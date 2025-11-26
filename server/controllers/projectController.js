const Project = require("../models/Project");
const User = require("../models/User");
const Card = require("../models/Card");
const Notification = require("../models/Notification");
const Invitation = require("../models/Invitation");
const Activity = require("../models/Activity");
const { createDefaultColumns } = require("./columnController");
const {
  sendProjectInvitationEmail,
  sendProjectUpdateEmail,
  sendMemberRemovedEmail,
} = require("../config/email");
const { COLOR_PALETTE } = require("../../client/src/utils/color");
const { getIO } = require("../config/socket");

const assignColor = async () => {
  // Fetch all used colors from DB
  const projects = await Project.find({}, "bgColor");
  const usedColors = new Set(projects.map((p) => p.bgColor));

  // Queue: available colors
  const availableColors = COLOR_PALETTE.filter((c) => !usedColors.has(c));

  if (availableColors.length > 0) {
    // Pick the first color in the queue (DSA: FIFO)
    return availableColors[0];
  }

  // If all colors are used, generate random new color
  return (
    "#" +
    Math.floor(Math.random() * 16777215)
      .toString(16)
      .padStart(6, "0")
  );
};

// Helper function to create activity and send notifications
const createActivityAndNotify = async (
  projectId,
  userId,
  type,
  message,
  details = {}
) => {
  try {
    // Create activity
    const activity = new Activity({
      project: projectId,
      user: userId,
      type,
      message,
      details,
    });
    await activity.save();

    // Get project with members and user who performed the action
    const project = await Project.findById(projectId).populate(
      "members.user",
      "name email"
    );
    const updatedBy = await User.findById(userId).select("name email");

    if (!project || !updatedBy) return activity;

    // Create notifications and send emails for all project members except the user who performed the action
    const notifications = [];
    const emailPromises = [];

    for (const member of project.members) {
      if (member.user._id.toString() !== userId.toString()) {
        // Create notification
        notifications.push({
          user: member.user._id,
          sender: userId,
          type: "project_activity",
          title: "Project Activity",
          message: message,
          relatedProject: projectId,
          data: {
            activityType: type,
            activityId: activity._id,
          },
        });

        // Send email notification for project updates
        if (type === "project_updated") {
          emailPromises.push(
            sendProjectUpdateEmail(
              member.user,
              project,
              updatedBy,
              message,
              details.detailedChanges
            )
          );
        }
      }
    }

    // Save notifications
    if (notifications.length > 0) {
      await Notification.insertMany(notifications);
    }

    // Send emails asynchronously (don't wait for them)
    if (emailPromises.length > 0) {
      console.log(
        `📧 Attempting to send ${emailPromises.length} project update emails`
      );
      Promise.allSettled(emailPromises)
        .then((results) => {
          results.forEach((result, index) => {
            if (result.status === "rejected") {
              console.error(
                `❌ Failed to send email to member ${index}:`,
                result.reason
              );
            } else {
              console.log(`✅ Email sent successfully to member ${index}`);
            }
          });
        })
        .catch((error) => {
          console.error("❌ Error in email sending process:", error);
        });
    } else {
      console.log("📧 No emails to send (no members or no project updates)");
    }

    return activity;
  } catch (error) {
    console.error("Error creating activity and notifications:", error);
  }
};

