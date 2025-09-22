const Card = require("../models/Card");
const Project = require("../models/Project");
const User = require("../models/User");
const Notification = require("../models/Notification");
const { validationResult } = require("express-validator");

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
      .sort({ createdAt: -1 });

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

    if (title) card.title = title;
    if (description !== undefined) card.description = description;
    if (status) card.status = status;
    if (priority) card.priority = priority;
    if (assignees) card.assignees = assignees;
    if (labels) card.labels = labels;
    if (dueDate !== undefined) {
      card.dueDate = dueDate ? new Date(dueDate) : null;
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
    card.status = status;

    // Add activity log entry
    card.activityLog.push({
      action: "status_changed",
      user: userId,
      timestamp: new Date(),
      details: `Status changed from ${oldStatus} to ${status}`,
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

    // Add activity log entry
    card.activityLog.push({
      action: "unassigned",
      user: userId,
      timestamp: new Date(),
      details: `User unassigned from card`,
    });

    await card.save();

    // Populate the card with user details
    await card.populate("assignees", "name email avatar color");
    await card.populate("createdBy", "name email avatar color");

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
    const { comment } = req.body;
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

// @route   DELETE /api/cards/:id/comments/:commentId
// @desc    Delete comment from card
// @access  Private
const deleteComment = async (req, res) => {
  try {
    const cardId = req.params.id;
    const commentId = req.params.commentId;
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

    // Find and remove the comment
    const commentIndex = card.comments.findIndex(
      (comment) => comment._id.toString() === commentId
    );

    if (commentIndex === -1) {
      return res.status(404).json({
        success: false,
        message: "Comment not found",
      });
    }

    // Check if user is the comment author or admin
    const comment = card.comments[commentIndex];
    if (comment.user.toString() !== userId.toString() && userRole !== "admin") {
      return res.status(403).json({
        success: false,
        message: "Access denied. You can only delete your own comments.",
      });
    }

    card.comments.splice(commentIndex, 1);

    // Add activity log entry
    card.activityLog.push({
      action: "comment_deleted",
      user: userId,
      timestamp: new Date(),
      details: "Deleted a comment",
    });

    await card.save();

    // Populate the card with user details
    await card.populate("assignees", "name email avatar color");
    await card.populate("createdBy", "name email avatar color");
    await card.populate("comments.user", "name email avatar color");

    res.json({
      success: true,
      message: "Comment deleted successfully",
      card,
    });
  } catch (error) {
    console.error("Delete comment error:", error);
    res.status(500).json({
      success: false,
      message: "Server error while deleting comment",
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
  deleteComment,
};
