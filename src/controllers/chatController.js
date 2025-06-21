const Message = require("../models/Message");

const fetchMessage = async (req, res) => {
    try {
        const currentUserId = req.user._id;
        const otherUserId = req.params.userId;

        const messages = await Message.find({
            $or: [
                { fromUserId: currentUserId, toUserId: otherUserId },
                { fromUserId: otherUserId, toUserId: currentUserId },
            ],
        }).sort({ timestamp: 1 }); // ascending order

        res.status(200).json(messages);
    } catch (err) {
        console.error("Error fetching messages:", err);
        res.status(500).json({ message: "Server error fetching messages" });
    }
}

module.exports = { fetchMessage };
