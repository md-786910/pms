const Card = require("../models/Card");
const Project = require("../models/Project");
const User = require("../models/User");
const Column = require("../models/Column");
const Notification = require("../models/Notification");
const { validationResult } = require("express-validator");
const {
  sendCardAssignedEmail,
  sendCardUnassignedEmail,
  sendCardStatusChangedEmail,
} = require("../config/email");
const { deleteFile, getFilePathFromUrl } = require("../middleware/upload");
const { ensureArchiveColumn } = require("./columnController");
const { getIO } = require("../config/socket");
const cacheService = require("../services/cacheService");

// Helper function to get status label from column
const getStatusLabel = async (projectId, statusValue) => {
  try {
    const column = await Column.findOne({
      project: projectId,
      status: statusValue,
    }).select("name");

    return column ? column.name : statusValue;
  } catch (error) {
    console.error("Error fetching column:", error);
    return statusValue;
  }
};

// Helper function to strip HTML tags for text comparison
const stripHtmlTags = (html) => {
  if (!html) return "";
  // Remove HTML tags and decode HTML entities
  return html
    .replace(/<[^>]*>/g, "") // Remove HTML tags
    .replace(/&nbsp;/g, " ") // Replace &nbsp; with space
    .replace(/&amp;/g, "&") // Decode HTML entities
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .trim();
};

// @route   GET /api/projects/:projectId/cards
// @desc    Get all cards for a project
// @access  Private
const getCards = async (req, res) => {
  try {
    const projectId = req.params.id || req.params.projectId;
    const userId = req.user._id;
    const userRole = req.user.role;
    const includeArchived = req.query.includeArchived === "true";

    // Check if user has access to this project
    const project = await Project.findById(projectId);
    if (!project) {
      return res.status(404).json({
        success: false,
        message: "Project not found",
      });
    }

    const isOwner = project.owner.toString() === userId.toString();
    const isMember = project.members.some(
      (member) => member.user.toString() === userId.toString()
    );

    if (!isOwner && !isMember && userRole !== "admin") {
      return res.status(403).json({
        success: false,
        message: "Access denied. You are not a member of this project.",
      });
    }

    // Build query based on whether to include archived cards
    const query = { project: projectId };
    if (!includeArchived) {
      query.isArchived = false;
    }

    const cards = await Card.find(query)
      .populate("assignees", "name email avatar color")
      .populate("createdBy", "name email avatar color")
      .populate("comments.user", "name email avatar color")
      .populate("readBy.user", "name email avatar color")
      .populate("archivedBy", "name email avatar color")
      .sort({ order: 1, updatedAt: -1 });

    // Fetch all columns for this project to create status -> column name mapping
    const columns = await Column.find({ project: projectId }).select(
      "status name"
    );
    const statusToLabelMap = {};
    columns.forEach((col) => {
      statusToLabelMap[col.status] = col.name;
    });

    // Sort comments in each card with latest at top and add statusLabel
    const cardsWithLabels = cards.map((card) => {
      const cardObj = card.toObject();

      // Add statusLabel from column mapping
      cardObj.statusLabel = statusToLabelMap[card.status] || card.status;

      // Sort comments
      if (cardObj.comments && cardObj.comments.length > 0) {
        cardObj.comments.sort((a, b) => {
          const aTime = a.updatedAt || a.timestamp || a.createdAt;
          const bTime = b.updatedAt || b.timestamp || b.createdAt;
          return new Date(bTime) - new Date(aTime);
        });
      }

      return cardObj;
    });

    res.json({
      success: true,
      cards: cardsWithLabels,
    });
  } catch (error) {
    console.error("Get cards error:", error);
    res.status(500).json({
      success: false,
      message: "Server error while fetching cards",
    });
  }
};

// @route   GET /api/cards/:id
// @desc    Get single card
// @access  Private
const getCard = async (req, res) => {
  try {
    const cardId = req.params.id;
    const userId = req.user._id;
    const userRole = req.user.role;

    const card = await Card.findById(cardId)
      .populate("assignees", "name email avatar color")
      .populate("createdBy", "name email avatar color")
      .populate("comments.user", "name email avatar color")
      .populate("readBy.user", "name email avatar color")
      .populate("project", "name");

    if (!card) {
      return res.status(404).json({
        success: false,
        message: "Card not found",
      });
    }

    // Check if user has access to this card's project
    const project = await Project.findById(card.project._id);
    const isOwner = project.owner.toString() === userId.toString();
    const isMember = project.members.some(
      (member) => member.user.toString() === userId.toString()
    );

    if (!isOwner && !isMember && userRole !== "admin") {
      return res.status(403).json({
        success: false,
        message: "Access denied. You are not a member of this project.",
      });
    }

    // Sort comments with latest at top
    if (card.comments && card.comments.length > 0) {
      card.comments.sort((a, b) => {
        const aTime = a.updatedAt || a.timestamp || a.createdAt;
        const bTime = b.updatedAt || b.timestamp || b.createdAt;
        return new Date(bTime) - new Date(aTime);
      });
    }

    // Add statusLabel from column
    const cardObj = card.toObject();
    const column = await Column.findOne({
      project: card.project._id,
      status: card.status,
    }).select("name");
    cardObj.statusLabel = column ? column.name : card.status;

    res.json({
      success: true,
      card: cardObj,
    });
  } catch (error) {
    console.error("Get card error:", error);
    res.status(500).json({
      success: false,
      message: "Server error while fetching card",
    });
  }
};

// @route   POST /api/cards
// @desc    Create new card
// @access  Private
const createCard = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: "Validation failed",
        errors: errors.array(),
      });
    }

    const {
      title,
      description,
      project,
      status = "todo",
      priority = "medium",
      assignees = [],
      labels = [],
      dueDate,
    } = req.body;

    const userId = req.user._id;

    // Check if user has access to this project
    const projectDoc = await Project.findById(project);
    if (!projectDoc) {
      return res.status(404).json({
        success: false,
        message: "Project not found",
      });
    }

    const isOwner = projectDoc.owner.toString() === userId.toString();
    const isMember = projectDoc.members.some(
      (member) => member.user.toString() === userId.toString()
    );

    if (!isOwner && !isMember && req.user.role !== "admin") {
      return res.status(403).json({
        success: false,
        message: "Access denied. You are not a member of this project.",
      });
    }

    // Calculate the next card number for this project
    const cardCount = await Card.countDocuments({ project });
    const cardNumber = cardCount + 1;

    const card = new Card({
      title,
      description,
      cardNumber,
      project,
      status,
      priority,
      assignees,
      labels,
      dueDate: dueDate ? new Date(dueDate) : undefined,
      createdBy: userId,
    });

    // Get user information and status label for automatic comment
    const creator = await User.findById(userId).select("name");
    const statusLabel = await getStatusLabel(project, status);

    // Add automatic comment for card creation
    card.comments.push({
      user: userId,
      text: `<p><strong>${creator.name}</strong> created this card in <strong>${statusLabel}</strong></p>`,
      timestamp: new Date(),
    });

    // Add activity log entry
    card.activityLog.push({
      action: "created",
      user: userId,
      timestamp: new Date(),
      details: `Card created in ${statusLabel}`,
    });

    await card.save();

    // Populate the card with user details
    await card.populate("assignees", "name email avatar color");
    await card.populate("createdBy", "name email avatar color");

    // Create notifications for assigned users
    for (const assigneeId of assignees) {
      if (assigneeId.toString() !== userId.toString()) {
        const notification = new Notification({
          user: assigneeId,
          sender: userId,
          type: "card_assigned",
          title: "Card Assigned",
          message: `You have been assigned to the card "${title}"`,
          relatedProject: project,
          relatedCard: card._id,
        });

        await notification.save();

        // Populate the notification with related data
        await notification.populate("sender", "name email avatar color");
        await notification.populate("relatedProject", "name");
        await notification.populate("relatedCard", "title");

        // Emit Socket.IO event for real-time notification
        try {
          const io = getIO();
          io.to(`user-${assigneeId}`).emit("new-notification", {
            notification,
          });
          console.log(`📬 Real-time notification sent to user ${assigneeId}`);
        } catch (socketError) {
          console.error(
            "Socket.IO error while sending notification:",
            socketError
          );
        }
      }
    }

    // Emit Socket.IO event for real-time updates
    try {
      const io = getIO();
      io.to(`project-${project}`).emit("card-created", {
        card,
        userId: userId.toString(),
      });
    } catch (socketError) {
      console.error("Socket.IO error:", socketError);
    }

    res.status(201).json({
      success: true,
      message: "Card created successfully",
      card,
    });
  } catch (error) {
    console.error("Create card error:", error);
    res.status(500).json({
      success: false,
      message: "Server error while creating card",
    });
  }
};

