const jwt = require("jsonwebtoken");
const User = require("../models/User");

const auth = async (req, res, next) => {
  try {
    const token = req.header("Authorization")?.replace("Bearer ", "");

    if (!token) {
      return res.status(401).json({
        success: false,
        message: "Access denied. No token provided.",
      });
    }

    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET || "your-secret-key"
    );
    const user = await User.findById(decoded.userId).select("-password");

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Invalid token. User not found.",
      });
    }

    if (!user.isActive) {
      return res.status(401).json({
        success: false,
        message: "Account is deactivated.",
      });
    }

    req.user = user;
    next();
  } catch (error) {
    if (error.name === "JsonWebTokenError") {
      return res.status(401).json({
        success: false,
        message: "Invalid token.",
      });
    }

    if (error.name === "TokenExpiredError") {
      return res.status(401).json({
        success: false,
        message: "Token expired.",
      });
    }

    console.error("Auth middleware error:", error);
    res.status(500).json({
      success: false,
      message: "Server error during authentication.",
    });
  }
};

const adminAuth = async (req, res, next) => {
  try {
    await auth(req, res, () => {
      if (req.user.role !== "admin") {
        return res.status(403).json({
          success: false,
          message: "Access denied. Admin privileges required.",
        });
      }
      next();
    });
  } catch (error) {
    console.error("Admin auth middleware error:", error);
    res.status(500).json({
      success: false,
      message: "Server error during admin authentication.",
    });
  }
};

const projectMemberAuth = async (req, res, next) => {
  try {
    await auth(req, res, async () => {
      const Project = require("../models/Project");
      const projectId = req.params.projectId || req.params.id;

      if (!projectId) {
        return res.status(400).json({
          success: false,
          message: "Project ID is required.",
        });
      }

      const project = await Project.findById(projectId);

      if (!project) {
        return res.status(404).json({
          success: false,
          message: "Project not found.",
        });
      }

      // Check if user is owner or member
      const isOwner = project.owner.toString() === req.user._id.toString();
      const isMember = project.members.some(
        (member) => member.user.toString() === req.user._id.toString()
      );

      if (!isOwner && !isMember && req.user.role !== "admin") {
        return res.status(403).json({
          success: false,
          message: "Access denied. You are not a member of this project.",
        });
      }

      req.project = project;
      next();
    });
  } catch (error) {
    console.error("Project member auth middleware error:", error);
    res.status(500).json({
      success: false,
      message: "Server error during project authentication.",
    });
  }
};

module.exports = { auth, adminAuth, projectMemberAuth };
