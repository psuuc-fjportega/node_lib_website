const express = require("express");
const router = express.Router();
const SystemSettings = require("../models/SystemSettings");
const { auth, adminOnly } = require("../middleware/auth.middleware");

const { logActivity } = require("../utils/logger");

// Get Settings
router.get("/", auth, async (req, res) => {
  try {
    const settings = await SystemSettings.getSettings();
    res.json(settings);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update Settings (Admin only)
router.put("/", auth, adminOnly, async (req, res) => {
  try {
    const { loanDuration, maxBooksPerUser, finePerDay } = req.body;
    let settings = await SystemSettings.getSettings();

    settings.loanDuration = loanDuration || settings.loanDuration;
    settings.maxBooksPerUser = maxBooksPerUser || settings.maxBooksPerUser;
    settings.finePerDay = finePerDay || settings.finePerDay;

    await settings.save();
    await logActivity(req, "SETTINGS_UPDATE", "Updated system settings");

    res.json({ message: "Settings updated successfully", settings });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