// @route   PUT /api/cards/:id
// @desc    Update card
// @access  Private
const updateCard = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: "Validation failed",
        errors: errors.array(),
      });
    }

    const cardId = req.params.id;
    const userId = req.user._id;
    const userRole = req.user.role;

    const card = await Card.findById(cardId);

    if (!card) {
      return res.status(404).json({
        success: false,
        message: "Card not found",
      });
    }

    // Check if user has access to this card's project
    const project = await Project.findById(card.project);
    const isOwner = project.owner.toString() === userId.toString();
    const isMember = project.members.some(
      (member) => member.user.toString() === userId.toString()
    );

    if (!isOwner && !isMember && userRole !== "admin") {
      return res.status(403).json({
        success: false,
        message: "Access denied. You are not a member of this project.",
      });
    }

    // Update card fields
    const { title, description, status, priority, assignees, labels } =
      req.body;

    // Don't default to current date - allow null for clearing the date
    let dueDate = req.body.hasOwnProperty('dueDate') ? req.body.dueDate : undefined;

    // Store previous values for comparison
    const previousStatus = card.status;
    const previousAssignees = [...card.assignees];
    const previousDescription = card.description || "";
    const previousTitle = card.title || "";

    if (title) card.title = title;
    if (description !== undefined) card.description = description;
    if (status) card.status = status;
    if (priority) card.priority = priority;
    if (assignees) card.assignees = assignees;
    if (labels) card.labels = labels;
    const previousDueDate = card.dueDate;

    // Update due date - handle clearing (null or empty string)
    if (dueDate !== undefined) {
      // If dueDate is null, empty string, or falsy, set to null to clear it
      card.dueDate = dueDate && dueDate !== '' ? new Date(dueDate) : null;
    }

    // Fetch user
    // const user = await User.findById(userId).select("name");
    // Get user information for activity comments
    const user = await User.findById(userId).select("name");

    // Add comment if due date changed
    if (dueDate !== undefined) {
      // Normalize dates for comparison (handle null and empty string)
      const normalizeDate = (date) => {
        if (!date || date === '') return null;
        return new Date(date).toISOString().slice(0, 10);
      };

      const normalizedNewDate = normalizeDate(dueDate);
      const normalizedOldDate = normalizeDate(previousDueDate);

      // Only add comment if the dates actually changed
      if (normalizedNewDate !== normalizedOldDate) {
        const formattedNewDate = normalizedNewDate
          ? new Date(dueDate).toLocaleDateString("en-US", {
            year: "numeric",
            month: "short",
            day: "numeric",
          })
          : "Cleared";

        const formattedOldDate = normalizedOldDate
          ? new Date(previousDueDate).toLocaleDateString("en-US", {
            year: "numeric",
            month: "short",
            day: "numeric",
          })
          : "No due date";

        card.comments.push({
          user: userId,
          text: `<p><strong>${user.name}</strong> changed the due date from <span style="background-color: #fef3c7; padding: 2px 6px; border-radius: 4px; font-weight: 500;">${formattedOldDate}</span> to <span style="background-color: #d1fae5; padding: 2px 6px; border-radius: 4px; font-weight: 500;">${formattedNewDate}</span></p>`,
          timestamp: new Date(),
        });
      }
    }

    // Add automatic comments for description changes
    if (description !== undefined) {
      const hadDescription = previousDescription && previousDescription.trim();
      const hasDescription = description && description.trim();

      // Only add comment if there's an actual change
      if (hasDescription && hadDescription) {
        // Both exist - check if they're actually different (strip HTML for comparison)
        const prevClean = stripHtmlTags(previousDescription).trim();
        const newClean = stripHtmlTags(description).trim();
        if (newClean !== prevClean) {
          card.comments.push({
            user: userId,
            text: `<p><strong>${user.name}</strong> updated the description</p>`,
            timestamp: new Date(),
          });
        }
      } else if (hasDescription && !hadDescription) {
        // Description was added
        card.comments.push({
          user: userId,
          text: `<p><strong>${user.name}</strong> added a description</p>`,
          timestamp: new Date(),
        });
      } else if (!hasDescription && hadDescription) {
        // Description was removed
        card.comments.push({
          user: userId,
          text: `<p><strong>${user.name}</strong> removed the description</p>`,
          timestamp: new Date(),
        });
      }
    }

    // Add automatic comments for title changes
    if (title) {
      const prevTitleClean = previousTitle ? previousTitle.trim() : "";
      const newTitleClean = title ? title.trim() : "";

      // Only add comment if title actually changed
      if (newTitleClean && prevTitleClean && newTitleClean !== prevTitleClean) {
        card.comments.push({
          user: userId,
          text: `<p><strong>${user.name}</strong> renamed the card from <span style="background-color: #f3f4f6; padding: 2px 6px; border-radius: 4px; font-weight: 500;">${previousTitle}</span> to <span style="background-color: #dbeafe; padding: 2px 6px; border-radius: 4px; font-weight: 500;">${title}</span></p>`,
          timestamp: new Date(),
        });
      }
    }

    // Add automatic comments for status changes
    if (
      status &&
      status !== previousStatus &&
      status.trim() !== previousStatus.trim()
    ) {
      const previousStatusLabel = await getStatusLabel(
        card.project,
        previousStatus
      );
      const newStatusLabel = await getStatusLabel(card.project, status);

      card.comments.push({
        user: userId,
        text: `<p><strong>${user.name}</strong> moved this card from <span style="background-color: #f3f4f6; padding: 2px 6px; border-radius: 4px; font-weight: 500;">${previousStatusLabel}</span> to <span style="background-color: #dbeafe; padding: 2px 6px; border-radius: 4px; font-weight: 500;">${newStatusLabel}</span></p>`,
        timestamp: new Date(),
      });

      // Send email notifications to all assigned members (async, non-blocking)
      if (card.assignees && card.assignees.length > 0) {
        setImmediate(async () => {
          try {
            const movedBy = await User.findById(userId);
            const projectData = await Project.findById(card.project);

            if (movedBy && projectData) {
              // Get assignee details
              const assigneesData = await User.find({
                _id: { $in: card.assignees },
              });

              // Send email to each assignee (except the person who moved it)
              for (const assignee of assigneesData) {
                if (assignee._id.toString() !== userId.toString()) {
                  await sendCardStatusChangedEmail(
                    assignee,
                    card,
                    projectData,
                    movedBy,
                    previousStatusLabel,
                    newStatusLabel
                  );
                  console.log(
                    `Card status change email sent to ${assignee.email}`
                  );
                }
              }
            }
          } catch (emailError) {
            console.error(
              "Error sending card status change emails:",
              emailError
            );
            // Email failure doesn't affect the main request
          }
        });
      }
    }

    // Add automatic comments for assignee changes
    if (assignees) {
      const newAssignees = assignees.map((id) => id.toString());
      const previousAssigneeIds = previousAssignees.map((id) => id.toString());

      // Find added assignees
      const addedAssignees = newAssignees.filter(
        (id) => !previousAssigneeIds.includes(id)
      );
      // Find removed assignees
      const removedAssignees = previousAssigneeIds.filter(
        (id) => !newAssignees.includes(id)
      );

      // Add comment for new assignees
      if (addedAssignees.length > 0) {
        const addedUsers = await User.find({
          _id: { $in: addedAssignees },
        }).select("name");
        const userNames = addedUsers.map((u) => u.name).join(", ");
        card.comments.push({
          user: userId,
          text: `<p><strong>${user.name}</strong> assigned <strong>${userNames}</strong> to this card</p>`,
          timestamp: new Date(),
        });
      }

      // Add comment for removed assignees
      if (removedAssignees.length > 0) {
        const removedUsers = await User.find({
          _id: { $in: removedAssignees },
        }).select("name");
        const userNames = removedUsers.map((u) => u.name).join(", ");
        card.comments.push({
          user: userId,
          text: `<p><strong>${user.name}</strong> removed <strong>${userNames}</strong> from this card</p>`,
          timestamp: new Date(),
        });
      }
    }

    // Add activity log entry
    card.activityLog.push({
      action: "updated",
      user: userId,
      timestamp: new Date(),
      details: "Card was updated",
    });

    await card.save();

    // Populate the card with user details
    await card.populate("assignees", "name email avatar color");
    await card.populate("createdBy", "name email avatar color");

    // Emit Socket.IO event for real-time updates
    try {
      const io = getIO();
      io.to(`project-${card.project}`).emit("card-updated", {
        card,
        userId: userId.toString(),
      });
    } catch (socketError) {
      console.error("Socket.IO error:", socketError);
    }

    res.json({
      success: true,
      message: "Card updated successfully",
      card,
    });
  } catch (error) {
    console.error("Update card error:", error);
    res.status(500).json({
      success: false,
      message: "Server error while updating card",
    });
  }
};

