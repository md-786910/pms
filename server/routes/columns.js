const express = require("express");
const { body, validationResult } = require("express-validator");
const {
  getColumns,
  createColumn,
  updateColumn,
  deleteColumn,
  reorderColumns,
} = require("../controllers/columnController");
const { auth, projectMemberAuth } = require("../middleware/auth");

const router = express.Router();

// All routes require authentication
router.use(auth);

// @route   GET /api/projects/:projectId/columns
// @desc    Get all columns for a project
// @access  Private
router.get("/projects/:projectId/columns", getColumns);

// @route   POST /api/projects/:projectId/columns
// @desc    Create a new column
// @access  Private
router.post(
  "/projects/:projectId/columns",
  [
    body("name")
      .trim()
      .isLength({ min: 1, max: 50 })
      .withMessage("Column name must be between 1 and 50 characters"),
    body("color")
      .optional()
      .isIn([
        "blue",
        "green",
        "yellow",
        "red",
        "purple",
        "pink",
        "indigo",
        "gray",
      ])
      .withMessage("Invalid color"),
  ],
  createColumn
);

// @route   PUT /api/projects/:projectId/columns/:columnId
// @desc    Update a column
// @access  Private
router.put(
  "/projects/:projectId/columns/:columnId",
  [
    body("name")
      .optional()
      .trim()
      .isLength({ min: 1, max: 50 })
      .withMessage("Column name must be between 1 and 50 characters"),
    body("color")
      .optional()
      .isIn([
        "blue",
        "green",
        "yellow",
        "red",
        "purple",
        "pink",
        "indigo",
        "gray",
      ])
      .withMessage("Invalid color"),
    body("position")
      .optional()
      .isInt({ min: 0 })
      .withMessage("Position must be a non-negative integer"),
  ],
  updateColumn
);

// @route   DELETE /api/projects/:projectId/columns/:columnId
// @desc    Delete a column
// @access  Private
router.delete("/projects/:projectId/columns/:columnId", deleteColumn);

// @route   PUT /api/projects/:projectId/columns/reorder
// @desc    Reorder columns
// @access  Private
router.put(
  "/projects/:projectId/columns/reorder",
  [body("columns").isArray().withMessage("Columns must be an array")],
  reorderColumns
);

module.exports = router;
