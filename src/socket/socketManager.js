// const jwt = require("jsonwebtoken")
// const User = require("../models/User")
// const Message = require("../models/Message")

// const activeUsers = new Map()

// const setupSocket = (io) => {
//   io.use(async (socket, next) => {
//     try {
//       const token = socket.handshake.auth.token
//       const decoded = jwt.verify(token, process.env.JWT_SECRET)
//       const user = await User.findById(decoded.userId)
//       if (!user || user.token !== token) {
//         return next(new Error("Authentication error"))
//       }
//       socket.user = user
//       next()
//     } catch (err) {
//       return next(new Error("Authentication error"))
//     }
//   })

//   io.on("connection", (socket) => {
//     const userId = socket.user._id.toString()
//     activeUsers.set(userId, socket.id)
//     console.log(`${socket.user.name} connected`)

//     // Update user online status
//     User.findByIdAndUpdate(userId, { isOnline: true }).exec()

//     // Notify all users that this user is online
//     socket.broadcast.emit("user_online", {
//       userId: userId,
//       name: socket.user.name,
//     })

//     // Join room for private messaging
//     socket.on("join_room", ({ roomId }) => {
//       socket.join(roomId)
//     })

//     // Check if specific user is online
//     socket.on("check_user_online", ({ toUserId }, callback) => {
//       const isOnline = activeUsers.has(toUserId)
//       callback({ userId: toUserId, isOnline })
//     })

//     // Typing Event
//     socket.on("typing", ({ toUserId }) => {
//       const targetSocketId = activeUsers.get(toUserId)
//       if (targetSocketId) {
//         io.to(targetSocketId).emit("user_typing", {
//           fromUserId: userId,
//           name: socket.user.name,
//         })
//       }
//     })

//     // Send Message with delivery status and unread count update
//     socket.on("send_message", async ({ toUserId, message }) => {
//       try {
//         const isDelivered = activeUsers.has(toUserId)

//         const newMessage = new Message({
//           fromUserId: userId,
//           toUserId,
//           message,
//           timestamp: new Date(),
//           isDelivered,
//           isRead: false,
//         })

//         await newMessage.save()
//         console.log(`Message saved: ${newMessage._id}`) // Debug log

//         // Send to receiver if online
//         const targetSocketId = activeUsers.get(toUserId)
//         if (targetSocketId) {
//           io.to(targetSocketId).emit("receive_message", {
//             _id: newMessage._id,
//             fromUserId: userId,
//             toUserId,
//             message,
//             timestamp: newMessage.timestamp,
//             isDelivered: true,
//             isRead: false,
//           })

//           // Get updated unread count for receiver
//           const unreadCount = await Message.countDocuments({
//             fromUserId: userId,
//             toUserId: toUserId,
//             isRead: false,
//           })

//           // console.log(`Unread count for receiver ${toUserId}: ${unreadCount}`) // Debug log

//           // Update last message for receiver's sidebar
//           io.to(targetSocketId).emit("last_message_update", {
//             userId: userId,
//             lastMessage: {
//               content: message,
//               timestamp: newMessage.timestamp,
//               unreadCount: unreadCount,
//               isFromCurrentUser: false,
//             },
//           })
//         }

//         // Always send back to sender with correct ID and status
//         socket.emit("message_sent", {
//           _id: newMessage._id,
//           toUserId,
//           message,
//           timestamp: newMessage.timestamp,
//           isDelivered: !!targetSocketId,
//           isRead: false,
//         })

//         // Update last message for sender's sidebar (no unread count for sender)
//         socket.emit("last_message_update", {
//           userId: toUserId,
//           lastMessage: {
//             content: message,
//             timestamp: newMessage.timestamp,
//             unreadCount: 0, // Sender doesn't have unread count for their own messages
//             isFromCurrentUser: true,
//           },
//         })
//       } catch (err) {
//         console.error("Error saving message:", err)
//       }
//     })

//     // Read Message Event - Enhanced to update unread counts
//     socket.on("read_message", async ({ messageId }) => {
//       try {
//         const message = await Message.findById(messageId)
//         if (!message) return

//         if (!message.isRead) {
//           const updated = await Message.findByIdAndUpdate(
//             messageId,
//             { isRead: true, readAt: new Date() },
//             { new: true },
//           )

//           const senderSocketId = activeUsers.get(updated.fromUserId.toString())
//           if (senderSocketId) {
//             io.to(senderSocketId).emit("message_read_status", {
//               messageId: updated._id,
//               isRead: true,
//             })
//           }

//           // Get updated unread count after marking as read
//           const unreadCount = await Message.countDocuments({
//             fromUserId: updated.fromUserId,
//             toUserId: updated.toUserId,
//             isRead: false,
//           })

