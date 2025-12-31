const TimeEntry = require("../models/TimeEntry");
const ActiveTimer = require("../models/ActiveTimer");
const Card = require("../models/Card");
const Project = require("../models/Project");
const { getIO } = require("../config/socket");

// Helper function to recalculate and update card's total time spent
const updateCardTotalTime = async (cardId) => {
  const result = await TimeEntry.aggregate([
    { $match: { card: cardId } },
    { $group: { _id: null, total: { $sum: "$duration" } } },
  ]);
  const totalTimeSpent = result.length > 0 ? result[0].total : 0;
  await Card.findByIdAndUpdate(cardId, { totalTimeSpent });
  return totalTimeSpent;
};

// Start timer on a card
exports.startTimer = async (req, res) => {
  try {
    const { cardId } = req.body;
    const userId = req.user._id;

    // Validate card exists
    const card = await Card.findById(cardId);
    if (!card) {
      return res.status(404).json({
        success: false,
        message: "Card not found",
      });
    }

    // Check if card is archived
    if (card.isArchived) {
      return res.status(400).json({
        success: false,
        message: "Cannot track time on archived cards",
      });
    }

    // Check if user already has an active timer
    const existingTimer = await ActiveTimer.findOne({ user: userId });
    if (existingTimer) {
      // Stop the existing timer first
      const elapsedSeconds = Math.floor(
        (Date.now() - existingTimer.startedAt) / 1000
      );
      const totalDuration = existingTimer.accumulatedSeconds + elapsedSeconds;

      if (totalDuration > 0) {
        // Create time entry for the previous timer
        await TimeEntry.create({
          card: existingTimer.card,
          project: existingTimer.project,
          user: userId,
          duration: totalDuration,
          entryType: "timer",
          workDate: existingTimer.startedAt,
          timerStartedAt: existingTimer.startedAt,
          timerStoppedAt: new Date(),
        });

        // Update the previous card's total time
        const prevCardTotal = await updateCardTotalTime(existingTimer.card);

        // Emit socket event for the previous card
        try {
          const io = getIO();
          io.to(`project-${existingTimer.project}`).emit("timer-stopped", {
            userId: userId.toString(),
            cardId: existingTimer.card.toString(),
            cardTotalTime: prevCardTotal,
          });
        } catch (socketError) {
          console.error("Socket error:", socketError);
        }
      }

      // Delete the existing timer
      await ActiveTimer.deleteOne({ user: userId });
    }

    // Create new active timer
    const activeTimer = await ActiveTimer.create({
      user: userId,
      card: cardId,
      project: card.project,
      startedAt: new Date(),
      accumulatedSeconds: 0,
    });

    // Populate for response
    await activeTimer.populate([
      { path: "card", select: "title cardNumber" },
      { path: "project", select: "name" },
    ]);

    // Emit socket event
    try {
      const io = getIO();
      io.to(`project-${card.project}`).emit("timer-started", {
        userId: userId.toString(),
        cardId: cardId,
        startedAt: activeTimer.startedAt,
      });
    } catch (socketError) {
      console.error("Socket error:", socketError);
    }

    res.status(200).json({
      success: true,
      activeTimer: {
        ...activeTimer.toObject(),
        elapsedSeconds: 0,
      },
    });
  } catch (error) {
    console.error("Error starting timer:", error);
    res.status(500).json({
      success: false,
      message: "Failed to start timer",
      error: error.message,
    });
  }
};

