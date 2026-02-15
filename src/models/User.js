const mongoose = require("mongoose");

const UserSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { type: String, enum: ["ADMIN", "LIBRARIAN", "MEMBER"], default: "MEMBER" },
  isActive: { type: Boolean, default: true }
});

module.exports = mongoose.model("User", UserSchema);
