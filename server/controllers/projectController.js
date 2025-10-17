const Project = require("../models/Project");
const User = require("../models/User");
const Card = require("../models/Card");
const Notification = require("../models/Notification");
const Invitation = require("../models/Invitation");
const { sendProjectInvitationEmail } = require("../config/email");

// @route   GET /api/projects
// @desc    Get all projects for a user
// @access  Private
const getProjects = async (req, res) => {
  try {
    const userId = req.user._id;
    const userRole = req.user.role;

    let projects;

    if (userRole === "admin") {
      // Admin can see all projects
      // in operator status[]
      projects = await Project.find({
        status: { $in: ["active", "planning", "on-hold", "completed"] },
      })
        .populate("owner", "name email avatar color")
        .populate("members.user", "name email avatar color")
        .sort({ createdAt: -1 });
    } else {
      // Members can only see projects they're part of
      projects = await Project.find({
        $or: [{ owner: userId }, { "members.user": userId }],
        status: "active",
      })
        .populate("owner", "name email avatar color")
        .populate("members.user", "name email avatar color")
        .sort({ createdAt: -1 });
    }

    res.json({
      success: true,
      projects,
    });
  } catch (error) {
    console.error("Get projects error:", error);
    res.status(500).json({
      success: false,
      message: "Server error while fetching projects",
    });
  }
};

// @route   GET /api/projects/:id
// @desc    Get single project
// @access  Private
const getProject = async (req, res) => {
  try {
    const projectId = req.params.id;
    const userId = req.user._id;
    const userRole = req.user.role;

    const project = await Project.findById(projectId)
      .populate("owner", "name email avatar color")
      .populate("members.user", "name email avatar color");

    if (!project) {
      return res.status(404).json({
        success: false,
        message: "Project not found",
      });
    }

    // Check if user has access to this project
    const isOwner =
      project.owner && project.owner._id.toString() === userId.toString();
    const isMember = project.members.some(
      (member) =>
        member &&
        member.user &&
        member.user._id.toString() === userId.toString()
    );

    if (!isOwner && !isMember && userRole !== "admin") {
      return res.status(403).json({
        success: false,
        message: "Access denied. You are not a member of this project.",
      });
    }

    // Get project cards
    const cards = await Card.find({ project: projectId })
      .populate("assignees", "name email avatar color")
      .populate("createdBy", "name email avatar color")
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      project: {
        ...project.toObject(),
        cards,
      },
    });
  } catch (error) {
    console.error("Get project error:", error);
    res.status(500).json({
      success: false,
      message: "Server error while fetching project",
    });
  }
};

