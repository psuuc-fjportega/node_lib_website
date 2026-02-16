const User = require("../models/User");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const { logActivity } = require("../utils/logger");

exports.register = async (req, res) => {
  const { username, password, role, secretCode } = req.body;

  try {
    // validate secret code for admin/librarian
    if (role === "ADMIN" && secretCode !== process.env.ADMIN_SECRET)
      return res.status(403).json({ message: "Invalid admin code" });
    if (role === "LIBRARIAN" && secretCode !== process.env.LIBRARIAN_SECRET)
      return res.status(403).json({ message: "Invalid librarian code" });

    const hashed = await bcrypt.hash(password, 10);
const normalizedRole = (role || "MEMBER").toUpperCase();
const user = await User.create({ username, password: hashed, role: normalizedRole });


    await logActivity(req, "USER_REGISTER", `Registered user: ${username} (${user.role})`);

    res.json({ message: "User registered", userId: user._id.toString() });
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

    // Check if deleted
    if (user.isDeleted) return res.status(403).json({ message: "Account has been removed" });

    // Check if active
    if (user.isActive === false) return res.status(403).json({ message: "Account disabled" });

    // ✅ Always stringify userId in token for consistency
    const payload = {
      userId: user._id.toString(),
      role: user.role,
      username: user.username,
    };

    const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: "1d" });

    // For logging
    req.user = { userId: payload.userId, role: payload.role };
    await logActivity(req, "USER_LOGIN", `User logged in: ${username}`);

    // ✅ Return username too (your frontend uses it everywhere)
    res.json({
      token,
      role: user.role,
      username: user.username,
      userId: payload.userId,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
