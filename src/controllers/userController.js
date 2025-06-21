const User = require("../models/User");

const createUser = async (req, res) => {
    const { name, profilePic } = req.body;
    if (!name) return res.status(400).json({ message: "Name is required" });

    try {
        let user = await User.findById(req.user._id);
        if (!user) return res.status(404).json({ message: "User not found" });

        user.name = name;
        if (profilePic) user.profilePic = profilePic;
        await user.save();

        res.json({ message: "User profile updated successfully", user });
    } catch (error) {
        res.status(500).json({ message: "Error updating user profile", error });
    }
};

const getAllUsers = async (req, res) => {
    try {
        const currentUserId = req.user._id;

        // Get current user data
        const currentUser = await User.findById(currentUserId, "_id name profilePic");

        // Get all other users
        const otherUsers = await User.find(
            { _id: { $ne: currentUserId } },
            "_id name profilePic"
        );

        res.json({
            success: true,
            currentUser,
            otherUsers
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: "Error fetching users",
            error
        });
    }
};

module.exports = { createUser, getAllUsers };