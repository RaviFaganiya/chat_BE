const express = require("express")
const { uploadProfilePicture, deleteUploadedFile } = require("../controllers/uploadController")
const authenticateUser = require("../middlewares/authenticateUser")
const upload = require("../utils/imageUpload")

const router = express.Router()

// All routes require authentication
router.use(authenticateUser)

// Upload profile picture
router.post("/profile-picture", upload.single("profilePic"), uploadProfilePicture)

// Delete uploaded file
router.delete("/file/:filename", deleteUploadedFile)

module.exports = router
