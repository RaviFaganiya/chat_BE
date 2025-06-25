const express = require("express")
const { fetchMessage, getLastMessages } = require("../controllers/chatController")
const authenticateUser = require("../middlewares/authenticateUser")

const router = express.Router()

router.get("/message/:userId", authenticateUser, fetchMessage)
router.get("/last-messages", authenticateUser, getLastMessages)

module.exports = router
