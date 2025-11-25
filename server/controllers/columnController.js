const mongoose = require("mongoose");
const Column = require("../models/Column");
const Project = require("../models/Project");
const Card = require("../models/Card");
const { validationResult } = require("express-validator");
const { getIO } = require("../config/socket");
const cacheService = require("../services/cacheService");

// Helper function to clean up duplicate archive columns
const cleanupDuplicateArchiveColumns = async (projectId) => {
  try {
    console.log(
      `Cleaning up duplicate archive columns for project ${projectId}`
    );

    // Find all archive columns for this project
    const archiveColumns = await Column.find({
      project: projectId,
      status: "archive",
    }).sort({ createdAt: 1 }); // Sort by creation date, oldest first

    if (archiveColumns.length > 1) {
      console.log(
        `Found ${archiveColumns.length} archive columns for project ${projectId}, keeping the oldest one`
      );

      // Keep the first (oldest) archive column
      const keepColumn = archiveColumns[0];
      const deleteColumns = archiveColumns.slice(1);

      // Delete the duplicate columns
      for (const column of deleteColumns) {
        console.log(`Deleting duplicate archive column ${column._id}`);
        await Column.findByIdAndDelete(column._id);
      }

      console.log(
        `Cleaned up ${deleteColumns.length} duplicate archive columns`
      );
      return keepColumn;
    }

    return archiveColumns[0] || null;
  } catch (error) {
    console.error("Error cleaning up duplicate archive columns:", error);
    return null;
  }
};

// Helper function to ensure archive column exists for a project
const ensureArchiveColumn = async (projectId, userId) => {
  try {
    console.log(`Ensuring archive column for project ${projectId}`);

    // Validate inputs
    if (!projectId || !userId) {
      console.error("Invalid inputs: projectId or userId is missing");
      return null;
    }

    // First, clean up any duplicate archive columns
    await cleanupDuplicateArchiveColumns(projectId);

    // Try to find existing archive column first
    let archiveColumn = await Column.findOne({
      project: projectId,
      status: "archive",
    });

    if (archiveColumn) {
      console.log(`Archive column already exists for project ${projectId}`);
      return archiveColumn;
    }

    // If no archive column exists, create one
    console.log(`Creating new archive column for project ${projectId}`);

    // Get the highest position to place archive column at the end
    const lastColumn = await Column.findOne({
      project: projectId,
    }).sort({ position: -1 });

    const archivePosition = lastColumn ? lastColumn.position + 1 : 999;

    // Create archive column with explicit validation
    archiveColumn = new Column({
      name: "Archive",
      project: projectId,
      status: "archive",
      color: "gray",
      position: archivePosition,
      isDefault: true,
      createdBy: userId,
    });

    // Validate the document before saving
    const validationError = archiveColumn.validateSync();
    if (validationError) {
      console.error("Validation error:", validationError);
      return null;
    }

    // Use a transaction to ensure atomicity
    const session = await mongoose.startSession();
    try {
      await session.withTransaction(async () => {
        // Double-check that no archive column exists (race condition protection)
        const existingArchive = await Column.findOne({
          project: projectId,
          status: "archive",
        }).session(session);

        if (existingArchive) {
          console.log(
            `Archive column already exists (race condition detected) for project ${projectId}`
          );
          archiveColumn = existingArchive;
          return;
        }

        // Create the archive column
        await archiveColumn.save({ session });
        console.log(
          `Archive column created for project ${projectId} with position ${archivePosition}`
        );
      });
    } finally {
      await session.endSession();
    }
    return archiveColumn;
  } catch (error) {
    console.error("Error ensuring archive column:", error);
    console.error("Error details:", error.message);
    console.error("Error code:", error.code);
    console.error("Error keyPattern:", error.keyPattern);
    console.error("Error keyValue:", error.keyValue);

    // If it's still a duplicate key error, try to find the existing column
    if (error.code === 11000) {
      console.log("Duplicate key error, finding existing archive column");
      try {
        const existingColumn = await Column.findOne({
          project: projectId,
          status: "archive",
        });
        if (existingColumn) {
          console.log("Found existing archive column:", existingColumn._id);
          return existingColumn;
        } else {
          console.log("No existing archive column found, this is unexpected");
        }
      } catch (findError) {
        console.error("Error finding existing archive column:", findError);
      }
    }

    // If all else fails, try to clean up and retry once
    console.log("Attempting cleanup and retry...");
    try {
      await cleanupDuplicateArchiveColumns(projectId);
      const retryColumn = await Column.findOne({
        project: projectId,
        status: "archive",
      });
      if (retryColumn) {
        console.log("Found archive column after cleanup:", retryColumn._id);
        return retryColumn;
      }
    } catch (retryError) {
      console.error("Error in retry attempt:", retryError);
    }

    return null;
  }
};

