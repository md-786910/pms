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
  getArchivedProjects,
  restoreProject,
  permanentDeleteProject,
} = require("../controllers/projectController");
const { auth, projectMemberAuth, adminAuth } = require("../middleware/auth");
const { uploadMiddleware } = require("../middleware/upload");

const router = express.Router();

// All routes require authentication
router.use(auth);

// @route   GET /api/projects
// @desc    Get all projects for a user
// @access  Private
router.get("/", getProjects);

// @route   POST /api/projects
// @desc    Create new project
// @access  Private
router.post(
  "/",
  adminAuth,
  [
    body("name")
      .trim()
      .isLength({ min: 1, max: 100 })
      .withMessage("Project name must be between 1 and 100 characters"),
    body("description")
      .optional()
      .trim()
      .isLength({ max: 20000 })
      .withMessage("Description cannot be more than 20000 characters"),
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

// @route   GET /api/projects/archived
// @desc    Get all archived projects
// @access  Private (Admin only)
router.get("/archived", adminAuth, getArchivedProjects);

// @route   PUT /api/projects/:id/restore
// @desc    Restore archived project
// @access  Private (Admin only)
router.put("/:id/restore", adminAuth, restoreProject);

// @route   DELETE /api/projects/:id/permanent
// @desc    Permanently delete project
// @access  Private (Admin only)
router.delete("/:id/permanent", adminAuth, permanentDeleteProject);

// @route   POST /api/projects/:id/upload
// @desc    Upload files for a project
// @access  Private
router.post(
  "/:id/upload",
  projectMemberAuth,
  uploadMiddleware,
  async (req, res) => {
    try {
      console.log("Upload route hit - Project ID:", req.params.id);
      console.log("Upload route - Params:", req.params);
      console.log("Upload route - User:", req.user ? req.user._id : "No user");
      console.log("Upload route - Files:", req.files);

      const projectId = req.params.id;
      const userId = req.user._id;
      const uploadedFiles = req.files || [];

      if (uploadedFiles.length === 0) {
        return res.status(400).json({
          success: false,
          message: "No files uploaded",
        });
      }

      // Get the project (already validated by projectMemberAuth)
      const Project = require("../models/Project");
      const Activity = require("../models/Activity");
      const User = require("../models/User");
      const Notification = require("../models/Notification");
      const { sendProjectUpdateEmail } = require("../config/email");

      const project = await Project.findById(projectId);

      // Add uploaded files to project attachments
      const newAttachments = uploadedFiles.map((file) => ({
        filename: file.filename,
        originalName: file.originalName,
        mimeType: file.mimeType,
        size: file.size,
        url: file.url,
        uploadedAt: new Date(),
      }));

      project.attachments = [...(project.attachments || []), ...newAttachments];
      await project.save();

      // Create activity for file uploads
      const fileNames = newAttachments
        .map((att) => att.originalName)
        .join(", ");
      const changeDetails = newAttachments.map((att) => ({
        field: "File Added",
        icon: "➕",
        oldValue: "N/A",
        newValue: att.originalName,
      }));

      const activity = new Activity({
        project: projectId,
        user: userId,
        type: "attachment_added",
        message: `Added ${uploadedFiles.length} file(s) to project`,
        details: {
          changes: [`added ${uploadedFiles.length} file(s)`],
          changeDetails: changeDetails,
          uploadedFiles: newAttachments.map((att) => att.originalName),
        },
      });
      await activity.save();

      // Get project with members for notifications
      const projectWithMembers = await Project.findById(projectId).populate(
        "members.user",
        "name email"
      );
      const updatedBy = await User.findById(userId).select("name email");

      if (projectWithMembers && updatedBy) {
        // Create notifications and send emails for all project members except the user who performed the action
        const notifications = [];
        const emailPromises = [];

        for (const member of projectWithMembers.members) {
          if (member.user._id.toString() !== userId.toString()) {
            notifications.push({
              user: member.user._id,
              sender: userId,
              type: "project_activity",
              title: "Project Activity",
              message: `Added ${uploadedFiles.length} file(s) to project`,
              relatedProject: projectId,
              data: {
                activityType: "attachment_added",
                activityId: activity._id,
              },
            });

            // Send email notification for file uploads
            emailPromises.push(
              sendProjectUpdateEmail(
                member.user,
                projectWithMembers,
                updatedBy,
                `Added ${uploadedFiles.length} file(s): ${fileNames}`,
                changeDetails
              )
            );
          }
        }

        // Save notifications
        if (notifications.length > 0) {
          await Notification.insertMany(notifications);
        }

        // Send emails asynchronously
        if (emailPromises.length > 0) {
          Promise.allSettled(emailPromises).catch((error) => {
            console.error("Error sending file upload emails:", error);
          });
        }
      }

      res.json({
        success: true,
        message: `${uploadedFiles.length} file(s) uploaded successfully`,
        attachments: newAttachments,
      });
    } catch (error) {
      console.error("Upload files route error:", error);
      res.status(500).json({
        success: false,
        message: "Server error while uploading files",
        error: error.message,
      });
    }
  }
);

// @route   DELETE /api/projects/:id/attachments/:attachmentId
// @desc    Delete an attachment from a project
// @access  Private
router.delete(
  "/:id/attachments/:attachmentId",
  projectMemberAuth,
  async (req, res) => {
    try {
      const projectId = req.params.id;
      const attachmentId = req.params.attachmentId;
      const userId = req.user._id;

      // Get the project
      const Project = require("../models/Project");
      const Activity = require("../models/Activity");
      const User = require("../models/User");
      const Notification = require("../models/Notification");
      const { sendProjectUpdateEmail } = require("../config/email");

      const project = await Project.findById(projectId);

      if (!project) {
        return res.status(404).json({
          success: false,
          message: "Project not found",
        });
      }

      // Find the attachment to delete
      const attachment = project.attachments.find(
        (att) => att._id.toString() === attachmentId
      );
      if (!attachment) {
        return res.status(404).json({
          success: false,
          message: "Attachment not found",
        });
      }

      // Store attachment details before removal
      const attachmentName = attachment.originalName;

      // Remove attachment from project
      project.attachments = project.attachments.filter(
        (att) => att._id.toString() !== attachmentId
      );
      await project.save();

      // Delete the actual file from filesystem
      const {
        deleteFile,
        getFilePathFromUrl,
      } = require("../middleware/upload");
      const filePath = getFilePathFromUrl(attachment.url);
      deleteFile(filePath);

      // Create activity for file removal
      const changeDetails = [
        {
          field: "File Removed",
          icon: "➖",
          oldValue: attachmentName,
          newValue: "N/A",
        },
      ];

      const activity = new Activity({
        project: projectId,
        user: userId,
        type: "attachment_removed",
        message: `Removed file "${attachmentName}" from project`,
        details: {
          changes: [`removed file "${attachmentName}"`],
          changeDetails: changeDetails,
          removedFile: attachmentName,
        },
      });
      await activity.save();

      // Get project with members for notifications
      const projectWithMembers = await Project.findById(projectId).populate(
        "members.user",
        "name email"
      );
      const updatedBy = await User.findById(userId).select("name email");

      if (projectWithMembers && updatedBy) {
        // Create notifications and send emails for all project members except the user who performed the action
        const notifications = [];
        const emailPromises = [];

        for (const member of projectWithMembers.members) {
          if (member.user._id.toString() !== userId.toString()) {
            notifications.push({
              user: member.user._id,
              sender: userId,
              type: "project_activity",
              title: "Project Activity",
              message: `Removed file "${attachmentName}" from project`,
              relatedProject: projectId,
              data: {
                activityType: "attachment_removed",
                activityId: activity._id,
              },
            });

            // Send email notification for file removal
            emailPromises.push(
              sendProjectUpdateEmail(
                member.user,
                projectWithMembers,
                updatedBy,
                `Removed file: ${attachmentName}`,
                changeDetails
              )
            );
          }
        }

        // Save notifications
        if (notifications.length > 0) {
          await Notification.insertMany(notifications);
        }

        // Send emails asynchronously
        if (emailPromises.length > 0) {
          Promise.allSettled(emailPromises).catch((error) => {
            console.error("Error sending file deletion emails:", error);
          });
        }
      }

      res.json({
        success: true,
        message: "Attachment deleted successfully",
      });
    } catch (error) {
      console.error("Delete attachment route error:", error);
      res.status(500).json({
        success: false,
        message: "Server error while deleting attachment",
      });
    }
  }
);

// @route   GET /api/projects/:id
// @desc    Get single project
// @access  Private
router.get("/:id", projectMemberAuth, getProject);

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
      .isLength({ max: 20000 })
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

// @route   POST /api/projects/:id/cards/move-all
// @desc    Move all cards from one column to another
// @access  Private
router.post(
  "/:id/cards/move-all",
  projectMemberAuth,
  [
    body("sourceStatus")
      .notEmpty()
      .withMessage("Source status is required")
      .isString()
      .withMessage("Source status must be a string"),
    body("targetStatus")
      .notEmpty()
      .withMessage("Target status is required")
      .isString()
      .withMessage("Target status must be a string"),
  ],
  async (req, res) => {
    try {
      const { moveAllCards } = require("../controllers/cardController");
      await moveAllCards(req, res);
    } catch (error) {
      console.error("Move all cards route error:", error);
      res.status(500).json({
        success: false,
        message: "Server error while moving cards",
      });
    }
  }
);

module.exports = router;