// @route   GET /api/projects
// @desc    Get all projects for a user
// @access  Private
const getProjects = async (req, res) => {
  try {
    const userId = req.user._id;
    const userRole = req.user.role;

    let projects;

    if (userRole === "admin") {
      // Admin can see all active (non-archived) projects
      projects = await Project.find({ status: "active", isArchived: { $ne: true } })
        .populate("owner", "name email avatar color")
        .populate("members.user", "name email avatar color")
        .sort({ createdAt: -1 });
    } else {
      // Members can only see projects they're part of (non-archived)
      projects = await Project.find({
        $or: [{ owner: userId }, { "members.user": userId }],
        status: "active",
        isArchived: { $ne: true },
      })
        .populate("owner", "name email avatar color")
        .populate("members.user", "name email avatar color")
        .sort({ createdAt: -1 });
    }

    // manipulate project
    // projects = projects.map((project, index) => {
    //   const projectColor = project.bgColor
    //     ? project.bgColor
    //     : COLOR_PALETTE[(index % COLOR_PALETTE.length) - 1];
    //   return {
    //     ...project.toJSON(),
    //     bgColor: projectColor,
    //   };
    // });

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
    const {
      name,
      description,
      clientName,
      projectType,
      projectStatus,
      startDate,
      endDate,
      liveSiteUrl,
      demoSiteUrl,
      markupUrl,
      attachments = [],
      color = "blue",
    } = req.body;
    const userId = req.user._id;
    const bgColor = await assignColor();
    const project = new Project({
      name,
      description,
      clientName,
      projectType,
      projectStatus,
      startDate: startDate || new Date(),
      endDate: endDate || null,
      liveSiteUrl,
      demoSiteUrl,
      markupUrl,
      attachments,
      owner: userId,
      members: [
        {
          user: userId,
          role: "admin",
        },
      ],
      color,
      bgColor,
    });

    await project.save();

    // Create default columns asynchronously (non-blocking)
    setImmediate(async () => {
      try {
        await createDefaultColumns(project._id, userId);
        console.log(`Default columns created for project ${project._id}`);
      } catch (columnError) {
        console.error("Error creating default columns:", columnError);
      }
    });

    // Create activity and send notifications
    await createActivityAndNotify(
      project._id,
      userId,
      "project_created",
      `Created project "${name}"`,
      {
        projectName: name,
        projectType: projectType,
        membersCount: project.members.length,
      }
    );

    // Populate the project with user details
    await project.populate("owner", "name email avatar color");
    await project.populate("members.user", "name email avatar color");

    res.status(201).json({
      success: true,
      message: "Project created successfully",
      project,
    });
  } catch (error) {
    console.error("Create project error:", error);
    res.status(500).json({
      success: false,
      message: "Server error while creating project",
    });
  }
};

