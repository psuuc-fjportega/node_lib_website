const express = require("express");
const router = express.Router();
const ActivityLog = require("../models/ActivityLog");
const { auth, adminOnly } = require("../middleware/auth.middleware");

// Get Logs (Admin only)
router.get("/", auth, adminOnly, async (req, res) => {
  try {
    const logs = await ActivityLog.find()
      .populate("user", "username role")
      .sort({ timestamp: -1 })
      .limit(100); // Limit to last 100 logs
    res.json(logs);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
