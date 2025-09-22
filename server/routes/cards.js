const express = require("express");
const { body, validationResult } = require("express-validator");
const {
  getCards,
  getCard,
  createCard,
  updateCard,
  deleteCard,
  updateStatus,
  assignUser,
  unassignUser,
  addComment,
  updateComment,
  addLabel,
  removeLabel,
  addAttachment,
  removeAttachment,
} = require("../controllers/cardController");
const { auth, projectMemberAuth } = require("../middleware/auth");

const router = express.Router();

// All routes require authentication
router.use(auth);

// @route   GET /api/projects/:projectId/cards
// @desc    Get all cards for a project
// @access  Private
router.get("/projects/:projectId/cards", getCards);

// @route   GET /api/cards/:id
// @desc    Get single card
// @access  Private
router.get("/:id", getCard);

// @route   POST /api/cards
// @desc    Create new card
// @access  Private
router.post(
  "/",
  [
    body("title")
      .trim()
      .isLength({ min: 1, max: 200 })
      .withMessage("Card title must be between 1 and 200 characters"),
    body("description")
      .optional()
      .trim()
      .isLength({ max: 1000 })
      .withMessage("Description cannot be more than 1000 characters"),
    body("project").isMongoId().withMessage("Valid project ID is required"),
    body("status").optional().isString().withMessage("Status must be a string"),
    body("priority")
      .optional()
      .isIn(["low", "medium", "high", "urgent"])
      .withMessage("Priority must be low, medium, high, or urgent"),
    body("assignees")
      .optional()
      .isArray()
      .withMessage("Assignees must be an array"),
    body("assignees.*")
      .optional()
      .isMongoId()
      .withMessage("Each assignee must be a valid user ID"),
    body("labels").optional().isArray().withMessage("Labels must be an array"),
    body("dueDate")
      .optional()
      .custom((value) => {
        if (value === "" || value === null || value === undefined) {
          return true; // Allow empty values
        }
        return (
          /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value) ||
          /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?Z?$/.test(value)
        );
      })
      .withMessage("Due date must be a valid date format"),
  ],
  createCard
);

// @route   PUT /api/cards/:id
// @desc    Update card
// @access  Private
router.put(
  "/:id",
  [
    body("title")
      .optional()
      .trim()
      .isLength({ min: 1, max: 200 })
      .withMessage("Card title must be between 1 and 200 characters"),
    body("description")
      .optional()
      .trim()
      .isLength({ max: 1000 })
      .withMessage("Description cannot be more than 1000 characters"),
    body("status").optional().isString().withMessage("Status must be a string"),
    body("priority")
      .optional()
      .isIn(["low", "medium", "high", "urgent"])
      .withMessage("Priority must be low, medium, high, or urgent"),
    body("assignees")
      .optional()
      .isArray()
      .withMessage("Assignees must be an array"),
    body("assignees.*")
      .optional()
      .isMongoId()
      .withMessage("Each assignee must be a valid user ID"),
    body("labels").optional().isArray().withMessage("Labels must be an array"),
    body("dueDate")
      .optional()
      .isISO8601()
      .withMessage("Due date must be a valid date"),
  ],
  updateCard
);

// @route   DELETE /api/cards/:id
// @desc    Delete card
// @access  Private
router.delete("/:id", deleteCard);

// @route   PUT /api/cards/:id/status
// @desc    Update card status
// @access  Private
router.put(
  "/:id/status",
  [
    body("status")
      .notEmpty()
      .withMessage("Status is required")
      .isString()
      .withMessage("Status must be a string"),
  ],
  updateStatus
);

// @route   POST /api/cards/:id/assign
// @desc    Assign user to card
// @access  Private
router.post(
  "/:id/assign",
  [body("userId").isMongoId().withMessage("Valid user ID is required")],
  assignUser
);

// @route   DELETE /api/cards/:id/assign/:userId
// @desc    Unassign user from card
// @access  Private
router.delete("/:id/assign/:userId", unassignUser);

// @route   POST /api/cards/:id/comments
// @desc    Add comment to card
// @access  Private
router.post(
  "/:id/comments",
  [
    body("comment")
      .trim()
      .isLength({ min: 1, max: 500 })
      .withMessage("Comment must be between 1 and 500 characters"),
  ],
  addComment
);

// @route   PUT /api/cards/:id/comments/:commentId
// @desc    Update comment in card
// @access  Private
router.put(
  "/:id/comments/:commentId",
  [
    body("text")
      .trim()
      .isLength({ min: 1, max: 500 })
      .withMessage("Comment must be between 1 and 500 characters"),
  ],
  updateComment
);

// @route   POST /api/cards/:id/labels
// @desc    Add label to card
// @access  Private
router.post(
  "/:id/labels",
  [
    body("name")
      .trim()
      .isLength({ min: 1, max: 50 })
      .withMessage("Label name must be between 1 and 50 characters"),
    body("color")
      .optional()
      .isIn([
        "red",
        "blue",
        "green",
        "yellow",
        "purple",
        "orange",
        "pink",
        "gray",
      ])
      .withMessage("Invalid color"),
  ],
  addLabel
);

// @route   DELETE /api/cards/:id/labels/:labelId
// @desc    Remove label from card
// @access  Private
router.delete("/:id/labels/:labelId", removeLabel);

// @route   POST /api/cards/:id/attachments
// @desc    Add attachment to card
// @access  Private
router.post(
  "/:id/attachments",
  [
    body("filename")
      .trim()
      .isLength({ min: 1 })
      .withMessage("Filename is required"),
    body("originalName")
      .trim()
      .isLength({ min: 1 })
      .withMessage("Original name is required"),
    body("mimeType")
      .trim()
      .isLength({ min: 1 })
      .withMessage("MIME type is required"),
    body("size").isNumeric().withMessage("Size must be a number"),
    body("url").isURL().withMessage("Valid URL is required"),
  ],
  addAttachment
);

// @route   DELETE /api/cards/:id/attachments/:attachmentId
// @desc    Remove attachment from card
// @access  Private
router.delete("/:id/attachments/:attachmentId", removeAttachment);

module.exports = router;
