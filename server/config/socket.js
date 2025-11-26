const socketIo = require("socket.io");
const jwt = require("jsonwebtoken");
const User = require("../models/User");

let io;

const initializeSocket = (server) => {
  io = socketIo(server, {
    cors: {
      origin: "*", // Allow all origins in development
      methods: ["GET", "POST", "PUT", "DELETE"],
      credentials: true,
    },
  });

  // Authentication middleware for socket connections
  io.use(async (socket, next) => {
    try {
      const token =
        socket.handshake.auth.token ||
        socket.handshake.headers.authorization?.replace("Bearer ", "");

      if (!token) {
        // Allow connection but mark as unauthenticated
        socket.userId = null;
        return next();
      }

      const decoded = jwt.verify(
        token,
        process.env.JWT_SECRET || "your-secret-key"
      );
      const user = await User.findById(decoded.userId).select("-password");

      if (!user || !user.isActive) {
        socket.userId = null;
        return next();
      }

      socket.userId = user._id.toString();
      socket.user = user;
      next();
    } catch (error) {
      // Allow connection even if auth fails (for unauthenticated users)
      socket.userId = null;
      next();
    }
  });

  io.on("connection", (socket) => {
    console.log(
      "Client connected:",
      socket.id,
      "User:",
      socket.userId || "Unauthenticated"
    );

    // Join user's notification room if authenticated
    if (socket.userId) {
      socket.join(`user-${socket.userId}`);
      console.log(
        `Client ${socket.id} joined notification room for user ${socket.userId}`
      );
    }

    // Handle joining a project room
    socket.on("join-project", (projectId) => {
      socket.join(`project-${projectId}`);
      console.log(`Client ${socket.id} joined project ${projectId}`);
    });

    // Handle leaving a project room
    socket.on("leave-project", (projectId) => {
      socket.leave(`project-${projectId}`);
      console.log(`Client ${socket.id} left project ${projectId}`);
    });

    socket.on("disconnect", () => {
      console.log("Client disconnected:", socket.id);
    });
  });

  return io;
};

const getIO = () => {
  if (!io) {
    throw new Error("Socket.IO not initialized");
  }
  return io;
};

module.exports = {
  initializeSocket,
  getIO,
};
