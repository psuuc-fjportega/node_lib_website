const mongoose = require("mongoose");

const ReservationSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  book: { type: mongoose.Schema.Types.ObjectId, ref: "Book", required: true },
  requestDate: { type: Date, default: Date.now },
  status: { type: String, enum: ["PENDING", "FULFILLED", "CANCELLED"], default: "PENDING" },
  fulfilledAt: { type: Date, default: null },
});

module.exports = mongoose.model("Reservation", ReservationSchema);
