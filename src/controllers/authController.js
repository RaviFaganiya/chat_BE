const User = require("../models/User");
const jwt = require("jsonwebtoken");
const sendEmail = require("../utils/mailer");

const OTP_LIMIT = 3; // Max OTP requests per user in 10 minutes
const OTP_BLOCK_TIME = 15 * 60 * 1000; // 15 minutes block after too many failed attempts
const OTP_ATTEMPT_LIMIT = 5; // Max failed OTP attempts before blocking
const OTP_EXPIRY_TIME = 5 * 60 * 1000; // OTP expiry time (5 minutes)

// Send OTP Function with Rate Limit
const sendOtp = async (req, res) => {
    const { email } = req.body;
    if (!email) return res.status(400).json({ message: "Email is required" });

    try {
        let user = await User.findOne({ email });

        if (user) {
            if (user.token) {
                const verifyCode = Math.floor(100000 + Math.random() * 900000).toString();
                user.otp = verifyCode;
                user.verifyCode = verifyCode;
                user.otpExpires = new Date(Date.now() + OTP_EXPIRY_TIME);
                await user.save();

                await sendEmail(
                    email,
                    "2-Step Verification Code",
                    `Your verification code is: ${verifyCode}. It will expire in 5 minutes.`
                );

                return res.status(403).json({
                    message: "User already exists and is logged in. 2-step verification required.",
                    verifyCode 
                });
            }

            const now = Date.now();
            if (
                user.otpRequestedAt &&
                now - user.otpRequestedAt < 10 * 60 * 1000 &&
                user.otpRequestCount >= OTP_LIMIT
            ) {
                return res.status(429).json({
                    message: "Too many OTP requests. Please wait before trying again."
                });
            }

            if (!user.otpRequestedAt || now - user.otpRequestedAt > 10 * 60 * 1000) {
                user.otpRequestCount = 0;
                user.otpRequestedAt = now;
            }

            user.otpRequestCount += 1;
        } else {
            user = new User({ email, otpRequestCount: 1, otpRequestedAt: Date.now() });
        }

        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        user.otp = otp;
        user.otpExpires = new Date(Date.now() + OTP_EXPIRY_TIME);
        await user.save();

        await sendEmail(
            email,
            "Your OTP Code",
            `Your OTP is: ${otp}. It will expire in 5 minutes.`
        );

        res.json({ message: "OTP sent successfully", otp }); // ⚠️ Remove `otp` in production

    } catch (error) {
        res.status(500).json({ message: "Error sending OTP", error });
    }
};

// Verify OTP with Brute Force Prevention
const verifyOtp = async (req, res) => {
    const { email, otp } = req.body;
    if (!email || !otp) return res.status(400).json({ message: "Email and OTP are required" });

    try {
        let user = await User.findOne({ email });

        if (!user) {
            return res.status(400).json({ message: "User not found" });
        }

        const now = Date.now();

        if (
            user.otpFailedAttempts >= OTP_ATTEMPT_LIMIT &&
            user.otpBlockedUntil &&
            now < user.otpBlockedUntil
        ) {
            return res.status(403).json({ message: "Too many failed attempts. Please try again later." });
        }

        if (user.otp !== otp || user.otpExpires < now) {
            user.otpFailedAttempts = (user.otpFailedAttempts || 0) + 1;

            if (user.otpFailedAttempts >= OTP_ATTEMPT_LIMIT) {
                user.otpBlockedUntil = now + OTP_BLOCK_TIME;
            }

            await user.save();
            return res.status(400).json({ message: "Invalid or expired OTP" });
        }

        user.otp = undefined;
        user.otpExpires = undefined;
        user.otpFailedAttempts = 0;
        user.otpBlockedUntil = undefined;
        user.verifyCode = undefined;

        const token = jwt.sign({ userId: user._id, email: user.email }, process.env.JWT_SECRET, {
            expiresIn: "7d"
        });

        user.token = token;
        await user.save();

        res.json({ message: "OTP verified successfully", user, token });
    } catch (error) {
        res.status(500).json({ message: "Error verifying OTP", error });
    }
};

// Logout Function
const logout = async (req, res) => {
    const { email } = req.body;
    if (!email) return res.status(400).json({ message: "Email is required" });

    try {
        let user = await User.findOne({ email });

        if (!user) {
            return res.status(400).json({ message: "User not found" });
        }

        user.token = null;
        await user.save();

        res.json({ message: "Logout successful" });
    } catch (error) {
        res.status(500).json({ message: "Error logging out", error });
    }
};

module.exports = { sendOtp, verifyOtp, logout };