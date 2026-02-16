const jwt = require("jsonwebtoken");

const auth = (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    return res.status(401).json({ message: "No token provided" });
  }

  const parts = authHeader.split(" ");
  if (parts.length !== 2 || parts[0] !== "Bearer") {
    return res.status(401).json({ message: "Invalid token format" });
  }

  const token = parts[1];

  try {
    const verified = jwt.verify(token, process.env.JWT_SECRET);

    // ✅ Properly declare the variable
    const normalizedUserId =
      verified.userId || verified.id || verified._id;

    const normalizedRole =
      (verified.role || "").toUpperCase();

    req.user = {
      ...verified,
      userId: normalizedUserId,
      role: normalizedRole,
    };

    if (!req.user.userId) {
      return res.status(401).json({ message: "Invalid token payload (missing user id)" });
    }

    next();
  } catch (err) {
    console.error("Auth error:", err.message);
    return res.status(401).json({ message: "Invalid Token" });
  }
};

const adminOnly = (req, res, next) => {
  if (!req.user || req.user.role !== "ADMIN") {
    return res.status(403).json({ message: "Admins only" });
  }
  next();
};

const roleCheck = (roles) => (req, res, next) => {
  if (!req.user || !roles.includes(req.user.role)) {
    return res.status(403).json({ message: "Access denied" });
  }
  next();
};

module.exports = { auth, adminOnly, roleCheck };
