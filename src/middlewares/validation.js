const { body } = require("express-validator")

// Profile validation rules
const profileValidation = [
  body("name")
    .optional()
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage("Name must be between 2 and 50 characters")
    .matches(/^[a-zA-Z\s]+$/)
    .withMessage("Name can only contain letters and spaces"),

  body("email").optional().isEmail().normalizeEmail().withMessage("Please provide a valid email address"),

  body("mobileNumber")
    .optional()
    .custom((value) => {
      if (value && value.trim() !== "") {
        if (!/^[+]?[1-9][\d]{0,15}$/.test(value)) {
          throw new Error("Mobile number must be a valid format (e.g., +1234567890 or 1234567890)")
        }
      }
      return true
    }),

  body("birthdate")
    .optional()
    .isISO8601()
    .toDate()
    .custom((value) => {
      if (value) {
        const today = new Date()
        today.setHours(0, 0, 0, 0) // Set to start of day for accurate comparison

        if (value >= today) {
          throw new Error("Birthdate must be in the past")
        }

        // Check if birthdate is reasonable (not too far in the past)
        const hundredYearsAgo = new Date()
        hundredYearsAgo.setFullYear(hundredYearsAgo.getFullYear() - 120)

        if (value < hundredYearsAgo) {
          throw new Error("Please enter a valid birthdate")
        }
      }
      return true
    }),

  body("bio").optional().trim().isLength({ max: 500 }).withMessage("Bio cannot exceed 500 characters"),

  body("location").optional().trim().isLength({ max: 100 }).withMessage("Location cannot exceed 100 characters"),

  body("profilePic")
    .optional()
    .custom((value) => {
      if (value && value.trim() !== "") {
        // Allow both URLs and local file paths
        const urlPattern = /^(https?:\/\/)|(\/)/
        if (!urlPattern.test(value)) {
          throw new Error("Profile picture must be a valid URL or file path")
        }
      }
      return true
    }),
]

// Privacy settings validation
const privacyValidation = [
  body("showEmail").optional().isBoolean().withMessage("Email visibility setting must be true or false"),

  body("showMobile").optional().isBoolean().withMessage("Mobile visibility setting must be true or false"),

  body("showBirthdate").optional().isBoolean().withMessage("Birthdate visibility setting must be true or false"),
]

module.exports = {
  profileValidation,
  privacyValidation,
}