// @route   PUT /api/cards/:id/archive
// @desc    Archive card (soft delete)
// @access  Private
const archiveCard = async (req, res) => {
  try {
    const cardId = req.params.id;
    const userId = req.user._id;
    const userRole = req.user.role;

    const card = await Card.findById(cardId);

    if (!card) {
      return res.status(404).json({
        success: false,
        message: "Card not found",
      });
    }

    // Check if user has access to this card's project
    const project = await Project.findById(card.project);
    const isOwner = project.owner.toString() === userId.toString();
    const isMember = project.members.some(
      (member) => member.user.toString() === userId.toString()
    );

    if (!isOwner && !isMember && userRole !== "admin") {
      return res.status(403).json({
        success: false,
        message: "Access denied. You are not a member of this project.",
      });
    }

    // Ensure archive column exists (may create new Archive column)
    await ensureArchiveColumn(card.project, userId);

    // Invalidate columns cache since Archive column might be newly created
    cacheService.invalidateColumns(card.project);

    // Store original status before archiving
    card.originalStatus = card.status;

    // Archive the card
    card.isArchived = true;
    card.archivedAt = new Date();
    card.archivedBy = userId;
    card.status = "archive"; // Move to archive column

    // Get user information for activity comment
    const user = await User.findById(userId).select("name");

    // Add automatic comment for archiving
    card.comments.push({
      user: userId,
      text: `<p><strong>${user.name}</strong> archived this card</p>`,
      timestamp: new Date(),
    });

    // Add activity log entry
    card.activityLog.push({
      action: "archived",
      user: userId,
      timestamp: new Date(),
      details: "Card was archived",
    });

    await card.save();

    // Populate the card with user details
    await card.populate("assignees", "name email avatar color");
    await card.populate("createdBy", "name email avatar color");

    // Emit Socket.IO event for real-time updates
    try {
      const io = getIO();
      io.to(`project-${card.project}`).emit("card-archived", {
        card,
        userId: userId.toString(),
      });
    } catch (socketError) {
      console.error("Socket.IO error:", socketError);
    }

    res.json({
      success: true,
      message: "Card archived successfully",
      card,
    });
  } catch (error) {
    console.error("Archive card error:", error);
    res.status(500).json({
      success: false,
      message: "Server error while archiving card",
    });
  }
};

// @route   PUT /api/cards/:id/restore
// @desc    Restore archived card
// @access  Private
const restoreCard = async (req, res) => {
  try {
    const cardId = req.params.id;
    const userId = req.user._id;
    const userRole = req.user.role;

    const card = await Card.findById(cardId);

    if (!card) {
      return res.status(404).json({
        success: false,
        message: "Card not found",
      });
    }

    // Check if user has access to this card's project
    const project = await Project.findById(card.project);
    const isOwner = project.owner.toString() === userId.toString();
    const isMember = project.members.some(
      (member) => member.user.toString() === userId.toString()
    );

    if (!isOwner && !isMember && userRole !== "admin") {
      return res.status(403).json({
        success: false,
        message: "Access denied. You are not a member of this project.",
      });
    }

    if (!card.isArchived) {
      return res.status(400).json({
        success: false,
        message: "Card is not archived",
      });
    }

    // Restore the card to original status
    card.isArchived = false;
    card.archivedAt = null;
    card.archivedBy = null;
    card.status = card.originalStatus || "todo"; // Restore to original column

    // Get user information for activity comment
    const user = await User.findById(userId).select("name");

    // Add automatic comment for restoration
    card.comments.push({
      user: userId,
      text: `<p><strong>${user.name}</strong> restored this card from archive</p>`,
      timestamp: new Date(),
    });

    // Add activity log entry
    card.activityLog.push({
      action: "restored",
      user: userId,
      timestamp: new Date(),
      details: "Card was restored from archive",
    });

    await card.save();

    // Update card's updatedAt to place it at the top of the column
    card.updatedAt = new Date();
    await card.save();

    // Populate the card with user details
    await card.populate("assignees", "name email avatar color");
    await card.populate("createdBy", "name email avatar color");

    // Emit Socket.IO event for real-time updates
    try {
      const io = getIO();
      io.to(`project-${card.project}`).emit("card-restored", {
        card,
        userId: userId.toString(),
      });
    } catch (socketError) {
      console.error("Socket.IO error:", socketError);
    }

    res.json({
      success: true,
      message: "Card restored successfully",
      card,
    });
  } catch (error) {
    console.error("Restore card error:", error);
    res.status(500).json({
      success: false,
      message: "Server error while restoring card",
    });
  }
};

// @route   PUT /api/cards/:id/status
// @desc    Update card status
// @access  Private
const updateStatus = async (req, res) => {
  try {
    const cardId = req.params.id;
    const { status } = req.body;
    const userId = req.user._id;
    const userRole = req.user.role;

    // Handle case where status might be an object
    let actualStatus = status;
    if (typeof status === "object" && status !== null) {
      actualStatus = status.status || status.value || status;
    }

    const card = await Card.findById(cardId);

    if (!card) {
      return res.status(404).json({
        success: false,
        message: "Card not found",
      });
    }

    // Check if user has access to this card's project
    const project = await Project.findById(card.project);
    const isOwner = project.owner.toString() === userId.toString();
    const isMember = project.members.some(
      (member) => member.user.toString() === userId.toString()
    );

    if (!isOwner && !isMember && userRole !== "admin") {
      return res.status(403).json({
        success: false,
        message: "Access denied. You are not a member of this project.",
      });
    }

    const oldStatus = card.status;
    card.status = actualStatus;

    // Get user information for activity comment
    const user = await User.findById(userId).select("name");

    // Add automatic comment for status change (only if status actually changed)
    if (oldStatus !== actualStatus) {
      const previousStatusLabel = await getStatusLabel(card.project, oldStatus);
      const newStatusLabel = await getStatusLabel(card.project, actualStatus);

      card.comments.push({
        user: userId,
        text: `<p><strong>${user.name}</strong> moved this card from <span style="background-color: #f3f4f6; padding: 2px 6px; border-radius: 4px; font-weight: 500;">${previousStatusLabel}</span> to <span style="background-color: #dbeafe; padding: 2px 6px; border-radius: 4px; font-weight: 500;">${newStatusLabel}</span></p>`,
        timestamp: new Date(),
      });

      // Send email notifications to all assigned members (async, non-blocking)
      if (card.assignees && card.assignees.length > 0) {
        setImmediate(async () => {
          try {
            const movedBy = await User.findById(userId);
            const projectData = await Project.findById(card.project);

            if (movedBy && projectData) {
              // Get assignee details
              const assignees = await User.find({
                _id: { $in: card.assignees },
              });

              // Send email to each assignee (except the person who moved it)
              for (const assignee of assignees) {
                if (assignee._id.toString() !== userId.toString()) {
                  await sendCardStatusChangedEmail(
                    assignee,
                    card,
                    projectData,
                    movedBy,
                    previousStatusLabel,
                    newStatusLabel
                  );
                  console.log(
                    `Card status change email sent to ${assignee.email}`
                  );
                }
              }
            }
          } catch (emailError) {
            console.error(
              "Error sending card status change emails:",
              emailError
            );
            // Email failure doesn't affect the main request
          }
        });
      }
    }

    // Add activity log entry
    card.activityLog.push({
      action: "status_changed",
      user: userId,
      timestamp: new Date(),
      details: `Status changed from ${oldStatus} to ${actualStatus}`,
    });

    await card.save();

    // Populate the card with user details
    await card.populate("assignees", "name email avatar color");
    await card.populate("createdBy", "name email avatar color");

    // Emit Socket.IO event for real-time updates
    try {
      const io = getIO();
      io.to(`project-${card.project}`).emit("card-status-changed", {
        card,
        userId: userId.toString(),
      });
    } catch (socketError) {
      console.error("Socket.IO error:", socketError);
    }

    res.json({
      success: true,
      message: "Card status updated successfully",
      card,
    });
  } catch (error) {
    console.error("Update status error:", error);
    res.status(500).json({
      success: false,
      message: "Server error while updating card status",
    });
  }
};

