const mongoose = require("mongoose");

const BorrowSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  book: { type: mongoose.Schema.Types.ObjectId, ref: "Book", required: true },

  // only assigned when APPROVED
  bookCopy: { type: mongoose.Schema.Types.ObjectId, ref: "BookCopy", default: null },

  borrowDate: { type: Date, default: Date.now },

  // ✅ dueDate is NOT required anymore (pending requests have no due date yet)
  dueDate: { type: Date, default: null },

  returnDate: { type: Date, default: null },
  returned: { type: Boolean, default: false },
  renewCount: { type: Number, default: 0 },

  // ✅ add PENDING + REJECTED
  status: {
    type: String,
    enum: ["PENDING", "BORROWED", "RETURNED", "REJECTED", "LOST", "DAMAGED"],
    default: "PENDING",
  },

  // optional: track approval info
  approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
  approvedAt: { type: Date, default: null },
  rejectedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
  rejectedAt: { type: Date, default: null },
});

module.exports = mongoose.model("Borrow", BorrowSchema);
