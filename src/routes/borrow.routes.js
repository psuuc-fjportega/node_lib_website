const router = require("express").Router();
const { auth, roleCheck } = require("../middleware/auth.middleware");
const {
  borrowBook,
  issueBook,
  returnBook,
  renewBook,
  updateBorrowStatus,
  getAllBorrows,
  getUserBorrows,
} = require("../controllers/borrow.controller");

const { approveBorrow, rejectBorrow } = require("../controllers/borrow.controller");

// Members/Librarians/Admins can borrow books
router.post("/", auth, roleCheck(["MEMBER", "LIBRARIAN", "ADMIN"]), borrowBook);

// Librarian/Admin can issue books to others
router.post("/issue", auth, roleCheck(["ADMIN", "LIBRARIAN"]), issueBook);

// Members/Librarians/Admins can return books
router.put("/return/:id", auth, roleCheck(["MEMBER", "LIBRARIAN", "ADMIN"]), returnBook);

// Renew (Member/Librarian/Admin)
router.put("/renew/:id", auth, roleCheck(["MEMBER", "ADMIN", "LIBRARIAN"]), renewBook);

// Update Status: Lost/Damaged (Librarian/Admin)
router.put("/status/:id", auth, roleCheck(["ADMIN", "LIBRARIAN"]), updateBorrowStatus);

// Approve/Reject borrow requests (Librarian/Admin)
router.put("/approve/:id", auth, roleCheck(["ADMIN", "LIBRARIAN"]), approveBorrow);
router.put("/reject/:id", auth, roleCheck(["ADMIN", "LIBRARIAN"]), rejectBorrow);

// Admins and Librarians can view all borrows
router.get("/", auth, roleCheck(["ADMIN", "LIBRARIAN"]), getAllBorrows);

// Members/Librarians/Admins can view only their own borrows
router.get("/my", auth, roleCheck(["MEMBER", "LIBRARIAN", "ADMIN"]), getUserBorrows);

module.exports = router;