//           console.log(`Updated unread count: ${unreadCount}`) // Debug log

//           // Update receiver's sidebar with new unread count
//           socket.emit("unread_count_update", {
//             userId: updated.fromUserId.toString(),
//             unreadCount: unreadCount,
//           })
//         }
//       } catch (error) {
//         console.error("Read message update failed:", error)
//       }
//     })

//     // Mark all messages from a user as read
//     socket.on("mark_all_read", async ({ fromUserId }) => {
//       try {
//         console.log(`Socket: Marking all messages as read from ${fromUserId} to ${userId}`) // Debug log

//         const result = await Message.updateMany(
//           {
//             fromUserId: fromUserId,
//             toUserId: userId,
//             isRead: false,
//           },
//           {
//             $set: {
//               isRead: true,
//               readAt: new Date(),
//             },
//           },
//         )

//         console.log(`Socket: Marked ${result.modifiedCount} messages as read`) // Debug log

//         if (result.modifiedCount > 0) {
//           // Notify sender that messages were read
//           const senderSocketId = activeUsers.get(fromUserId)
//           if (senderSocketId) {
//             io.to(senderSocketId).emit("messages_read_bulk", {
//               toUserId: userId,
//               count: result.modifiedCount,
//             })
//           }

//           // Update receiver's sidebar - unread count should now be 0
//           socket.emit("unread_count_update", {
//             userId: fromUserId,
//             unreadCount: 0,
//           })
//         }
//       } catch (error) {
//         console.error("Mark all read failed:", error)
//       }
//     })

//     // ============ CALL EVENTS ============

//     // Call Offer (Initiating a call)
//     socket.on("call_offer", ({ toUserId, offer, isVideo }) => {
//       const targetSocketId = activeUsers.get(toUserId)
//       if (targetSocketId) {
//         io.to(targetSocketId).emit("call_offer", {
//           fromUserId: userId,
//           offer,
//           isVideo,
//           callerName: socket.user.name,
//         })
//       }
//     })

//     // // Call Answer (Accepting a call)
//     // socket.on("call_answer", ({ toUserId, answer }) => {
//     //   const targetSocketId = activeUsers.get(toUserId)
//     //   if (targetSocketId) {
//     //     io.to(targetSocketId).emit("call_answer", {
//     //       fromUserId: userId,
//     //       answer,
//     //     })
//     //   }
//     // })

//     // // Call Accepted
//     // socket.on("call_accepted", ({ toUserId }) => {
//     //   const targetSocketId = activeUsers.get(toUserId)
//     //   if (targetSocketId) {
//     //     io.to(targetSocketId).emit("call_accepted", {
//     //       fromUserId: userId,
//     //     })
//     //   }
//     // })

//     // // Call Rejected
//     // socket.on("call_rejected", ({ toUserId }) => {
//     //   const targetSocketId = activeUsers.get(toUserId)
//     //   if (targetSocketId) {
//     //     io.to(targetSocketId).emit("call_rejected", {
//     //       fromUserId: userId,
//     //     })
//     //   }
//     // })

//     // // Call Ended
//     // socket.on("call_ended", ({ toUserId }) => {
//     //   const targetSocketId = activeUsers.get(toUserId)
//     //   if (targetSocketId) {
//     //     io.to(targetSocketId).emit("call_ended", {
//     //       fromUserId: userId,
//     //     })
//     //   }
//     // })

//       socket.on("initiate-call", ({ to, from, callType }) => {
//     const recipientSocketId = activeUsers.get(to)
//     if (recipientSocketId) {
//       io.to(recipientSocketId).emit("incoming-call", { from, callType })
//     } else {
//       socket.emit("call-failed", { reason: "User not available" })
//     }
//   })

//   socket.on("accept-call", ({ to, from }) => {
//     const callerSocketId = activeUsers.get(to)
//     if (callerSocketId) {
//       io.to(callerSocketId).emit("call-accepted", { from })
//     }
//   })

//   socket.on("reject-call", ({ to, from }) => {
//     const callerSocketId = activeUsers.get(to)
//     if (callerSocketId) {
//       io.to(callerSocketId).emit("call-rejected", { from })
//     }
//   })

//   socket.on("end-call", ({ to, from }) => {
//     const recipientSocketId = activeUsers.get(to)
//     if (recipientSocketId) {
//       io.to(recipientSocketId).emit("call-ended", { from })
//     }
//   })

//     socket.on("webrtc-offer", ({ to, offer }) => {
//     const recipientSocketId = activeUsers.get(to)
//     if (recipientSocketId) {
//       io.to(recipientSocketId).emit("webrtc-offer", {
//         offer,
//         from: socket.userId,
//       })
//     }
//   })

