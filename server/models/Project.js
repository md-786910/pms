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
      enum: ["maintenance", "ongoing", "one-time"],
      default: "maintenance",
    },
    projectStatus: {
      type: String,
      enum: ["new", "ongoing", "completed", "cancelled"],
      default: "new",
    },
    startDate: {
      type: Date,
      required: [true, "Start date is required"],
    },
    endDate: {
      type: Date,
      default: null,
    },
    liveSiteUrl: {
      type: String,
      trim: true,
      validate: {
        validator: function (v) {
          return !v || /^https?:\/\/.+/.test(v);
        },
        message: "Live site URL must be a valid URL",
      },
    },
    demoSiteUrl: {
      type: String,
      trim: true,
      validate: {
        validator: function (v) {
          return !v || /^https?:\/\/.+/.test(v);
        },
        message: "Demo site URL must be a valid URL",
      },
    },
    markupUrl: {
      type: String,
      trim: true,
      validate: {
        validator: function (v) {
          return !v || /^https?:\/\/.+/.test(v);
        },
        message: "Markup URL must be a valid URL",
      },
    },
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
        uploadedAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],
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
