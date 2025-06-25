const Message = require("../models/Message")

const fetchMessage = async (req, res) => {
  try {
    const currentUserId = req.user._id
    const otherUserId = req.params.userId

    const messages = await Message.find({
      $or: [
        { fromUserId: currentUserId, toUserId: otherUserId },
        { fromUserId: otherUserId, toUserId: currentUserId },
      ],
    }).sort({ timestamp: 1 }) // ascending order

    res.status(200).json(messages)
  } catch (err) {
    console.error("Error fetching messages:", err)
    res.status(500).json({ message: "Server error fetching messages" })
  }
}

// New function to get last messages for all conversations
const getLastMessages = async (req, res) => {
  try {
    const currentUserId = req.user._id

    // Get all unique conversation partners
    const conversations = await Message.aggregate([
      {
        $match: {
          $or: [{ fromUserId: currentUserId }, { toUserId: currentUserId }],
        },
      },
      {
        $addFields: {
          otherUserId: {
            $cond: {
              if: { $eq: ["$fromUserId", currentUserId] },
              then: "$toUserId",
              else: "$fromUserId",
            },
          },
        },
      },
      {
        $sort: { timestamp: -1 },
      },
      {
        $group: {
          _id: "$otherUserId",
          lastMessage: { $first: "$$ROOT" },
          unreadCount: {
            $sum: {
              $cond: [
                {
                  $and: [{ $eq: ["$toUserId", currentUserId] }, { $eq: ["$isRead", false] }],
                },
                1,
                0,
              ],
            },
          },
        },
      },
    ])

    // Format the response
    const lastMessages = conversations.map((conv) => ({
      userId: conv._id,
      content: conv.lastMessage.message,
      timestamp: conv.lastMessage.timestamp,
      unreadCount: conv.unreadCount,
      isFromCurrentUser: conv.lastMessage.fromUserId.toString() === currentUserId.toString(),
    }))

    res.status(200).json(lastMessages)
  } catch (err) {
    console.error("Error fetching last messages:", err)
    res.status(500).json({ message: "Server error fetching last messages" })
  }
}

// Make sure to export ALL functions
module.exports = {
  fetchMessage,
  getLastMessages,
}
