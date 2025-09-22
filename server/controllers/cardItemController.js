const CardItem = require("../models/CardItem");
const Card = require("../models/Card");
const Project = require("../models/Project");
const { validationResult } = require("express-validator");

// @route   GET /api/cards/:cardId/items
// @desc    Get all items for a card
// @access  Private
const getCardItems = async (req, res) => {
  try {
    const cardId = req.params.cardId;
    const userId = req.user._id;

    // Check if user has access to this card's project
    const card = await Card.findById(cardId).populate("project");
    if (!card) {
      return res.status(404).json({
        success: false,
        message: "Card not found",
      });
    }

    const project = card.project;
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

    const items = await CardItem.find({ card: cardId })
      .populate("createdBy", "name email avatar color")
      .sort({ position: 1 });

    res.json({
      success: true,
      items,
    });
  } catch (error) {
    console.error("Get card items error:", error);
    res.status(500).json({
      success: false,
      message: "Server error while fetching card items",
    });
  }
};

// @route   POST /api/cards/:cardId/items
// @desc    Create a new item for a card
// @access  Private
const createCardItem = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: "Validation failed",
        errors: errors.array(),
      });
    }

    const cardId = req.params.cardId;
    const userId = req.user._id;
    const { title, description = "" } = req.body;

    // Check if user has access to this card's project
    const card = await Card.findById(cardId).populate("project");
    if (!card) {
      return res.status(404).json({
        success: false,
        message: "Card not found",
      });
    }

    const project = card.project;
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

    // Get the next position
    const lastItem = await CardItem.findOne({ card: cardId }).sort({
      position: -1,
    });
    const position = lastItem ? lastItem.position + 1 : 0;

    const item = new CardItem({
      card: cardId,
      title,
      description,
      position,
      createdBy: userId,
    });

    await item.save();

    // Populate the createdBy field
    await item.populate("createdBy", "name email avatar color");

    res.status(201).json({
      success: true,
      message: "Card item created successfully",
      item,
    });
  } catch (error) {
    console.error("Create card item error:", error);
    res.status(500).json({
      success: false,
      message: "Server error while creating card item",
    });
  }
};

// @route   PUT /api/cards/:cardId/items/:itemId
// @desc    Update a card item
// @access  Private
const updateCardItem = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: "Validation failed",
        errors: errors.array(),
      });
    }

    const cardId = req.params.cardId;
    const itemId = req.params.itemId;
    const userId = req.user._id;
    const { title, description, completed, position } = req.body;

    // Check if user has access to this card's project
    const card = await Card.findById(cardId).populate("project");
    if (!card) {
      return res.status(404).json({
        success: false,
        message: "Card not found",
      });
    }

    const project = card.project;
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

    // Find the item
    const item = await CardItem.findOne({
      _id: itemId,
      card: cardId,
    });

    if (!item) {
      return res.status(404).json({
        success: false,
        message: "Card item not found",
      });
    }

    // Update item
    if (title !== undefined) item.title = title;
    if (description !== undefined) item.description = description;
    if (completed !== undefined) item.completed = completed;
    if (position !== undefined) item.position = position;

    await item.save();

    // Populate the createdBy field
    await item.populate("createdBy", "name email avatar color");

    res.json({
      success: true,
      message: "Card item updated successfully",
      item,
    });
  } catch (error) {
    console.error("Update card item error:", error);
    res.status(500).json({
      success: false,
      message: "Server error while updating card item",
    });
  }
};

// @route   DELETE /api/cards/:cardId/items/:itemId
// @desc    Delete a card item
// @access  Private
const deleteCardItem = async (req, res) => {
  try {
    const cardId = req.params.cardId;
    const itemId = req.params.itemId;
    const userId = req.user._id;

    // Check if user has access to this card's project
    const card = await Card.findById(cardId).populate("project");
    if (!card) {
      return res.status(404).json({
        success: false,
        message: "Card not found",
      });
    }

    const project = card.project;
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

    // Find and delete the item
    const item = await CardItem.findOneAndDelete({
      _id: itemId,
      card: cardId,
    });

    if (!item) {
      return res.status(404).json({
        success: false,
        message: "Card item not found",
      });
    }

    res.json({
      success: true,
      message: "Card item deleted successfully",
    });
  } catch (error) {
    console.error("Delete card item error:", error);
    res.status(500).json({
      success: false,
      message: "Server error while deleting card item",
    });
  }
};

// @route   PUT /api/cards/:cardId/items/reorder
// @desc    Reorder card items
// @access  Private
const reorderCardItems = async (req, res) => {
  try {
    const cardId = req.params.cardId;
    const userId = req.user._id;
    const { items } = req.body;

    // Check if user has access to this card's project
    const card = await Card.findById(cardId).populate("project");
    if (!card) {
      return res.status(404).json({
        success: false,
        message: "Card not found",
      });
    }

    const project = card.project;
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

    // Update positions of all items
    for (let i = 0; i < items.length; i++) {
      const itemId = items[i];
      await CardItem.findOneAndUpdate(
        { _id: itemId, card: cardId },
        { position: i }
      );
    }

    res.json({
      success: true,
      message: "Card items reordered successfully",
    });
  } catch (error) {
    console.error("Reorder card items error:", error);
    res.status(500).json({
      success: false,
      message: "Server error while reordering card items",
    });
  }
};

module.exports = {
  getCardItems,
  createCardItem,
  updateCardItem,
  deleteCardItem,
  reorderCardItems,
};
