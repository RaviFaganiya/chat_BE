const express = require("express");
const { fetchMessage } = require("../controllers/chatController");
const authenticateUser = require("../middlewares/authenticateUser");

const router = express.Router();

router.get("/message/:userId", authenticateUser, fetchMessage);

module.exports = router;