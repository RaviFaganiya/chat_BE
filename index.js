// require("dotenv").config();
// const express = require("express");
// const http = require("http");
// const connectDB = require("./src/config/db");
// const authRoutes = require("./src/routes/authRoutes");
// const userRoutes = require("./src/routes/userRoutes");
// const chatRoutes = require("./src/routes/chatRouters");
// const { setupSocket } = require("./src/socket/socketManager");
// const cors = require('cors');

// const app = express();
// const server = http.createServer(app);
// const io = require("socket.io")(server, {
//     cors: {
//         origin: "*",
//         methods: ["GET", "POST"]
//     }
// });

// // Database connection
// connectDB();

// // Middlewares
// app.use(express.json());
// app.use(cors());

// // API Routes
// app.use("/api/auth", authRoutes);
// app.use("/api/user", userRoutes);
// app.use("/api/chat", chatRoutes);

// // Socket setup
// setupSocket(io);

// const PORT = process.env.PORT || 5500;
// server.listen(PORT, () => console.log(`Server running on port ${PORT}`));




require("dotenv").config()
const express = require("express")
const http = require("http")
const path = require("path")
const connectDB = require("./src/config/db")
const authRoutes = require("./src/routes/authRoutes")
const userRoutes = require("./src/routes/userRoutes")
const chatRoutes = require("./src/routes/chatRouters")
const uploadRoutes = require("./src/routes/uploadRoutes")
const { setupSocket } = require("./src/socket/socketManager")
const cors = require("cors")

const app = express()
const server = http.createServer(app)
const io = require("socket.io")(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
})

// Database connection
connectDB()

// Middlewares
app.use(express.json({ limit: "10mb" }))
app.use(express.urlencoded({ extended: true, limit: "10mb" }))
app.use(cors())

// Serve static files (uploaded images)
app.use("/uploads", express.static(path.join(__dirname, "uploads")))

// API Routes
app.use("/api/auth", authRoutes)
app.use("/api/user", userRoutes)
app.use("/api/chat", chatRoutes)
app.use("/api/upload", uploadRoutes)

// Health check endpoint
app.get("/api/health", (req, res) => {
  res.json({
    success: true,
    message: "Server is running",
    timestamp: new Date().toISOString(),
  })
})

// Socket setup
setupSocket(io)

// Error handling middleware
app.use((error, req, res, next) => {
  console.error("Global error handler:", error)

  if (error.code === "LIMIT_FILE_SIZE") {
    return res.status(400).json({
      success: false,
      message: "File size too large. Maximum size is 5MB.",
    })
  }

  res.status(500).json({
    success: false,
    message: "Internal server error",
    error: process.env.NODE_ENV === "development" ? error.message : "Something went wrong",
  })
})

// 404 handler
app.use("*", (req, res) => {
  res.status(404).json({
    success: false,
    message: "Route not found",
  })
})

const PORT = process.env.PORT || 5500
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`)
  console.log(`Health check: http://localhost:${PORT}/api/health`)
})
