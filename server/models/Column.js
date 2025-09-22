const mongoose = require("mongoose");

const columnSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 50,
    },
    project: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Project",
      required: true,
    },
    status: {
      type: String,
      required: true,
      unique: true, // This will be the unique identifier for the column
    },
    color: {
      type: String,
      default: "gray",
      enum: [
        "blue",
        "green",
        "yellow",
        "red",
        "purple",
        "pink",
        "indigo",
        "gray",
      ],
    },
    position: {
      type: Number,
      required: true,
      default: 0,
    },
    isDefault: {
      type: Boolean,
      default: false,
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

// Indexes
columnSchema.index({ project: 1, position: 1 });
columnSchema.index({ project: 1, status: 1 }, { unique: true });

// Ensure only one default column per project
columnSchema.index(
  { project: 1, isDefault: 1 },
  { unique: true, partialFilterExpression: { isDefault: true } }
);

module.exports = mongoose.model("Column", columnSchema);