// @route   GET /api/projects/:projectId/columns
// @desc    Get all columns for a project
// @access  Private
const getColumns = async (req, res) => {
  try {
    const projectId = req.params.projectId || req.params.id;
    const userId = req.user._id;

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

    if (!isOwner && !isMember && req.user.role !== "admin") {
      return res.status(403).json({
        success: false,
        message: "Access denied. You are not a member of this project.",
      });
    }

    // Check cache first
    const cacheKey = cacheService.getColumnsKey(projectId);
    const cachedColumns = cacheService.get(cacheKey);

    if (cachedColumns) {
      console.log(`Cache hit for columns: ${projectId}`);
      return res.json({
        success: true,
        columns: cachedColumns,
        fromCache: true,
      });
    }

    console.log(`Cache miss for columns: ${projectId}`);

    // Get all columns (excluding archive column for now)
    const columns = await Column.find({
      project: projectId,
      status: { $ne: "archive" }, // Exclude archive column initially
    }).populate("createdBy", "name email avatar color");

    // Check if there are any archived cards in this project
    const archivedCardsCount = await Card.countDocuments({
      project: projectId,
      isArchived: true,
    });

    let sortedColumns = [...columns].sort(
      (a, b) => (a.position || 0) - (b.position || 0)
    );

    // Only include archive column if there are archived cards
    if (archivedCardsCount > 0) {
      // Ensure archive column exists
      const archiveColumn = await ensureArchiveColumn(projectId, userId);

      if (archiveColumn) {
        // Add archive column at the end
        sortedColumns.push(archiveColumn);
      }
    }

    // Cache the columns (TTL: 5 minutes)
    cacheService.set(cacheKey, sortedColumns);

    res.json({
      success: true,
      columns: sortedColumns,
    });
  } catch (error) {
    console.error("Get columns error:", error);
    res.status(500).json({
      success: false,
      message: "Server error while fetching columns",
    });
  }
};