// Stop timer and create time entry
exports.stopTimer = async (req, res) => {
  try {
    const userId = req.user._id;

    // Find active timer
    const activeTimer = await ActiveTimer.findOne({ user: userId });
    if (!activeTimer) {
      return res.status(404).json({
        success: false,
        message: "No active timer found",
      });
    }

    // Calculate duration
    const elapsedSeconds = Math.floor(
      (Date.now() - activeTimer.startedAt) / 1000
    );
    const totalDuration = activeTimer.accumulatedSeconds + elapsedSeconds;

    let timeEntry = null;
    if (totalDuration > 0) {
      // Create time entry
      timeEntry = await TimeEntry.create({
        card: activeTimer.card,
        project: activeTimer.project,
        user: userId,
        duration: totalDuration,
        entryType: "timer",
        workDate: activeTimer.startedAt,
        timerStartedAt: activeTimer.startedAt,
        timerStoppedAt: new Date(),
      });

      // Populate user for response
      await timeEntry.populate("user", "name avatar color");
    }

    // Update card's total time
    const cardTotalTime = await updateCardTotalTime(activeTimer.card);

    // Get card for socket room
    const card = await Card.findById(activeTimer.card);

    // Delete active timer
    await ActiveTimer.deleteOne({ user: userId });

    // Emit socket event
    try {
      const io = getIO();
      io.to(`project-${activeTimer.project}`).emit("timer-stopped", {
        userId: userId.toString(),
        cardId: activeTimer.card.toString(),
        entry: timeEntry,
        cardTotalTime,
      });
    } catch (socketError) {
      console.error("Socket error:", socketError);
    }

    res.status(200).json({
      success: true,
      entry: timeEntry,
      cardTotalTime,
    });
  } catch (error) {
    console.error("Error stopping timer:", error);
    res.status(500).json({
      success: false,
      message: "Failed to stop timer",
      error: error.message,
    });
  }
};

// Get user's active timer
exports.getActiveTimer = async (req, res) => {
  try {
    const userId = req.user._id;

    const activeTimer = await ActiveTimer.findOne({ user: userId }).populate([
      { path: "card", select: "title cardNumber project" },
      { path: "project", select: "name" },
    ]);

    if (!activeTimer) {
      return res.status(200).json({
        success: true,
        activeTimer: null,
      });
    }

    // Calculate elapsed time
    const elapsedSeconds = Math.floor(
      (Date.now() - activeTimer.startedAt) / 1000
    );
    const totalElapsed = activeTimer.accumulatedSeconds + elapsedSeconds;

    res.status(200).json({
      success: true,
      activeTimer: {
        ...activeTimer.toObject(),
        elapsedSeconds: totalElapsed,
      },
    });
  } catch (error) {
    console.error("Error getting active timer:", error);
    res.status(500).json({
      success: false,
      message: "Failed to get active timer",
      error: error.message,
    });
  }
};

// Discard active timer without saving
exports.discardTimer = async (req, res) => {
  try {
    const userId = req.user._id;

    const activeTimer = await ActiveTimer.findOne({ user: userId });
    if (!activeTimer) {
      return res.status(404).json({
        success: false,
        message: "No active timer found",
      });
    }

    const projectId = activeTimer.project;
    const cardId = activeTimer.card;

    // Delete without creating time entry
    await ActiveTimer.deleteOne({ user: userId });

    // Emit socket event
    try {
      const io = getIO();
      io.to(`project-${projectId}`).emit("timer-discarded", {
        userId: userId.toString(),
        cardId: cardId.toString(),
      });
    } catch (socketError) {
      console.error("Socket error:", socketError);
    }

    res.status(200).json({
      success: true,
      message: "Timer discarded",
    });
  } catch (error) {
    console.error("Error discarding timer:", error);
    res.status(500).json({
      success: false,
      message: "Failed to discard timer",
      error: error.message,
    });
  }
};

// Add manual time entry
exports.addManualEntry = async (req, res) => {
  try {
    const { cardId, duration, description, workDate, isBillable } = req.body;
    const userId = req.user._id;

    // Validate card exists
    const card = await Card.findById(cardId);
    if (!card) {
      return res.status(404).json({
        success: false,
        message: "Card not found",
      });
    }

    // Check if card is archived
    if (card.isArchived) {
      return res.status(400).json({
        success: false,
        message: "Cannot track time on archived cards",
      });
    }

    // Validate duration
    if (!duration || duration <= 0) {
      return res.status(400).json({
        success: false,
        message: "Duration must be greater than 0",
      });
    }

    // Create time entry
    const timeEntry = await TimeEntry.create({
      card: cardId,
      project: card.project,
      user: userId,
      duration,
      description: description || "",
      entryType: "manual",
      workDate: workDate || new Date(),
      isBillable: isBillable !== undefined ? isBillable : true,
    });

    // Populate user for response
    await timeEntry.populate("user", "name avatar color");

    // Update card's total time
    const cardTotalTime = await updateCardTotalTime(cardId);

    // Emit socket event
    try {
      const io = getIO();
      io.to(`project-${card.project}`).emit("time-entry-added", {
        userId: userId.toString(),
        cardId: cardId,
        entry: timeEntry,
        cardTotalTime,
      });
    } catch (socketError) {
      console.error("Socket error:", socketError);
    }

    res.status(201).json({
      success: true,
      entry: timeEntry,
      cardTotalTime,
    });
  } catch (error) {
    console.error("Error adding time entry:", error);
    res.status(500).json({
      success: false,
      message: "Failed to add time entry",
      error: error.message,
    });
  }
};

