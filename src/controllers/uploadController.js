const path = require("path")
const fs = require("fs")

// Upload profile picture
const uploadProfilePicture = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "No file uploaded",
      })
    }

    // Generate URL for the uploaded file
    const fileUrl = `/uploads/profiles/${req.file.filename}`

    res.json({
      success: true,
      message: "Profile picture uploaded successfully",
      imageUrl: fileUrl,
      filename: req.file.filename,
    })
  } catch (error) {
    console.error("Upload error:", error)
    res.status(500).json({
      success: false,
      message: "Error uploading file",
      error: error.message,
    })
  }
}

// Delete uploaded file
const deleteUploadedFile = async (req, res) => {
  try {
    const { filename } = req.params
    const filePath = path.join(__dirname, "../../uploads/profiles", filename)

    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath)
      res.json({
        success: true,
        message: "File deleted successfully",
      })
    } else {
      res.status(404).json({
        success: false,
        message: "File not found",
      })
    }
  } catch (error) {
    console.error("Delete file error:", error)
    res.status(500).json({
      success: false,
      message: "Error deleting file",
      error: error.message,
    })
  }
}

module.exports = {
  uploadProfilePicture,
  deleteUploadedFile,
}
