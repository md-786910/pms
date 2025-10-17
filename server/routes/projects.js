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
const { projectUploadMiddleware } = require("../middleware/upload");

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
  projectUploadMiddleware,
  [
    body("name")
      .notEmpty()
      .trim()
      .isLength({ min: 1, max: 100 })
      .withMessage(
        "Project name is required and must be between 1 and 100 characters"
      ),
    body("description")
      .optional()
      .trim()
      .isLength({ max: 10000 })
      .withMessage("Description cannot be more than 10000 characters"),
    body("clientName")
      .optional()
      .trim()
      .isLength({ max: 100 })
      .withMessage("Client name cannot be more than 100 characters"),
    body("projectType")
      .notEmpty()
      .isIn(["Maintenance", "One Time", "On Going"])
      .withMessage(
        "Project type is required and must be one of: Maintenance, One Time, On Going"
      ),
    body("startDate")
      .notEmpty()
      .isDate()
      .withMessage("Start date is required and must be a valid date"),
    body("endDate").optional(),
    body("projectStatus")
      .notEmpty()
      .isIn(["active", "planning", "on-hold", "completed"])
      .withMessage(
        "Project status is required and must be one of: active, planning, on-hold, completed"
      ),
    body("liveSiteUrl")
      .optional()
      .custom((value) => {
        if (!value || value.trim() === "") return true;
        return /^https?:\/\/.+/.test(value);
      })
      .withMessage(
        "Live site URL must be a valid URL starting with http:// or https://"
      ),
    body("demoSiteUrl")
      .optional()
      .custom((value) => {
        if (!value || value.trim() === "") return true;
        return /^https?:\/\/.+/.test(value);
      })
      .withMessage(
        "Demo site URL must be a valid URL starting with http:// or https://"
      ),
    body("markupUrl")
      .optional()
      .custom((value) => {
        if (!value || value.trim() === "") return true;
        return /^https?:\/\/.+/.test(value);
      })
      .withMessage(
        "Markup URL must be a valid URL starting with http:// or https://"
      ),
  ],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: "Validation failed",
          errors: errors.array(),
        });
      }
      console.log("Creating project:", req.body);
      const projectCreated = await createProject(req, res);
      if (!projectCreated) {
        return res.status(400).json({
          success: false,
          message: "Project creation failed",
        });
      }
      return res.status(201).json({
        success: true,
        message: "Project created successfully",
        project: projectCreated,
      });
    } catch (error) {
      // Handle specific MongoDB errors
      if (error.name === "ValidationError") {
        const errors = Object.values(error.errors).map((e) => e.message);
        return res.status(400).json({
          success: false,
          message: "Validation Error",
          errors,
        });
      }

      if (error.code === 11000) {
        return res.status(400).json({
          success: false,
          message: "A project with this name already exists",
        });
      }
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
      .isLength({ max: 10000 })
      .withMessage("Description cannot be more than 10000 characters"),
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

module.exports = router;