// @route   POST /api/projects
// @desc    Create new project
// @access  Private
const createProject = async (req, res) => {
  try {
    let {
      name,
      description,
      clientName,
      projectType,
      startDate,
      endDate = null,
      projectStatus = "active",
      color = "blue",
      liveSiteUrl,
      demoSiteUrl,
      markupUrl,
    } = req.body;

    // Handle FormData arrays - extract first element if it's an array
    const extractFirstValue = (value) =>
      Array.isArray(value) ? value[0] : value;

    name = extractFirstValue(name);
    description = extractFirstValue(description);
    clientName = extractFirstValue(clientName);
    projectType = extractFirstValue(projectType);
    startDate = extractFirstValue(startDate);
    endDate = extractFirstValue(endDate);
    projectStatus = extractFirstValue(projectStatus);
    color = extractFirstValue(color);
    liveSiteUrl = extractFirstValue(liveSiteUrl);
    demoSiteUrl = extractFirstValue(demoSiteUrl);
    markupUrl = extractFirstValue(markupUrl);

    // Convert date strings to Date objects with validation
    if (startDate) {
      startDate = new Date(startDate);
      if (isNaN(startDate.getTime())) {
        return res.status(400).json({
          success: false,
          message: "Invalid start date format",
        });
      }
    }
    if (endDate && endDate !== "") {
      endDate = new Date(endDate);
      if (isNaN(endDate.getTime())) {
        return res.status(400).json({
          success: false,
          message: "Invalid end date format",
        });
      }
    }

    // Debug logging to see the processed values
    console.log("Processed form data:", {
      name: typeof name,
      description: typeof description,
      clientName: typeof clientName,
      projectType: typeof projectType,
      projectStatus: typeof projectStatus,
      color: typeof color,
      liveSiteUrl: typeof liveSiteUrl,
      demoSiteUrl: typeof demoSiteUrl,
      markupUrl: typeof markupUrl,
    });

    console.log("Actual values:", {
      name,
      description,
      clientName,
      projectType,
      projectStatus,
      color,
      liveSiteUrl,
      demoSiteUrl,
      markupUrl,
    });
    const userId = req.user._id;

    // Handle file attachments if any
    const attachments = [];
    if (req.files && req.files.length > 0) {
      for (const file of req.files) {
        attachments.push({
          filename: file.filename,
          originalName: file.originalName,
          mimeType: file.mimeType,
          size: file.size,
          url: file.url,
          uploadedBy: userId,
        });
      }
    }

    // Validate required fields
    if (!name || !name.trim()) {
      return res.status(400).json({
        success: false,
        message: "Project name is required",
      });
    }

    if (
      !projectType ||
      !["Maintenance", "One Time", "On Going"].includes(projectType)
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Valid project type is required (Maintenance, One Time, or On Going)",
      });
    }

    if (!startDate) {
      return res.status(400).json({
        success: false,
        message: "Start date is required",
      });
    }

    // Validate date logic
    if (endDate && startDate && endDate < startDate) {
      return res.status(400).json({
        success: false,
        message: "End date cannot be before start date",
      });
    }

    console.log("Creating project with data:", {
      name,
      description,
      clientName,
      projectType,
      startDate,
      endDate,
      status: projectStatus,
      owner: userId,
      color,
      liveSiteUrl,
      demoSiteUrl,
      markupUrl,
    });

    const project = new Project({
      name: name.trim(),
      description: description ? description.trim() : "",
      clientName: clientName ? clientName.trim() : "",
      projectType,
      startDate: startDate || new Date(),
      endDate: endDate ? endDate : null,
      status: projectStatus || "active",
      owner: userId,
      members: [
        {
          user: userId,
          role: "admin",
        },
      ],
      color: color || "blue",
      liveSiteUrl,
      demoSiteUrl,
      markupUrl,
      attachments,
    });

    console.log("About to save project...");
    try {
      await project.save();
      console.log("Project saved successfully!");
    } catch (saveError) {
      console.error("Error saving project:", saveError);
      throw saveError;
    }

    // Populate the project with user details
    await project.populate("owner", "name email avatar color");
    await project.populate("members.user", "name email avatar color");
    await project.populate("attachments.uploadedBy", "name email avatar color");

    res.status(201).json({
      success: true,
      message: "Project created successfully",
      project,
    });
  } catch (error) {
    console.error("Create project error:", error);
    throw error;
  }
};

// @route   PUT /api/projects/:id
// @desc    Update project
// @access  Private
const updateProject = async (req, res) => {
  try {
    const projectId = req.params.id;
    const userId = req.user._id;
    let {
      name,
      description,
      clientName,
      projectType,
      startDate,
      endDate,
      color,
      liveSiteUrl,
      demoSiteUrl,
      markupUrl,
    } = req.body;

    // Handle FormData arrays - extract first element if it's an array
    if (Array.isArray(name)) name = name[0];
    if (Array.isArray(description)) description = description[0];
    if (Array.isArray(clientName)) clientName = clientName[0];
    if (Array.isArray(projectType)) projectType = projectType[0];
    if (Array.isArray(color)) color = color[0];
    if (Array.isArray(liveSiteUrl)) liveSiteUrl = liveSiteUrl[0];
    if (Array.isArray(demoSiteUrl)) demoSiteUrl = demoSiteUrl[0];
    if (Array.isArray(markupUrl)) markupUrl = markupUrl[0];

    const project = await Project.findById(projectId);

    if (!project) {
      return res.status(404).json({
        success: false,
        message: "Project not found",
      });
    }

    // Check if user is owner or admin
    const isOwner = project.owner.toString() === userId.toString();
    const isAdmin = req.user.role === "admin";

    if (!isOwner && !isAdmin) {
      return res.status(403).json({
        success: false,
        message: "Access denied. Only project owner can update project.",
      });
    }

    // Update project fields
    if (name) project.name = name;
    if (description) project.description = description;
    if (clientName) project.clientName = clientName;
    if (projectType) project.projectType = projectType;
    if (startDate) project.startDate = startDate;
    if (endDate) project.endDate = endDate;
    if (color) project.color = color;
    if (liveSiteUrl !== undefined) project.liveSiteUrl = liveSiteUrl;
    if (demoSiteUrl !== undefined) project.demoSiteUrl = demoSiteUrl;
    if (markupUrl !== undefined) project.markupUrl = markupUrl;

    await project.save();

    // Populate the project with user details
    await project.populate("owner", "name email avatar color");
    await project.populate("members.user", "name email avatar color");

    res.json({
      success: true,
      message: "Project updated successfully",
      project,
    });
  } catch (error) {
    console.error("Update project error:", error);
    res.status(500).json({
      success: false,
      message: "Server error while updating project",
    });
  }
};