// Update time entry
exports.updateEntry = async (req, res) => {
  try {
    const { id } = req.params;
    const { duration, description, workDate, isBillable } = req.body;
    const userId = req.user._id;

    // Find time entry
    const timeEntry = await TimeEntry.findById(id);
    if (!timeEntry) {
      return res.status(404).json({
        success: false,
        message: "Time entry not found",
      });
    }

    // Check ownership
    if (timeEntry.user.toString() !== userId.toString()) {
      return res.status(403).json({
        success: false,
        message: "You can only edit your own time entries",
      });
    }

    // Update fields
    if (duration !== undefined && duration > 0) {
      timeEntry.duration = duration;
    }
    if (description !== undefined) {
      timeEntry.description = description;
    }
    if (workDate !== undefined) {
      timeEntry.workDate = workDate;
    }
    if (isBillable !== undefined) {
      timeEntry.isBillable = isBillable;
    }

    await timeEntry.save();

    // Populate user for response
    await timeEntry.populate("user", "name avatar color");

    // Update card's total time
    const cardTotalTime = await updateCardTotalTime(timeEntry.card);

    // Emit socket event
    try {
      const io = getIO();
      io.to(`project-${timeEntry.project}`).emit("time-entry-updated", {
        userId: userId.toString(),
        cardId: timeEntry.card.toString(),
        entry: timeEntry,
        cardTotalTime,
      });
    } catch (socketError) {
      console.error("Socket error:", socketError);
    }

    res.status(200).json({
      success: true,
      entry: timeEntry,
      cardTotalTime,
    });
  } catch (error) {
    console.error("Error updating time entry:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update time entry",
      error: error.message,
    });
  }
};

// Delete time entry
exports.deleteEntry = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user._id;

    // Find time entry
    const timeEntry = await TimeEntry.findById(id);
    if (!timeEntry) {
      return res.status(404).json({
        success: false,
        message: "Time entry not found",
      });
    }

    // Check ownership
    if (timeEntry.user.toString() !== userId.toString()) {
      return res.status(403).json({
        success: false,
        message: "You can only delete your own time entries",
      });
    }

    const cardId = timeEntry.card;
    const projectId = timeEntry.project;
    const entryId = timeEntry._id;

    // Delete time entry
    await TimeEntry.deleteOne({ _id: id });

    // Update card's total time
    const cardTotalTime = await updateCardTotalTime(cardId);

    // Emit socket event
    try {
      const io = getIO();
      io.to(`project-${projectId}`).emit("time-entry-deleted", {
        userId: userId.toString(),
        cardId: cardId.toString(),
        entryId: entryId.toString(),
        cardTotalTime,
      });
    } catch (socketError) {
      console.error("Socket error:", socketError);
    }

    res.status(200).json({
      success: true,
      message: "Time entry deleted",
      cardTotalTime,
    });
  } catch (error) {
    console.error("Error deleting time entry:", error);
    res.status(500).json({
      success: false,
      message: "Failed to delete time entry",
      error: error.message,
    });
  }
};

