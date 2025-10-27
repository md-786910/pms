const mongoose = require("mongoose");

const activitySchema = new mongoose.Schema(
  {
    project: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Project",
      required: [true, "Project is required"],
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "User is required"],
    },
    type: {
      type: String,
      required: [true, "Activity type is required"],
      enum: [
        "project_created",
        "project_updated",
        "project_deleted",
        "member_added",
        "member_removed",
        "card_created",
        "card_updated",
        "card_deleted",
        "column_created",
        "column_updated",
        "column_deleted",
        "comment_added",
        "attachment_added",
        "attachment_removed",
      ],
    },
    message: {
      type: String,
      required: [true, "Activity message is required"],
      maxlength: [500, "Message cannot be more than 500 characters"],
    },
    details: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
  },
  {
    timestamps: true,
  }
);

// Index for efficient queries
activitySchema.index({ project: 1, createdAt: -1 });
activitySchema.index({ user: 1, createdAt: -1 });
activitySchema.index({ type: 1, createdAt: -1 });

// Populate user details when converting to JSON
activitySchema.methods.toJSON = function () {
  const activityObject = this.toObject();
  return activityObject;
};

module.exports = mongoose.model("Activity", activitySchema);
