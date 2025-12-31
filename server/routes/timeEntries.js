const express = require("express");
const { body, validationResult } = require("express-validator");
const {
  startTimer,
  stopTimer,
  getActiveTimer,
  discardTimer,
  addManualEntry,
  updateEntry,
  deleteEntry,
  getCardTimeEntries,
  getProjectTimeSummary,
  getProjectTimeEntries,
  setEstimatedTime,
} = require("../controllers/timeEntryController");
const { auth } = require("../middleware/auth");

const router = express.Router();

// All routes require authentication
router.use(auth);

// ============ Timer Operations ============

// @route   POST /api/time-entries/timer/start
// @desc    Start timer on a card
// @access  Private
router.post(
  "/timer/start",
  [body("cardId").notEmpty().withMessage("Card ID is required")],
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }
    next();
  },
  startTimer
);

// @route   POST /api/time-entries/timer/stop
// @desc    Stop active timer and create time entry
// @access  Private
router.post("/timer/stop", stopTimer);

// @route   GET /api/time-entries/timer/active
// @desc    Get user's active timer
// @access  Private
router.get("/timer/active", getActiveTimer);

// @route   DELETE /api/time-entries/timer/discard
// @desc    Discard active timer without saving
// @access  Private
router.delete("/timer/discard", discardTimer);

// ============ Manual Time Entries ============

// @route   POST /api/time-entries
// @desc    Add manual time entry
// @access  Private
router.post(
  "/",
  [
    body("cardId").notEmpty().withMessage("Card ID is required"),
    body("duration")
      .isNumeric()
      .withMessage("Duration must be a number")
      .custom((value) => value > 0)
      .withMessage("Duration must be greater than 0"),
  ],
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }
    next();
  },
  addManualEntry
);

// @route   PUT /api/time-entries/:id
// @desc    Update time entry
// @access  Private (owner only)
router.put("/:id", updateEntry);

// @route   DELETE /api/time-entries/:id
// @desc    Delete time entry
// @access  Private (owner only)
router.delete("/:id", deleteEntry);

// ============ Time Entry Queries ============

// @route   GET /api/time-entries/cards/:cardId
// @desc    Get all time entries for a card
// @access  Private
router.get("/cards/:cardId", getCardTimeEntries);

// @route   GET /api/time-entries/projects/:projectId/summary
// @desc    Get project time summary (aggregated stats)
// @access  Private
router.get("/projects/:projectId/summary", getProjectTimeSummary);

// @route   GET /api/time-entries/projects/:projectId/entries
// @desc    Get all time entries for a project with filters
// @access  Private
router.get("/projects/:projectId/entries", getProjectTimeEntries);

// ============ Estimated Time ============

// @route   PUT /api/time-entries/cards/:cardId/estimated
// @desc    Set estimated time for a card
// @access  Private
router.put(
  "/cards/:cardId/estimated",
  [
    body("estimatedTime")
      .isNumeric()
      .withMessage("Estimated time must be a number"),
  ],
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }
    next();
  },
  setEstimatedTime
);

module.exports = router;
