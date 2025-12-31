const mongoose = require("mongoose");

const activeTimerSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true, // One active timer per user
    },
    card: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Card",
      required: true,
    },
    project: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Project",
      required: true,
    },
    startedAt: {
      type: Date,
      required: true,
      default: Date.now,
    },
    // Accumulated time before current session (if timer was paused/resumed)
    accumulatedSeconds: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes
activeTimerSchema.index({ user: 1 });
activeTimerSchema.index({ card: 1 });
activeTimerSchema.index({ project: 1 });

module.exports = mongoose.model("ActiveTimer", activeTimerSchema);
