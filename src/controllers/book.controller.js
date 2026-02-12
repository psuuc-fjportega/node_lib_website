const Book = require("../models/Book");

// List all books (any role)
exports.getAllBooks = async (req, res) => {
  const books = await Book.find();
  res.json(books);
};

// Add book (Admin/Librarian)
exports.addBook = async (req, res) => {
  try {
    const { title, author, description } = req.body;
    const book = await Book.create({ title, author, description });
    res.json({ message: "Book added", book });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

// Update book (Admin/Librarian)
exports.updateBook = async (req, res) => {
  try {
    const book = await Book.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!book) return res.status(404).json({ message: "Book not found" });
    res.json(book);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

// Delete book (Admin only)
exports.deleteBook = async (req, res) => {
  try {
    const book = await Book.findByIdAndDelete(req.params.id);
    if (!book) return res.status(404).json({ message: "Book not found" });
    res.json({ message: "Book deleted" });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};
