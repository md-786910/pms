const mongoose = require("mongoose");

const notificationSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    type: {
      type: String,
      enum: [
        "project_invite",
        "project_joined",
        "project_activity",
        "card_assigned",
        "card_unassigned",
        "card_updated",
        "comment_added",
        "comment_mention",
        "due_date_reminder",
        "credential_access",
        "credential_access_revoked",
        "system",
      ],
      required: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: [100, "Title cannot be more than 100 characters"],
    },
    message: {
      type: String,
      required: true,
      trim: true,
      maxlength: [500, "Message cannot be more than 500 characters"],
    },
    read: {
      type: Boolean,
      default: false,
    },
    data: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    relatedProject: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Project",
    },
    relatedCard: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Card",
    },
    expiresAt: {
      type: Date,
      default: function () {
        return new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days
      },
    },
  },
  {
    timestamps: true,
  }
);

// Index for better query performance
notificationSchema.index({ user: 1, read: 1 });
notificationSchema.index({ createdAt: -1 });
notificationSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

module.exports = mongoose.model("Notification", notificationSchema);