// @route   POST /api/projects/:projectId/columns
// @desc    Create a new column
// @access  Private
const createColumn = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: "Validation failed",
        errors: errors.array(),
      });
    }

    const projectId = req.params.projectId || req.params.id;
    const userId = req.user._id;
    const {
      name,
      color = "gray",
      status: customStatus,
      position: customPosition,
    } = req.body;

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

    if (!isOwner && !isMember && req.user.role !== "admin") {
      return res.status(403).json({
        success: false,
        message: "Access denied. You are not a member of this project.",
      });
    }

    // Use custom status if provided, otherwise generate unique status
    const status =
      customStatus ||
      `custom_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Use custom position if provided, otherwise get the next position
    let position;
    if (customPosition !== undefined) {
      position = customPosition;
    } else {
      const lastColumn = await Column.findOne({ project: projectId }).sort({
        position: -1,
      });
      position = lastColumn ? lastColumn.position + 1 : 4;
    }

    const column = new Column({
      name,
      project: projectId,
      status,
      color,
      position,
      createdBy: userId,
    });

    await column.save();

    // Invalidate columns cache for this project
    cacheService.invalidateColumns(projectId);

    // Populate the createdBy field
    await column.populate("createdBy", "name email avatar color");

    // Emit Socket.IO event for real-time updates
    try {
      const io = getIO();
      io.to(`project-${projectId}`).emit("column-created", {
        column,
        userId: userId.toString(),
      });
    } catch (socketError) {
      console.error("Socket.IO error:", socketError);
    }

    res.status(201).json({
      success: true,
      message: "Column created successfully",
      column,
    });
  } catch (error) {
    console.error("Create column error:", error);
    res.status(500).json({
      success: false,
      message: "Server error while creating column",
    });
  }
};

// @route   PUT /api/projects/:projectId/columns/:columnId
// @desc    Update a column
// @access  Private
const updateColumn = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: "Validation failed",
        errors: errors.array(),
      });
    }

    const projectId = req.params.projectId || req.params.id;
    const columnId = req.params.columnId;
    const userId = req.user._id;
    const { name, color, position } = req.body;

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

    if (!isOwner && !isMember && req.user.role !== "admin") {
      return res.status(403).json({
        success: false,
        message: "Access denied. You are not a member of this project.",
      });
    }

    // Find the column
    const column = await Column.findOne({
      _id: columnId,
      project: projectId,
    });

    if (!column) {
      return res.status(404).json({
        success: false,
        message: "Column not found",
      });
    }

    // Prevent modifying the Archive column
    if (column.status === "archive") {
      return res.status(400).json({
        success: false,
        message: "Cannot modify the Archive column",
      });
    }

    // Update column
    if (name) column.name = name;
    if (color) column.color = color;
    if (position !== undefined) column.position = position;

    await column.save();

    // Invalidate columns cache for this project
    cacheService.invalidateColumns(projectId);

    // Populate the createdBy field
    await column.populate("createdBy", "name email avatar color");

    // Emit Socket.IO event for real-time updates
    try {
      const io = getIO();
      io.to(`project-${column.project}`).emit("column-updated", {
        column,
        userId: userId.toString(),
      });
    } catch (socketError) {
      console.error("Socket.IO error:", socketError);
    }

    res.json({
      success: true,
      message: "Column updated successfully",
      column,
    });
  } catch (error) {
    console.error("Update column error:", error);
    res.status(500).json({
      success: false,
      message: "Server error while updating column",
    });
  }
};

// @route   DELETE /api/projects/:projectId/columns/:columnId
// @desc    Delete a column
// @access  Private
const deleteColumn = async (req, res) => {
  try {
    const projectId = req.params.projectId || req.params.id;
    const columnId = req.params.columnId;
    const userId = req.user._id;

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

    if (!isOwner && !isMember && req.user.role !== "admin") {
      return res.status(403).json({
        success: false,
        message: "Access denied. You are not a member of this project.",
      });
    }

    // Find the column
    const column = await Column.findOne({
      _id: columnId,
      project: projectId,
    });

    if (!column) {
      return res.status(404).json({
        success: false,
        message: "Column not found",
      });
    }

    // Check if it's a default column
    if (column.isDefault) {
      return res.status(400).json({
        success: false,
        message: "Cannot delete default columns",
      });
    }

    // Check if column has any cards
    const cardsCount = await Card.countDocuments({
      project: projectId,
      status: column.status,
    });

    if (cardsCount > 0) {
      return res.status(400).json({
        success: false,
        message:
          "Cannot delete column that contains cards. Please move or delete all cards first.",
      });
    }

    // Delete the column (only possible if no cards exist)
    await Column.findByIdAndDelete(columnId);

    // Invalidate columns cache for this project
    cacheService.invalidateColumns(projectId);

    res.json({
      success: true,
      message: "Column deleted successfully",
    });
  } catch (error) {
    console.error("Delete column error:", error);
    res.status(500).json({
      success: false,
      message: "Server error while deleting column",
    });
  }
};

// @route   PUT /api/projects/:projectId/columns/reorder
// @desc    Reorder columns
// @access  Private
const reorderColumns = async (req, res) => {
  try {
    const projectId = req.params.projectId || req.params.id;
    const userId = req.user._id;
    const { columns } = req.body;

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

    if (!isOwner && !isMember && req.user.role !== "admin") {
      return res.status(403).json({
        success: false,
        message: "Access denied. You are not a member of this project.",
      });
    }

    // Update positions of all columns, keeping Archive column always last
    let writeIndex = 0;
    for (let i = 0; i < columns.length; i++) {
      const columnId = columns[i];
      const col = await Column.findOne({ _id: columnId, project: projectId });
      if (!col) continue;
      if (col.status === "archive") {
        // Skip archive for now
        continue;
      }
      await Column.findOneAndUpdate(
        { _id: columnId, project: projectId },
        { position: writeIndex }
      );
      writeIndex += 1;
    }

    // Place the archive column at the end
    const archiveColumn = await Column.findOne({
      project: projectId,
      status: "archive",
    });
    if (archiveColumn) {
      await Column.findOneAndUpdate(
        { _id: archiveColumn._id, project: projectId },
        { position: writeIndex }
      );
    }

    // Invalidate columns cache for this project
    cacheService.invalidateColumns(projectId);

    res.json({
      success: true,
      message: "Columns reordered successfully",
    });
  } catch (error) {
    console.error("Reorder columns error:", error);
    res.status(500).json({
      success: false,
      message: "Server error while reordering columns",
    });
  }
};

module.exports = {
  getColumns,
  createColumn,
  updateColumn,
  deleteColumn,
  reorderColumns,
  ensureArchiveColumn,
  cleanupDuplicateArchiveColumns,
};