// @route   PUT /api/projects/:id
// @desc    Update project
// @access  Private
const updateProject = async (req, res) => {
  try {
    const projectId = req.params.id;
    const userId = req.user._id;
    const {
      name,
      description,
      clientName,
      projectType,
      projectStatus,
      startDate,
      endDate,
      liveSiteUrl,
      demoSiteUrl,
      markupUrl,
      attachments,
      color,
    } = req.body;

    const project = await Project.findById(projectId).populate(
      "owner",
      "name email avatar color role"
    );

    if (!project) {
      return res.status(404).json({
        success: false,
        message: "Project not found",
      });
    }

    // Check if user can update this project
    const isOwner = project.owner.toString() === userId.toString();
    const isAdmin = req.user.role === "admin";
    const isMember = project.members.some(
      (member) =>
        member && member.user && member.user.toString() === userId.toString()
    );

    // Allow update if:
    // 1. User is the owner
    // 2. User is admin
    // 3. User is a member of the project
    if (!isOwner && !isAdmin && !isMember) {
      return res.status(403).json({
        success: false,
        message:
          "Access denied. Only project owner, admin, or members can update project.",
      });
    }

    // Track actual changes before updating
    const changes = [];
    const changeDetails = [];
    const originalProject = project.toObject();

    // Helper function to format values for display
    const formatValue = (value) => {
      if (value === null || value === undefined || value === "") return "Empty";
      if (typeof value === "string" && value.trim() === "") return "Empty";
      return value;
    };

    // Helper function to normalize date values for comparison
    const normalizeDate = (dateValue) => {
      if (!dateValue) return null;
      if (dateValue instanceof Date) {
        return dateValue.toISOString().split("T")[0];
      }
      if (typeof dateValue === "string" && dateValue.trim() === "") {
        return null;
      }
      return dateValue;
    };

    // Helper function to check if two values are actually different
    const valuesAreDifferent = (oldValue, newValue) => {
      // Normalize empty values
      const normalizeEmpty = (val) => {
        if (val === null || val === undefined || val === "") return null;
        if (typeof val === "string" && val.trim() === "") return null;
        return val;
      };

      return normalizeEmpty(oldValue) !== normalizeEmpty(newValue);
    };

    // Update project fields and track changes
    if (name !== undefined && name !== originalProject.name) {
      project.name = name;
      changes.push(`name to "${name}"`);
      changeDetails.push({
        field: "Project Name",
        icon: "📝",
        oldValue: formatValue(originalProject.name),
        newValue: formatValue(name),
      });
    }
    if (
      description !== undefined &&
      valuesAreDifferent(originalProject.description, description)
    ) {
      project.description = description;
      changes.push(`description`);
      changeDetails.push({
        field: "Description",
        icon: "📄",
        oldValue: formatValue(originalProject.description),
        newValue: formatValue(description),
      });
    }
    if (
      clientName !== undefined &&
      valuesAreDifferent(originalProject.clientName, clientName)
    ) {
      project.clientName = clientName;
      changes.push(`client name to "${clientName}"`);
      changeDetails.push({
        field: "Client Name",
        icon: "🏢",
        oldValue: formatValue(originalProject.clientName),
        newValue: formatValue(clientName),
      });
    }
    if (
      projectType !== undefined &&
      projectType !== originalProject.projectType
    ) {
      project.projectType = projectType;
      changes.push(`project type to "${projectType}"`);
      changeDetails.push({
        field: "Project Type",
        icon: "📋",
        oldValue: formatValue(originalProject.projectType),
        newValue: formatValue(projectType),
      });
    }
    if (
      projectStatus !== undefined &&
      projectStatus !== originalProject.projectStatus
    ) {
      project.projectStatus = projectStatus;
      changes.push(`project status to "${projectStatus}"`);
      changeDetails.push({
        field: "Project Status",
        icon: "📊",
        oldValue: formatValue(originalProject.projectStatus),
        newValue: formatValue(projectStatus),
      });
    }
    if (startDate !== undefined) {
      const normalizedOldStartDate = normalizeDate(originalProject.startDate);
      const normalizedNewStartDate = normalizeDate(startDate);

      if (normalizedOldStartDate !== normalizedNewStartDate) {
        project.startDate = startDate;
        changes.push(`start date to "${startDate}"`);
        changeDetails.push({
          field: "Start Date",
          icon: "📅",
          oldValue: formatValue(normalizedOldStartDate),
          newValue: formatValue(normalizedNewStartDate),
        });
      }
    }
    if (endDate !== undefined) {
      const normalizedOldEndDate = normalizeDate(originalProject.endDate);
      const normalizedNewEndDate = normalizeDate(endDate);

      if (normalizedOldEndDate !== normalizedNewEndDate) {
        project.endDate = endDate;
        changes.push(`end date to "${endDate}"`);
        changeDetails.push({
          field: "End Date",
          icon: "📅",
          oldValue: formatValue(normalizedOldEndDate),
          newValue: formatValue(normalizedNewEndDate),
        });
      }
    }
    if (
      liveSiteUrl !== undefined &&
      valuesAreDifferent(originalProject.liveSiteUrl, liveSiteUrl)
    ) {
      project.liveSiteUrl = liveSiteUrl;
      changes.push(`live site URL`);
      changeDetails.push({
        field: "Live Site URL",
        icon: "🌐",
        oldValue: formatValue(originalProject.liveSiteUrl),
        newValue: formatValue(liveSiteUrl),
      });
    }
    if (
      demoSiteUrl !== undefined &&
      valuesAreDifferent(originalProject.demoSiteUrl, demoSiteUrl)
    ) {
      project.demoSiteUrl = demoSiteUrl;
      changes.push(`demo site URL`);
      changeDetails.push({
        field: "Demo Site URL",
        icon: "🎯",
        oldValue: formatValue(originalProject.demoSiteUrl),
        newValue: formatValue(demoSiteUrl),
      });
    }
    if (
      markupUrl !== undefined &&
      valuesAreDifferent(originalProject.markupUrl, markupUrl)
    ) {
      project.markupUrl = markupUrl;
      changes.push(`markup URL`);
      changeDetails.push({
        field: "Markup URL",
        icon: "🎨",
        oldValue: formatValue(originalProject.markupUrl),
        newValue: formatValue(markupUrl),
      });
    }
    if (
      attachments !== undefined &&
      JSON.stringify(attachments) !==
        JSON.stringify(originalProject.attachments)
    ) {
      // Track individual file changes
      const oldFiles = originalProject.attachments || [];
      const newFiles = attachments || [];

      // Find added files (files in newFiles but not in oldFiles)
      const addedFiles = newFiles.filter(
        (newFile) =>
          !oldFiles.some(
            (oldFile) =>
              oldFile.filename === newFile.filename ||
              (oldFile.originalName === newFile.originalName &&
                oldFile.size === newFile.size)
          )
      );

      // Find removed files (files in oldFiles but not in newFiles)
      const removedFiles = oldFiles.filter(
        (oldFile) =>
          !newFiles.some(
            (newFile) =>
              newFile.filename === oldFile.filename ||
              (newFile.originalName === oldFile.originalName &&
                newFile.size === oldFile.size)
          )
      );

      // Only update attachments if there are actual file additions or removals
      if (addedFiles.length > 0 || removedFiles.length > 0) {
        project.attachments = attachments;

        if (addedFiles.length > 0) {
          changes.push(`added ${addedFiles.length} file(s)`);
          addedFiles.forEach((file) => {
            changeDetails.push({
              field: "File Added",
              icon: "➕",
              oldValue: "N/A",
              newValue: file.originalName,
            });
          });
        }

        if (removedFiles.length > 0) {
          changes.push(`removed ${removedFiles.length} file(s)`);
          removedFiles.forEach((file) => {
            changeDetails.push({
              field: "File Removed",
              icon: "➖",
              oldValue: file.originalName,
              newValue: "N/A",
            });
          });
        }
      }
    }
    if (color !== undefined && color !== originalProject.color) {
      project.color = color;
      changes.push(`project color`);
      changeDetails.push({
        field: "Project Color",
        icon: "🎨",
        oldValue: formatValue(originalProject.color),
        newValue: formatValue(color),
      });
    }

    // Only save if there were actual changes
    if (changes.length > 0) {
      await project.save();
    }

    // Create activity and send notifications only if there were actual changes
    if (changes.length > 0) {
      // Create detailed change messages with old → new values
      const detailedChanges = changeDetails.map((change) => {
        const oldValueColor = "#dc2626"; // Red for old values
        const newValueColor = "#059669"; // Green for new values
        const fieldColor = "#3b82f6"; // Blue for field names

        return `${change.icon} <span style="color: ${fieldColor}; font-weight: bold;">${change.field}</span> → <span style="color: ${oldValueColor}; font-weight: bold;">"${change.oldValue}"</span> → <span style="color: ${newValueColor}; font-weight: bold;">"${change.newValue}"</span>`;
      });

      // Create both HTML and plain text versions
      const htmlMessage = `Updated project:<br/>${detailedChanges.join(
        "<br/>"
      )}`;
      const plainMessage = `Updated project: ${changes.join(", ")}`;

      await createActivityAndNotify(
        projectId,
        userId,
        "project_updated",
        plainMessage, // Store plain text in database
        {
          changes: changes,
          htmlMessage: htmlMessage, // Store HTML version for display
          detailedChanges: detailedChanges,
          changeDetails: changeDetails, // Store structured change data
          updatedFields: {
            name,
            description,
            clientName,
            projectType,
            projectStatus,
            startDate,
            endDate,
            liveSiteUrl,
            demoSiteUrl,
            markupUrl,
            attachments,
            color,
          },
        }
      );
    }

    // Populate the project with user details
    await project.populate("owner", "name email avatar color role");
    await project.populate("members.user", "name email avatar color");

    res.json({
      success: true,
      message:
        changes.length > 0
          ? "Project updated successfully"
          : "No changes to update",
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
// @desc    Archive project (soft delete)
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
        message: "Access denied. Only project owner or admin can archive project.",
      });
    }

    // Soft delete - archive the project instead of permanently deleting
    project.isArchived = true;
    project.archivedAt = new Date();
    project.archivedBy = userId;
    await project.save();

    // Create activity for archive
    await createActivityAndNotify(
      projectId,
      userId,
      "project_archived",
      `Archived project "${project.name}"`,
      { projectName: project.name }
    );

    res.json({
      success: true,
      message: "Project archived successfully. You can restore it from the Archive section.",
    });
  } catch (error) {
    console.error("Archive project error:", error);
    res.status(500).json({
      success: false,
      message: "Server error while archiving project",
    });
  }
};

