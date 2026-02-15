const mongoose = require("mongoose");

const ActivityLogSchema = new mongoose.Schema({
  action: { type: String, required: true }, // e.g., "USER_LOGIN", "SETTINGS_UPDATE"
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  details: { type: String },
  timestamp: { type: Date, default: Date.now }
});

module.exports = mongoose.model("ActivityLog", ActivityLogSchema);
