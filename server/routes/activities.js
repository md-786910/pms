const express = require("express");
const router = express.Router();
const { body, validationResult } = require("express-validator");
const Activity = require("../models/Activity");
const Project = require("../models/Project");
const { auth, projectMemberAuth } = require("../middleware/auth");

// @route   GET /api/activities/project/:projectId
// @desc    Get all activities for a project
// @access  Private
router.get(
  "/project/:projectId",
  [auth, projectMemberAuth],
  async (req, res) => {
    try {
      const { projectId } = req.params;
      const { page = 1, limit = 50 } = req.query;

      const activities = await Activity.find({ project: projectId })
        .populate("user", "name email avatar color")
        .sort({ createdAt: -1 })
        .limit(limit * 1)
        .skip((page - 1) * limit);

      const total = await Activity.countDocuments({ project: projectId });

      res.json({
        success: true,
        activities,
        pagination: {
          current: parseInt(page),
          pages: Math.ceil(total / limit),
          total,
        },
      });
    } catch (error) {
      console.error("Get activities error:", error);
      res.status(500).json({
        success: false,
        message: "Server error while fetching activities",
      });
    }
  }
);

// @route   GET /api/activities/user/:userId
// @desc    Get all activities for a user
// @access  Private
router.get("/user/:userId", auth, async (req, res) => {
  try {
    const { userId } = req.params;
    const { page = 1, limit = 50 } = req.query;

    // Check if user is requesting their own activities or is admin
    if (
      req.user._id.toString() !== userId.toString() &&
      req.user.role !== "admin"
    ) {
      return res.status(403).json({
        success: false,
        message: "Access denied",
      });
    }

    const activities = await Activity.find({ user: userId })
      .populate("project", "name")
      .populate("user", "name email avatar color")
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Activity.countDocuments({ user: userId });

    res.json({
      success: true,
      activities,
      pagination: {
        current: parseInt(page),
        pages: Math.ceil(total / limit),
        total,
      },
    });
  } catch (error) {
    console.error("Get user activities error:", error);
    res.status(500).json({
      success: false,
      message: "Server error while fetching user activities",
    });
  }
});

// @route   GET /api/activities/recent
// @desc    Get recent activities across all projects user has access to
// @access  Private
router.get("/recent", auth, async (req, res) => {
  try {
    const { limit = 20 } = req.query;
    const userId = req.user._id;

    // Get all projects user has access to
    let projectQuery = {};
    if (req.user.role !== "admin") {
      projectQuery = {
        $or: [{ owner: userId }, { "members.user": userId }],
      };
    }

    const userProjects = await Project.find(projectQuery).select("_id");
    const projectIds = userProjects.map((p) => p._id);

    const activities = await Activity.find({ project: { $in: projectIds } })
      .populate("project", "name")
      .populate("user", "name email avatar color")
      .sort({ createdAt: -1 })
      .limit(parseInt(limit));

    res.json({
      success: true,
      activities,
    });
  } catch (error) {
    console.error("Get recent activities error:", error);
    res.status(500).json({
      success: false,
      message: "Server error while fetching recent activities",
    });
  }
});

module.exports = router;
