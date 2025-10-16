const express = require("express");
const { body, validationResult } = require("express-validator");
const {
  getProjects,
  getProject,
  createProject,
  updateProject,
  deleteProject,
  addMember,
  removeMember,
} = require("../controllers/projectController");
const { auth, projectMemberAuth } = require("../middleware/auth");

const router = express.Router();

// All routes require authentication
router.use(auth);

// @route   GET /api/projects
// @desc    Get all projects for a user
// @access  Private
router.get("/", getProjects);

// @route   GET /api/projects/:id
// @desc    Get single project
// @access  Private
router.get("/:id", projectMemberAuth, getProject);

// @route   POST /api/projects
// @desc    Create new project
// @access  Private
router.post(
  "/",
  [
    body("name")
      .trim()
      .isLength({ min: 1, max: 100 })
      .withMessage("Project name must be between 1 and 100 characters"),
    body("description")
      .optional()
      .trim()
      .isLength({ max: 500 })
      .withMessage("Description cannot be more than 500 characters"),
    body("color")
      .optional()
      .isIn(["blue", "green", "purple", "orange", "pink", "red", "yellow"])
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

      await createProject(req, res);
    } catch (error) {
      console.error("Create project route error:", error);
      res.status(500).json({
        success: false,
        message: "Server error",
      });
    }
  }
);

// @route   PUT /api/projects/:id
// @desc    Update project
// @access  Private
router.put(
  "/:id",
  [
    body("name")
      .optional()
      .trim()
      .isLength({ min: 1, max: 100 })
      .withMessage("Project name must be between 1 and 100 characters"),
    body("description")
      .optional()
      .trim()
      .isLength({ max: 500 })
      .withMessage("Description cannot be more than 500 characters"),
    body("color")
      .optional()
      .isIn(["blue", "green", "purple", "orange", "pink", "red", "yellow"])
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

      await updateProject(req, res);
    } catch (error) {
      console.error("Update project route error:", error);
      res.status(500).json({
        success: false,
        message: "Server error",
      });
    }
  }
);

// @route   DELETE /api/projects/:id
// @desc    Delete project
// @access  Private
router.delete("/:id", deleteProject);

// @route   POST /api/projects/:id/members
// @desc    Add member to project
// @access  Private
router.post(
  "/:id/members",
  [
    body("email")
      .isEmail()
      .normalizeEmail()
      .withMessage("Please provide a valid email"),
    body("role")
      .optional()
      .isIn(["admin", "member"])
      .withMessage("Role must be either admin or member"),
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

      await addMember(req, res);
    } catch (error) {
      console.error("Add member route error:", error);
      res.status(500).json({
        success: false,
        message: "Server error",
      });
    }
  }
);

// @route   DELETE /api/projects/:id/members/:memberId
// @desc    Remove member from project
// @access  Private
router.delete("/:id/members/:memberId", removeMember);

// @route   GET /api/projects/:id/cards
// @desc    Get all cards for a project
// @access  Private
router.get("/:id/cards", projectMemberAuth, async (req, res) => {
  try {
    const { getCards } = require("../controllers/cardController");
    await getCards(req, res);
  } catch (error) {
    console.error("Get project cards route error:", error);
    res.status(500).json({
      success: false,
      message: "Server error while fetching cards",
    });
  }
});

// @route   GET /api/projects/:id/stories
// @desc    Get all stories for a project
// @access  Private
router.get("/:id/stories", projectMemberAuth, async (req, res) => {
  try {
    const { getStories } = require("../controllers/storyController");
    // Map the :id param to :projectId for the controller
    req.params.projectId = req.params.id;
    await getStories(req, res);
  } catch (error) {
    console.error("Get project stories route error:", error);
    res.status(500).json({
      success: false,
      message: "Server error while fetching stories",
    });
  }
});

module.exports = router;
