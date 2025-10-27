const express = require("express");
const {
  getProjectLabels,
  createLabel,
  deleteLabel,
  updateLabel,
} = require("../controllers/labelController");
const { projectMemberAuth } = require("../middleware/auth");
const { body, validationResult } = require("express-validator");

const router = express.Router();

// Middleware to ensure project ID is properly extracted from parent route
router.use((req, res, next) => {
  // The project ID comes from the parent route in index.js
  if (req.projectIdFromUrl) {
    req.projectId = req.projectIdFromUrl;
    req.params.id = req.projectIdFromUrl;
    req.params.projectId = req.projectIdFromUrl;
    console.log("Label router - Set project ID:", req.projectIdFromUrl);
  }

  console.log("Label router - req.params:", req.params);
  console.log("Label router - req.projectIdFromUrl:", req.projectIdFromUrl);
  next();
});

// All routes use projectMemberAuth middleware to verify project access
router.use(projectMemberAuth);

// @route   GET /api/projects/:id/labels
// @desc    Get all labels for a project
// @access  Private
router.get("/", getProjectLabels);

// @route   POST /api/projects/:id/labels
// @desc    Create a new label for a project
// @access  Private
router.post(
  "/",
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
        "light-green",
        "dark-green",
        "light-yellow",
        "dark-yellow",
      ])
      .withMessage("Invalid color"),
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
      await createLabel(req, res);
    } catch (error) {
      console.error("Create label route error:", error);
      res.status(500).json({
        success: false,
        message: "Server error while creating label",
      });
    }
  }
);

// @route   PUT /api/projects/:id/labels/:labelId
// @desc    Update a label
// @access  Private
router.put(
  "/:labelId",
  [
    body("name")
      .optional()
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
        "light-green",
        "dark-green",
        "light-yellow",
        "dark-yellow",
      ])
      .withMessage("Invalid color"),
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
      await updateLabel(req, res);
    } catch (error) {
      console.error("Update label route error:", error);
      res.status(500).json({
        success: false,
        message: "Server error while updating label",
      });
    }
  }
);

// @route   DELETE /api/projects/:id/labels/:labelId
// @desc    Delete a label from project and all cards
// @access  Private
router.delete("/:labelId", deleteLabel);

module.exports = router;
