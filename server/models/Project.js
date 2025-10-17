const mongoose = require("mongoose");

const projectSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Project name is required"],
      trim: true,
      maxlength: [100, "Project name cannot be more than 100 characters"],
    },
    description: {
      type: String,
      trim: true,
      maxlength: [500, "Description cannot be more than 500 characters"],
    },
    clientName: {
      type: String,
      trim: true,
      maxlength: [100, "Client name cannot be more than 100 characters"],
    },
    projectType: {
      type: String,
      enum: ["Maintenance", "One Time", "On Going"],
      default: "Maintenance",
    },
    startDate: {
      type: Date,
      required: [true, "Start date is required"],
    },
    endDate: {
      type: Date,
      default: null,
    },
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    members: [
      {
        user: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
          required: true,
        },
        role: {
          type: String,
          enum: ["admin", "member"],
          default: "member",
        },
        joinedAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],
    status: {
      type: String,
      enum: ["active", "archived", "completed"],
      default: "active",
    },
    color: {
      type: String,
      default: "blue",
    },
    settings: {
      allowMemberInvites: {
        type: Boolean,
        default: true,
      },
      defaultCardStatus: {
        type: String,
        default: "todo",
      },
    },
  },
  {
    timestamps: true,
  }
);

// Index for better query performance
projectSchema.index({ owner: 1 });
projectSchema.index({ "members.user": 1 });
projectSchema.index({ status: 1 });

module.exports = mongoose.model("Project", projectSchema);
