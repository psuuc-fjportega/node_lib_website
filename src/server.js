const morgan = require("morgan");
require("dotenv").config();
const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
const path = require("path");
const userRoutes = require("./routes/user.routes");

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(morgan("dev"));
app.use("/api/users", userRoutes);

// Serve static files
app.use("/static", express.static(path.join(__dirname, "static")));
app.use(express.static(path.join(__dirname, "../public")));

// MongoDB connection
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log("MongoDB connected"))
  .catch(err => console.error(err));

// API Routes
app.use("/api/auth", require("./routes/auth.routes"));
app.use("/api/books", require("./routes/book.routes"));
app.use("/api/borrows", require("./routes/borrow.routes"));
app.use("/api/settings", require("./routes/settings.routes"));
app.use("/api/logs", require("./routes/log.routes"));
app.use("/api/reports", require("./routes/reports.routes"));
app.use("/api/reservations", require("./routes/reservation.routes"));

// Frontend routes
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "../public/home.html"));
});
app.get("/register", (req, res) => {
    res.sendFile(path.join(__dirname, "../public/register.html"));
});

app.get("/login", (req, res) => {
    res.sendFile(path.join(__dirname, "../public/login.html"));
});

app.use((err, req, res, next) => {
  console.error("GLOBAL ERROR STACK:\n", err.stack);
  res.status(500).json({ message: err.message });
});



// 404 middleware
app.use((req, res) => {
    res.status(404).send("Page not found");
});

// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running at: http://localhost:${PORT}`));

