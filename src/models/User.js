const mongoose = require("mongoose")

const userSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    name: {
      type: String,
      required: true,
      default: "Guest User",
      trim: true,
    },
    profilePic: {
      type: String,
      default:
        "https://static.vecteezy.com/system/resources/thumbnails/009/734/564/small/default-avatar-profile-icon-of-social-media-user-vector.jpg",
    },
    mobileNumber: {
      type: String,
      trim: true,
      validate: {
        validator: (v) => !v || /^[+]?[1-9][\d]{0,15}$/.test(v),
        message: "Please enter a valid mobile number",
      },
    },
    birthdate: {
      type: Date,
      validate: {
        validator: (v) => !v || v < new Date(),
        message: "Birthdate cannot be in the future",
      },
    },
    bio: {
      type: String,
      maxlength: 500,
      trim: true,
    },
    location: {
      type: String,
      trim: true,
    },
    isProfileComplete: {
      type: Boolean,
      default: false,
    },
    token: { type: String },

    // OTP and verification fields
    otp: { type: String },
    otpExpires: { type: Date },
    verifyCode: { type: String, default: null },

    // Rate limiting and security fields
    otpRequestCount: { type: Number, default: 0 },
    otpRequestedAt: { type: Date },
    otpFailedAttempts: { type: Number, default: 0 },
    otpBlockedUntil: { type: Date },

    // Profile settings
    isOnline: { type: Boolean, default: false },
    lastSeen: { type: Date, default: Date.now },
    privacy: {
      showEmail: { type: Boolean, default: false },
      showMobile: { type: Boolean, default: false },
      showBirthdate: { type: Boolean, default: true },
    },
  },
  {
    timestamps: true,
  },
)

// Index for better query performance
userSchema.index({ email: 1 })
userSchema.index({ mobileNumber: 1 })

// Virtual for age calculation
userSchema.virtual("age").get(function () {
  if (!this.birthdate) return null
  const today = new Date()
  const birthDate = new Date(this.birthdate)
  let age = today.getFullYear() - birthDate.getFullYear()
  const monthDiff = today.getMonth() - birthDate.getMonth()
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--
  }
  return age
})

// Method to check if profile is complete
userSchema.methods.checkProfileComplete = function () {
  const requiredFields = ["name", "email"]
  const isComplete = requiredFields.every((field) => this[field] && this[field].trim() !== "")
  this.isProfileComplete = isComplete
  return isComplete
}

// Method to get public profile
userSchema.methods.getPublicProfile = function () {
  const profile = {
    _id: this._id,
    name: this.name,
    profilePic: this.profilePic,
    bio: this.bio,
    location: this.location,
    isOnline: this.isOnline,
    lastSeen: this.lastSeen,
    age: this.age,
  }

  // Add fields based on privacy settings
  if (this.privacy.showEmail) profile.email = this.email
  if (this.privacy.showMobile) profile.mobileNumber = this.mobileNumber
  if (this.privacy.showBirthdate) profile.birthdate = this.birthdate

  return profile
}

const User = mongoose.model("User", userSchema)

module.exports = User