//   socket.on("webrtc-answer", ({ to, answer }) => {
//     const recipientSocketId = activeUsers.get(to)
//     if (recipientSocketId) {
//       io.to(recipientSocketId).emit("webrtc-answer", {
//         answer,
//         from: socket.userId,
//       })
//     }
//   })

//   socket.on("webrtc-ice-candidate", ({ to, candidate }) => {
//     const recipientSocketId = activeUsers.get(to)
//     if (recipientSocketId) {
//       io.to(recipientSocketId).emit("webrtc-ice-candidate", {
//         candidate,
//         from: socket.userId,
//       })
//     }
//   })

//     // ICE Candidate Exchange
//     socket.on("ice_candidate", ({ toUserId, candidate }) => {
//       const targetSocketId = activeUsers.get(toUserId)
//       if (targetSocketId) {
//         io.to(targetSocketId).emit("ice_candidate", {
//           fromUserId: userId,
//           candidate,
//         })
//       }
//     })

//     // Incoming Call Notification
//     socket.on("incoming_call", ({ toUserId, isVideo }) => {
//       const targetSocketId = activeUsers.get(toUserId)
//       if (targetSocketId) {
//         io.to(targetSocketId).emit("incoming_call", {
//           fromUserId: userId,
//           isVideo,
//           callerName: socket.user.name,
//         })
//       }
//     })

//     // Disconnect Event
//     socket.on("disconnect", async () => {
//       activeUsers.delete(userId)
//       console.log(`${socket.user.name} disconnected`)

//       // Update user offline status
//       await User.findByIdAndUpdate(userId, { isOnline: false })

//       // Notify all connected users that this user went offline
//       socket.broadcast.emit("user_offline", {
//         userId: userId,
//       })
//     })
//   })
// }

