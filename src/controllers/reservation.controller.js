const Reservation = require("../models/Reservation");
const Book = require("../models/Book");
const { logActivity } = require("../utils/logger");

// Create Reservation
exports.createReservation = async (req, res) => {
  const { bookId } = req.body;
  const book = await Book.findById(bookId);
  if (!book) return res.status(404).json({ message: "Book not found" });

  // Only allow reservation if no copies available
  if (book.availableCopies > 0) {
      return res.status(400).json({ message: "Book is available! You can borrow it directly." });
  }

  // Check if already reserved
  const existing = await Reservation.findOne({ 
      user: req.user.userId, 
      book: bookId, 
      status: "PENDING" 
  });
  if (existing) return res.status(400).json({ message: "You already reserved this book." });

  const reservation = await Reservation.create({
    user: req.user.userId,
    book: bookId
  });

  await logActivity(req, "RESERVE_BOOK", `Reserved book: ${book.title}`);

  res.json({ message: "Reservation placed successfully", reservation });
};

// Get My Reservations
exports.getMyReservations = async (req, res) => {
  const reservations = await Reservation.find({ user: req.user.userId })
    .populate("book")
    .sort({ requestDate: -1 });
  res.json(reservations);
};

// Cancel Reservation
exports.cancelReservation = async (req, res) => {
  const reservation = await Reservation.findById(req.params.id);
  if (!reservation) return res.status(404).json({ message: "Reservation not found" });
  
  if (reservation.user.toString() !== req.user.userId) {
      return res.status(403).json({ message: "Access denied" });
  }

  reservation.status = "CANCELLED";
  await reservation.save();

  res.json({ message: "Reservation cancelled" });
};
