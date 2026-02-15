const express = require("express");
const router = express.Router();
const User = require("../models/User");
const { auth, adminOnly, roleCheck } = require("../middleware/auth.middleware");
const { logActivity } = require("../utils/logger");

// Get Users (Admin or Librarian)
router.get("/", auth, roleCheck(["ADMIN", "LIBRARIAN"]), async (req, res) => {
  try {
    const { role, includeDeleted } = req.query;
    let query = { isDeleted: false }; // hide soft-deleted by default
    if (includeDeleted === "true") delete query.isDeleted;
    if (role) query.role = role;

    const users = await User.find(query).select("-password");
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

    // ❌ Prevent deleting other ADMINs
    if (userToDelete.role === "ADMIN" && req.user.userId !== userToDelete._id.toString()) {
      return res.status(403).json({ message: "You cannot delete other ADMINs." });
    }

    // ❌ Prevent deleting the last ADMIN (self-deletion case handled above or allowed if not last)
    if (userToDelete.role === "ADMIN") {
      const adminCount = await User.countDocuments({ role: "ADMIN" });

      if (adminCount <= 1) {
        return res.status(400).json({
          message: "Cannot delete the last ADMIN."
        });
      }
    }

    const user = await User.findById(userIdToDelete);
    user.isDeleted = true;
    user.deletedAt = new Date();
    user.isActive = false;
    await user.save();
    await logActivity(req, "USER_SOFT_DELETE", `Soft-deleted user: ${user.username}`);

    res.json({ message: "User archived (soft-deleted)" });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }

  
});

// Restore soft-deleted user (Admin only)
router.put("/:id/restore", auth, adminOnly, async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: "User not found" });
    if (!user.isDeleted) return res.status(400).json({ message: "User is not deleted" });

    user.isDeleted = false;
    user.deletedAt = null;
    user.isActive = true;
    await user.save();
    await logActivity(req, "USER_RESTORE", `Restored user: ${user.username}`);

    res.json({ message: "User restored successfully", user });
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

    
    
    if (userToUpdate.role === "ADMIN" && req.user.userId !== userToUpdate._id.toString()) {
      return res.status(403).json({ message: "You cannot edit other ADMINs." });
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

    await logActivity(req, "USER_UPDATE", `Updated user: ${username} (${role})`);

    res.json(updatedUser);

  } catch (err) {
    res.status(500).json({ error: err.message });
  }



});




// Toggle User Status (Enable/Disable)
router.put("/:id/toggle-status", auth, adminOnly, async (req, res) => {
  try {
    const userIdToToggle = req.params.id;
    
    // Prevent disabling yourself
    if (req.user.userId === userIdToToggle) {
      return res.status(400).json({ message: "You cannot disable yourself." });
    }

    const user = await User.findById(userIdToToggle);
    if (!user) return res.status(404).json({ message: "User not found" });

    // Prevent disabling other admins
    if (user.role === "ADMIN") {
       return res.status(403).json({ message: "Cannot disable other admins." });
    }

    user.isActive = !user.isActive;
    await user.save();
    
    await logActivity(req, "USER_TOGGLE_STATUS", `User ${user.username} ${user.isActive ? 'enabled' : 'disabled'}`);

    res.json({ message: `User ${user.isActive ? 'enabled' : 'disabled'} successfully`, isActive: user.isActive });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Add User (Admin only)
router.post("/add", auth, adminOnly, async (req, res) => {
  try {
    const { username, password, role } = req.body;
    
    // Check if user exists
    const existingUser = await User.findOne({ username });
    if (existingUser) return res.status(400).json({ message: "Username already exists" });

    const bcrypt = require("bcrypt");
    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = new User({
      username,
      password: hashedPassword,
      role: role || "MEMBER",
      isActive: true
    });

    await newUser.save();
    await logActivity(req, "USER_ADD", `Created user: ${username} (${role})`);

    res.json({ message: "User created successfully", user: newUser });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