// module.exports = { setupSocket }


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
      socket.userId = user._id.toString()
      next()
    } catch (err) {
      return next(new Error("Authentication error"))
    }
  })

  io.on("connection", (socket) => {
    const userId = socket.userId
    activeUsers.set(userId, socket.id)
    console.log(`${socket.user.name} connected (${userId})`)

    // Update user online status
    User.findByIdAndUpdate(userId, { isOnline: true }).exec()

    // Notify all users that this user is online
    socket.broadcast.emit("user_online", {
      userId: userId,
      name: socket.user.name,
    })

    // Join room for private messaging
    socket.on("join_room", ({ roomId }) => {
      socket.join(roomId)
      console.log(`User ${userId} joined room ${roomId}`)
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

    // Send Message with delivery status and unread count update
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
        console.log(`Message saved: ${newMessage._id}`)

        // Send to receiver if online
        const targetSocketId = activeUsers.get(toUserId)
        if (targetSocketId) {
          io.to(targetSocketId).emit("receive_message", {
            _id: newMessage._id,
            fromUserId: userId,
            toUserId,
            message,
            timestamp: newMessage.timestamp,
            isDelivered: true,
            isRead: false,
          })

          // Get updated unread count for receiver
          const unreadCount = await Message.countDocuments({
            fromUserId: userId,
            toUserId: toUserId,
            isRead: false,
          })

          // Update last message for receiver's sidebar
          io.to(targetSocketId).emit("last_message_update", {
            userId: userId,
            lastMessage: {
              content: message,
              timestamp: newMessage.timestamp,
              unreadCount: unreadCount,
              isFromCurrentUser: false,
            },
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

        // Update last message for sender's sidebar
        socket.emit("last_message_update", {
          userId: toUserId,
          lastMessage: {
            content: message,
            timestamp: newMessage.timestamp,
            unreadCount: 0,
            isFromCurrentUser: true,
          },
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
          const updated = await Message.findByIdAndUpdate(
            messageId,
            { isRead: true, readAt: new Date() },
            { new: true },
          )

          const senderSocketId = activeUsers.get(updated.fromUserId.toString())
          if (senderSocketId) {
            io.to(senderSocketId).emit("message_read_status", {
              messageId: updated._id,
              isRead: true,
            })
          }

          // Get updated unread count after marking as read
          const unreadCount = await Message.countDocuments({
            fromUserId: updated.fromUserId,
            toUserId: updated.toUserId,
            isRead: false,
          })

          // Update receiver's sidebar with new unread count
          socket.emit("unread_count_update", {
            userId: updated.fromUserId.toString(),
            unreadCount: unreadCount,
          })
        }
      } catch (error) {
        console.error("Read message update failed:", error)
      }
    })

    // Mark all messages from a user as read
    socket.on("mark_all_read", async ({ fromUserId }) => {
      try {
        console.log(`Socket: Marking all messages as read from ${fromUserId} to ${userId}`)

        const result = await Message.updateMany(
          {
            fromUserId: fromUserId,
            toUserId: userId,
            isRead: false,
          },
          {
            $set: {
              isRead: true,
              readAt: new Date(),
            },
          },
        )

        console.log(`Socket: Marked ${result.modifiedCount} messages as read`)

        if (result.modifiedCount > 0) {
          // Notify sender that messages were read
          const senderSocketId = activeUsers.get(fromUserId)
          if (senderSocketId) {
            io.to(senderSocketId).emit("messages_read_bulk", {
              toUserId: userId,
              count: result.modifiedCount,
            })
          }

          // Update receiver's sidebar - unread count should now be 0
          socket.emit("unread_count_update", {
            userId: fromUserId,
            unreadCount: 0,
          })
        }
      } catch (error) {
        console.error("Mark all read failed:", error)
      }
    })

    // ============ ENHANCED CALL EVENTS ============

    // Call initiation
    socket.on("call-initiate", ({ to, from, callType }) => {
      console.log(`📞 Call initiation: ${from} -> ${to} (${callType})`)
      const targetSocketId = activeUsers.get(to)
      if (targetSocketId) {
        io.to(targetSocketId).emit("call-offer", { from, callType })
        console.log(`📤 Call offer sent to ${to}`)
      } else {
        socket.emit("call-failed", { reason: "User is not online" })
        console.log(`❌ Call failed: User ${to} not online`)
      }
    })

    // Call acceptance
    socket.on("call-accept", ({ to, from }) => {
      console.log(`✅ Call accepted: ${from} -> ${to}`)
      const targetSocketId = activeUsers.get(to)
      if (targetSocketId) {
        io.to(targetSocketId).emit("call-accept", { from })
        console.log(`📤 Call accept sent to ${to}`)
      }
    })

    // Call rejection
    socket.on("call-reject", ({ to, from }) => {
      console.log(`❌ Call rejected: ${from} -> ${to}`)
      const targetSocketId = activeUsers.get(to)
      if (targetSocketId) {
        io.to(targetSocketId).emit("call-reject", { from })
        console.log(`📤 Call reject sent to ${to}`)
      }
    })

    // Call end
    socket.on("call-end", ({ to, from }) => {
      console.log(`📞 Call ended: ${from} -> ${to}`)
      const targetSocketId = activeUsers.get(to)
      if (targetSocketId) {
        io.to(targetSocketId).emit("call-end", { from })
        console.log(`📤 Call end sent to ${to}`)
      }
    })

    // WebRTC Offer
    socket.on("webrtc-offer", ({ to, offer }) => {
      console.log(`📡 WebRTC offer: ${userId} -> ${to}`)
      const targetSocketId = activeUsers.get(to)
      if (targetSocketId) {
        io.to(targetSocketId).emit("webrtc-offer", {
          from: userId,
          offer: offer,
        })
        console.log(`📤 WebRTC offer sent to ${to}`)
      } else {
        console.log(`❌ WebRTC offer failed: User ${to} not found`)
      }
    })

    // WebRTC Answer
    socket.on("webrtc-answer", ({ to, answer }) => {
      console.log(`📡 WebRTC answer: ${userId} -> ${to}`)
      const targetSocketId = activeUsers.get(to)
      if (targetSocketId) {
        io.to(targetSocketId).emit("webrtc-answer", {
          from: userId,
          answer: answer,
        })
        console.log(`📤 WebRTC answer sent to ${to}`)
      } else {
        console.log(`❌ WebRTC answer failed: User ${to} not found`)
      }
    })

    // ICE Candidate
    socket.on("ice-candidate", ({ to, candidate }) => {
      console.log(`🧊 ICE candidate: ${userId} -> ${to}`)
      const targetSocketId = activeUsers.get(to)
      if (targetSocketId) {
        io.to(targetSocketId).emit("ice-candidate", {
          from: userId,
          candidate: candidate,
        })
        console.log(`📤 ICE candidate sent to ${to}`)
      } else {
        console.log(`❌ ICE candidate failed: User ${to} not found`)
      }
    })

    // Disconnect Event
    socket.on("disconnect", async () => {
      activeUsers.delete(userId)
      console.log(`${socket.user.name} disconnected (${userId})`)

      // Update user offline status
      await User.findByIdAndUpdate(userId, { isOnline: false })

      // Notify all connected users that this user went offline
      socket.broadcast.emit("user_offline", {
        userId: userId,
      })
    })
  })
}

module.exports = { setupSocket }
