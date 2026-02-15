const ActivityLog = require("../models/ActivityLog");

exports.logActivity = async (req, action, details) => {
  try {
    // If req is provided, try to extract user
    const userId = req.user ? req.user.userId : null;
    
    await ActivityLog.create({
      action,
      user: userId,
      details,
    });
  } catch (err) {
    console.error("Logging failed:", err);
  }
};
