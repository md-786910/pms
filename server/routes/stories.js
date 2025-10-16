const express = require("express");
const { body } = require("express-validator");
const {
  getStories,
  getStory,
  getSubStories,
  createStory,
  updateStory,
  deleteStory,
  addComment,
  updateComment,
  uploadFiles,
  removeAttachment,
  assignUser,
  unassignUser,
} = require("../controllers/storyController");
const { auth } = require("../middleware/auth");
const { uploadMiddleware } = require("../middleware/upload");

const router = express.Router();

// All routes require authentication
router.use(auth);

// @route   GET /api/stories/:id
// @desc    Get single story with sub-stories
// @access  Private
router.get("/:id", getStory);

// @route   GET /api/stories/:id/substories
// @desc    Get sub-stories for a story
// @access  Private
router.get("/:id/substories", getSubStories);

// @route   POST /api/stories
// @desc    Create new story
// @access  Private
router.post(
  "/",
  [
    body("title")
      .trim()
      .isLength({ min: 1, max: 200 })
      .withMessage("Story title must be between 1 and 200 characters"),
    body("description")
      .optional({ nullable: true, checkFalsy: true })
      .trim()
      .isLength({ max: 50000 })
      .withMessage("Description cannot be more than 50000 characters"),
    body("project").isMongoId().withMessage("Valid project ID is required"),
    body("parentStory")
      .optional({ nullable: true, checkFalsy: true })
      .isMongoId()
      .withMessage("Parent story must be a valid ID"),
    body("status")
      .optional({ nullable: true })
      .isIn(["todo", "in_progress", "review", "done"])
      .withMessage("Status must be todo, in_progress, review, or done"),
    body("priority")
      .optional({ nullable: true })
      .isIn(["low", "medium", "high", "urgent"])
      .withMessage("Priority must be low, medium, high, or urgent"),
    body("storyType")
      .optional({ nullable: true })
      .isIn(["story", "task", "bug", "epic"])
      .withMessage("Story type must be story, task, bug, or epic"),
    body("assignees")
      .optional({ nullable: true })
      .isArray()
      .withMessage("Assignees must be an array"),
    body("assignees.*")
      .optional({ nullable: true })
      .isMongoId()
      .withMessage("Each assignee must be a valid user ID"),
    body("labels")
      .optional({ nullable: true })
      .isArray()
      .withMessage("Labels must be an array"),
    body("dueDate")
      .optional({ nullable: true, checkFalsy: true })
      .custom((value) => {
        if (value === "" || value === null || value === undefined) {
          return true;
        }
        return (
          /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value) ||
          /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?Z?$/.test(value) ||
          /^\d{4}-\d{2}-\d{2}$/.test(value)
        );
      })
      .withMessage("Due date must be a valid date format"),
    body("estimatedHours")
      .optional({ nullable: true, checkFalsy: true })
      .isNumeric()
      .withMessage("Estimated hours must be a number"),
  ],
  createStory
);

// @route   PUT /api/stories/:id
// @desc    Update story
// @access  Private
router.put(
  "/:id",
  [
    body("title")
      .optional({ nullable: true })
      .trim()
      .isLength({ min: 1, max: 200 })
      .withMessage("Story title must be between 1 and 200 characters"),
    body("description")
      .optional({ nullable: true, checkFalsy: true })
      .trim()
      .isLength({ max: 50000 })
      .withMessage("Description cannot be more than 50000 characters"),
    body("status")
      .optional({ nullable: true })
      .isIn(["todo", "in_progress", "review", "done"])
      .withMessage("Status must be todo, in_progress, review, or done"),
    body("priority")
      .optional({ nullable: true })
      .isIn(["low", "medium", "high", "urgent"])
      .withMessage("Priority must be low, medium, high, or urgent"),
    body("storyType")
      .optional({ nullable: true })
      .isIn(["story", "task", "bug", "epic"])
      .withMessage("Story type must be story, task, bug, or epic"),
    body("assignees")
      .optional({ nullable: true })
      .isArray()
      .withMessage("Assignees must be an array"),
    body("assignees.*")
      .optional({ nullable: true })
      .isMongoId()
      .withMessage("Each assignee must be a valid user ID"),
    body("labels")
      .optional({ nullable: true })
      .isArray()
      .withMessage("Labels must be an array"),
    body("dueDate")
      .optional({ nullable: true, checkFalsy: true })
      .custom((value) => {
        if (value === "" || value === null || value === undefined) {
          return true;
        }
        return (
          /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value) ||
          /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?Z?$/.test(value) ||
          /^\d{4}-\d{2}-\d{2}$/.test(value)
        );
      })
      .withMessage("Due date must be a valid date format"),
    body("estimatedHours")
      .optional({ nullable: true, checkFalsy: true })
      .isNumeric()
      .withMessage("Estimated hours must be a number"),
    body("actualHours")
      .optional({ nullable: true, checkFalsy: true })
      .isNumeric()
      .withMessage("Actual hours must be a number"),
  ],
  updateStory
);

// @route   DELETE /api/stories/:id
// @desc    Delete story and its sub-stories
// @access  Private
router.delete("/:id", deleteStory);

// @route   POST /api/stories/:id/comments
// @desc    Add comment to story
// @access  Private
router.post(
  "/:id/comments",
  [
    body("comment")
      .trim()
      .isLength({ min: 1, max: 5000 })
      .withMessage("Comment must be between 1 and 5000 characters"),
  ],
  addComment
);

// @route   PUT /api/stories/:id/comments/:commentId
// @desc    Update comment in story
// @access  Private
router.put(
  "/:id/comments/:commentId",
  [
    body("text")
      .trim()
      .isLength({ min: 1, max: 5000 })
      .withMessage("Comment must be between 1 and 5000 characters"),
  ],
  updateComment
);

// @route   POST /api/stories/:id/upload-files
// @desc    Upload files to story
// @access  Private
router.post("/:id/upload-files", uploadMiddleware, uploadFiles);

// @route   DELETE /api/stories/:id/attachments/:attachmentId
// @desc    Remove attachment from story
// @access  Private
router.delete("/:id/attachments/:attachmentId", removeAttachment);

// @route   POST /api/stories/:id/assign
// @desc    Assign user to story
// @access  Private
router.post(
  "/:id/assign",
  [body("userId").isMongoId().withMessage("Valid user ID is required")],
  assignUser
);

// @route   DELETE /api/stories/:id/assign/:userId
// @desc    Unassign user from story
// @access  Private
router.delete("/:id/assign/:userId", unassignUser);

module.exports = router;