// @route   DELETE /api/projects/:id
// @desc    Delete project
// @access  Private
const deleteProject = async (req, res) => {
  try {
    const projectId = req.params.id;
    const userId = req.user._id;

    const project = await Project.findById(projectId);

    if (!project) {
      return res.status(404).json({
        success: false,
        message: "Project not found",
      });
    }

    // Check if user is owner or admin
    const isOwner = project.owner.toString() === userId.toString();
    const isAdmin = req.user.role === "admin";

    if (!isOwner && !isAdmin) {
      return res.status(403).json({
        success: false,
        message: "Access denied. Only project owner can delete project.",
      });
    }

    // Start asynchronous cleanup process
    const {
      scheduleProjectCleanup,
    } = require("../services/projectCleanupService");
    scheduleProjectCleanup(projectId);

    // Delete the project immediately (synchronous)
    await Project.findByIdAndDelete(projectId);

    res.json({
      success: true,
      message:
        "Project deleted successfully. Related data cleanup is in progress.",
    });
  } catch (error) {
    console.error("Delete project error:", error);
    res.status(500).json({
      success: false,
      message: "Server error while deleting project",
    });
  }
};

// @route   POST /api/projects/:id/members
// @desc    Add member to project
// @access  Private
const addMember = async (req, res) => {
  try {
    const projectId = req.params.id;
    const userId = req.user._id;
    const { email, role = "member" } = req.body;

    const project = await Project.findById(projectId);

    if (!project) {
      return res.status(404).json({
        success: false,
        message: "Project not found",
      });
    }

    // Check if user is owner or admin
    const isOwner = project.owner.toString() === userId.toString();
    const isAdmin = req.user.role === "admin";

    if (!isOwner && !isAdmin) {
      return res.status(403).json({
        success: false,
        message: "Access denied. Only project owner can add members.",
      });
    }

    // Find user by email
    const userToAdd = await User.findOne({ email });

    if (userToAdd) {
      // User exists - add them directly to the project
      // Check if user is already a member
      const isAlreadyMember = project.members.some(
        (member) =>
          member &&
          member.user &&
          member.user.toString() === userToAdd._id.toString()
      );

      if (isAlreadyMember) {
        return res.status(400).json({
          success: false,
          message: "User is already a member of this project",
        });
      }

      // Add user directly to project
      project.members.push({
        user: userToAdd._id,
        role: role,
      });

      await project.save();

      // Create notification for the added member
      const notification = new Notification({
        user: userToAdd._id,
        sender: userId,
        type: "project_joined",
        title: "Added to Project",
        message: `You have been added to the project "${project.name}"`,
        relatedProject: projectId,
      });

      await notification.save();

      // Send notification email to existing user (no password creation needed)
      setImmediate(async () => {
        try {
          await sendProjectInvitationEmail(
            userToAdd,
            project,
            req.user,
            null // No token for existing users
          );
          console.log(
            `Project notification email sent to existing user ${userToAdd.email}`
          );
        } catch (emailError) {
          console.error(
            "Error sending project notification email:",
            emailError
          );
        }
      });

      // Populate the project with user details
      await project.populate("owner", "name email avatar color");
      await project.populate("members.user", "name email avatar color");

      return res.json({
        success: true,
        message: "User added to project successfully",
        project,
      });
    } else {
      // User doesn't exist - create invitation

      // Check if invitation already exists (any status)
      const existingInvitation = await Invitation.findOne({
        email,
        project: projectId,
      });

      if (existingInvitation) {
        if (existingInvitation.status === "accepted") {
          return res.status(400).json({
            success: false,
            message: "User has already accepted an invitation for this project",
          });
        } else {
          // For pending, expired, or cancelled invitations, resend the invitation
          existingInvitation.status = "pending";
          existingInvitation.invitedBy = userId;
          existingInvitation.role = role;
          existingInvitation.generateToken(); // Generate new token for security
          await existingInvitation.save();

          // Send invitation email (async, non-blocking)
          setImmediate(async () => {
            try {
              await sendProjectInvitationEmail(
                { email, name: email.split("@")[0] },
                project,
                req.user,
                existingInvitation.token
              );
              console.log(`Project invitation email resent to ${email}`);
            } catch (emailError) {
              console.error(
                "Error resending project invitation email:",
                emailError
              );
            }
          });

          return res.json({
            success: true,
            message: "Invitation resent successfully",
            invitation: {
              email: existingInvitation.email,
              role: existingInvitation.role,
              expiresAt: existingInvitation.expiresAt,
            },
          });
        }
      }

      // Create new invitation
      const invitation = new Invitation({
        email,
        project: projectId,
        invitedBy: userId,
        role,
      });

      // Generate invitation token
      invitation.generateToken();
      await invitation.save();

      // Send invitation email (async, non-blocking)
      setImmediate(async () => {
        try {
          await sendProjectInvitationEmail(
            { email, name: email.split("@")[0] }, // Create a temporary user object for email
            project,
            req.user,
            invitation.token
          );
          console.log(`Project invitation email sent to ${email}`);
        } catch (emailError) {
          console.error("Error sending project invitation email:", emailError);
        }
      });

      res.json({
        success: true,
        message: "Invitation sent successfully",
        invitation: {
          email: invitation.email,
          role: invitation.role,
          expiresAt: invitation.expiresAt,
        },
      });
    }
  } catch (error) {
    console.error("Add member error:", error);
    res.status(500).json({
      success: false,
      message: "Server error while adding member",
    });
  }
};

