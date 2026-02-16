const Borrow = require("../models/Borrow");
const Book = require("../models/Book");
const BookCopy = require("../models/BookCopy");
const Reservation = require("../models/Reservation");
const SystemSettings = require("../models/SystemSettings");
const { logActivity } = require("../utils/logger");



// ── Helper: Calculate fine for a borrow record ──
function calculateFine(borrow, settings) {
  if (!borrow.dueDate || borrow.status !== "RETURNED") return 0;

  const returnDate = borrow.returnDate || new Date();
  const dueDate = new Date(borrow.dueDate);
  const gracePeriod = settings.gracePeriodDays || 0;

  // Add grace period to due date
  const effectiveDueDate = new Date(dueDate);
  effectiveDueDate.setDate(effectiveDueDate.getDate() + gracePeriod);

  const diffMs = returnDate - effectiveDueDate;
  if (diffMs <= 0) return 0; // returned on time (within grace)

  const overdueDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
  return overdueDays * (settings.finePerDay || 0);
}

// ── Helper: Auto-fulfill oldest pending reservation when a book is returned ──
async function fulfillNextReservation(bookId, req) {
  const nextReservation = await Reservation.findOne({
    book: bookId,
    status: "PENDING",
  }).sort({ requestDate: 1 }); // oldest first

  if (nextReservation) {
    nextReservation.status = "FULFILLED";
    nextReservation.fulfilledAt = new Date();
    await nextReservation.save();

    await logActivity(
      req,
      "RESERVATION_FULFILLED",
      `Reservation fulfilled for user ${nextReservation.user} on book ${bookId}`
    );

    return nextReservation;
  }
  return null;
}
// ── Borrow a book (Member) ──
exports.borrowBook = async (req, res) => {
  try {
    const { bookId } = req.body;

    if (!req.user || !req.user.userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const userId = req.user.userId;

    const book = await Book.findById(bookId);
    if (!book) return res.status(404).json({ message: "Book not found" });

  const existingBorrowed = await Borrow.findOne({
  user: userId,
  book: bookId,
  status: "BORROWED",
  returned: false,
});

if (existingBorrowed) {
  return res.status(400).json({ message: "You already borrowed this book." });
}


if (existingBorrowed) {
  return res.status(400).json({ message: "You already borrowed this book." });
}


    // ✅ prevent duplicate pending requests for same book
    const existingPending = await Borrow.findOne({
      user: userId,
      book: bookId,
      status: "PENDING",
    });

    if (existingPending) {
      return res.status(400).json({ message: "You already have a pending request for this book." });
    }

    // ✅ create PENDING request (no copy, no dueDate)
    const request = await Borrow.create({
      user: userId,
      book: bookId,
      status: "PENDING",
      dueDate: null,
      bookCopy: null,
      returned: false,
    });

    await logActivity(
      req,
      "BORROW_REQUEST",
      `Borrow request created for book: ${book.title}`
    );

    res.json({ message: "Borrow request sent for approval", borrow: request });
  } catch (err) {
    console.error("BORROW_REQUEST ERROR:", err.message);
    console.error(err.stack);
    res.status(500).json({ message: err.message });
  }
};



// ── Issue book (Librarian/Admin) ──
exports.issueBook = async (req, res) => {
  try {
    const { userId, bookId } = req.body;

    const book = await Book.findById(bookId);
    if (!book) return res.status(404).json({ message: "Book not found" });

    if (book.availableCopies < 1) {
      return res.status(400).json({ message: "No copies available." });
    }

    const settings = await SystemSettings.getSettings();

    // Find an available BookCopy
    const availableCopy = await BookCopy.findOne({
      book: bookId,
      status: "AVAILABLE",
    });

    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + settings.loanDuration);

  const borrow = await Borrow.create({
  user: userId,
  book: bookId,
  bookCopy: availableCopy ? availableCopy._id : null,
  dueDate: dueDate,
  status: "BORROWED",
  approvedBy: req.user.userId,     // librarian/admin who issued
  approvedAt: new Date(),
});


    // Update copy status
    if (availableCopy) {
      availableCopy.status = "BORROWED";
      await availableCopy.save();
    }

    book.availableCopies -= 1;
    await book.save();

    await logActivity(
      req,
      "ISSUE_BOOK",
      `Issued book: ${book.title} to user ${userId}${availableCopy ? ` (Copy: ${availableCopy.accessionNo})` : ""}`
    );

    res.json({ message: "Book issued", borrow, dueDate });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ── Return a book (Member/Librarian/Admin) ──
exports.returnBook = async (req, res) => {
  try {
    const borrow = await Borrow.findById(req.params.id).populate("book");
    if (!borrow)
      return res.status(404).json({ message: "Borrow record not found" });
    if (borrow.returned)
      return res.status(400).json({ message: "Book already returned" });
    if (borrow.status === "PENDING" || borrow.status === "REJECTED") {
  return res.status(400).json({ message: "This request is not an active borrow." });
}


    const settings = await SystemSettings.getSettings();

    borrow.returned = true;
    borrow.status = "RETURNED";
    borrow.returnDate = new Date();
    await borrow.save();

    // Calculate fine
    const fine = calculateFine(borrow, settings);

    // Update BookCopy status back to AVAILABLE
    if (borrow.bookCopy) {
      await BookCopy.findByIdAndUpdate(borrow.bookCopy, {
        status: "AVAILABLE",
      });
    }

    // Increment available copies
    const book = await Book.findById(borrow.book._id);
    if (book) {
      book.availableCopies += 1;
      await book.save();
    }

    // Auto-fulfill the next pending reservation for this book
    const fulfilledReservation = await fulfillNextReservation(
      borrow.book._id,
      req
    );

    await logActivity(
      req,
      "RETURN_BOOK",
      `Returned book: ${borrow.book.title}${fine > 0 ? ` | Fine: ₱${fine}` : ""}`
    );

    res.json({
      message: "Book returned",
      borrow,
      fine,
      fineDetails:
        fine > 0
          ? {
              overdueDays: Math.ceil(fine / settings.finePerDay),
              finePerDay: settings.finePerDay,
              gracePeriodDays: settings.gracePeriodDays,
              total: fine,
            }
          : null,
      reservationFulfilled: fulfilledReservation ? true : false,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ── Renew Book (Member/Librarian/Admin) ──
exports.renewBook = async (req, res) => {
  try {
    const borrow = await Borrow.findById(req.params.id).populate("book");
    if (!borrow)
      return res.status(404).json({ message: "Borrow record not found" });
    if (borrow.returned)
      return res.status(400).json({ message: "Cannot renew returned book" });

    if (borrow.status !== "BORROWED") {
  return res.status(400).json({ message: "Only BORROWED books can be renewed." });
}


    // If Member, ensure it's their own book
    if (
      req.user.role === "MEMBER" &&
      borrow.user.toString() !== req.user.userId
    ) {
      return res.status(403).json({ message: "Access denied" });
    }

    const settings = await SystemSettings.getSettings();

    // ── ENFORCEMENT: Check renewal limit ──
    const currentRenewals = borrow.renewCount || 0;
    if (currentRenewals >= settings.maxRenewals) {
      return res.status(400).json({
        message: `Renewal limit reached (${settings.maxRenewals} renewals max). Please return the book.`,
      });
    }

    // ── ENFORCEMENT: Block renewal if someone has reserved this book ──
    const pendingReservation = await Reservation.findOne({
      book: borrow.book._id,
      status: "PENDING",
    });
    if (pendingReservation) {
      return res.status(400).json({
        message:
          "Cannot renew — another member has reserved this book. Please return it.",
      });
    }

    const newDueDate = new Date(borrow.dueDate);
    newDueDate.setDate(newDueDate.getDate() + settings.loanDuration);
    borrow.dueDate = newDueDate;
    borrow.renewCount = currentRenewals + 1;

    await borrow.save();
    await logActivity(
      req,
      "RENEW_BOOK",
      `Renewed book: ${borrow.book.title} (Renewal #${borrow.renewCount}/${settings.maxRenewals})`
    );

    res.json({
      message: `Book renewed (${borrow.renewCount}/${settings.maxRenewals})`,
      borrow,
      remainingRenewals: settings.maxRenewals - borrow.renewCount,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ── Update Borrow Status (Lost/Damaged) ──
exports.updateBorrowStatus = async (req, res) => {
  try {
    const { status } = req.body; // LOST, DAMAGED
    const borrow = await Borrow.findById(req.params.id).populate("book");

    if (!borrow)
      return res.status(404).json({ message: "Borrow record not found" });

    borrow.status = status;
    borrow.returned = true;
    borrow.returnDate = new Date();
    await borrow.save();

    // Update BookCopy status
    if (borrow.bookCopy) {
      await BookCopy.findByIdAndUpdate(borrow.bookCopy, { status: status });
    }

    // If DAMAGED, return to stock. If LOST, the copy is gone.
    if (status === "DAMAGED") {
      const book = await Book.findById(borrow.book._id);
      if (book) {
        book.availableCopies += 1;
        await book.save();
      }
    }

    // If LOST, reduce totalCopies as well since the physical copy is gone
    if (status === "LOST") {
      const book = await Book.findById(borrow.book._id);
      if (book) {
        book.totalCopies = Math.max(0, book.totalCopies - 1);
        await book.save();
      }
    }

    await logActivity(
      req,
      "UPDATE_BORROW_STATUS",
      `Marked book ${borrow.book.title} as ${status}`
    );

    res.json({ message: `Borrow status updated to ${status}`, borrow });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ── Get all borrows (Admin/Librarian) — includes fine info ──
exports.getAllBorrows = async (req, res) => {
  try {
    const settings = await SystemSettings.getSettings();

    const borrows = await Borrow.find()
      .populate("user book bookCopy approvedBy rejectedBy");

    const enriched = borrows.map((b) => {
      const obj = b.toObject();

      // Fine only makes sense for RETURNED with dueDate
      if (b.returned && b.status === "RETURNED" && b.dueDate) {
        obj.fine = calculateFine(b, settings);
      }

      // Current fine preview only for BORROWED with dueDate
      if (!b.returned && b.status === "BORROWED" && b.dueDate) {
        const now = new Date();
        const dueDate = new Date(b.dueDate);
        const grace = settings.gracePeriodDays || 0;

        const effectiveDue = new Date(dueDate);
        effectiveDue.setDate(effectiveDue.getDate() + grace);

        const diffMs = now - effectiveDue;
        obj.currentFine =
          diffMs > 0
            ? Math.ceil(diffMs / (1000 * 60 * 60 * 24)) * (settings.finePerDay || 0)
            : 0;
      }

      return obj;
    });

    res.json(enriched);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};


// ── Get current user's borrows (Member) — includes fine info ──
exports.getUserBorrows = async (req, res) => {
  try {
    const settings = await SystemSettings.getSettings();

    const borrows = await Borrow.find({ user: req.user.userId })
      .populate("book bookCopy approvedBy rejectedBy");

    const enriched = borrows.map((b) => {
      const obj = b.toObject();

      if (b.returned && b.status === "RETURNED" && b.dueDate) {
        obj.fine = calculateFine(b, settings);
      }

      if (!b.returned && b.status === "BORROWED" && b.dueDate) {
        const now = new Date();
        const dueDate = new Date(b.dueDate);
        const grace = settings.gracePeriodDays || 0;

        const effectiveDue = new Date(dueDate);
        effectiveDue.setDate(effectiveDue.getDate() + grace);

        const diffMs = now - effectiveDue;
        obj.currentFine =
          diffMs > 0
            ? Math.ceil(diffMs / (1000 * 60 * 60 * 24)) * (settings.finePerDay || 0)
            : 0;
      }

      return obj;
    });

    res.json(enriched);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};


// ── Approve borrow request (Librarian/Admin) ──
exports.approveBorrow = async (req, res) => {
  try {
    const { id } = req.params;

    const borrow = await Borrow.findById(id).populate("book user");
    if (!borrow) return res.status(404).json({ message: "Borrow request not found" });

    if (borrow.status !== "PENDING") {
      return res.status(400).json({ message: "Only PENDING requests can be approved." });
    }

    const settings = await SystemSettings.getSettings();
    const loanDuration = Number(settings?.loanDuration) || 7;

    // check book availability
    const book = await Book.findById(borrow.book._id);
    if (!book || book.availableCopies < 1) {
      return res.status(400).json({ message: "No copies available to approve this request." });
    }

    // find an available copy
    const availableCopy = await BookCopy.findOne({
      book: book._id,
      status: "AVAILABLE",
    });

    if (!availableCopy) {
      return res.status(400).json({ message: "No AVAILABLE copy found." });
    }

    // set due date
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + loanDuration);

    // update borrow record
    borrow.status = "BORROWED";
    borrow.dueDate = dueDate;
    borrow.bookCopy = availableCopy._id;
    borrow.approvedBy = req.user.userId;
    borrow.approvedAt = new Date();
    borrow.borrowDate = new Date();
    await borrow.save();

    // update copy status + book availability
    availableCopy.status = "BORROWED";
    await availableCopy.save();

    book.availableCopies -= 1;
    await book.save();

    await logActivity(
      req,
      "BORROW_APPROVED",
      `Approved borrow for ${borrow.user.username} — ${borrow.book.title} (Copy: ${availableCopy.accessionNo})`
    );

    res.json({ message: "Borrow request approved", borrow });
  } catch (err) {
    console.error("APPROVE_BORROW ERROR:", err.message);
    console.error(err.stack);
    res.status(500).json({ message: err.message });
  }
};

// ── Reject borrow request (Librarian/Admin) ──
exports.rejectBorrow = async (req, res) => {
  try {
    const { id } = req.params;

    const borrow = await Borrow.findById(id).populate("book user");
    if (!borrow) return res.status(404).json({ message: "Borrow request not found" });

    if (borrow.status !== "PENDING") {
      return res.status(400).json({ message: "Only PENDING requests can be rejected." });
    }

    borrow.status = "REJECTED";
    borrow.returned = true; // treat as closed so it doesn't count as active
    borrow.rejectedBy = req.user.userId;
    borrow.rejectedAt = new Date();
    await borrow.save();

    await logActivity(
      req,
      "BORROW_REJECTED",
      `Rejected borrow for ${borrow.user.username} — ${borrow.book.title}`
    );

    res.json({ message: "Borrow request rejected", borrow });
  } catch (err) {
    console.error("REJECT_BORROW ERROR:", err.message);
    console.error(err.stack);
    res.status(500).json({ message: err.message });
  }
};
