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
  getProjectTimeTrackingReport,
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

// @route   GET /api/projects/:id/time-tracking
// @desc    Admin report: Get time tracking summary for each card in the project (per-user totals)
// @access  Private (Admin only)
router.get("/:id/time-tracking", adminAuth, getProjectTimeTrackingReport);

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
  adminAuth,
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
router.delete("/:id", adminAuth, deleteProject);

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

// =============================================
// CREDENTIALS ROUTES (Admin manages, specific members can view)
// =============================================

// @route   POST /api/projects/:id/credentials
// @desc    Add a credential to project
// @access  Private (Admin only)
router.post(
  "/:id/credentials",
  adminAuth,
  [
    body("label")
      .trim()
      .isLength({ min: 1, max: 100 })
      .withMessage("Label must be between 1 and 100 characters"),
    body("value")
      .optional()
      .trim()
      .isLength({ max: 1000 })
      .withMessage("Value cannot be more than 1000 characters"),
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

      const Project = require("../models/Project");
      const projectId = req.params.id;
      const userId = req.user._id;
      const { label, value } = req.body;

      const project = await Project.findById(projectId);
      if (!project) {
        return res.status(404).json({
          success: false,
          message: "Project not found",
        });
      }

      // Add new credential
      const newCredential = {
        label,
        value: value || "",
        createdAt: new Date(),
        createdBy: userId,
      };

      project.credentials.push(newCredential);
      await project.save();

      // Populate and return
      await project.populate("owner", "name email avatar color");
      await project.populate("members.user", "name email avatar color");
      await project.populate("credentials.createdBy", "name email");
      await project.populate(
        "credentialAccess.user",
        "name email avatar color"
      );
      await project.populate("credentialAccess.grantedBy", "name email");

      res.status(201).json({
        success: true,
        message: "Credential added successfully",
        project,
        credential: project.credentials[project.credentials.length - 1],
      });
    } catch (error) {
      console.error("Add credential error:", error);
      res.status(500).json({
        success: false,
        message: "Server error while adding credential",
      });
    }
  }
);

// @route   PUT /api/projects/:id/credentials/:credentialId
// @desc    Update a credential
// @access  Private (Admin only)
router.put(
  "/:id/credentials/:credentialId",
  adminAuth,
  [
    body("label")
      .optional()
      .trim()
      .isLength({ min: 1, max: 100 })
      .withMessage("Label must be between 1 and 100 characters"),
    body("value")
      .optional()
      .trim()
      .isLength({ max: 1000 })
      .withMessage("Value cannot be more than 1000 characters"),
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

      const Project = require("../models/Project");
      const projectId = req.params.id;
      const credentialId = req.params.credentialId;
      const { label, value } = req.body;

      const project = await Project.findById(projectId);
      if (!project) {
        return res.status(404).json({
          success: false,
          message: "Project not found",
        });
      }

      // Find the credential
      const credentialIndex = project.credentials.findIndex(
        (c) => c._id.toString() === credentialId
      );

      if (credentialIndex === -1) {
        return res.status(404).json({
          success: false,
          message: "Credential not found",
        });
      }

      // Update the credential
      if (label !== undefined)
        project.credentials[credentialIndex].label = label;
      if (value !== undefined)
        project.credentials[credentialIndex].value = value;

      await project.save();

      // Populate and return
      await project.populate("owner", "name email avatar color");
      await project.populate("members.user", "name email avatar color");
      await project.populate("credentials.createdBy", "name email");
      await project.populate(
        "credentialAccess.user",
        "name email avatar color"
      );

      res.json({
        success: true,
        message: "Credential updated successfully",
        project,
        credential: project.credentials[credentialIndex],
      });
    } catch (error) {
      console.error("Update credential error:", error);
      res.status(500).json({
        success: false,
        message: "Server error while updating credential",
      });
    }
  }
);

