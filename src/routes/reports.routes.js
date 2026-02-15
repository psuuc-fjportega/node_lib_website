const express = require("express");
const router = express.Router();
const User = require("../models/User");
const Book = require("../models/Book");
const Borrow = require("../models/Borrow");
const { auth, adminOnly } = require("../middleware/auth.middleware");

// Get Dashboard Stats
router.get("/dashboard-stats", auth, adminOnly, async (req, res) => {
  try {
    const totalUsers = await User.countDocuments();
    const adminCount = await User.countDocuments({ role: "ADMIN" });
    const librarianCount = await User.countDocuments({ role: "LIBRARIAN" });
    const memberCount = await User.countDocuments({ role: "MEMBER" });

    const totalBooks = await Book.countDocuments();
    const activeBorrows = await Borrow.countDocuments({ returned: false });
    
    // Calculate total fines (mock logic for now as fines aren't fully implemented in DB)
    // In a real scenario, we'd sum up fines from a Fine model
    
    res.json({
      users: {
        total: totalUsers,
        admins: adminCount,
        librarians: librarianCount,
        members: memberCount
      },
      books: {
        total: totalBooks,
        borrowed: activeBorrows,
        available: totalBooks - activeBorrows
      }
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
