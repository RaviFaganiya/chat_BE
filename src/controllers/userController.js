const User = require("../models/User")
const Message = require("../models/Message")
const { validationResult } = require("express-validator")

// Get Users with Last Messages and Unread Count (Fixed implementation)
const getUsers = async (req, res) => {
  try {
    const currentUserId = req.user._id

    // Get all users except current user
    const users = await User.find({ _id: { $ne: currentUserId } })
      .select("name email profilePic isOnline lastSeen bio location")
      .lean()

    // Get last messages and unread counts for each user
    const usersWithLastMessages = await Promise.all(
      users.map(async (user) => {
        // Get the last message between current user and this user
        const lastMessage = await Message.findOne({
          $or: [
            { fromUserId: currentUserId, toUserId: user._id },
            { fromUserId: user._id, toUserId: currentUserId },
          ],
        })
          .sort({ timestamp: -1 })
          .lean()

        // Count ONLY unread messages FROM this user TO current user
        const unreadCount = await Message.countDocuments({
          fromUserId: user._id,
          toUserId: currentUserId,
          isRead: false,
        })

        console.log(`User ${user.name} - Unread count: ${unreadCount}`) // Debug log

        return {
          ...user,
          lastMessage: lastMessage
            ? {
                content: lastMessage.message,
                timestamp: lastMessage.timestamp,
                unreadCount: unreadCount,
                isFromCurrentUser: lastMessage.fromUserId.toString() === currentUserId.toString(),
              }
            : {
                content: null,
                timestamp: null,
                unreadCount: unreadCount,
                isFromCurrentUser: false,
              },
        }
      }),
    )

    // Sort users by last message timestamp (most recent first)
    usersWithLastMessages.sort((a, b) => {
      const aTime = a.lastMessage?.timestamp || new Date(0)
      const bTime = b.lastMessage?.timestamp || new Date(0)
      return new Date(bTime) - new Date(aTime)
    })

    const currentUser = await User.findById(currentUserId).select("name email profilePic").lean()

    res.status(200).json({
      success: true,
      currentUser,
      users: usersWithLastMessages,
    })
  } catch (err) {
    console.error("Error fetching users:", err)
    res.status(500).json({
      success: false,
      message: "Server error fetching users",
    })
  }
}

// Mark messages as read when user opens a chat (Fixed implementation)
const markMessagesAsRead = async (req, res) => {
  try {
    const currentUserId = req.user._id
    const { fromUserId } = req.params

    console.log(`Marking messages as read from ${fromUserId} to ${currentUserId}`) // Debug log

    // Mark all unread messages from the specific user as read
    const result = await Message.updateMany(
      {
        fromUserId: fromUserId,
        toUserId: currentUserId,
        isRead: false,
      },
      {
        $set: {
          isRead: true,
          readAt: new Date(),
        },
      },
    )

    console.log(`Marked ${result.modifiedCount} messages as read`) // Debug log

    res.status(200).json({
      success: true,
      message: "Messages marked as read",
      modifiedCount: result.modifiedCount,
    })
  } catch (error) {
    console.error("Error marking messages as read:", error)
    res.status(500).json({
      success: false,
      message: "Error marking messages as read",
      error: error.message,
    })
  }
}

// Get unread count for a specific user
const getUnreadCount = async (req, res) => {
  try {
    const currentUserId = req.user._id
    const { fromUserId } = req.params

    const unreadCount = await Message.countDocuments({
      fromUserId: fromUserId,
      toUserId: currentUserId,
      isRead: false,
    })

    console.log(`Unread count from ${fromUserId} to ${currentUserId}: ${unreadCount}`) // Debug log

    res.status(200).json({
      success: true,
      unreadCount,
    })
  } catch (error) {
    console.error("Error getting unread count:", error)
    res.status(500).json({
      success: false,
      message: "Error getting unread count",
      error: error.message,
    })
  }
}

// Other existing functions...
const createOrUpdateProfile = async (req, res) => {
  try {
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: "Validation errors",
        errors: errors.array().map((error) => ({
          field: error.path || error.param,
          message: error.msg,
          value: error.value,
        })),
      })
    }

    const { name, profilePic, mobileNumber, birthdate, bio, location } = req.body
    const userId = req.user._id

    const user = await User.findById(userId)
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      })
    }

    // Update user fields only if they are provided
    if (name !== undefined) user.name = name.trim()
    if (profilePic !== undefined) user.profilePic = profilePic
    if (mobileNumber !== undefined) {
      user.mobileNumber = mobileNumber.trim() === "" ? undefined : mobileNumber.trim()
    }
    if (birthdate !== undefined) {
      user.birthdate = birthdate ? new Date(birthdate) : undefined
    }
    if (bio !== undefined) user.bio = bio.trim() === "" ? undefined : bio.trim()
    if (location !== undefined) user.location = location.trim() === "" ? undefined : location.trim()

    // Check if profile is complete (if this method exists in your User model)
    if (typeof user.checkProfileComplete === "function") {
      user.checkProfileComplete()
    }

    await user.save()

    res.json({
      success: true,
      message: "Profile updated successfully",
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        profilePic: user.profilePic,
        mobileNumber: user.mobileNumber,
        birthdate: user.birthdate,
        bio: user.bio,
        location: user.location,
        isProfileComplete: user.isProfileComplete,
        age: user.age,
        privacy: user.privacy,
      },
    })
  } catch (error) {
    console.error("Profile update error:", error)

    // Handle mongoose validation errors
    if (error.name === "ValidationError") {
      const validationErrors = Object.values(error.errors).map((err) => ({
        field: err.path,
        message: err.message,
        value: err.value,
      }))

      return res.status(400).json({
        success: false,
        message: "Validation errors",
        errors: validationErrors,
      })
    }

    res.status(500).json({
      success: false,
      message: "Error updating profile",
      error: error.message,
    })
  }
}

const getCurrentUserProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select(
      "-token -otp -otpExpires -verifyCode -otpRequestCount -otpRequestedAt -otpFailedAttempts -otpBlockedUntil",
    )

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      })
    }

    res.json({
      success: true,
      user: {
        ...user.toObject(),
        age: user.age,
      },
    })
  } catch (error) {
    console.error("Get profile error:", error)
    res.status(500).json({
      success: false,
      message: "Error fetching profile",
      error: error.message,
    })
  }
}

const getUserProfileById = async (req, res) => {
  try {
    const { userId } = req.params

    const user = await User.findById(userId).select(
      "-token -otp -otpExpires -verifyCode -otpRequestCount -otpRequestedAt -otpFailedAttempts -otpBlockedUntil",
    )

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      })
    }

    // Return public profile based on privacy settings (if this method exists)
    let publicProfile
    if (typeof user.getPublicProfile === "function") {
      publicProfile = user.getPublicProfile()
    } else {
      // Fallback if getPublicProfile method doesn't exist
      publicProfile = {
        _id: user._id,
        name: user.name,
        profilePic: user.profilePic,
        bio: user.bio,
        location: user.location,
        isOnline: user.isOnline,
        lastSeen: user.lastSeen,
      }
    }

    res.json({
      success: true,
      user: publicProfile,
    })
  } catch (error) {
    console.error("Get user profile error:", error)
    res.status(500).json({
      success: false,
      message: "Error fetching user profile",
      error: error.message,
    })
  }
}

const getAllUsers = async (req, res) => {
  try {
    const currentUserId = req.user._id
    const page = Number.parseInt(req.query.page) || 1
    const limit = Number.parseInt(req.query.limit) || 10
    const search = req.query.search || ""
    const skip = (page - 1) * limit

    // Build search query
    const searchQuery = { _id: { $ne: currentUserId } }
    if (search) {
      searchQuery.$or = [{ name: { $regex: search, $options: "i" } }, { email: { $regex: search, $options: "i" } }]
    }

    // Get current user data
    const currentUser = await User.findById(currentUserId).select(
      "_id name email profilePic bio location isOnline lastSeen",
    )

    // Get other users with pagination
    const otherUsers = await User.find(searchQuery)
      .select("_id name profilePic bio location isOnline lastSeen")
      .sort({ name: 1 })
      .skip(skip)
      .limit(limit)

    // Get total count for pagination
    const totalUsers = await User.countDocuments(searchQuery)
    const totalPages = Math.ceil(totalUsers / limit)

    res.json({
      success: true,
      currentUser,
      users: otherUsers,
      pagination: {
        currentPage: page,
        totalPages,
        totalUsers,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1,
      },
    })
  } catch (error) {
    console.error("Get all users error:", error)
    res.status(500).json({
      success: false,
      message: "Error fetching users",
      error: error.message,
    })
  }
}

const updatePrivacySettings = async (req, res) => {
  try {
    const { showEmail, showMobile, showBirthdate } = req.body
    const userId = req.user._id

    const user = await User.findById(userId)
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      })
    }

    // Initialize privacy object if it doesn't exist
    if (!user.privacy) {
      user.privacy = {}
    }

    // Update privacy settings
    if (showEmail !== undefined) user.privacy.showEmail = showEmail
    if (showMobile !== undefined) user.privacy.showMobile = showMobile
    if (showBirthdate !== undefined) user.privacy.showBirthdate = showBirthdate

    await user.save()

    res.json({
      success: true,
      message: "Privacy settings updated successfully",
      privacy: user.privacy,
    })
  } catch (error) {
    console.error("Privacy update error:", error)
    res.status(500).json({
      success: false,
      message: "Error updating privacy settings",
      error: error.message,
    })
  }
}

const deleteUserAccount = async (req, res) => {
  try {
    const userId = req.user._id

    await User.findByIdAndDelete(userId)

    res.json({
      success: true,
      message: "Account deleted successfully",
    })
  } catch (error) {
    console.error("Delete account error:", error)
    res.status(500).json({
      success: false,
      message: "Error deleting account",
      error: error.message,
    })
  }
}

const searchUsers = async (req, res) => {
  try {
    const { query } = req.query
    const currentUserId = req.user._id

    if (!query || query.trim() === "") {
      return res.status(400).json({
        success: false,
        message: "Search query is required",
      })
    }

    const users = await User.find({
      _id: { $ne: currentUserId },
      $or: [{ name: { $regex: query, $options: "i" } }, { email: { $regex: query, $options: "i" } }],
    })
      .select("_id name profilePic bio location isOnline")
      .limit(20)

    res.json({
      success: true,
      users,
      count: users.length,
    })
  } catch (error) {
    console.error("Search users error:", error)
    res.status(500).json({
      success: false,
      message: "Error searching users",
      error: error.message,
    })
  }
}

const getUserProfile = async (req, res) => {
  try {
    const userId = req.params.userId
    const user = await User.findById(userId).select("name email profilePic isOnline lastSeen bio location").lean()

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      })
    }

    res.status(200).json({
      success: true,
      user,
    })
  } catch (err) {
    console.error("Error fetching user profile:", err)
    res.status(500).json({
      success: false,
      message: "Server error fetching user profile",
    })
  }
}

module.exports = {
  createOrUpdateProfile,
  getCurrentUserProfile,
  getUserProfileById,
  getAllUsers,
  getUsers,
  markMessagesAsRead,
  getUnreadCount,
  updatePrivacySettings,
  deleteUserAccount,
  searchUsers,
  getUserProfile,
}
