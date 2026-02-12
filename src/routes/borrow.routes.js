const router = require("express").Router();
const { auth, roleCheck } = require("../middleware/auth.middleware");
const {
  borrowBook,
  returnBook,
  getAllBorrows,
  getUserBorrows,
} = require("../controllers/borrow.controller");

// Members can borrow books
router.post("/", auth, roleCheck(["MEMBER"]), borrowBook);

// Members/Librarians/Admins can return books
router.put("/return/:id", auth, roleCheck(["MEMBER", "LIBRARIAN", "ADMIN"]), returnBook);

// Admins and Librarians can view all borrows
router.get("/", auth, roleCheck(["ADMIN", "LIBRARIAN"]), getAllBorrows);

// Members can view only their own borrows
router.get("/my", auth, roleCheck(["MEMBER"]), getUserBorrows);

module.exports = router;
