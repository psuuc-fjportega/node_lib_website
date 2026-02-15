const mongoose = require("mongoose");

const BookSchema = new mongoose.Schema({
  title: { type: String, required: true },
  author: { type: String, required: true },
  description: String,
  category: { type: String, default: "General" },
  totalCopies: { type: Number, default: 1 },
  availableCopies: { type: Number, default: 1 },
});

module.exports = mongoose.model("Book", BookSchema);
