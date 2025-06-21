// // const jwt = require("jsonwebtoken");
// // const User = require("../models/User");
// // const Message = require("../models/Message");

// // const activeUsers = new Map();

// // const setupSocket = (io) => {

// //     io.use(async (socket, next) => {
// //         try {
// //             const token = socket.handshake.auth.token;
// //             const decoded = jwt.verify(token, process.env.JWT_SECRET);
// //             const user = await User.findById(decoded.userId);
// //             if (!user || user.token !== token) {
// //                 return next(new Error("Authentication error"));
// //             }
// //             socket.user = user;
// //             next();
// //         } catch (err) {
// //             return next(new Error("Authentication error"));
// //         }
// //     });

// //     io.on("connection", (socket) => {
// //         const userId = socket.user._id.toString();
// //         activeUsers.set(userId, socket.id);
// //         console.log(`${socket.user.name} connected`);

// //         // Check if specific user is online
// //         socket.on("check_user_online", ({ toUserId }, callback) => {
// //             const isOnline = activeUsers.has(toUserId);
// //             callback({ userId: toUserId, isOnline });
// //         });

// //         // Typing Event
// //         socket.on("typing", ({ toUserId }) => {
// //             const targetSocketId = activeUsers.get(toUserId);
// //             if (targetSocketId) {
// //                 io.to(targetSocketId).emit("user_typing", {
// //                     fromUserId: userId,
// //                     name: socket.user.name
// //                 });
// //             }
// //         });

// //         // Send Message with delivery status
// //         socket.on("send_message", async ({ toUserId, message }) => {
// //             try {
// //                 const isDelivered = activeUsers.has(toUserId);

// //                 const newMessage = new Message({
// //                     fromUserId: userId,
// //                     toUserId,
// //                     message,
// //                     timestamp: new Date(),
// //                     isDelivered,
// //                     isRead: false
// //                 });

// //                 await newMessage.save();

// //                 const targetSocketId = activeUsers.get(toUserId);
// //                 if (targetSocketId) {
// //                     io.to(targetSocketId).emit("receive_message", {
// //                         _id: newMessage._id,
// //                         fromUserId: userId,
// //                         message,
// //                         timestamp: newMessage.timestamp,
// //                         isDelivered: true,
// //                         isRead: false
// //                     });

// //                     // Also send back to sender with the correct ID
// //                     socket.emit("message_sent", {
// //                         _id: newMessage._id,
// //                         toUserId,
// //                         message,
// //                         timestamp: newMessage.timestamp,
// //                         isDelivered: true,
// //                         isRead: false
// //                     });
// //                 } else {
// //                     // If receiver is offline, still send back to sender with the correct ID
// //                     socket.emit("message_sent", {
// //                         _id: newMessage._id,
// //                         toUserId,
// //                         message,
// //                         timestamp: newMessage.timestamp,
// //                         isDelivered: false,
// //                         isRead: false
// //                     });
// //                 }
// //             } catch (err) {
// //                 console.error("Error saving message:", err);
// //             }
// //         });

// //         // Read Message Event
// //         socket.on("read_message", async ({ messageId }) => {
// //             try {
// //                 const updated = await Message.findByIdAndUpdate(
// //                     messageId,
// //                     { isRead: true },
// //                     { new: true }
// //                 );

// //                 const senderSocketId = activeUsers.get(updated.fromUserId);
// //                 if (senderSocketId) {
// //                     io.to(senderSocketId).emit("message_read_status", {
// //                         messageId: updated._id,
// //                         isRead: true
// //                     });
// //                 }
// //             } catch (error) {
// //                 console.error("Read message update failed:", error);
// //             }
// //         });

// //         // Disconnect Event
// //         socket.on("disconnect", () => {
// //             activeUsers.delete(userId);
// //             console.log(`${socket.user.name} disconnected`);
// //         });
// //     });

// // };

// // module.exports = { setupSocket };

// const jwt = require("jsonwebtoken");
// const User = require("../models/User");
// const Message = require("../models/Message");

// const activeUsers = new Map();

// const setupSocket = (io) => {
//     io.use(async (socket, next) => {
//         try {
//             const token = socket.handshake.auth.token;
//             const decoded = jwt.verify(token, process.env.JWT_SECRET);
//             const user = await User.findById(decoded.userId);
//             if (!user || user.token !== token) {
//                 return next(new Error("Authentication error"));
//             }
//             socket.user = user;
//             next();
//         } catch (err) {
//             return next(new Error("Authentication error"));
//         }
//     });

