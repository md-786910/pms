const mongoose = require("mongoose");

const invitationSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
    },
    project: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Project",
      required: true,
    },
    invitedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    role: {
      type: String,
      enum: ["member", "admin"],
      default: "member",
    },
    token: {
      type: String,
      required: true,
      unique: true,
    },
    status: {
      type: String,
      enum: ["pending", "accepted", "expired", "cancelled"],
      default: "pending",
    },
    expiresAt: {
      type: Date,
      default: () => new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
      index: { expireAfterSeconds: 0 },
    },
    acceptedAt: {
      type: Date,
    },
    acceptedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  },
  {
    timestamps: true,
  }
);

// Indexes
invitationSchema.index({ email: 1, project: 1 }, { unique: true });
invitationSchema.index({ token: 1 });
invitationSchema.index({ status: 1 });

// Generate invitation token
invitationSchema.methods.generateToken = function () {
  const crypto = require("crypto");
  this.token = crypto.randomBytes(32).toString("hex");
  this.expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days expiration
  return this.token;
};

// Check if invitation is valid
invitationSchema.methods.isValid = function () {
  return this.status === "pending" && this.expiresAt > new Date();
};

// Accept invitation
invitationSchema.methods.accept = function (userId) {
  this.status = "accepted";
  this.acceptedAt = new Date();
  this.acceptedBy = userId;
  return this.save();
};

module.exports = mongoose.model("Invitation", invitationSchema);