// @route   PUT /api/cards/reorder
// @desc    Update card order and optionally status (for drag-and-drop)
// @access  Private
const reorderCards = async (req, res) => {
  try {
    const { cardOrders } = req.body; // Array of { cardId, order, status? }
    const userId = req.user._id;
    const userRole = req.user.role;

    console.log("Reorder cards request:", {
      userId,
      cardOrdersCount: cardOrders?.length,
      cardOrders: cardOrders,
    });

    if (!Array.isArray(cardOrders) || cardOrders.length === 0) {
      return res.status(400).json({
        success: false,
        message: "cardOrders array is required",
      });
    }

    // Get the first card to check project access
    const firstCard = await Card.findById(cardOrders[0].cardId);
    if (!firstCard) {
      return res.status(404).json({
        success: false,
        message: "Card not found",
      });
    }

    // Check if user has access to this card's project
    const project = await Project.findById(firstCard.project);
    const isOwner = project.owner.toString() === userId.toString();
    const isMember = project.members.some(
      (member) => member.user.toString() === userId.toString()
    );

    if (!isOwner && !isMember && userRole !== "admin") {
      return res.status(403).json({
        success: false,
        message: "Access denied. You are not a member of this project.",
      });
    }

    // Get user information for activity comments
    const user = await User.findById(userId).select("name");
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // Update all cards
    const updatedCards = [];
    for (const { cardId, order, status } of cardOrders) {
      if (!cardId) {
        console.warn("Skipping card order update: cardId is missing");
        continue;
      }

      const card = await Card.findById(cardId);
      if (!card) {
        console.warn(`Card not found: ${cardId}`);
        continue;
      }

      // Verify card belongs to same project
      if (card.project.toString() !== firstCard.project.toString()) {
        console.warn(
          `Card ${cardId} does not belong to project ${firstCard.project}`
        );
        continue;
      }

      const oldStatus = card.status;
      const oldOrder = card.order || 0;

      // Update order (ensure it's a number)
      card.order = typeof order === "number" ? order : parseInt(order, 10) || 0;

      // Update status if provided and different
      if (status && status !== oldStatus) {
        card.status = status;

        try {
          // Add automatic comment for status change
          const previousStatusLabel = await getStatusLabel(
            card.project,
            oldStatus
          );
          const newStatusLabel = await getStatusLabel(card.project, status);

          card.comments.push({
            user: userId,
            text: `<p><strong>${user.name}</strong> moved this card from <span style="background-color: #f3f4f6; padding: 2px 6px; border-radius: 4px; font-weight: 500;">${previousStatusLabel}</span> to <span style="background-color: #dbeafe; padding: 2px 6px; border-radius: 4px; font-weight: 500;">${newStatusLabel}</span></p>`,
            timestamp: new Date(),
          });

          // Add activity log entry
          card.activityLog.push({
            action: "status_changed",
            user: userId,
            timestamp: new Date(),
            details: `Status changed from ${oldStatus} to ${status}`,
          });
        } catch (labelError) {
          console.error("Error getting status labels:", labelError);
          // Continue without comment if label fetch fails
        }
      } else if (order !== oldOrder) {
        // Add activity log entry for order change
        card.activityLog.push({
          action: "reordered",
          user: userId,
          timestamp: new Date(),
          details: `Card order changed from ${oldOrder} to ${card.order}`,
        });
      }

      try {
        await card.save();
        await card.populate("assignees", "name email avatar color");
        await card.populate("createdBy", "name email avatar color");
        updatedCards.push(card);
      } catch (saveError) {
        console.error(`Error saving card ${cardId}:`, saveError);
        // Continue with other cards even if one fails
      }
    }

    if (updatedCards.length === 0) {
      return res.status(400).json({
        success: false,
        message: "No cards were updated",
      });
    }

    // Emit Socket.IO event for real-time updates
    try {
      const io = getIO();
      io.to(`project-${firstCard.project}`).emit("cards-reordered", {
        cards: updatedCards,
        userId: userId.toString(),
      });
    } catch (socketError) {
      console.error("Socket.IO error:", socketError);
    }

    res.json({
      success: true,
      message: "Cards reordered successfully",
      cards: updatedCards,
    });
  } catch (error) {
    console.error("Reorder cards error:", error);
    console.error("Error stack:", error.stack);
    console.error("Request body:", req.body);
    res.status(500).json({
      success: false,
      message: "Server error while reordering cards",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
      stack: process.env.NODE_ENV === "development" ? error.stack : undefined,
    });
  }
};

// @route   PUT /api/cards/:id/complete
// @desc    Toggle card completion status
// @access  Private
const toggleComplete = async (req, res) => {
  try {
    const cardId = req.params.id;
    const userId = req.user._id;
    const userRole = req.user.role;

    const card = await Card.findById(cardId);

    if (!card) {
      return res.status(404).json({
        success: false,
        message: "Card not found",
      });
    }

    // Check if user has access to this card's project
    const project = await Project.findById(card.project);
    const isOwner = project.owner.toString() === userId.toString();
    const isMember = project.members.some(
      (member) => member.user.toString() === userId.toString()
    );

    if (!isOwner && !isMember && userRole !== "admin") {
      return res.status(403).json({
        success: false,
        message: "Access denied. You are not a member of this project.",
      });
    }

    // Toggle completion status
    const wasCompleted = card.isComplete;
    card.isComplete = !card.isComplete;

    if (card.isComplete) {
      // Mark as complete
      card.completedAt = new Date();
      card.completedBy = userId;
    } else {
      // Mark as incomplete
      card.completedAt = null;
      card.completedBy = null;
    }

    // Get user information for activity comment
    const user = await User.findById(userId).select("name");

    // Add automatic comment for completion change
    if (card.isComplete) {
      card.comments.push({
        user: userId,
        text: `<p><strong>${user.name}</strong> marked this card as <span style="background-color: #d1fae5; padding: 2px 6px; border-radius: 4px; font-weight: 500;">complete</span></p>`,
        timestamp: new Date(),
      });
    } else {
      card.comments.push({
        user: userId,
        text: `<p><strong>${user.name}</strong> marked this card as <span style="background-color: #fef3c7; padding: 2px 6px; border-radius: 4px; font-weight: 500;">incomplete</span></p>`,
        timestamp: new Date(),
      });
    }

    // Add activity log entry
    card.activityLog.push({
      action: card.isComplete ? "marked_complete" : "marked_incomplete",
      user: userId,
      timestamp: new Date(),
      details: `Card marked as ${card.isComplete ? "complete" : "incomplete"}`,
    });

    await card.save();

    // Populate the card with user details
    await card.populate("assignees", "name email avatar color");
    await card.populate("createdBy", "name email avatar color");
    await card.populate("completedBy", "name email avatar color");

    // Emit Socket.IO event for real-time updates
    try {
      const io = getIO();
      io.to(`project-${card.project}`).emit("card-completion-toggled", {
        card,
        userId: userId.toString(),
      });
    } catch (socketError) {
      console.error("Socket.IO error:", socketError);
    }

    res.json({
      success: true,
      message: `Card marked as ${card.isComplete ? "complete" : "incomplete"}`,
      card,
    });
  } catch (error) {
    console.error("Toggle complete error:", error);
    res.status(500).json({
      success: false,
      message: "Server error while toggling card completion",
    });
  }
};

