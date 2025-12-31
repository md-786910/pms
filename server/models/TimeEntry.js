const mongoose = require("mongoose");

const timeEntrySchema = new mongoose.Schema(
  {
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
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    // Duration in seconds (allows precise tracking)
    duration: {
      type: Number,
      required: true,
      min: 0,
    },
    // For manual entries: description of work done
    description: {
      type: String,
      trim: true,
      maxlength: [500, "Description cannot be more than 500 characters"],
    },
    // Entry type: 'timer' (from start/stop) or 'manual' (manually added)
    entryType: {
      type: String,
      enum: ["timer", "manual"],
      default: "manual",
    },
    // When the work was done (for manual entries, user can specify; for timer, auto-set)
    workDate: {
      type: Date,
      default: Date.now,
    },
    // Timer-specific fields
    timerStartedAt: {
      type: Date,
    },
    timerStoppedAt: {
      type: Date,
    },
    // Billable flag for future invoicing features
    isBillable: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes for efficient queries
timeEntrySchema.index({ card: 1, createdAt: -1 });
timeEntrySchema.index({ project: 1, createdAt: -1 });
timeEntrySchema.index({ user: 1, createdAt: -1 });
timeEntrySchema.index({ project: 1, user: 1 });
timeEntrySchema.index({ card: 1, user: 1 });
timeEntrySchema.index({ workDate: -1 });

module.exports = mongoose.model("TimeEntry", timeEntrySchema);
