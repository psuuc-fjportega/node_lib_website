const Book = require("../models/Book");
const BookCopy = require("../models/BookCopy");

// List all books (any role) - with Filter & Search
exports.getAllBooks = async (req, res) => {
  try {
    const { search, category, availability, includeDeleted } = req.query;
    let query = { isDeleted: false }; // default: hide soft-deleted

    // Admin can optionally include deleted books
    if (includeDeleted === "true") {
      delete query.isDeleted;
    }

    // Search by Title or Author
    if (search) {
      query.$or = [
        { title: { $regex: search, $options: "i" } },
        { author: { $regex: search, $options: "i" } }
      ];
    }

    // Filter by Category
    if (category) {
      query.category = category;
    }

    // Filter by Availability (Available = availableCopies > 0)
    if (availability === "true") {
      query.availableCopies = { $gt: 0 };
    }

    const books = await Book.find(query);
    res.json(books);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Add book (Admin/Librarian) — also creates BookCopy documents
exports.addBook = async (req, res) => {
  try {
    const { title, author, description, category, totalCopies } = req.body;
    const copies = totalCopies || 1;
    const book = await Book.create({ 
      title, 
      author, 
      description,
      category: category || "General",
      totalCopies: copies,
      availableCopies: copies
    });

    // Auto-create individual BookCopy records
    await BookCopy.createCopies(book._id, copies);

    res.json({ message: "Book added", book });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

// Update book (Admin/Librarian)
exports.updateBook = async (req, res) => {
  try {
    const { totalCopies } = req.body;
    
    // If totalCopies is being updated, we need to adjust availableCopies and BookCopy records
    if (totalCopies !== undefined) {
       const book = await Book.findById(req.params.id);
       if (!book) return res.status(404).json({ message: "Book not found" });
       
       const difference = totalCopies - book.totalCopies;
       req.body.availableCopies = book.availableCopies + difference;
       
       // Prevent negative available copies
       if (req.body.availableCopies < 0) {
          return res.status(400).json({ message: "Cannot reduce total copies below currently borrowed amount." });
       }

       // Create or remove BookCopy records
       if (difference > 0) {
         await BookCopy.createCopies(book._id, difference);
       } else if (difference < 0) {
         // Remove available copies (not borrowed ones)
         const copiesToRemove = await BookCopy.find({ book: book._id, status: "AVAILABLE" })
           .sort({ copyNumber: -1 })
           .limit(Math.abs(difference));
         for (const copy of copiesToRemove) {
           await BookCopy.findByIdAndDelete(copy._id);
         }
       }
    }

    const book = await Book.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!book) return res.status(404).json({ message: "Book not found" });
    res.json(book);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

// Soft-delete book (Admin only)
exports.deleteBook = async (req, res) => {
  try {
    const book = await Book.findById(req.params.id);
    if (!book) return res.status(404).json({ message: "Book not found" });

    book.isDeleted = true;
    book.deletedAt = new Date();
    await book.save();

    res.json({ message: "Book archived (soft-deleted)" });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

// Restore a soft-deleted book (Admin only)
exports.restoreBook = async (req, res) => {
  try {
    const book = await Book.findById(req.params.id);
    if (!book) return res.status(404).json({ message: "Book not found" });

    book.isDeleted = false;
    book.deletedAt = null;
    await book.save();

    res.json({ message: "Book restored", book });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

// Get copies for a specific book
exports.getBookCopies = async (req, res) => {
  try {
    const copies = await BookCopy.find({ book: req.params.id }).sort({ copyNumber: 1 });
    res.json(copies);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Update a specific copy's condition
exports.updateBookCopy = async (req, res) => {
  try {
    const { condition, status } = req.body;
    const update = {};
    if (condition) update.condition = condition;
    if (status) update.status = status;

    const copy = await BookCopy.findByIdAndUpdate(req.params.copyId, update, { new: true });
    if (!copy) return res.status(404).json({ message: "Copy not found" });
    res.json(copy);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};