// @route   POST /api/cards/:id/assign
// @desc    Assign user to card
// @access  Private
const assignUser = async (req, res) => {
  try {
    const cardId = req.params.id;
    const { userId: assigneeId } = req.body;
    const userId = req.user._id;
    const userRole = req.user.role;

    const card = await Card.findById(cardId);

    if (!card) {
      return res.status(404).json({
        success: false,
        message: "Card not found",
      });
    }

    // Check if user has access to this card's project
    const project = await Project.findById(card.project);
    const isOwner = project.owner.toString() === userId.toString();
    const isMember = project.members.some(
      (member) => member.user.toString() === userId.toString()
    );

    if (!isOwner && !isMember && userRole !== "admin") {
      return res.status(403).json({
        success: false,
        message: "Access denied. You are not a member of this project.",
      });
    }

    // Check if user is already assigned
    if (card.assignees.includes(assigneeId)) {
      return res.status(400).json({
        success: false,
        message: "User is already assigned to this card",
      });
    }

    card.assignees.push(assigneeId);

    // Get user information for activity comment
    const currentUser = await User.findById(userId).select("name");
    const assignedUser = await User.findById(assigneeId).select("name");

    // Add automatic comment for assignment
    card.comments.push({
      user: userId,
      text: `<p><strong>${currentUser.name}</strong> assigned <strong>${assignedUser.name}</strong> to this card</p>`,
      timestamp: new Date(),
    });

    // Add activity log entry
    card.activityLog.push({
      action: "assigned",
      user: userId,
      timestamp: new Date(),
      details: `User assigned to card`,
    });

    await card.save();

    // Create notification for the assigned user
    if (assigneeId !== userId.toString()) {
      const notification = new Notification({
        user: assigneeId,
        sender: userId,
        type: "card_assigned",
        title: "Card Assigned",
        message: `You have been assigned to the card "${card.title}"`,
        relatedProject: card.project,
        relatedCard: card._id,
      });

      await notification.save();

      // Populate the notification with related data
      await notification.populate("sender", "name email avatar color");
      await notification.populate("relatedProject", "name");
      await notification.populate("relatedCard", "title");

      // Emit Socket.IO event for real-time notification
      try {
        const io = getIO();
        io.to(`user-${assigneeId}`).emit("new-notification", {
          notification,
        });
        console.log(`📬 Real-time notification sent to user ${assigneeId}`);
      } catch (socketError) {
        console.error(
          "Socket.IO error while sending notification:",
          socketError
        );
      }
    }

    // Populate the card with user details
    await card.populate("assignees", "name email avatar color");
    await card.populate("createdBy", "name email avatar color");

    // Send email notification to the assigned user (async, non-blocking)
    if (assigneeId !== userId.toString()) {
      setImmediate(async () => {
        try {
          const assignee = await User.findById(assigneeId);
          const assignedBy = await User.findById(userId);
          const project = await Project.findById(card.project);

          if (assignee && assignedBy && project) {
            await sendCardAssignedEmail(assignee, card, project, assignedBy);
            console.log(`Card assignment email sent to ${assignee.email}`);
          }
        } catch (emailError) {
          console.error("Error sending card assignment email:", emailError);
          // Email failure doesn't affect the main request
        }
      });
    }

    // Emit Socket.IO event for real-time updates
    try {
      const io = getIO();
      io.to(`project-${card.project}`).emit("card-user-assigned", {
        card,
        userId: userId.toString(),
      });
    } catch (socketError) {
      console.error("Socket.IO error:", socketError);
    }

    res.json({
      success: true,
      message: "User assigned successfully",
      card,
    });
  } catch (error) {
    console.error("Assign user error:", error);
    res.status(500).json({
      success: false,
      message: "Server error while assigning user",
    });
  }
};

// @route   DELETE /api/cards/:id/assign/:userId
// @desc    Unassign user from card
// @access  Private
const unassignUser = async (req, res) => {
  try {
    const cardId = req.params.id;
    const assigneeId = req.params.userId;
    const userId = req.user._id;
    const userRole = req.user.role;

    const card = await Card.findById(cardId);

    if (!card) {
      return res.status(404).json({
        success: false,
        message: "Card not found",
      });
    }

    // Check if user has access to this card's project
    const project = await Project.findById(card.project);
    const isOwner = project.owner.toString() === userId.toString();
    const isMember = project.members.some(
      (member) => member.user.toString() === userId.toString()
    );

    if (!isOwner && !isMember && userRole !== "admin") {
      return res.status(403).json({
        success: false,
        message: "Access denied. You are not a member of this project.",
      });
    }

    // Remove user from assignees
    card.assignees = card.assignees.filter(
      (id) => id.toString() !== assigneeId
    );

    // Get user information for activity comment
    const currentUser = await User.findById(userId).select("name");
    const unassignedUser = await User.findById(assigneeId).select("name");

    // Add automatic comment for unassignment
    card.comments.push({
      user: userId,
      text: `<p><strong>${currentUser.name}</strong> removed <strong>${unassignedUser.name}</strong> from this card</p>`,
      timestamp: new Date(),
    });

    // Add activity log entry
    card.activityLog.push({
      action: "unassigned",
      user: userId,
      timestamp: new Date(),
      details: `User unassigned from card`,
    });

    await card.save();

    // Create notification for the unassigned user
    if (assigneeId !== userId.toString()) {
      const notification = new Notification({
        user: assigneeId,
        sender: userId,
        type: "card_unassigned",
        title: "Card Unassigned",
        message: `You have been removed from the card "${card.title}"`,
        relatedProject: card.project,
        relatedCard: card._id,
      });

      await notification.save();

      // Populate the notification with related data
      await notification.populate("sender", "name email avatar color");
      await notification.populate("relatedProject", "name");
      await notification.populate("relatedCard", "title");

      // Emit Socket.IO event for real-time notification
      try {
        const io = getIO();
        io.to(`user-${assigneeId}`).emit("new-notification", {
          notification,
        });
        console.log(`📬 Real-time notification sent to user ${assigneeId}`);
      } catch (socketError) {
        console.error(
          "Socket.IO error while sending notification:",
          socketError
        );
      }
    }

    // Populate the card with user details
    await card.populate("assignees", "name email avatar color");
    await card.populate("createdBy", "name email avatar color");

    // Send email notification to the unassigned user (async, non-blocking)
    if (assigneeId !== userId.toString()) {
      setImmediate(async () => {
        try {
          const assignee = await User.findById(assigneeId);
          const unassignedBy = await User.findById(userId);
          const project = await Project.findById(card.project);

          if (assignee && unassignedBy && project) {
            await sendCardUnassignedEmail(
              assignee,
              card,
              project,
              unassignedBy
            );
            console.log(`Card unassignment email sent to ${assignee.email}`);
          }
        } catch (emailError) {
          console.error("Error sending card unassignment email:", emailError);
          // Email failure doesn't affect the main request
        }
      });
    }

    // Emit Socket.IO event for real-time updates
    try {
      const io = getIO();
      io.to(`project-${card.project}`).emit("card-user-unassigned", {
        card,
        userId: userId.toString(),
      });
    } catch (socketError) {
      console.error("Socket.IO error:", socketError);
    }

    res.json({
      success: true,
      message: "User unassigned successfully",
      card,
    });
  } catch (error) {
    console.error("Unassign user error:", error);
    res.status(500).json({
      success: false,
      message: "Server error while unassigning user",
    });
  }
};

// @route   POST /api/cards/:id/comments
// @desc    Add comment to card
// @access  Private
const addComment = async (req, res) => {
  try {
    const cardId = req.params.id;
    const { comment, mentions = [] } = req.body;
    const userId = req.user._id;
    const userRole = req.user.role;

    const card = await Card.findById(cardId);

    if (!card) {
      return res.status(404).json({
        success: false,
        message: "Card not found",
      });
    }

    // Check if user has access to this card's project
    const project = await Project.findById(card.project);
    const isOwner = project.owner.toString() === userId.toString();
    const isMember = project.members.some(
      (member) => member.user.toString() === userId.toString()
    );

    if (!isOwner && !isMember && userRole !== "admin") {
      return res.status(403).json({
        success: false,
        message: "Access denied. You are not a member of this project.",
      });
    }

    const newComment = {
      text: comment,
      user: userId,
      timestamp: new Date(),
    };

    card.comments.push(newComment);

    // Add activity log entry
    card.activityLog.push({
      action: "commented",
      user: userId,
      timestamp: new Date(),
      details: "Added a comment",
    });

    await card.save();

    // Process mentions from both the mentions array and the comment text
    const extractedMentions = [];

    // Extract mentions from comment text (format: @username)
    const mentionRegex = /@(\w+)/g;
    let match;
    while ((match = mentionRegex.exec(comment)) !== null) {
      const username = match[1];

      // Find user by name (case insensitive)
      const mentionedUser = await User.findOne({
        name: { $regex: new RegExp(`^${username}$`, "i") },
      });

      if (mentionedUser) {
        extractedMentions.push({
          type: "user",
          id: mentionedUser._id.toString(),
          name: mentionedUser.name,
        });
      }
    }

    // Combine mentions from array and extracted mentions
    const allMentions = [...(mentions || []), ...extractedMentions];

    // Remove duplicates based on user ID
    const uniqueMentions = allMentions.filter(
      (mention, index, self) =>
        index === self.findIndex((m) => m.id === mention.id)
    );

    if (uniqueMentions.length > 0) {
      console.log("Processing mentions:", uniqueMentions);

      // Get mentioned users
      const mentionedUserIds = uniqueMentions
        .filter((mention) => mention.type === "user")
        .map((mention) => mention.id);

      // Get card assignees for @card mentions
      const cardAssignees = card.assignees.map((assignee) =>
        assignee.toString()
      );

      // Get project members for @board mentions
      const projectMembers = project.members.map((member) =>
        member.user.toString()
      );

      // Determine who to notify
      let usersToNotify = [];

      uniqueMentions.forEach((mention) => {
        if (mention.type === "user" && mention.id !== userId.toString()) {
          usersToNotify.push(mention.id);
        } else if (mention.type === "group" && mention.id === "card") {
          usersToNotify.push(
            ...cardAssignees.filter((id) => id !== userId.toString())
          );
        } else if (mention.type === "group" && mention.id === "board") {
          usersToNotify.push(
            ...projectMembers.filter((id) => id !== userId.toString())
          );
        }
      });

      // Remove duplicates
      usersToNotify = [...new Set(usersToNotify)];

      console.log("Users to notify:", usersToNotify);

      // Create notifications for mentioned users
      if (usersToNotify.length > 0) {
        const notifications = usersToNotify.map((userId) => ({
          user: userId,
          type: "comment_mention",
          title: "You were mentioned in a comment",
          message: `${req.user.name} mentioned you in a comment on "${card.title}"`,
          relatedCard: card._id,
          relatedProject: card.project,
          isRead: false,
        }));

        await Notification.insertMany(notifications);
        console.log(`Created ${notifications.length} mention notifications`);

        // Send email notifications (async)
        setImmediate(async () => {
          try {
            const { sendMentionEmail } = require("../config/email");
            const mentionedUsers = await User.find({
              _id: { $in: usersToNotify },
            });

            for (const mentionedUser of mentionedUsers) {
              await sendMentionEmail(
                mentionedUser,
                req.user,
                card,
                comment,
                project
              );
              console.log(`Mention email sent to ${mentionedUser.email}`);
            }
          } catch (emailError) {
            console.error("Error sending mention emails:", emailError);
          }
        });
      }
    }

    // Populate the card with user details
    await card.populate("assignees", "name email avatar color");
    await card.populate("createdBy", "name email avatar color");
    await card.populate("comments.user", "name email avatar color");

    // Emit Socket.IO event for real-time updates
    try {
      const io = getIO();
      io.to(`project-${card.project}`).emit("card-comment-added", {
        card,
        userId: userId.toString(),
      });
    } catch (socketError) {
      console.error("Socket.IO error:", socketError);
    }

    res.json({
      success: true,
      message: "Comment added successfully",
      card,
    });
  } catch (error) {
    console.error("Add comment error:", error);
    res.status(500).json({
      success: false,
      message: "Server error while adding comment",
    });
  }
};