// @route   DELETE /api/projects/:id/credentials/:credentialId
// @desc    Delete a credential
// @access  Private (Admin only)
router.delete("/:id/credentials/:credentialId", adminAuth, async (req, res) => {
  try {
    const Project = require("../models/Project");
    const projectId = req.params.id;
    const credentialId = req.params.credentialId;

    const project = await Project.findById(projectId);
    if (!project) {
      return res.status(404).json({
        success: false,
        message: "Project not found",
      });
    }

    // Find and remove the credential
    const credentialIndex = project.credentials.findIndex(
      (c) => c._id.toString() === credentialId
    );

    if (credentialIndex === -1) {
      return res.status(404).json({
        success: false,
        message: "Credential not found",
      });
    }

    project.credentials.splice(credentialIndex, 1);
    await project.save();

    // Populate and return
    await project.populate("owner", "name email avatar color");
    await project.populate("members.user", "name email avatar color");

    res.json({
      success: true,
      message: "Credential deleted successfully",
      project,
    });
  } catch (error) {
    console.error("Delete credential error:", error);
    res.status(500).json({
      success: false,
      message: "Server error while deleting credential",
    });
  }
});

// @route   POST /api/projects/:id/credential-access/:memberId
// @desc    Grant credential access to a project member
// @access  Private (Admin only)
router.post("/:id/credential-access/:memberId", adminAuth, async (req, res) => {
  try {
    const Project = require("../models/Project");
    const User = require("../models/User");
    const Notification = require("../models/Notification");
    const { sendCredentialAccessEmail } = require("../config/email");
    const { getIO } = require("../config/socket");

    const projectId = req.params.id;
    const memberId = req.params.memberId;
    const userId = req.user._id;

    const project = await Project.findById(projectId).populate(
      "members.user",
      "name email avatar color"
    );

    if (!project) {
      return res.status(404).json({
        success: false,
        message: "Project not found",
      });
    }

    // Check if user is a member of the project
    const isMember = project.members.some(
      (m) => m.user && m.user._id.toString() === memberId
    );

    if (!isMember) {
      return res.status(400).json({
        success: false,
        message: "User is not a member of this project",
      });
    }

    // Check if already has access
    const alreadyHasAccess = project.credentialAccess.some(
      (ca) => ca.user && ca.user.toString() === memberId
    );

    if (alreadyHasAccess) {
      return res.status(400).json({
        success: false,
        message: "User already has credential access",
      });
    }

    // Grant access
    project.credentialAccess.push({
      user: memberId,
      grantedAt: new Date(),
      grantedBy: userId,
    });

    await project.save();

    // Get the member details for notification
    const memberUser = await User.findById(memberId);
    const grantedByUser = await User.findById(userId);

    // Create notification for the member
    const notification = new Notification({
      user: memberId,
      sender: userId,
      type: "credential_access",
      title: "Credential Access Granted",
      message: `You have been granted access to view credentials for project "${project.name}"`,
      relatedProject: projectId,
    });

    await notification.save();

    // Populate notification
    await notification.populate("sender", "name email avatar color");
    await notification.populate("relatedProject", "name");

    // Send real-time notification
    try {
      const io = getIO();
      io.to(`user-${memberId}`).emit("new-notification", { notification });

      // Emit credential access granted event to the member
      io.to(`user-${memberId}`).emit("credential-access-granted", {
        projectId,
        project: {
          _id: project._id,
          name: project.name,
          credentials: project.credentials,
          credentialAccess: project.credentialAccess,
        },
      });

      // Emit to project room so all viewers see the update
      io.to(`project-${projectId}`).emit("project-credential-access-updated", {
        projectId,
        memberId,
        memberName: memberUser.name,
        action: "granted",
        credentialAccess: project.credentialAccess,
      });
    } catch (socketError) {
      console.error("Socket error:", socketError);
    }

    // Send email notification
    setImmediate(async () => {
      try {
        await sendCredentialAccessEmail(memberUser, project, grantedByUser);
        console.log(`Credential access email sent to ${memberUser.email}`);
      } catch (emailError) {
        console.error("Error sending credential access email:", emailError);
      }
    });

    // Populate and return
    await project.populate("owner", "name email avatar color");
    await project.populate("credentialAccess.user", "name email avatar color");
    await project.populate("credentialAccess.grantedBy", "name email");

    res.json({
      success: true,
      message: `Credential access granted to ${memberUser.name}`,
      project,
    });
  } catch (error) {
    console.error("Grant credential access error:", error);
    res.status(500).json({
      success: false,
      message: "Server error while granting credential access",
    });
  }
});

