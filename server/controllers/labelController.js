const Label = require("../models/Label");
const Card = require("../models/Card");
const Project = require("../models/Project");

// @route   GET /api/projects/:projectId/labels
// @desc    Get all labels for a project
// @access  Private
const getProjectLabels = async (req, res) => {
  try {
    // Try multiple sources for the project ID
    const projectId =
      req.projectId ||
      req.projectIdFromUrl ||
      req.params.id ||
      req.params.projectId;

    if (!projectId) {
      return res.status(400).json({
        success: false,
        message: "Project ID is required",
      });
    }

    const labels = await Label.find({ project: projectId }).sort({
      createdAt: -1,
    });

    res.json({
      success: true,
      labels,
    });
  } catch (error) {
    console.error("Get project labels error:", error);
    res.status(500).json({
      success: false,
      message: "Server error while fetching labels",
    });
  }
};

// @route   POST /api/projects/:projectId/labels
// @desc    Create a new label for a project
// @access  Private
const createLabel = async (req, res) => {
  try {
    // Try multiple sources for the project ID
    const projectId =
      req.projectId ||
      req.projectIdFromUrl ||
      req.params.id ||
      req.params.projectId;

    console.log("createLabel - projectId:", projectId);
    console.log("createLabel - req.params:", req.params);
    const { name, color = "blue" } = req.body;
    const userId = req.user._id;

    // Check if project exists
    const project = await Project.findById(projectId);
    if (!project) {
      return res.status(404).json({
        success: false,
        message: "Project not found",
      });
    }

    // Check if label already exists
    const existingLabel = await Label.findOne({
      project: projectId,
      name: { $regex: new RegExp(`^${name}$`, "i") },
    });

    if (existingLabel) {
      return res.status(400).json({
        success: false,
        message: "Label with this name already exists",
      });
    }

    // Create the label
    const label = new Label({
      name: name.trim(),
      color,
      project: projectId,
      createdBy: userId,
    });

    await label.save();

    // Emit Socket.IO event for real-time updates
    try {
      const io = require("../config/socket").getIO();
      io.to(`project-${projectId}`).emit("project-label-created", {
        label,
        userId: userId.toString(),
      });
    } catch (socketError) {
      console.error("Socket.IO error:", socketError);
    }

    res.json({
      success: true,
      message: "Label created successfully",
      label,
    });
  } catch (error) {
    console.error("Create label error:", error);
    res.status(500).json({
      success: false,
      message: "Server error while creating label",
    });
  }
};

// @route   DELETE /api/projects/:projectId/labels/:labelId
// @desc    Delete a label from project and all cards
// @access  Private
const deleteLabel = async (req, res) => {
  try {
    // Try multiple sources for the project ID
    const projectId =
      req.projectId ||
      req.projectIdFromUrl ||
      req.params.id ||
      req.params.projectId;
    const labelId = req.params.labelId;

    console.log("deleteLabel - projectId:", projectId);
    console.log("deleteLabel - labelId:", labelId);
    console.log("deleteLabel - req.params:", req.params);

    // Find the label
    const label = await Label.findOne({ _id: labelId, project: projectId });

    if (!label) {
      return res.status(404).json({
        success: false,
        message: "Label not found",
      });
    }

    const labelName = label.name;

    // Delete the label from the database
    await Label.findByIdAndDelete(labelId);

    // Remove label from all cards in the project
    const cards = await Card.find({ project: projectId });
    const cardsToUpdate = [];

    for (const card of cards) {
      const cardLabelIndex = card.labels.findIndex((l) => l.name === labelName);
      if (cardLabelIndex !== -1) {
        card.labels.splice(cardLabelIndex, 1);
        cardsToUpdate.push(card);
        await card.save();
      }
    }

    // Emit Socket.IO event for real-time updates
    try {
      const io = require("../config/socket").getIO();
      io.to(`project-${projectId}`).emit("project-label-removed", {
        labelName,
        labelId,
        userId: req.user._id.toString(),
      });
    } catch (socketError) {
      console.error("Socket.IO error:", socketError);
    }

    res.json({
      success: true,
      message: `Label "${labelName}" deleted from project and ${cardsToUpdate.length} card(s)`,
      cardsUpdated: cardsToUpdate.length,
    });
  } catch (error) {
    console.error("Delete label error:", error);
    res.status(500).json({
      success: false,
      message: "Server error while deleting label",
    });
  }
};

// @route   PUT /api/projects/:projectId/labels/:labelId
// @desc    Update a label
// @access  Private
const updateLabel = async (req, res) => {
  try {
    // Try multiple sources for the project ID
    const projectId =
      req.projectId ||
      req.projectIdFromUrl ||
      req.params.id ||
      req.params.projectId;
    const labelId = req.params.labelId;

    console.log("updateLabel - projectId:", projectId);
    console.log("updateLabel - labelId:", labelId);
    const { name, color } = req.body;

    // Find the label
    const label = await Label.findOne({ _id: labelId, project: projectId });

    if (!label) {
      return res.status(404).json({
        success: false,
        message: "Label not found",
      });
    }

    const oldName = label.name;
    const oldColor = label.color;

    // Update the label
    if (name !== undefined) label.name = name.trim();
    if (color !== undefined) label.color = color;

    await label.save();

    // Update label in all cards
    const cards = await Card.find({ project: projectId });
    let cardsUpdated = 0;

    for (const card of cards) {
      let cardModified = false;
      for (const cardLabel of card.labels) {
        if (cardLabel.name === oldName) {
          // Update the label on the card
          if (name && name.trim() !== oldName) {
            cardLabel.name = name.trim();
          }
          if (color && color !== oldColor) {
            cardLabel.color = color;
          }
          cardModified = true;
        }
      }
      if (cardModified) {
        await card.save();
        cardsUpdated++;
      }
    }

    // Emit Socket.IO event for real-time updates
    try {
      const io = require("../config/socket").getIO();
      io.to(`project-${projectId}`).emit("project-label-updated", {
        label,
        cardsUpdated,
        userId: req.user._id.toString(),
      });
    } catch (socketError) {
      console.error("Socket.IO error:", socketError);
    }

    res.json({
      success: true,
      message: "Label updated successfully",
      label,
      cardsUpdated,
    });
  } catch (error) {
    console.error("Update label error:", error);
    res.status(500).json({
      success: false,
      message: "Server error while updating label",
    });
  }
};

module.exports = {
  getProjectLabels,
  createLabel,
  deleteLabel,
  updateLabel,
};
