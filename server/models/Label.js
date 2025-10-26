const mongoose = require("mongoose");

const labelSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Label name is required"],
      trim: true,
      maxlength: [50, "Label name cannot exceed 50 characters"],
    },
    color: {
      type: String,
      enum: [
        "red",
        "blue",
        "green",
        "yellow",
        "purple",
        "orange",
        "pink",
        "gray",
        "light-green",
        "dark-green",
        "light-yellow",
        "dark-yellow",
      ],
      default: "blue",
    },
    project: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Project",
      required: true,
    },
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
labelSchema.index({ project: 1 });
labelSchema.index({ name: 1, project: 1 }, { unique: true }); // Unique label name per project

module.exports = mongoose.model("Label", labelSchema);
