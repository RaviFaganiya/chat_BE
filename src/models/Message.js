// const mongoose = require("mongoose");

// const messageSchema = new mongoose.Schema({
//   fromUserId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
//   toUserId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
//   message: { type: String, required: true },
//   timestamp: { type: Date, default: Date.now },
//   isDelivered: { type: Boolean, default: false },
//   isRead: { type: Boolean, default: false },
// });

// module.exports = mongoose.model("Message", messageSchema);


const mongoose = require("mongoose")

const messageSchema = new mongoose.Schema({
  fromUserId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  toUserId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  message: {
    type: String,
    required: true,
  },
  timestamp: {
    type: Date,
    default: Date.now,
  },
  isDelivered: {
    type: Boolean,
    default: false,
  },
  isRead: {
    type: Boolean,
    default: false,
  },
  readBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
  },
  messageType: {
    type: String,
    enum: ["text", "call_log"],
    default: "text",
  },
  callData: {
    duration: Number,
    callType: {
      type: String,
      enum: ["voice", "video"],
    },
    callStatus: {
      type: String,
      enum: ["completed", "missed", "rejected"],
    },
  },
})

const Message = mongoose.model("Message", messageSchema)

module.exports = Message
