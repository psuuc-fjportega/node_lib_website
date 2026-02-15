const router = require("express").Router();
const { auth, roleCheck } = require("../middleware/auth.middleware");
const { 
    createReservation, 
    getMyReservations, 
    cancelReservation 
} = require("../controllers/reservation.controller");

// All roles routes
router.post("/", auth, roleCheck(["MEMBER", "LIBRARIAN", "ADMIN"]), createReservation);
router.get("/my", auth, roleCheck(["MEMBER", "LIBRARIAN", "ADMIN"]), getMyReservations);
router.put("/cancel/:id", auth, roleCheck(["MEMBER", "LIBRARIAN", "ADMIN"]), cancelReservation);

module.exports = router;