// @route   DELETE /api/projects/:id/credential-access/:memberId
// @desc    Revoke credential access from a project member
// @access  Private (Admin only)
router.delete(
  "/:id/credential-access/:memberId",
  adminAuth,
  async (req, res) => {
    try {
      const Project = require("../models/Project");
      const User = require("../models/User");
      const Notification = require("../models/Notification");
      const { getIO } = require("../config/socket");

      const projectId = req.params.id;
      const memberId = req.params.memberId;
      const userId = req.user._id;

      const project = await Project.findById(projectId);

      if (!project) {
        return res.status(404).json({
          success: false,
          message: "Project not found",
        });
      }

      // Check if has access
      const accessIndex = project.credentialAccess.findIndex(
        (ca) => ca.user && ca.user.toString() === memberId
      );

      if (accessIndex === -1) {
        return res.status(400).json({
          success: false,
          message: "User does not have credential access",
        });
      }

      // Revoke access
      project.credentialAccess.splice(accessIndex, 1);
      await project.save();

      // Get member details
      const memberUser = await User.findById(memberId);

      // Create notification
      const notification = new Notification({
        user: memberId,
        sender: userId,
        type: "credential_access_revoked",
        title: "Credential Access Revoked",
        message: `Your credential access for project "${project.name}" has been revoked`,
        relatedProject: projectId,
      });

      await notification.save();
      await notification.populate("sender", "name email avatar color");
      await notification.populate("relatedProject", "name");

      // Send real-time notification
      try {
        const io = getIO();
        io.to(`user-${memberId}`).emit("new-notification", { notification });

        // Emit credential access revoked event to the member
        io.to(`user-${memberId}`).emit("credential-access-revoked", {
          projectId,
          memberId,
        });

        // Emit to project room so all viewers see the update
        io.to(`project-${projectId}`).emit(
          "project-credential-access-updated",
          {
            projectId,
            memberId,
            memberName: memberUser?.name || "User",
            action: "revoked",
            credentialAccess: project.credentialAccess,
          }
        );
      } catch (socketError) {
        console.error("Socket error:", socketError);
      }

      // Populate and return
      await project.populate("owner", "name email avatar color");
      await project.populate("members.user", "name email avatar color");
      await project.populate(
        "credentialAccess.user",
        "name email avatar color"
      );

      res.json({
        success: true,
        message: `Credential access revoked from ${memberUser?.name || "user"}`,
        project,
      });
    } catch (error) {
      console.error("Revoke credential access error:", error);
      res.status(500).json({
        success: false,
        message: "Server error while revoking credential access",
      });
    }
  }
);

// =============================================
// DESCRIPTION ROUTES (Notes/Documentation)
// =============================================

