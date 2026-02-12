const router = require("express").Router();
const { getAllBooks, addBook, updateBook, deleteBook } = require("../controllers/book.controller");
const { auth, roleCheck } = require("../middleware/auth.middleware");

// Anyone can view books
router.get("/", getAllBooks);

// Admin/Librarian can add or update
router.post("/", auth, roleCheck(["ADMIN", "LIBRARIAN"]), addBook);
router.put("/:id", auth, roleCheck(["ADMIN", "LIBRARIAN"]), updateBook);

// Only Admin can delete
router.delete("/:id", auth, roleCheck(["ADMIN"]), deleteBook);

module.exports = router;