// Get time entries for a card
exports.getCardTimeEntries = async (req, res) => {
  try {
    const { cardId } = req.params;
    const { page = 1, limit = 20 } = req.query;

    // Validate card exists
    const card = await Card.findById(cardId);
    if (!card) {
      return res.status(404).json({
        success: false,
        message: "Card not found",
      });
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const entries = await TimeEntry.find({ card: cardId })
      .populate("user", "name avatar color")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await TimeEntry.countDocuments({ card: cardId });

    res.status(200).json({
      success: true,
      entries,
      pagination: {
        total,
        page: parseInt(page),
        pages: Math.ceil(total / parseInt(limit)),
      },
    });
  } catch (error) {
    console.error("Error getting card time entries:", error);
    res.status(500).json({
      success: false,
      message: "Failed to get time entries",
      error: error.message,
    });
  }
};

// Get project time summary
exports.getProjectTimeSummary = async (req, res) => {
  try {
    const { projectId } = req.params;
    const mongoose = require("mongoose");

    // Validate project exists
    const project = await Project.findById(projectId);
    if (!project) {
      return res.status(404).json({
        success: false,
        message: "Project not found",
      });
    }

    // Get total time and aggregations
    const [totalResult, byCard, byUser] = await Promise.all([
      // Total time spent on project
      TimeEntry.aggregate([
        { $match: { project: new mongoose.Types.ObjectId(projectId) } },
        { $group: { _id: null, total: { $sum: "$duration" } } },
      ]),

      // Time by card
      TimeEntry.aggregate([
        { $match: { project: new mongoose.Types.ObjectId(projectId) } },
        {
          $group: {
            _id: "$card",
            timeSpent: { $sum: "$duration" },
            entryCount: { $sum: 1 },
          },
        },
        {
          $lookup: {
            from: "cards",
            localField: "_id",
            foreignField: "_id",
            as: "card",
          },
        },
        { $unwind: "$card" },
        {
          $project: {
            card: {
              _id: "$card._id",
              title: "$card.title",
              cardNumber: "$card.cardNumber",
              estimatedTime: "$card.estimatedTime",
            },
            timeSpent: 1,
            entryCount: 1,
          },
        },
        { $sort: { timeSpent: -1 } },
      ]),

      // Time by user
      TimeEntry.aggregate([
        { $match: { project: new mongoose.Types.ObjectId(projectId) } },
        {
          $group: {
            _id: "$user",
            timeSpent: { $sum: "$duration" },
            entryCount: { $sum: 1 },
          },
        },
        {
          $lookup: {
            from: "users",
            localField: "_id",
            foreignField: "_id",
            as: "user",
          },
        },
        { $unwind: "$user" },
        {
          $project: {
            user: {
              _id: "$user._id",
              name: "$user.name",
              avatar: "$user.avatar",
              color: "$user.color",
            },
            timeSpent: 1,
            entryCount: 1,
          },
        },
        { $sort: { timeSpent: -1 } },
      ]),
    ]);

    // Get total estimated time from cards
    const estimatedResult = await Card.aggregate([
      {
        $match: {
          project: new mongoose.Types.ObjectId(projectId),
          isArchived: false,
        },
      },
      { $group: { _id: null, total: { $sum: "$estimatedTime" } } },
    ]);

    const totalTimeSpent = totalResult.length > 0 ? totalResult[0].total : 0;
    const totalEstimatedTime =
      estimatedResult.length > 0 ? estimatedResult[0].total : 0;

    res.status(200).json({
      success: true,
      summary: {
        totalTimeSpent,
        totalEstimatedTime,
        percentComplete:
          totalEstimatedTime > 0
            ? Math.round((totalTimeSpent / totalEstimatedTime) * 100)
            : 0,
        byCard,
        byUser,
        cardsWithTime: byCard.length,
      },
    });
  } catch (error) {
    console.error("Error getting project time summary:", error);
    res.status(500).json({
      success: false,
      message: "Failed to get project time summary",
      error: error.message,
    });
  }
};

// Get all time entries for a project with filters
exports.getProjectTimeEntries = async (req, res) => {
  try {
    const { projectId } = req.params;
    const {
      page = 1,
      limit = 50,
      startDate,
      endDate,
      userId,
      cardId,
      entryType,
      sortBy = "createdAt",
      sortOrder = "desc",
    } = req.query;
    const mongoose = require("mongoose");

    // Validate project exists
    const project = await Project.findById(projectId);
    if (!project) {
      return res.status(404).json({
        success: false,
        message: "Project not found",
      });
    }

    // Build query
    const query = { project: new mongoose.Types.ObjectId(projectId) };

    // Date range filter
    if (startDate || endDate) {
      query.workDate = {};
      if (startDate) {
        query.workDate.$gte = new Date(startDate);
      }
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        query.workDate.$lte = end;
      }
    }

    // User filter
    if (userId) {
      query.user = new mongoose.Types.ObjectId(userId);
    }

    // Card filter
    if (cardId) {
      query.card = new mongoose.Types.ObjectId(cardId);
    }

    // Entry type filter
    if (entryType && ["timer", "manual"].includes(entryType)) {
      query.entryType = entryType;
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const sortOptions = { [sortBy]: sortOrder === "asc" ? 1 : -1 };

    const [entries, total, summaryStats] = await Promise.all([
      // Get entries
      TimeEntry.find(query)
        .populate("user", "name avatar color")
        .populate("card", "title cardNumber estimatedTime")
        .sort(sortOptions)
        .skip(skip)
        .limit(parseInt(limit)),

      // Get total count
      TimeEntry.countDocuments(query),

      // Get summary stats for filtered results
      TimeEntry.aggregate([
        { $match: query },
        {
          $group: {
            _id: null,
            totalDuration: { $sum: "$duration" },
            totalEntries: { $sum: 1 },
            timerEntries: {
              $sum: { $cond: [{ $eq: ["$entryType", "timer"] }, 1, 0] },
            },
            manualEntries: {
              $sum: { $cond: [{ $eq: ["$entryType", "manual"] }, 1, 0] },
            },
          },
        },
      ]),
    ]);

    // Get unique users and cards for filter options
    const [uniqueUsers, uniqueCards] = await Promise.all([
      TimeEntry.aggregate([
        { $match: { project: new mongoose.Types.ObjectId(projectId) } },
        { $group: { _id: "$user" } },
        {
          $lookup: {
            from: "users",
            localField: "_id",
            foreignField: "_id",
            as: "user",
          },
        },
        { $unwind: "$user" },
        {
          $project: {
            _id: "$user._id",
            name: "$user.name",
            avatar: "$user.avatar",
            color: "$user.color",
          },
        },
        { $sort: { name: 1 } },
      ]),
      TimeEntry.aggregate([
        { $match: { project: new mongoose.Types.ObjectId(projectId) } },
        { $group: { _id: "$card" } },
        {
          $lookup: {
            from: "cards",
            localField: "_id",
            foreignField: "_id",
            as: "card",
          },
        },
        { $unwind: "$card" },
        {
          $project: {
            _id: "$card._id",
            title: "$card.title",
            cardNumber: "$card.cardNumber",
          },
        },
        { $sort: { cardNumber: 1 } },
      ]),
    ]);

    const stats = summaryStats.length > 0 ? summaryStats[0] : {
      totalDuration: 0,
      totalEntries: 0,
      timerEntries: 0,
      manualEntries: 0,
    };

    res.status(200).json({
      success: true,
      entries,
      stats: {
        totalDuration: stats.totalDuration,
        totalEntries: stats.totalEntries,
        timerEntries: stats.timerEntries,
        manualEntries: stats.manualEntries,
      },
      filterOptions: {
        users: uniqueUsers,
        cards: uniqueCards,
      },
      pagination: {
        total,
        page: parseInt(page),
        pages: Math.ceil(total / parseInt(limit)),
        limit: parseInt(limit),
      },
    });
  } catch (error) {
    console.error("Error getting project time entries:", error);
    res.status(500).json({
      success: false,
      message: "Failed to get project time entries",
      error: error.message,
    });
  }
};

// Set estimated time for a card
exports.setEstimatedTime = async (req, res) => {
  try {
    const { cardId } = req.params;
    const { estimatedTime } = req.body;
    const userId = req.user._id;

    // Validate card exists
    const card = await Card.findById(cardId);
    if (!card) {
      return res.status(404).json({
        success: false,
        message: "Card not found",
      });
    }

    // Update estimated time
    card.estimatedTime = estimatedTime || 0;
    await card.save();

    // Emit socket event
    try {
      const io = getIO();
      io.to(`project-${card.project}`).emit("estimated-time-changed", {
        userId: userId.toString(),
        cardId: cardId,
        estimatedTime: card.estimatedTime,
      });
    } catch (socketError) {
      console.error("Socket error:", socketError);
    }

    res.status(200).json({
      success: true,
      card: {
        _id: card._id,
        estimatedTime: card.estimatedTime,
        totalTimeSpent: card.totalTimeSpent,
      },
    });
  } catch (error) {
    console.error("Error setting estimated time:", error);
    res.status(500).json({
      success: false,
      message: "Failed to set estimated time",
      error: error.message,
    });
  }
};
