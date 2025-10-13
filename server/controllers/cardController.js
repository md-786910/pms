const Card = require("../models/Card");
const Project = require("../models/Project");
const User = require("../models/User");
const Column = require("../models/Column");
const Notification = require("../models/Notification");
const { validationResult } = require("express-validator");
const {
  sendCardAssignedEmail,
  sendCardUnassignedEmail,
} = require("../config/email");
const { deleteFile, getFilePathFromUrl } = require("../middleware/upload");

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

// @route   GET /api/projects/:projectId/cards
// @desc    Get all cards for a project
// @access  Private
const getCards = async (req, res) => {
  try {
    const projectId = req.params.id || req.params.projectId;
    const userId = req.user._id;
    const userRole = req.user.role;

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

    const cards = await Card.find({ project: projectId })
      .populate("assignees", "name email avatar color")
      .populate("createdBy", "name email avatar color")
      .populate("comments.user", "name email avatar color")
      .sort({ createdAt: -1 });

    // Sort comments in each card with latest at top
    cards.forEach((card) => {
      if (card.comments && card.comments.length > 0) {
        card.comments.sort((a, b) => {
          const aTime = a.updatedAt || a.timestamp || a.createdAt;
          const bTime = b.updatedAt || b.timestamp || b.createdAt;
          return new Date(bTime) - new Date(aTime);
        });
      }
    });

    res.json({
      success: true,
      cards,
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

    res.json({
      success: true,
      card,
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

    const card = new Card({
      title,
      description,
      project,
      status,
      priority,
      assignees,
      labels,
      dueDate: dueDate ? new Date(dueDate) : undefined,
      createdBy: userId,
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
      }
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
    const { title, description, status, priority, assignees, labels, dueDate } =
      req.body;

    // Store previous values for comparison
    const previousStatus = card.status;
    const previousAssignees = [...card.assignees];

    if (title) card.title = title;
    if (description !== undefined) card.description = description;
    if (status) card.status = status;
    if (priority) card.priority = priority;
    if (assignees) card.assignees = assignees;
    if (labels) card.labels = labels;
    const previousDueDate = card.dueDate;

    // Update due date
    if (dueDate !== undefined) {
      card.dueDate = dueDate ? new Date(dueDate) : null;
    }

    // Fetch user
    // const user = await User.findById(userId).select("name");
    // Get user information for activity comments
    const user = await User.findById(userId).select("name");

    // Add comment if due date changed
    if (
      dueDate !== undefined &&
      new Date(dueDate).toISOString().slice(0, 10) !==
        (previousDueDate
          ? new Date(previousDueDate).toISOString().slice(0, 10)
          : null)
    ) {
      const formattedNewDate = new Date(dueDate).toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
      });

      const formattedOldDate = previousDueDate
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

// @route   DELETE /api/cards/:id
// @desc    Delete card
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

    await Card.findByIdAndDelete(cardId);

    res.json({
      success: true,
      message: "Card deleted successfully",
    });
  } catch (error) {
    console.error("Delete card error:", error);
    res.status(500).json({
      success: false,
      message: "Server error while deleting card",
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
        <p><strong>${user.name}</strong> removed an image:</p>
        <img src="${attachmentToRemove.url}" alt="${attachmentToRemove.originalName}" style="max-width: 300px; margin-top: 8px; border-radius: 6px;" />
      `
      : `
        <p><strong>${user.name}</strong> removed an attachment: 
          <a href="${attachmentToRemove.url}" target="_blank" style="background-color: #fee2e2; padding: 2px 6px; border-radius: 4px; font-weight: 500; text-decoration: none;">
            ${attachmentToRemove.originalName}
          </a>
        </p>
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

module.exports = {
  getCards,
  getCard,
  createCard,
  updateCard,
  deleteCard,
  updateStatus,
  assignUser,
  unassignUser,
  addComment,
  updateComment,
  addLabel,
  removeLabel,
  addAttachment,
  removeAttachment,
  uploadFiles,
};
