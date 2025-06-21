const express = require("express");
const { createUser, getAllUsers } = require("../controllers/userController");
const authenticateUser = require("../middlewares/authenticateUser");

const router = express.Router();

router.post("/create-user", authenticateUser, createUser); // Protected Route
router.get("/get-all-users", authenticateUser, getAllUsers); // Fetch All Users (Protected)

module.exports = router;