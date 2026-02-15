const mongoose = require("mongoose");

const SystemSettingsSchema = new mongoose.Schema({
  loanDuration: { type: Number, default: 7 }, // Days
  maxBooksPerUser: { type: Number, default: 5 },
  finePerDay: { type: Number, default: 1 } // Currency unit per day
});

// Singleton pattern: Ensure only one settings document exists
SystemSettingsSchema.statics.getSettings = async function() {
  const settings = await this.findOne();
  if (settings) return settings;
  return await this.create({});
};

module.exports = mongoose.model("SystemSettings", SystemSettingsSchema);