// @route   PUT /api/cards/:id/comments/:commentId
// @desc    Update comment in card
// @access  Private
const updateComment = async (req, res) => {
  try {
    const cardId = req.params.id;
    const commentId = req.params.commentId;
    const userId = req.user._id;
    const userRole = req.user.role;
    const { text } = req.body;

    const card = await Card.findById(cardId);

    if (!card) {
      return res.status(404).json({
        success: false,
        message: "Card not found",
      });
    }

    // Check if user has access to this card's project
    const project = await Project.findById(card.project);
    const isOwner = project.owner.toString() === userId.toString();
    const isMember = project.members.some(
      (member) => member.user.toString() === userId.toString()
    );

    if (!isOwner && !isMember && userRole !== "admin") {
      return res.status(403).json({
        success: false,
        message: "Access denied. You are not a member of this project.",
      });
    }

    // Find the comment
    const comment = card.comments.find(
      (comment) => comment._id.toString() === commentId
    );

    if (!comment) {
      return res.status(404).json({
        success: false,
        message: "Comment not found",
      });
    }

    // Check if user is the author of the comment or has admin privileges
    if (comment.user.toString() !== userId.toString() && userRole !== "admin") {
      return res.status(403).json({
        success: false,
        message: "Access denied. You can only update your own comments.",
      });
    }

    // Update the comment
    comment.text = text;
    comment.updatedAt = new Date();

    // Add activity log entry
    card.activityLog.push({
      action: "comment_updated",
      user: userId,
      timestamp: new Date(),
      details: "Updated a comment",
    });

    await card.save();

    // Populate the card with user details
    await card.populate("assignees", "name email avatar color");
    await card.populate("createdBy", "name email avatar color");
    await card.populate("comments.user", "name email avatar color");

    // Emit Socket.IO event for real-time updates
    try {
      const io = getIO();
      io.to(`project-${card.project}`).emit("card-comment-updated", {
        card,
        userId: userId.toString(),
      });
    } catch (socketError) {
      console.error("Socket.IO error:", socketError);
    }

    res.json({
      success: true,
      message: "Comment updated successfully",
      card,
    });
  } catch (error) {
    console.error("Update comment error:", error);
    res.status(500).json({
      success: false,
      message: "Server error while updating comment",
    });
  }
};

// @route   POST /api/cards/:id/labels
// @desc    Add label to card
// @access  Private
const addLabel = async (req, res) => {
  try {
    const cardId = req.params.id;
    const { name, color = "blue" } = req.body;
    const userId = req.user._id;
    const userRole = req.user.role;

    const card = await Card.findById(cardId);
    if (!card) {
      return res.status(404).json({
        success: false,
        message: "Card not found",
      });
    }

    // Check access
    const project = await Project.findById(card.project);
    const isOwner = project.owner.toString() === userId.toString();
    const isMember = project.members.some(
      (member) => member.user.toString() === userId.toString()
    );

    if (!isOwner && !isMember && userRole !== "admin") {
      return res.status(403).json({
        success: false,
        message: "Access denied. You are not a member of this project.",
      });
    }

    // Check if label already exists
    const existingLabel = card.labels.find(
      (label) => label.name.toLowerCase() === name.toLowerCase()
    );

    if (existingLabel) {
      return res.status(400).json({
        success: false,
        message: "Label already exists on this card",
      });
    }

    card.labels.push({ name, color });
    await card.save();

    // Emit Socket.IO event for real-time updates
    try {
      const io = getIO();
      io.to(`project-${card.project}`).emit("card-label-added", {
        card,
        userId: userId.toString(),
      });
    } catch (socketError) {
      console.error("Socket.IO error:", socketError);
    }

    res.json({
      success: true,
      message: "Label added successfully",
      card,
    });
  } catch (error) {
    console.error("Add label error:", error);
    res.status(500).json({
      success: false,
      message: "Server error while adding label",
    });
  }
};

// @route   DELETE /api/cards/:id/labels/:labelId
// @desc    Remove label from card
// @access  Private
const removeLabel = async (req, res) => {
  try {
    const cardId = req.params.id;
    const labelId = req.params.labelId;
    const userId = req.user._id;
    const userRole = req.user.role;

    const card = await Card.findById(cardId);
    if (!card) {
      return res.status(404).json({
        success: false,
        message: "Card not found",
      });
    }

    // Check access
    const project = await Project.findById(card.project);
    const isOwner = project.owner.toString() === userId.toString();
    const isMember = project.members.some(
      (member) => member.user.toString() === userId.toString()
    );

    if (!isOwner && !isMember && userRole !== "admin") {
      return res.status(403).json({
        success: false,
        message: "Access denied. You are not a member of this project.",
      });
    }

    card.labels = card.labels.filter(
      (label) => label._id.toString() !== labelId
    );
    await card.save();

    // Emit Socket.IO event for real-time updates
    try {
      const io = getIO();
      io.to(`project-${card.project}`).emit("card-label-removed", {
        card,
        userId: userId.toString(),
      });
    } catch (socketError) {
      console.error("Socket.IO error:", socketError);
    }

    res.json({
      success: true,
      message: "Label removed successfully",
      card,
    });
  } catch (error) {
    console.error("Remove label error:", error);
    res.status(500).json({
      success: false,
      message: "Server error while removing label",
    });
  }
};

// @route   POST /api/cards/:id/attachments
// @desc    Add attachment to card
// @access  Private
const addAttachment = async (req, res) => {
  try {
    const cardId = req.params.id;
    const { filename, originalName, mimeType, size, url } = req.body;
    const userId = req.user._id;
    const userRole = req.user.role;

    const card = await Card.findById(cardId);
    if (!card) {
      return res.status(404).json({
        success: false,
        message: "Card not found",
      });
    }

    // Check access
    const project = await Project.findById(card.project);
    const isOwner = project.owner.toString() === userId.toString();
    const isMember = project.members.some(
      (member) => member.user.toString() === userId.toString()
    );

    if (!isOwner && !isMember && userRole !== "admin") {
      return res.status(403).json({
        success: false,
        message: "Access denied. You are not a member of this project.",
      });
    }

    const attachment = {
      filename,
      originalName,
      mimeType,
      size,
      url,
      uploadedBy: userId,
    };

    card.attachments.push(attachment);
    await card.save();

    // Emit Socket.IO event for real-time updates
    try {
      const io = getIO();
      io.to(`project-${card.project}`).emit("card-attachment-added", {
        card,
        userId: userId.toString(),
      });
    } catch (socketError) {
      console.error("Socket.IO error:", socketError);
    }

    res.json({
      success: true,
      message: "Attachment added successfully",
      card,
    });
  } catch (error) {
    console.error("Add attachment error:", error);
    res.status(500).json({
      success: false,
      message: "Server error while adding attachment",
    });
  }
};

