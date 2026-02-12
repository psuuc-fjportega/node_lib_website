const User = require("../models/User");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");



exports.register = async (req, res) => {
  const { username, password, role, secretCode } = req.body;
  try {
    // validate secret code for admin/librarian
    if (role === "ADMIN" && secretCode !== process.env.ADMIN_SECRET)
      return res.status(403).json({ message: "Invalid admin code" });
    if (role === "LIBRARIAN" && secretCode !== process.env.LIBRARIAN_SECRET)
      return res.status(403).json({ message: "Invalid librarian code" });

    const hashed = await bcrypt.hash(password, 10);
    const user = await User.create({ username, password: hashed, role: role || "MEMBER" });

    res.json({ message: "User registered", userId: user._id });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

exports.login = async (req, res) => {
  const { username, password } = req.body;
  try {
    const user = await User.findOne({ username });
    if (!user) return res.status(400).json({ message: "User not found" });

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) return res.status(400).json({ message: "Invalid password" });

    const token = jwt.sign(
      { userId: user._id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: "1d" }
    );

    res.json({ token, role: user.role }); // ✅ must return token and role
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
