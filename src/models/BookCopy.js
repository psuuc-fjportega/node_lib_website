const mongoose = require("mongoose");

const BookCopySchema = new mongoose.Schema({
  book: { type: mongoose.Schema.Types.ObjectId, ref: "Book", required: true },
  copyNumber: { type: Number, required: true },
  accessionNo: { type: String, unique: true, required: true },
  status: {
    type: String,
    enum: ["AVAILABLE", "BORROWED", "LOST", "DAMAGED", "MAINTENANCE"],
    default: "AVAILABLE",
  },
  condition: {
    type: String,
    enum: ["NEW", "GOOD", "FAIR", "POOR"],
    default: "NEW",
  },
  addedAt: { type: Date, default: Date.now },
});

// Static helper: generate next accession number
BookCopySchema.statics.generateAccessionNo = async function () {
  const last = await this.findOne().sort({ _id: -1 });
  if (!last || !last.accessionNo) return "BK-000001";
  const num = parseInt(last.accessionNo.replace("BK-", "")) + 1;
  return "BK-" + String(num).padStart(6, "0");
};

// Static helper: create N copies for a book
BookCopySchema.statics.createCopies = async function (bookId, count) {
  const existing = await this.countDocuments({ book: bookId });
  const copies = [];
  for (let i = 0; i < count; i++) {
    const accessionNo = await this.generateAccessionNo();
    copies.push(
      await this.create({
        book: bookId,
        copyNumber: existing + i + 1,
        accessionNo,
      })
    );
  }
  return copies;
};

module.exports = mongoose.model("BookCopy", BookCopySchema);