// @route   POST /api/cards/:id/upload-files
// @desc    Upload files to card
// @access  Private
const uploadFiles = async (req, res) => {
  try {
    const cardId = req.params.id;
    const userId = req.user._id;
    const userRole = req.user.role;
    const uploadedFiles = req.files || [];

    const card = await Card.findById(cardId);
    if (!card) {
      return res.status(404).json({
        success: false,
        message: "Card not found",
      });
    }

    // Check access
    const project = await Project.findById(card.project);
    const isOwner = project.owner.toString() === userId.toString();
    const isMember = project.members.some(
      (member) => member.user.toString() === userId.toString()
    );

    if (!isOwner && !isMember && userRole !== "admin") {
      return res.status(403).json({
        success: false,
        message: "Access denied. You are not a member of this project.",
      });
    }

    if (uploadedFiles.length === 0) {
      return res.status(400).json({
        success: false,
        message: "No files uploaded",
      });
    }

    // Add uploaded files as attachments
    const attachments = uploadedFiles.map((file) => ({
      filename: file.filename,
      originalName: file.originalName,
      mimeType: file.mimeType,
      size: file.size,
      url: file.url,
      uploadedBy: userId,
    }));

    card.attachments.push(...attachments);

    // Add activity log entry
    card.activityLog.push({
      action: "files_uploaded",
      user: userId,
      timestamp: new Date(),
      details: `Uploaded ${uploadedFiles.length} file(s)`,
    });

    // Add comments per uploaded file
    const user = await User.findById(userId).select("name");

    uploadedFiles.forEach((file) => {
      const isImage = file.mimeType && file.mimeType.startsWith("image/");
      const commentText = isImage
        ? `
          <p><strong>${user.name}</strong> uploaded an image:</p>
          <img src="${file.url}" alt="${file.originalName}" style="max-width: 300px; margin-top: 8px; border-radius: 6px;" />
        `
        : `
          <p><strong>${user.name}</strong> uploaded an attachment: 
            <a href="${file.url}" target="_blank" style="background-color: #e0f2fe; padding: 2px 6px; border-radius: 4px; font-weight: 500; text-decoration: none;">
              ${file.originalName}
            </a>
          </p>
        `;

      card.comments.push({
        user: userId,
        text: commentText,
        timestamp: new Date(),
      });
    });

    await card.save();

    // Populate user info for frontend
    await card.populate("assignees", "name email avatar color");
    await card.populate("createdBy", "name email avatar color");

    // Emit Socket.IO event for real-time updates
    try {
      const io = getIO();
      io.to(`project-${card.project}`).emit("card-files-uploaded", {
        card,
        userId: userId.toString(),
      });
    } catch (socketError) {
      console.error("Socket.IO error:", socketError);
    }

    res.json({
      success: true,
      message: `${uploadedFiles.length} file(s) uploaded successfully`,
      card,
      uploadedFiles: attachments,
    });
  } catch (error) {
    console.error("Upload files error:", error);
    res.status(500).json({
      success: false,
      message: "Server error while uploading files",
    });
  }
};

// @route   DELETE /api/cards/:id/attachments/:attachmentId
// @desc    Remove attachment from card
// @access  Private
const removeAttachment = async (req, res) => {
  try {
    const cardId = req.params.id;
    const attachmentId = req.params.attachmentId;
    const userId = req.user._id;
    const userRole = req.user.role;

    const card = await Card.findById(cardId);
    if (!card) {
      return res.status(404).json({
        success: false,
        message: "Card not found",
      });
    }

    // Check access
    const project = await Project.findById(card.project);
    const isOwner = project.owner.toString() === userId.toString();
    const isMember = project.members.some(
      (member) => member.user.toString() === userId.toString()
    );

    if (!isOwner && !isMember && userRole !== "admin") {
      return res.status(403).json({
        success: false,
        message: "Access denied. You are not a member of this project.",
      });
    }

    // Find the attachment to get file info before removing
    const attachmentToRemove = card.attachments.find(
      (attachment) => attachment._id.toString() === attachmentId
    );

    if (!attachmentToRemove) {
      return res.status(404).json({
        success: false,
        message: "Attachment not found",
      });
    }

    // Remove attachment from card
    card.attachments = card.attachments.filter(
      (attachment) => attachment._id.toString() !== attachmentId
    );

    // Add activity log entry
    card.activityLog.push({
      action: "attachment_removed",
      user: userId,
      timestamp: new Date(),
      details: `Removed attachment: ${attachmentToRemove.originalName}`,
    });

    // Add comment with file or image preview
    const user = await User.findById(userId).select("name");

    const isImage =
      attachmentToRemove.mimeType &&
      attachmentToRemove.mimeType.startsWith("image/");
    const commentText = isImage
      ? `
        <p><strong>${user.name}</strong> removed an image: ${attachmentToRemove.originalName}</p>
      `
      : `
        <p><strong>${user.name}</strong> removed an attachment: ${attachmentToRemove.originalName} </p>
      `;

    card.comments.push({
      user: userId,
      text: commentText,
      timestamp: new Date(),
    });

    await card.save();

    // Delete the physical file (optional if handled externally)
    const filePath = getFilePathFromUrl(attachmentToRemove.url);
    const fileDeleted = deleteFile(filePath);

    if (!fileDeleted) {
      console.warn(`Failed to delete file: ${filePath}`);
    }

    // Populate the card with user details
    await card.populate("assignees", "name email avatar color");
    await card.populate("createdBy", "name email avatar color");

    // Emit Socket.IO event for real-time updates
    try {
      const io = getIO();
      io.to(`project-${card.project}`).emit("card-attachment-removed", {
        card,
        userId: userId.toString(),
      });
    } catch (socketError) {
      console.error("Socket.IO error:", socketError);
    }

    res.json({
      success: true,
      message: "Attachment removed successfully",
      card,
    });
  } catch (error) {
    console.error("Remove attachment error:", error);
    res.status(500).json({
      success: false,
      message: "Server error while removing attachment",
    });
  }
};

// @route   DELETE /api/cards/:id
// @desc    Permanently delete a card
// @access  Private
const deleteCard = async (req, res) => {
  try {
    const cardId = req.params.id;
    const userId = req.user._id;
    const userRole = req.user.role;

    const card = await Card.findById(cardId);

    if (!card) {
      return res.status(404).json({
        success: false,
        message: "Card not found",
      });
    }

    // Check if user has access to this card's project
    const project = await Project.findById(card.project);
    const isOwner = project.owner.toString() === userId.toString();
    const isMember = project.members.some(
      (member) => member.user.toString() === userId.toString()
    );

    if (!isOwner && !isMember && userRole !== "admin") {
      return res.status(403).json({
        success: false,
        message: "Access denied. You are not a member of this project.",
      });
    }

    // Only allow deletion of archived cards
    if (!card.isArchived) {
      return res.status(400).json({
        success: false,
        message:
          "Only archived cards can be permanently deleted. Please archive the card first.",
      });
    }

    // Delete all related card items first
    const CardItem = require("../models/CardItem");
    await CardItem.deleteMany({ card: cardId });

    // Delete the card
    await Card.findByIdAndDelete(cardId);

    // Emit Socket.IO event for real-time updates
    try {
      const { getIO } = require("../config/socket");
      const io = getIO();
      io.to(`project-${project._id}`).emit("card-deleted", {
        cardId,
        userId: userId.toString(),
      });
    } catch (socketError) {
      console.error("Socket.IO error:", socketError);
    }

    res.json({
      success: true,
      message: "Card permanently deleted",
    });
  } catch (error) {
    console.error("Delete card error:", error);
    res.status(500).json({
      success: false,
      message: "Server error while deleting card",
    });
  }
};

