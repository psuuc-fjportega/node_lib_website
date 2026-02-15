const mongoose = require("mongoose");

const BorrowSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  book: { type: mongoose.Schema.Types.ObjectId, ref: "Book", required: true },
  bookCopy: { type: mongoose.Schema.Types.ObjectId, ref: "BookCopy", default: null },
  borrowDate: { type: Date, default: Date.now },
  dueDate: { type: Date, required: true },
  returnDate: { type: Date, default: null },
  returned: { type: Boolean, default: false },
  renewCount: { type: Number, default: 0 },
  status: { type: String, enum: ['BORROWED', 'RETURNED', 'LOST', 'DAMAGED'], default: 'BORROWED' },
});

module.exports = mongoose.model("Borrow", BorrowSchema);
