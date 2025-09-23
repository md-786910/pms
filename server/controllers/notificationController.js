const Notification = require("../models/Notification");
const User = require("../models/User");
const Project = require("../models/Project");
const Card = require("../models/Card");

// @route   GET /api/notifications
// @desc    Get all notifications for a user
// @access  Private
const getNotifications = async (req, res) => {
  try {
    console.log("🔔 Getting notifications for user:", req.user._id);
    const userId = req.user._id;
    const { page = 1, limit = 20, unreadOnly = false } = req.query;

    const query = { user: userId };
    if (unreadOnly === "true") {
      query.read = false;
    }

    const notifications = await Notification.find(query)
      .populate("sender", "name email avatar color")
      .populate("relatedProject", "name")
      .populate("relatedCard", "title")
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Notification.countDocuments(query);

    console.log(
      "📊 Found",
      notifications.length,
      "notifications for user",
      userId
    );

    res.json({
      success: true,
      notifications,
      pagination: {
        current: parseInt(page),
        pages: Math.ceil(total / limit),
        total,
      },
    });
  } catch (error) {
    console.error("Get notifications error:", error);
    res.status(500).json({
      success: false,
      message: "Server error while fetching notifications",
    });
  }
};

// @route   PUT /api/notifications/:id/read
// @desc    Mark notification as read
// @access  Private
const markAsRead = async (req, res) => {
  try {
    const notificationId = req.params.id;
    const userId = req.user._id;

    const notification = await Notification.findOne({
      _id: notificationId,
      user: userId,
    });

    if (!notification) {
      return res.status(404).json({
        success: false,
        message: "Notification not found",
      });
    }

    notification.read = true;
    notification.readAt = new Date();
    await notification.save();

    res.json({
      success: true,
      message: "Notification marked as read",
      notification,
    });
  } catch (error) {
    console.error("Mark as read error:", error);
    res.status(500).json({
      success: false,
      message: "Server error while marking notification as read",
    });
  }
};

// @route   PUT /api/notifications/mark-all-read
// @desc    Mark all notifications as read
// @access  Private
const markAllAsRead = async (req, res) => {
  try {
    const userId = req.user._id;

    await Notification.updateMany(
      { user: userId, read: false },
      { read: true, readAt: new Date() }
    );

    res.json({
      success: true,
      message: "All notifications marked as read",
    });
  } catch (error) {
    console.error("Mark all as read error:", error);
    res.status(500).json({
      success: false,
      message: "Server error while marking all notifications as read",
    });
  }
};

// @route   DELETE /api/notifications/:id
// @desc    Delete notification
// @access  Private
const deleteNotification = async (req, res) => {
  try {
    const notificationId = req.params.id;
    const userId = req.user._id;

    const notification = await Notification.findOneAndDelete({
      _id: notificationId,
      user: userId,
    });

    if (!notification) {
      return res.status(404).json({
        success: false,
        message: "Notification not found",
      });
    }

    res.json({
      success: true,
      message: "Notification deleted successfully",
    });
  } catch (error) {
    console.error("Delete notification error:", error);
    res.status(500).json({
      success: false,
      message: "Server error while deleting notification",
    });
  }
};

// @route   POST /api/notifications
// @desc    Create notification
// @access  Private
const createNotification = async (req, res) => {
  try {
    const {
      user,
      type,
      title,
      message,
      relatedProject,
      relatedCard,
      priority = "medium",
    } = req.body;

    const senderId = req.user._id;

    // Check if target user exists
    const targetUser = await User.findById(user);
    if (!targetUser) {
      return res.status(404).json({
        success: false,
        message: "Target user not found",
      });
    }

    // Check if related project exists (if provided)
    if (relatedProject) {
      const project = await Project.findById(relatedProject);
      if (!project) {
        return res.status(404).json({
          success: false,
          message: "Related project not found",
        });
      }
    }

    // Check if related card exists (if provided)
    if (relatedCard) {
      const card = await Card.findById(relatedCard);
      if (!card) {
        return res.status(404).json({
          success: false,
          message: "Related card not found",
        });
      }
    }

    const notification = new Notification({
      user,
      sender: senderId,
      type,
      title,
      message,
      relatedProject,
      relatedCard,
      priority,
    });

    await notification.save();

    // Populate the notification with related data
    await notification.populate("sender", "name email avatar color");
    await notification.populate("relatedProject", "name");
    await notification.populate("relatedCard", "title");

    res.status(201).json({
      success: true,
      message: "Notification created successfully",
      notification,
    });
  } catch (error) {
    console.error("Create notification error:", error);
    res.status(500).json({
      success: false,
      message: "Server error while creating notification",
    });
  }
};

// @route   GET /api/notifications/unread-count
// @desc    Get unread notification count
// @access  Private
const getUnreadCount = async (req, res) => {
  try {
    const userId = req.user._id;

    const count = await Notification.countDocuments({
      user: userId,
      read: false,
    });

    res.json({
      success: true,
      count,
    });
  } catch (error) {
    console.error("Get unread count error:", error);
    res.status(500).json({
      success: false,
      message: "Server error while fetching unread count",
    });
  }
};

module.exports = {
  getNotifications,
  markAsRead,
  markAllAsRead,
  deleteNotification,
  createNotification,
  getUnreadCount,
};
