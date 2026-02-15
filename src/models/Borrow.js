const mongoose = require("mongoose");

const BorrowSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  book: { type: mongoose.Schema.Types.ObjectId, ref: "Book", required: true },
  borrowDate: { type: Date, default: Date.now },
  dueDate: { type: Date, required: true },
  returned: { type: Boolean, default: false },
  status: { type: String, enum: ['BORROWED', 'RETURNED', 'LOST', 'DAMAGED'], default: 'BORROWED' },
});

module.exports = mongoose.model("Borrow", BorrowSchema);
