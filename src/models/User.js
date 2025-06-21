const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
    email: { type: String, required: true, unique: true },
    name: { type: String, required: true, default: "Guest User" },
    profilePic: {
        type: String,
        default: "https://static.vecteezy.com/system/resources/thumbnails/009/734/564/small/default-avatar-profile-icon-of-social-media-user-vector.jpg"
    },
    token: { type: String },

    otp: { type: String },
    otpExpires: { type: Date },
    verifyCode: { type: String, default: null },

    // New fields for rate limiting and security
    otpRequestCount: { type: Number, default: 0 },
    otpRequestedAt: { type: Date },
    otpFailedAttempts: { type: Number, default: 0 },
    otpBlockedUntil: { type: Date }
});

const User = mongoose.model("User", userSchema);

module.exports = User;