// @route   DELETE /api/projects/:id/members/:memberId
// @desc    Remove member from project
// @access  Private
const removeMember = async (req, res) => {
  try {
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

    // Check if user is owner or admin
    const isOwner = project.owner.toString() === userId.toString();
    const isAdmin = req.user.role === "admin";

    if (!isOwner && !isAdmin) {
      return res.status(403).json({
        success: false,
        message: "Access denied. Only project owner can remove members.",
      });
    }

    // Check if trying to remove the owner
    if (project.owner.toString() === memberId) {
      return res.status(400).json({
        success: false,
        message: "Cannot remove project owner",
      });
    }

    // Get user email before removing them
    const userToRemove = await User.findById(memberId);
    if (!userToRemove) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // Remove member from project
    project.members = project.members.filter(
      (member) => member && member.user && member.user.toString() !== memberId
    );

    await project.save();

    // Update invitation status to cancelled when user is removed
    const invitationUpdateResult = await Invitation.updateMany(
      {
        project: projectId,
        email: userToRemove.email,
      },
      { status: "cancelled" }
    );

    console.log(
      `Updated ${invitationUpdateResult.modifiedCount} invitations to cancelled for user ${userToRemove.email} in project ${projectId}`
    );

    // Also check if there are any invitations that weren't updated
    const remainingInvitations = await Invitation.find({
      project: projectId,
      email: userToRemove.email,
      status: { $ne: "cancelled" },
    });

    if (remainingInvitations.length > 0) {
      console.log(
        `Warning: Found ${remainingInvitations.length} invitations that weren't updated to cancelled:`,
        remainingInvitations.map((inv) => ({
          id: inv._id,
          status: inv.status,
          email: inv.email,
        }))
      );
    }

    // Remove user from all cards in this project
    await Card.updateMany(
      { project: projectId },
      { $pull: { assignees: memberId } }
    );

    // Create notification for the removed member
    const notification = new Notification({
      user: memberId,
      sender: userId,
      type: "system",
      title: "Removed from Project",
      message: `You have been removed from the project "${project.name}"`,
      relatedProject: projectId,
    });

    await notification.save();

    // Populate the project with user details
    await project.populate("owner", "name email avatar color");
    await project.populate("members.user", "name email avatar color");

    res.json({
      success: true,
      message: "Member removed successfully",
      project,
    });
  } catch (error) {
    console.error("Remove member error:", error);
    res.status(500).json({
      success: false,
      message: "Server error while removing member",
    });
  }
};

module.exports = {
  getProjects,
  getProject,
  createProject,
  updateProject,
  deleteProject,
  addMember,
  removeMember,
};
