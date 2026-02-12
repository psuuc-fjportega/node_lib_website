const Borrow = require("../models/Borrow");
const Book = require("../models/Book");

// Borrow a book (Member)
exports.borrowBook = async (req, res) => {
  const { bookId, dueDate } = req.body;
  const book = await Book.findById(bookId);
  if (!book) return res.status(404).json({ message: "Book not found" });

  const borrow = await Borrow.create({
    user: req.user.userId,
    book: bookId,
    dueDate: new Date(dueDate),
  });

  res.json({ message: "Book borrowed", borrow });
};

// Return a book (Member/Librarian/Admin)
exports.returnBook = async (req, res) => {
  const borrow = await Borrow.findById(req.params.id);
  if (!borrow) return res.status(404).json({ message: "Borrow record not found" });
  if (borrow.returned) return res.status(400).json({ message: "Book already returned" });

  borrow.returned = true;
  await borrow.save();

  res.json({ message: "Book returned", borrow });
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
