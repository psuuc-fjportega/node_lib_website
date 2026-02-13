const express = require("express");
const router = express.Router();
const User = require("../models/User");
const { auth, adminOnly } = require("../middleware/auth.middleware");



router.get("/", auth, adminOnly, async (req, res) => {
  try {
    const users = await User.find().select("-password");
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE user (ADMIN only)
// DELETE user (ADMIN only)
router.delete("/:id", auth, adminOnly, async (req, res) => {
  try {
    const userIdToDelete = req.params.id;

    // ❌ Prevent deleting yourself
    if (req.user.userId === userIdToDelete) {
      return res.status(400).json({ message: "You cannot delete yourself." });
    }

    const userToDelete = await User.findById(userIdToDelete);
    if (!userToDelete) {
      return res.status(404).json({ message: "User not found" });
    }

    // ❌ Prevent deleting the last ADMIN
    if (userToDelete.role === "ADMIN") {
      const adminCount = await User.countDocuments({ role: "ADMIN" });

      if (adminCount <= 1) {
        return res.status(400).json({
          message: "Cannot delete the last ADMIN."
        });
      }
    }

    await User.findByIdAndDelete(userIdToDelete);

    res.json({ message: "User deleted successfully" });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }

  
});



router.put("/:id", auth, adminOnly, async (req, res) => {
  try {
    const userIdToUpdate = req.params.id;
    const { username, role } = req.body;

    const userToUpdate = await User.findById(userIdToUpdate);
    if (!userToUpdate) {
      return res.status(404).json({ message: "User not found" });
    }

    
    if (req.user.userId === userIdToUpdate && role !== userToUpdate.role) {
      return res.status(400).json({
        message: "You cannot change your own role."
      });
    }

    
    if (userToUpdate.role === "ADMIN" && role !== "ADMIN") {
      const adminCount = await User.countDocuments({ role: "ADMIN" });

      if (adminCount <= 1) {
        return res.status(400).json({
          message: "System must have at least one ADMIN."
        });
      }
    }

    const updatedUser = await User.findByIdAndUpdate(
      userIdToUpdate,
      { username, role },
      { new: true }
    ).select("-password");

    res.json(updatedUser);

  } catch (err) {
    res.status(500).json({ error: err.message });
  }



});




module.exports = router;