//     io.on("connection", (socket) => {
//         const userId = socket.user._id.toString();
//         activeUsers.set(userId, socket.id);
//         console.log(`${socket.user.name} connected`);

//         // Check if specific user is online
//         socket.on("check_user_online", ({ toUserId }, callback) => {
//             const isOnline = activeUsers.has(toUserId);
//             callback({ userId: toUserId, isOnline });
//         });

//         // Typing Event
//         socket.on("typing", ({ toUserId }) => {
//             const targetSocketId = activeUsers.get(toUserId);
//             if (targetSocketId) {
//                 io.to(targetSocketId).emit("user_typing", {
//                     fromUserId: userId,
//                     name: socket.user.name
//                 });
//             }
//         });

//         // Send Message with delivery status
//         socket.on("send_message", async ({ toUserId, message }) => {
//             try {
//                 const isDelivered = activeUsers.has(toUserId);

//                 const newMessage = new Message({
//                     fromUserId: userId,
//                     toUserId,
//                     message,
//                     timestamp: new Date(),
//                     isDelivered,
//                     isRead: false
//                 });

//                 await newMessage.save();

//                 // Send to receiver if online
//                 const targetSocketId = activeUsers.get(toUserId);
//                 if (targetSocketId) {
//                     io.to(targetSocketId).emit("receive_message", {
//                         _id: newMessage._id,
//                         fromUserId: userId,
//                         message,
//                         timestamp: newMessage.timestamp,
//                         isDelivered: true,
//                         isRead: false
//                     });
//                 }

//                 // Always send back to sender with correct ID and status
//                 socket.emit("message_sent", {
//                     _id: newMessage._id,
//                     toUserId,
//                     message,
//                     timestamp: newMessage.timestamp,
//                     isDelivered: !!targetSocketId,
//                     isRead: false
//                 });

//             } catch (err) {
//                 console.error("Error saving message:", err);
//             }
//         });

//         // Read Message Event - Enhanced with proper error handling
//         socket.on("read_message", async ({ messageId }) => {
//             try {
//                 const message = await Message.findById(messageId);
//                 if (!message) return;

//                 // Only update if not already read
//                 if (!message.isRead) {
//                     const updated = await Message.findByIdAndUpdate(
//                         messageId,
//                         { isRead: true },
//                         { new: true }
//                     );

//                     // Notify sender that their message was read
//                     const senderSocketId = activeUsers.get(updated.fromUserId);
//                     if (senderSocketId) {
//                         io.to(senderSocketId).emit("message_read_status", {
//                             messageId: updated._id,
//                             isRead: true
//                         });
//                     }
//                 }
//             } catch (error) {
//                 console.error("Read message update failed:", error);
//             }
//         });

//         // Disconnect Event
//         socket.on("disconnect", () => {
//             activeUsers.delete(userId);
//             console.log(`${socket.user.name} disconnected`);
//         });
//     });
// };

// module.exports = { setupSocket };






const jwt = require("jsonwebtoken")
const User = require("../models/User")
const Message = require("../models/Message")

const activeUsers = new Map()