// @route   POST /api/projects/:projectId/cards/move-all
// @desc    Move all cards from one column to another
// @access  Private
const moveAllCards = async (req, res) => {
  try {
    const projectId = req.params.projectId || req.params.id;
    const userId = req.user._id;
    const userRole = req.user.role;
    const { sourceStatus, targetStatus } = req.body;

    if (!sourceStatus || !targetStatus) {
      return res.status(400).json({
        success: false,
        message: "Source status and target status are required",
      });
    }

    if (sourceStatus === targetStatus) {
      return res.status(400).json({
        success: false,
        message: "Source and target columns cannot be the same",
      });
    }

    // Check if user has access to this project
    const project = await Project.findById(projectId);
    if (!project) {
      return res.status(404).json({
        success: false,
        message: "Project not found",
      });
    }

    const isOwner = project.owner.toString() === userId.toString();
    const isMember = project.members.some(
      (member) => member.user.toString() === userId.toString()
    );

    if (!isOwner && !isMember && userRole !== "admin") {
      return res.status(403).json({
        success: false,
        message: "Access denied. You are not a member of this project.",
      });
    }

    // Verify columns exist
    const sourceColumn = await Column.findOne({
      project: projectId,
      status: sourceStatus,
    });
    const targetColumn = await Column.findOne({
      project: projectId,
      status: targetStatus,
    });

    if (!sourceColumn) {
      return res.status(404).json({
        success: false,
        message: "Source column not found",
      });
    }

    if (!targetColumn) {
      return res.status(404).json({
        success: false,
        message: "Target column not found",
      });
    }

    // Prevent moving to/from archive column
    if (sourceStatus === "archive" || targetStatus === "archive") {
      return res.status(400).json({
        success: false,
        message:
          "Cannot move cards to or from archive column using this endpoint",
      });
    }

    // Find all cards in the source column (non-archived)
    const cards = await Card.find({
      project: projectId,
      status: sourceStatus,
      isArchived: false,
    });

    if (cards.length === 0) {
      return res.status(400).json({
        success: false,
        message: "No cards found in the source column",
      });
    }

    // Get user information for activity comment
    const user = await User.findById(userId).select("name");

    // Get status labels
    const sourceStatusLabel = sourceColumn.name;
    const targetStatusLabel = targetColumn.name;

    // Update all cards
    const updatedCards = [];
    for (const card of cards) {
      const oldStatus = card.status;
      card.status = targetStatus;

      // Add automatic comment for bulk move
      card.comments.push({
        user: userId,
        text: `<p><strong>${user.name}</strong> moved this card from <span style="background-color: #f3f4f6; padding: 2px 6px; border-radius: 4px; font-weight: 500;">${sourceStatusLabel}</span> to <span style="background-color: #dbeafe; padding: 2px 6px; border-radius: 4px; font-weight: 500;">${targetStatusLabel}</span></p>`,
        timestamp: new Date(),
      });

      // Add activity log entry
      card.activityLog.push({
        action: "status_changed",
        user: userId,
        timestamp: new Date(),
        details: `Status changed from ${oldStatus} to ${targetStatus} (bulk move)`,
      });

      await card.save();

      // Populate the card with user details
      await card.populate("assignees", "name email avatar color");
      await card.populate("createdBy", "name email avatar color");

      updatedCards.push(card);
    }

    // Emit Socket.IO events for real-time updates
    try {
      const io = getIO();
      // Emit individual card updates for each moved card
      updatedCards.forEach((card) => {
        io.to(`project-${projectId}`).emit("card-status-changed", {
          card,
          userId: userId.toString(),
        });
      });

      // Also emit a bulk move event
      io.to(`project-${projectId}`).emit("cards-bulk-moved", {
        projectId,
        sourceStatus,
        targetStatus,
        cardCount: updatedCards.length,
        userId: userId.toString(),
      });
    } catch (socketError) {
      console.error("Socket.IO error:", socketError);
    }

    res.json({
      success: true,
      message: `Successfully moved ${updatedCards.length} card(s) from "${sourceStatusLabel}" to "${targetStatusLabel}"`,
      movedCount: updatedCards.length,
      cards: updatedCards,
    });
  } catch (error) {
    console.error("Move all cards error:", error);
    res.status(500).json({
      success: false,
      message: "Server error while moving cards",
    });
  }
};

// @route   GET /api/cards/due-today
// @desc    Get cards assigned to current user that are due today
// @access  Private
const getCardsDueToday = async (req, res) => {
  try {
    const userId = req.user._id;

    // Get start and end of today
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date();
    endOfDay.setHours(23, 59, 59, 999);

    // Find cards assigned to user, due today, not completed, not archived
    const cards = await Card.find({
      assignees: userId,
      dueDate: {
        $gte: startOfDay,
        $lte: endOfDay,
      },
      isComplete: false,
      isArchived: false,
    })
      .populate("project", "name")
      .populate("assignees", "name email avatar color")
      .populate("createdBy", "name email avatar color")
      .sort({ dueDate: 1 });

    res.json({
      success: true,
      cards,
      count: cards.length,
    });
  } catch (error) {
    console.error("Get cards due today error:", error);
    res.status(500).json({
      success: false,
      message: "Server error while fetching cards due today",
    });
  }
};

// @route   GET /api/cards/back-date
// @desc    Get cards assigned to current user that are past due (before today)
// @access  Private
const getCardsBackDate = async (req, res) => {
  try {
    const userId = req.user._id;

    // Get start of today
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    // Find cards assigned to user, due before today, not completed, not archived
    const cards = await Card.find({
      assignees: userId,
      dueDate: {
        $lt: startOfDay,
      },
      isComplete: false,
      isArchived: false,
    })
      .populate("project", "name")
      .populate("assignees", "name email avatar color")
      .populate("createdBy", "name email avatar color")
      .sort({ dueDate: -1 });

    res.json({
      success: true,
      cards,
      count: cards.length,
    });
  } catch (error) {
    console.error("Get cards back date error:", error);
    res.status(500).json({
      success: false,
      message: "Server error while fetching cards back date",
    });
  }
};

// @route   GET /api/cards/upcoming
// @desc    Get cards assigned to current user that are due in the future (after today)
// @access  Private
const getCardsUpcoming = async (req, res) => {
  try {
    const userId = req.user._id;

    // Get end of today
    const endOfDay = new Date();
    endOfDay.setHours(23, 59, 59, 999);

    // Find cards assigned to user, due after today, not completed, not archived
    const cards = await Card.find({
      assignees: userId,
      dueDate: {
        $gt: endOfDay,
      },
      isComplete: false,
      isArchived: false,
    })
      .populate("project", "name")
      .populate("assignees", "name email avatar color")
      .populate("createdBy", "name email avatar color")
      .sort({ dueDate: 1 });

    res.json({
      success: true,
      cards,
      count: cards.length,
    });
  } catch (error) {
    console.error("Get cards upcoming error:", error);
    res.status(500).json({
      success: false,
      message: "Server error while fetching upcoming cards",
    });
  }
};

// @route   PUT /api/cards/:id/read
// @desc    Mark card as read by current user
// @access  Private
const markCardAsRead = async (req, res) => {
  try {
    const cardId = req.params.id;
    const userId = req.user._id;
    const userRole = req.user.role;

    const card = await Card.findById(cardId);

    if (!card) {
      return res.status(404).json({
        success: false,
        message: "Card not found",
      });
    }

    // Check if user has access to this card's project
    const project = await Project.findById(card.project);
    const isOwner = project.owner.toString() === userId.toString();
    const isMember = project.members.some(
      (member) => member.user.toString() === userId.toString()
    );

    if (!isOwner && !isMember && userRole !== "admin") {
      return res.status(403).json({
        success: false,
        message: "Access denied. You are not a member of this project.",
      });
    }

    // Check if user has already read this card
    const alreadyRead = card.readBy.some(
      (readEntry) => readEntry.user.toString() === userId.toString()
    );

    if (!alreadyRead) {
      // Add user to readBy array
      card.readBy.push({
        user: userId,
        readAt: new Date(),
      });
      await card.save();
    }

    // Populate the card with user details
    await card.populate("assignees", "name email avatar color");
    await card.populate("createdBy", "name email avatar color");
    await card.populate("readBy.user", "name email avatar color");

    res.json({
      success: true,
      message: "Card marked as read",
      card,
    });
  } catch (error) {
    console.error("Mark card as read error:", error);
    res.status(500).json({
      success: false,
      message: "Server error while marking card as read",
    });
  }
};

module.exports = {
  getCards,
  getCard,
  createCard,
  updateCard,
  archiveCard,
  restoreCard,
  updateStatus,
  reorderCards,
  toggleComplete,
  getCardsDueToday,
  getCardsBackDate,
  getCardsUpcoming,
  assignUser,
  unassignUser,
  addComment,
  updateComment,
  addLabel,
  removeLabel,
  addAttachment,
  removeAttachment,
  uploadFiles,
  moveAllCards,
  deleteCard,
  markCardAsRead,
};