// @route   GET /api/projects/archived
// @desc    Get all archived projects
// @access  Private (Admin only)
const getArchivedProjects = async (req, res) => {
  try {
    const userId = req.user._id;
    const userRole = req.user.role;

    // Only admin can see archived projects
    if (userRole !== "admin") {
      return res.status(403).json({
        success: false,
        message: "Access denied. Only admins can view archived projects.",
      });
    }

    const projects = await Project.find({ isArchived: true })
      .populate("owner", "name email avatar color")
      .populate("members.user", "name email avatar color")
      .populate("archivedBy", "name email avatar color")
      .sort({ archivedAt: -1 });

    res.json({
      success: true,
      projects,
    });
  } catch (error) {
    console.error("Get archived projects error:", error);
    res.status(500).json({
      success: false,
      message: "Server error while fetching archived projects",
    });
  }
};

// @route   PUT /api/projects/:id/restore
// @desc    Restore archived project
// @access  Private (Admin only)
const restoreProject = async (req, res) => {
  try {
    const projectId = req.params.id;
    const userId = req.user._id;
    const userRole = req.user.role;

    // Only admin can restore projects
    if (userRole !== "admin") {
      return res.status(403).json({
        success: false,
        message: "Access denied. Only admins can restore archived projects.",
      });
    }

    const project = await Project.findById(projectId);

    if (!project) {
      return res.status(404).json({
        success: false,
        message: "Project not found",
      });
    }

    if (!project.isArchived) {
      return res.status(400).json({
        success: false,
        message: "Project is not archived",
      });
    }

    // Restore the project
    project.isArchived = false;
    project.archivedAt = null;
    project.archivedBy = null;
    project.status = "active";
    await project.save();

    // Create activity for restore
    await createActivityAndNotify(
      projectId,
      userId,
      "project_restored",
      `Restored project "${project.name}" from archive`,
      { projectName: project.name }
    );

    // Populate the project with user details
    await project.populate("owner", "name email avatar color");
    await project.populate("members.user", "name email avatar color");

    res.json({
      success: true,
      message: "Project restored successfully",
      project,
    });
  } catch (error) {
    console.error("Restore project error:", error);
    res.status(500).json({
      success: false,
      message: "Server error while restoring project",
    });
  }
};

