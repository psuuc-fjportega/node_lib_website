const Borrow = require("../models/Borrow");
const Book = require("../models/Book");

// Borrow a book (Member)
const SystemSettings = require("../models/SystemSettings");
const { logActivity } = require("../utils/logger");

// Borrow a book (Member)
exports.borrowBook = async (req, res) => {
  const { bookId } = req.body;
  
  const book = await Book.findById(bookId);
  if (!book) return res.status(404).json({ message: "Book not found" });

  // Get System Settings
  const settings = await SystemSettings.getSettings();

  // Check max books limit
  const activeBorrows = await Borrow.countDocuments({ user: req.user.userId, returned: false });
  if (activeBorrows >= settings.maxBooksPerUser) {
    return res.status(400).json({ message: `You have reached the limit of ${settings.maxBooksPerUser} borrowed books.` });
  }
  
  // Check available copies
  if (book.availableCopies < 1) {
    return res.status(400).json({ message: "No copies available." });
  }

  // Calculate Due Date
  const dueDate = new Date();
  dueDate.setDate(dueDate.getDate() + settings.loanDuration);

  const borrow = await Borrow.create({
    user: req.user.userId,
    book: bookId,
    dueDate: dueDate,
  });
  
  // Decrement available copies
  book.availableCopies -= 1;
  await book.save();

  await logActivity(req, "BORROW_BOOK", `Borrowed book: ${book.title}`);

  res.json({ message: "Book borrowed", borrow, dueDate });
};

// Issue book (Librarian/Admin)
exports.issueBook = async (req, res) => {
  const { userId, bookId } = req.body;
  
  const book = await Book.findById(bookId);
  if (!book) return res.status(404).json({ message: "Book not found" });
  
  if (book.availableCopies < 1) {
    return res.status(400).json({ message: "No copies available." });
  }

  const settings = await SystemSettings.getSettings();

  const dueDate = new Date();
  dueDate.setDate(dueDate.getDate() + settings.loanDuration);

  const borrow = await Borrow.create({
    user: userId,
    book: bookId,
    dueDate: dueDate,
  });

  book.availableCopies -= 1;
  await book.save();

  await logActivity(req, "ISSUE_BOOK", `Issued book: ${book.title} to user ${userId}`);

  res.json({ message: "Book issued", borrow, dueDate });
};

// Return a book (Member/Librarian/Admin)
exports.returnBook = async (req, res) => {
  const borrow = await Borrow.findById(req.params.id).populate("book");
  if (!borrow) return res.status(404).json({ message: "Borrow record not found" });
  if (borrow.returned) return res.status(400).json({ message: "Book already returned" });

  borrow.returned = true;
  borrow.status = "RETURNED";
  borrow.returnDate = new Date();
  await borrow.save();
  
  // Increment available copies
  const book = await Book.findById(borrow.book._id);
  if (book) {
      book.availableCopies += 1;
      await book.save();
  }

  await logActivity(req, "RETURN_BOOK", `Returned book: ${borrow.book.title}`);

  res.json({ message: "Book returned", borrow });
};

// Renew Book (Member/Librarian/Admin)
exports.renewBook = async (req, res) => {
  const borrow = await Borrow.findById(req.params.id).populate("book");
  if (!borrow) return res.status(404).json({ message: "Borrow record not found" });
  if (borrow.returned) return res.status(400).json({ message: "Cannot renew returned book" });

  // If Member, ensure it's their own book
  if (req.user.role === "MEMBER" && borrow.user.toString() !== req.user.userId) {
      return res.status(403).json({ message: "Access denied" });
  }

  const settings = await SystemSettings.getSettings();
  
  const newDueDate = new Date(borrow.dueDate);
  newDueDate.setDate(newDueDate.getDate() + settings.loanDuration);
  borrow.dueDate = newDueDate;
  
  await borrow.save();
  await logActivity(req, "RENEW_BOOK", `Renewed book: ${borrow.book.title}`);

  res.json({ message: "Book renewed", borrow });
};

// Update Borrow Status (Lost/Damaged)
exports.updateBorrowStatus = async (req, res) => {
  const { status } = req.body; // LOST, DAMAGED
  const borrow = await Borrow.findById(req.params.id).populate("book");
  
  if (!borrow) return res.status(404).json({ message: "Borrow record not found" });

  borrow.status = status;
  borrow.returned = true; // Mark as effectively closed/returned from partial borrowing perspective
  await borrow.save();
  
  // If damaged, we might still return it to stock but needs repair (logic can vary). 
  // If lost, we strictly DO NOT increment stock since it's gone.
  // For simplicity here: LOST = -1 stock (so we don't increment back), DAMAGED = +1 stock (returned but needs fix)
  
  if (status === 'DAMAGED') {
      const book = await Book.findById(borrow.book._id);
      if (book) {
          book.availableCopies += 1;
          await book.save();
      }
  }

  await logActivity(req, "UPDATE_BORROW_STATUS", `Marked book ${borrow.book.title} as ${status}`);
  
  res.json({ message: `Borrow status updated to ${status}`, borrow });
};

// Get all borrows (Admin/Librarian)
exports.getAllBorrows = async (req, res) => {
  const borrows = await Borrow.find().populate("user book");
  res.json(borrows);
};

// Get current user's borrows (Member)
exports.getUserBorrows = async (req, res) => {
  const borrows = await Borrow.find({ user: req.user.userId }).populate("book");
  res.json(borrows);
};
