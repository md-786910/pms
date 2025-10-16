require("dotenv").config();
const express = require("express");
const cors = require("cors");
const path = require("path");
const connectDB = require("./config/database");
const config = require("./config/config");

// Import routes
const authRoutes = require("./routes/auth");
const userRoutes = require("./routes/users");
const projectRoutes = require("./routes/projects");
const cardRoutes = require("./routes/cards");
const cardItemRoutes = require("./routes/cardItems");
const columnRoutes = require("./routes/columns");
const notificationRoutes = require("./routes/notifications");
const invitationRoutes = require("./routes/invitations");
const storyRoutes = require("./routes/stories");

const app = express();
const PORT = config.PORT;

// Connect to MongoDB
connectDB();

// Middleware
app.use(
  cors({
    origin: true,
    credentials: true,
  })
);
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// Serve static files
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/projects", projectRoutes);
app.use("/api/cards", cardRoutes);
app.use("/api/card-items", cardItemRoutes);
app.use("/api/columns", columnRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/invitations", invitationRoutes);
app.use("/api/stories", storyRoutes);

// Health check endpoint
app.get("/api/health", (req, res) => {
  res.json({
    success: true,
    message: "Server is running",
    timestamp: new Date().toISOString(),
    environment: config.NODE_ENV,
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error("Error:", err);

  if (err.name === "ValidationError") {
    const errors = Object.values(err.errors).map((e) => e.message);
    return res.status(400).json({
      success: false,
      message: "Validation Error",
      errors,
    });
  }

  if (err.name === "CastError") {
    return res.status(400).json({
      success: false,
      message: "Invalid ID format",
    });
  }

  if (err.code === 11000) {
    const field = Object.keys(err.keyValue)[0];
    return res.status(400).json({
      success: false,
      message: `${field} already exists`,
    });
  }

  res.status(500).json({
    success: false,
    message: "Internal server error",
  });
});

// 404 handler
app.use("*", (req, res) => {
  res.status(404).json({
    success: false,
    message: "Route not found",
  });
});

// Start server with error handling
const server = app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Environment: ${config.NODE_ENV}`);
  console.log(`Database: ${config.MONGODB_URI}`);
  console.log(`Client URL: ${config.CLIENT_URL}`);
});

// Handle server errors gracefully
server.on("error", (err) => {
  if (err.code === "EADDRINUSE") {
    console.log(
      `Port ${PORT} is already in use. Trying to kill existing process...`
    );
    const { exec } = require("child_process");
    exec(`lsof -ti:${PORT} | xargs kill -9`, (error) => {
      if (error) {
        console.log(
          "Could not kill existing process. Please manually stop the server."
        );
        console.log("You can run: lsof -ti:5000 | xargs kill -9");
      } else {
        console.log("Killed existing process. Restarting server...");
        setTimeout(() => {
          server.listen(PORT);
        }, 1000);
      }
    });
  } else {
    console.error("Server error:", err);
  }
});

// Graceful shutdown
process.on("SIGTERM", () => {
  console.log("SIGTERM received. Shutting down gracefully...");
  server.close(() => {
    console.log("Process terminated");
    process.exit(0);
  });
});

process.on("SIGINT", () => {
  console.log("SIGINT received. Shutting down gracefully...");
  server.close(() => {
    console.log("Process terminated");
    process.exit(0);
  });
});
