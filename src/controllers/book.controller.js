const Book = require("../models/Book");

// List all books (any role)
// List all books (any role) - with Filter & Search
exports.getAllBooks = async (req, res) => {
  try {
    const { search, category, availability } = req.query;
    let query = {};

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

// Add book (Admin/Librarian)
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
    res.json({ message: "Book added", book });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

// Update book (Admin/Librarian)
exports.updateBook = async (req, res) => {
  try {
    const { totalCopies } = req.body;
    
    // If totalCopies is being updated, we need to adjust availableCopies
    if (totalCopies !== undefined) {
       const book = await Book.findById(req.params.id);
       if (!book) return res.status(404).json({ message: "Book not found" });
       
       const difference = totalCopies - book.totalCopies;
       req.body.availableCopies = book.availableCopies + difference;
       
       // Prevent negative available copies
       if (req.body.availableCopies < 0) {
          return res.status(400).json({ message: "Cannot reduce total copies below currently borrowed amount." });
       }
    }

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
