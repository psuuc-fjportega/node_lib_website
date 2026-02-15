const router = require("express").Router();
const { getAllBooks, addBook, updateBook, deleteBook, restoreBook, getBookCopies, updateBookCopy } = require("../controllers/book.controller");
const { auth, roleCheck } = require("../middleware/auth.middleware");

// Anyone can view books
router.get("/", getAllBooks);

// Admin/Librarian can add or update
router.post("/", auth, roleCheck(["ADMIN", "LIBRARIAN"]), addBook);
router.put("/:id", auth, roleCheck(["ADMIN", "LIBRARIAN"]), updateBook);

// Only Admin can delete (soft-delete)
router.delete("/:id", auth, roleCheck(["ADMIN"]), deleteBook);

// Only Admin can restore
router.put("/:id/restore", auth, roleCheck(["ADMIN"]), restoreBook);

// Get copies for a specific book
router.get("/:id/copies", auth, roleCheck(["ADMIN", "LIBRARIAN"]), getBookCopies);

// Update a specific copy
router.put("/:id/copies/:copyId", auth, roleCheck(["ADMIN", "LIBRARIAN"]), updateBookCopy);

module.exports = router;