// @route   DELETE /api/projects/:id/permanent
// @desc    Permanently delete project
// @access  Private (Admin only)
const permanentDeleteProject = async (req, res) => {
  try {
    const projectId = req.params.id;
    const userId = req.user._id;
    const userRole = req.user.role;

    // Only admin can permanently delete projects
    if (userRole !== "admin") {
      return res.status(403).json({
        success: false,
        message: "Access denied. Only admins can permanently delete projects.",
      });
    }

    const project = await Project.findById(projectId);

    if (!project) {
      return res.status(404).json({
        success: false,
        message: "Project not found",
      });
    }

    // Start asynchronous cleanup process
    const {
      scheduleProjectCleanup,
    } = require("../services/projectCleanupService");
    scheduleProjectCleanup(projectId);

    // Delete the project permanently
    await Project.findByIdAndDelete(projectId);

    res.json({
      success: true,
      message: "Project permanently deleted. Related data cleanup is in progress.",
    });
  } catch (error) {
    console.error("Permanent delete project error:", error);
    res.status(500).json({
      success: false,
      message: "Server error while permanently deleting project",
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

      // Populate the notification with related data
      await notification.populate("sender", "name email avatar color");
      await notification.populate("relatedProject", "name");

      // Emit Socket.IO event for real-time notification
      try {
        const io = getIO();
        io.to(`user-${userToAdd._id}`).emit("new-notification", {
          notification,
        });
        console.log(`📬 Real-time notification sent to user ${userToAdd._id}`);
      } catch (socketError) {
        console.error("Socket.IO error while sending notification:", socketError);
      }

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

    // Populate the notification with related data
    await notification.populate("sender", "name email avatar color");
    await notification.populate("relatedProject", "name");

    // Emit Socket.IO event for real-time notification
    try {
      const io = getIO();
      io.to(`user-${memberId}`).emit("new-notification", {
        notification,
      });
      console.log(`📬 Real-time notification sent to user ${memberId}`);
    } catch (socketError) {
      console.error("Socket.IO error while sending notification:", socketError);
    }

    // Send email notification to the removed member
    setImmediate(async () => {
      try {
        await sendMemberRemovedEmail(userToRemove, project, req.user);
        console.log(`Member removal email sent to ${userToRemove.email}`);
      } catch (emailError) {
        console.error("Error sending member removal email:", emailError);
      }
    });

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
  getArchivedProjects,
  restoreProject,
  permanentDeleteProject,
};