// @route   POST /api/projects/:id/descriptions
// @desc    Add a description/note to project
// @access  Private (Admin only)
router.post(
  "/:id/descriptions",
  adminAuth,
  [
    body("content")
      .trim()
      .isLength({ min: 1, max: 10000 })
      .withMessage("Content must be between 1 and 10000 characters"),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: errors.array()[0].msg,
        errors: errors.array(),
      });
    }

    try {
      const Project = require("../models/Project");
      const projectId = req.params.id;
      const { content } = req.body;
      const userId = req.user._id;

      const project = await Project.findById(projectId);

      if (!project) {
        return res.status(404).json({
          success: false,
          message: "Project not found",
        });
      }

      // Initialize descriptions array if it doesn't exist
      if (!project.descriptions) {
        project.descriptions = [];
      }

      const newDescription = {
        content,
        createdBy: userId,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      project.descriptions.push(newDescription);
      await project.save();

      // Populate and return
      await project.populate("owner", "name email avatar color");
      await project.populate("members.user", "name email avatar color");
      await project.populate(
        "descriptions.createdBy",
        "name email avatar color"
      );

      res.status(201).json({
        success: true,
        message: "Description added successfully",
        project,
        description: project.descriptions[project.descriptions.length - 1],
      });
    } catch (error) {
      console.error("Add description error:", error);
      res.status(500).json({
        success: false,
        message: "Server error while adding description",
      });
    }
  }
);

// @route   PUT /api/projects/:id/descriptions/:descriptionId
// @desc    Update a description/note
// @access  Private (Admin only)
router.put(
  "/:id/descriptions/:descriptionId",
  adminAuth,
  [
    body("content")
      .optional()
      .trim()
      .isLength({ min: 1, max: 10000 })
      .withMessage("Content must be between 1 and 10000 characters"),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: errors.array()[0].msg,
        errors: errors.array(),
      });
    }

    try {
      const Project = require("../models/Project");
      const projectId = req.params.id;
      const descriptionId = req.params.descriptionId;
      const { content } = req.body;

      const project = await Project.findById(projectId);

      if (!project) {
        return res.status(404).json({
          success: false,
          message: "Project not found",
        });
      }

      // Find the description
      const descriptionIndex = project.descriptions.findIndex(
        (d) => d._id.toString() === descriptionId
      );

      if (descriptionIndex === -1) {
        return res.status(404).json({
          success: false,
          message: "Description not found",
        });
      }

      // Update the description
      if (content !== undefined) {
        project.descriptions[descriptionIndex].content = content;
        project.descriptions[descriptionIndex].updatedAt = new Date();
      }

      await project.save();

      // Populate and return
      await project.populate("owner", "name email avatar color");
      await project.populate("members.user", "name email avatar color");
      await project.populate(
        "descriptions.createdBy",
        "name email avatar color"
      );

      res.json({
        success: true,
        message: "Description updated successfully",
        project,
        description: project.descriptions[descriptionIndex],
      });
    } catch (error) {
      console.error("Update description error:", error);
      res.status(500).json({
        success: false,
        message: "Server error while updating description",
      });
    }
  }
);

// @route   DELETE /api/projects/:id/descriptions/:descriptionId
// @desc    Delete a description/note
// @access  Private (Admin only)
router.delete(
  "/:id/descriptions/:descriptionId",
  adminAuth,
  async (req, res) => {
    try {
      const Project = require("../models/Project");
      const projectId = req.params.id;
      const descriptionId = req.params.descriptionId;

      const project = await Project.findById(projectId);

      if (!project) {
        return res.status(404).json({
          success: false,
          message: "Project not found",
        });
      }

      // Find and remove the description
      const descriptionIndex = project.descriptions.findIndex(
        (d) => d._id.toString() === descriptionId
      );

      if (descriptionIndex === -1) {
        return res.status(404).json({
          success: false,
          message: "Description not found",
        });
      }

      project.descriptions.splice(descriptionIndex, 1);
      await project.save();

      // Populate and return
      await project.populate("owner", "name email avatar color");
      await project.populate("members.user", "name email avatar color");
      await project.populate(
        "descriptions.createdBy",
        "name email avatar color"
      );

      res.json({
        success: true,
        message: "Description deleted successfully",
        project,
      });
    } catch (error) {
      console.error("Delete description error:", error);
      res.status(500).json({
        success: false,
        message: "Server error while deleting description",
      });
    }
  }
);

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
