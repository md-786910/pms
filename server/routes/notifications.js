const express = require("express");
const { body, validationResult } = require("express-validator");
const {
  getNotifications,
  markAsRead,
  markAllAsRead,
  deleteNotification,
  createNotification,
  getUnreadCount,
} = require("../controllers/notificationController");
const { auth } = require("../middleware/auth");

const router = express.Router();

// All routes require authentication
router.use(auth);

// @route   GET /api/notifications
// @desc    Get all notifications for a user
// @access  Private
router.get("/", getNotifications);

// @route   GET /api/notifications/unread-count
// @desc    Get unread notification count
// @access  Private
router.get("/unread-count", getUnreadCount);

// @route   PUT /api/notifications/:id/read
// @desc    Mark notification as read
// @access  Private
router.put("/:id/read", markAsRead);

// @route   PUT /api/notifications/mark-all-read
// @desc    Mark all notifications as read
// @access  Private
router.put("/mark-all-read", markAllAsRead);

// @route   DELETE /api/notifications/:id
// @desc    Delete notification
// @access  Private
router.delete("/:id", deleteNotification);

// @route   POST /api/notifications
// @desc    Create notification
// @access  Private
router.post(
  "/",
  [
    body("user").isMongoId().withMessage("Valid user ID is required"),
    body("type")
      .isIn([
        "project_invite",
        "project_joined",
        "card_assigned",
        "card_unassigned",
        "card_updated",
        "comment_added",
        "due_date_reminder",
        "system",
      ])
      .withMessage("Invalid notification type"),
    body("title")
      .trim()
      .isLength({ min: 1, max: 100 })
      .withMessage("Title must be between 1 and 100 characters"),
    body("message")
      .trim()
      .isLength({ min: 1, max: 500 })
      .withMessage("Message must be between 1 and 500 characters"),
    body("relatedProject")
      .optional()
      .isMongoId()
      .withMessage("Related project must be a valid project ID"),
    body("relatedCard")
      .optional()
      .isMongoId()
      .withMessage("Related card must be a valid card ID"),
    body("priority")
      .optional()
      .isIn(["low", "medium", "high", "urgent"])
      .withMessage("Priority must be low, medium, high, or urgent"),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: "Validation failed",
          errors: errors.array(),
        });
      }

      await createNotification(req, res);
    } catch (error) {
      console.error("Create notification route error:", error);
      res.status(500).json({
        success: false,
        message: "Server error",
      });
    }
  }
);

module.exports = router;
