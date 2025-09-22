const express = require("express");
const { body, validationResult } = require("express-validator");
const {
  getCardItems,
  createCardItem,
  updateCardItem,
  deleteCardItem,
  reorderCardItems,
} = require("../controllers/cardItemController");
const { auth } = require("../middleware/auth");

const router = express.Router();

// All routes require authentication
router.use(auth);

// @route   GET /api/cards/:cardId/items
// @desc    Get all items for a card
// @access  Private
router.get("/cards/:cardId/items", getCardItems);

// @route   POST /api/cards/:cardId/items
// @desc    Create a new item for a card
// @access  Private
router.post(
  "/cards/:cardId/items",
  [
    body("title")
      .trim()
      .isLength({ min: 1, max: 200 })
      .withMessage("Item title must be between 1 and 200 characters"),
    body("description")
      .optional()
      .trim()
      .isLength({ max: 1000 })
      .withMessage("Description cannot be more than 1000 characters"),
  ],
  createCardItem
);

// @route   PUT /api/cards/:cardId/items/:itemId
// @desc    Update a card item
// @access  Private
router.put(
  "/cards/:cardId/items/:itemId",
  [
    body("title")
      .optional()
      .trim()
      .isLength({ min: 1, max: 200 })
      .withMessage("Item title must be between 1 and 200 characters"),
    body("description")
      .optional()
      .trim()
      .isLength({ max: 1000 })
      .withMessage("Description cannot be more than 1000 characters"),
    body("completed")
      .optional()
      .isBoolean()
      .withMessage("Completed must be a boolean"),
    body("position")
      .optional()
      .isInt({ min: 0 })
      .withMessage("Position must be a non-negative integer"),
  ],
  updateCardItem
);

// @route   DELETE /api/cards/:cardId/items/:itemId
// @desc    Delete a card item
// @access  Private
router.delete("/cards/:cardId/items/:itemId", deleteCardItem);

// @route   PUT /api/cards/:cardId/items/reorder
// @desc    Reorder card items
// @access  Private
router.put(
  "/cards/:cardId/items/reorder",
  [body("items").isArray().withMessage("Items must be an array")],
  reorderCardItems
);

module.exports = router;
