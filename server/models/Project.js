const mongoose = require("mongoose");
const COLOR_PALETTE = [
  "#FF5733",
  "#FFC300",
  "#33FF57",
  "#3357FF",
  "#FF33A8",
  "#8D33FF",
];

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
      maxlength: [10000, "Description cannot be more than 10,000 characters"],
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
    bgColor: { type: String },
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
    demoSiteUrls: [
      {
        type: String,
        trim: true,
        validate: {
          validator: function (v) {
            return !v || /^https?:\/\/.+/.test(v);
          },
          message: "Demo site URL must be a valid URL",
        },
      },
    ],
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
    // Soft delete (archive) fields
    isArchived: {
      type: Boolean,
      default: false,
    },
    archivedAt: {
      type: Date,
      default: null,
    },
    archivedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
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
    // Credentials - custom fields with label/value pairs (admin only can manage)
    credentials: [
      {
        label: {
          type: String,
          required: true,
          trim: true,
          maxlength: [100, "Label cannot be more than 100 characters"],
        },
        value: {
          type: String,
          trim: true,
          maxlength: [1000, "Value cannot be more than 1000 characters"],
        },
        createdAt: {
          type: Date,
          default: Date.now,
        },
        createdBy: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
        },
      },
    ],
    // Members who have access to view credentials (admin always has access)
    credentialAccess: [
      {
        user: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
        },
        grantedAt: {
          type: Date,
          default: Date.now,
        },
        grantedBy: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
        },
      },
    ],
    // Project descriptions/notes
    descriptions: [
      {
        content: {
          type: String,
          required: true,
          maxlength: 10000,
        },
        createdBy: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
        },
        createdAt: {
          type: Date,
          default: Date.now,
        },
        updatedAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],
  },
  {
    timestamps: true,
  }
);

// Index for better query performance
projectSchema.index({ owner: 1 });
projectSchema.index({ "members.user": 1 });
projectSchema.index({ status: 1 });
projectSchema.index({ isArchived: 1 });

module.exports = mongoose.model("Project", projectSchema);