const setupSocket = (io) => {
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth.token
      const decoded = jwt.verify(token, process.env.JWT_SECRET)
      const user = await User.findById(decoded.userId)
      if (!user || user.token !== token) {
        return next(new Error("Authentication error"))
      }
      socket.user = user
      next()
    } catch (err) {
      return next(new Error("Authentication error"))
    }
  })

  io.on("connection", (socket) => {
    const userId = socket.user._id.toString()
    activeUsers.set(userId, socket.id)
    console.log(`${socket.user.name} connected`)

    // Join room for private messaging
    socket.on("join_room", ({ roomId }) => {
      socket.join(roomId)
    })

    // Check if specific user is online
    socket.on("check_user_online", ({ toUserId }, callback) => {
      const isOnline = activeUsers.has(toUserId)
      callback({ userId: toUserId, isOnline })
    })

    // Typing Event
    socket.on("typing", ({ toUserId }) => {
      const targetSocketId = activeUsers.get(toUserId)
      if (targetSocketId) {
        io.to(targetSocketId).emit("user_typing", {
          fromUserId: userId,
          name: socket.user.name,
        })
      }
    })

    // Send Message with delivery status
    socket.on("send_message", async ({ toUserId, message }) => {
      try {
        const isDelivered = activeUsers.has(toUserId)

        const newMessage = new Message({
          fromUserId: userId,
          toUserId,
          message,
          timestamp: new Date(),
          isDelivered,
          isRead: false,
        })

        await newMessage.save()

        // Send to receiver if online
        const targetSocketId = activeUsers.get(toUserId)
        if (targetSocketId) {
          io.to(targetSocketId).emit("receive_message", {
            _id: newMessage._id,
            fromUserId: userId,
            message,
            timestamp: newMessage.timestamp,
            isDelivered: true,
            isRead: false,
          })
        }

        // Always send back to sender with correct ID and status
        socket.emit("message_sent", {
          _id: newMessage._id,
          toUserId,
          message,
          timestamp: newMessage.timestamp,
          isDelivered: !!targetSocketId,
          isRead: false,
        })
      } catch (err) {
        console.error("Error saving message:", err)
      }
    })

    // Read Message Event
    socket.on("read_message", async ({ messageId }) => {
      try {
        const message = await Message.findById(messageId)
        if (!message) return

        if (!message.isRead) {
          const updated = await Message.findByIdAndUpdate(messageId, { isRead: true }, { new: true })

          const senderSocketId = activeUsers.get(updated.fromUserId)
          if (senderSocketId) {
            io.to(senderSocketId).emit("message_read_status", {
              messageId: updated._id,
              isRead: true,
            })
          }
        }
      } catch (error) {
        console.error("Read message update failed:", error)
      }
    })

    // ============ CALL EVENTS ============

    // Call Offer (Initiating a call)
    socket.on("call_offer", ({ toUserId, offer, isVideo }) => {
      const targetSocketId = activeUsers.get(toUserId)
      if (targetSocketId) {
        io.to(targetSocketId).emit("call_offer", {
          fromUserId: userId,
          offer,
          isVideo,
          callerName: socket.user.name,
        })
      }
    })

    // Call Answer (Accepting a call)
    socket.on("call_answer", ({ toUserId, answer }) => {
      const targetSocketId = activeUsers.get(toUserId)
      if (targetSocketId) {
        io.to(targetSocketId).emit("call_answer", {
          fromUserId: userId,
          answer,
        })
      }
    })

    // Call Accepted
    socket.on("call_accepted", ({ toUserId }) => {
      const targetSocketId = activeUsers.get(toUserId)
      if (targetSocketId) {
        io.to(targetSocketId).emit("call_accepted", {
          fromUserId: userId,
        })
      }
    })

    // Call Rejected
    socket.on("call_rejected", ({ toUserId }) => {
      const targetSocketId = activeUsers.get(toUserId)
      if (targetSocketId) {
        io.to(targetSocketId).emit("call_rejected", {
          fromUserId: userId,
        })
      }
    })

    // Call Ended
    socket.on("call_ended", ({ toUserId }) => {
      const targetSocketId = activeUsers.get(toUserId)
      if (targetSocketId) {
        io.to(targetSocketId).emit("call_ended", {
          fromUserId: userId,
        })
      }
    })

    // ICE Candidate Exchange
    socket.on("ice_candidate", ({ toUserId, candidate }) => {
      const targetSocketId = activeUsers.get(toUserId)
      if (targetSocketId) {
        io.to(targetSocketId).emit("ice_candidate", {
          fromUserId: userId,
          candidate,
        })
      }
    })

    // Incoming Call Notification
    socket.on("incoming_call", ({ toUserId, isVideo }) => {
      const targetSocketId = activeUsers.get(toUserId)
      if (targetSocketId) {
        io.to(targetSocketId).emit("incoming_call", {
          fromUserId: userId,
          isVideo,
          callerName: socket.user.name,
        })
      }
    })

    // Disconnect Event
    socket.on("disconnect", () => {
      activeUsers.delete(userId)
      console.log(`${socket.user.name} disconnected`)

      // Notify all connected users that this user went offline
      socket.broadcast.emit("user_offline", {
        userId: userId,
      })
    })
  })
}

module.exports = { setupSocket }
