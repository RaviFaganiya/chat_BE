const express = require("express")
const {
  createOrUpdateProfile,
  getCurrentUserProfile,
  getUserProfileById,
  getAllUsers,
  getUsers, // Add this new function for last messages
  updatePrivacySettings,
  deleteUserAccount,
  searchUsers,
  getUserProfile, // Additional helper function
} = require("../controllers/userController")
const authenticateUser = require("../middlewares/authenticateUser")
const { profileValidation, privacyValidation } = require("../middlewares/validation")

const router = express.Router()

// All routes require authentication
router.use(authenticateUser)

// Profile routes
router.get("/profile", getCurrentUserProfile)
router.put("/profile", profileValidation, createOrUpdateProfile)
router.get("/profile/:userId", getUserProfileById)

// Users routes
router.get("/users", getUsers) // Updated to use the new function with last messages
router.get("/all-users", getAllUsers) // Keep your existing function with a different route
router.get("/search", searchUsers)
router.get("/user/:userId", getUserProfile) // Additional route for getting single user

// Privacy settings
router.put("/privacy", privacyValidation, updatePrivacySettings)

// Account management
router.delete("/account", deleteUserAccount)

module.exports = router
