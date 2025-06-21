const express = require("express");
const { sendOtp, verifyOtp, logout } = require("../controllers/authController");

const router = express.Router();

router.post("/send-otp", sendOtp);
router.post("/verify-otp", verifyOtp);
router.post("/logout", logout);

module.exports = router;