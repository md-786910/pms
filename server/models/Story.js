const mongoose = require("mongoose");

const storySchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, "Story title is required"],
      trim: true,
      maxlength: [200, "Title cannot be more than 200 characters"],
    },
    description: {
      type: String,
      trim: true,
      maxlength: [50000, "Description cannot be more than 50000 characters"],
    },
    project: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Project",
      required: true,
    },
    parentStory: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Story",
      default: null, // null means it's a parent story
    },
    status: {
      type: String,
      enum: ["todo", "in_progress", "review", "done"],
      default: "todo",
    },
    priority: {
      type: String,
      enum: ["low", "medium", "high", "urgent"],
      default: "medium",
    },
    storyType: {
      type: String,
      enum: ["story", "task", "bug", "epic"],
      default: "story",
    },
    assignees: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],
    labels: [
      {
        name: {
          type: String,
          required: true,
        },
        color: {
          type: String,
          default: "blue",
        },
      },
    ],
    dueDate: {
      type: Date,
    },
    estimatedHours: {
      type: Number,
      default: 0,
    },
    actualHours: {
      type: Number,
      default: 0,
    },
    comments: [
      {
        user: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
          required: true,
        },
        text: {
          type: String,
          required: true,
          trim: true,
          maxlength: [5000, "Comment cannot be more than 5000 characters"],
        },
        timestamp: {
          type: Date,
          default: Date.now,
        },
        updatedAt: {
          type: Date,
        },
      },
    ],
    attachments: [
      {
        filename: {
          type: String,
          required: true,
        },
        originalName: {
          type: String,
          required: true,
        },
        mimeType: {
          type: String,
          required: true,
        },
        size: {
          type: Number,
          required: true,
        },
        url: {
          type: String,
          required: true,
        },
        uploadedBy: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
          required: true,
        },
        uploadedAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],
    activityLog: [
      {
        user: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
          required: true,
        },
        action: {
          type: String,
          required: true,
        },
        details: {
          type: String,
        },
        timestamp: {
          type: Date,
          default: Date.now,
        },
      },
    ],
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

// Index for better query performance
storySchema.index({ project: 1, status: 1 });
storySchema.index({ parentStory: 1 });
storySchema.index({ assignees: 1 });
storySchema.index({ dueDate: 1 });
storySchema.index({ project: 1, parentStory: 1 }); // For fetching parent stories

// Virtual for sub-stories
storySchema.virtual("subStories", {
  ref: "Story",
  localField: "_id",
  foreignField: "parentStory",
});

// Ensure virtuals are included in JSON
storySchema.set("toJSON", { virtuals: true });
storySchema.set("toObject", { virtuals: true });

module.exports = mongoose.model("Story", storySchema);
