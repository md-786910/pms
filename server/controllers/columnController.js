const Column = require("../models/Column");
const Project = require("../models/Project");
const Card = require("../models/Card");
const { validationResult } = require("express-validator");

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

    // Get custom columns
    const customColumns = await Column.find({ project: projectId })
      .populate("createdBy", "name email avatar color")
      .sort({ position: 1 });

    // Get default columns (todo, doing, review, done)
    const defaultColumns = [
      {
        _id: "todo",
        name: "To Do",
        status: "todo",
        color: "blue",
        position: 0,
        isDefault: true,
        project: projectId,
        createdBy: null,
      },
      {
        _id: "doing",
        name: "Doing",
        status: "doing",
        color: "yellow",
        position: 1,
        isDefault: true,
        project: projectId,
        createdBy: null,
      },
      {
        _id: "review",
        name: "Review",
        status: "review",
        color: "purple",
        position: 2,
        isDefault: true,
        project: projectId,
        createdBy: null,
      },
      {
        _id: "done",
        name: "Done",
        status: "done",
        color: "green",
        position: 3,
        isDefault: true,
        project: projectId,
        createdBy: null,
      },
    ];

    // Merge and sort all columns
    const allColumns = [...defaultColumns, ...customColumns].sort(
      (a, b) => a.position - b.position
    );

    res.json({
      success: true,
      columns: allColumns,
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
    const { name, color = "gray" } = req.body;

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

    // Generate unique status for the column
    const status = `custom_${Date.now()}_${Math.random()
      .toString(36)
      .substr(2, 9)}`;

    // Get the next position
    const lastColumn = await Column.findOne({ project: projectId }).sort({
      position: -1,
    });
    const position = lastColumn ? lastColumn.position + 1 : 4;

    const column = new Column({
      name,
      project: projectId,
      status,
      color,
      position,
      createdBy: userId,
    });

    await column.save();

    // Populate the createdBy field
    await column.populate("createdBy", "name email avatar color");

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

    // Update column
    if (name) column.name = name;
    if (color) column.color = color;
    if (position !== undefined) column.position = position;

    await column.save();

    // Populate the createdBy field
    await column.populate("createdBy", "name email avatar color");

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

    // Move all cards from this column to "todo" column
    await Card.updateMany(
      { project: projectId, status: column.status },
      { status: "todo" }
    );

    // Delete the column
    await Column.findByIdAndDelete(columnId);

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

    // Update positions of all columns
    for (let i = 0; i < columns.length; i++) {
      const columnId = columns[i];
      if (columnId.startsWith("custom_")) {
        // This is a custom column
        await Column.findOneAndUpdate(
          { _id: columnId, project: projectId },
          { position: i }
        );
      }
    }

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
};
