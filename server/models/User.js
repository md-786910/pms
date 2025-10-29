const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Name is required"],
      trim: true,
      maxlength: [50, "Name cannot be more than 50 characters"],
    },
    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true,
      lowercase: true,
      match: [
        /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/,
        "Please enter a valid email",
      ],
    },
    password: {
      type: String,
      required: [true, "Password is required"],
      minlength: [6, "Password must be at least 6 characters"],
    },
    role: {
      type: String,
      enum: ["admin", "member"],
      default: "member",
    },
    avatar: {
      type: String,
      default: function () {
        if (!this.name) return "U";
        const nameParts = this.name.trim().split(" ");
        if (nameParts.length >= 2) {
          // First letter of first name + first letter of last name
          return (
            nameParts[0][0] + nameParts[nameParts.length - 1][0]
          ).toUpperCase();
        } else if (nameParts.length === 1) {
          // If only one name, use first two letters
          return nameParts[0].substring(0, 2).toUpperCase();
        }
        return "U";
      },
    },
    color: {
      type: String,
      default: function () {
        const colors = [
          "teal",
          "green",
          "purple",
          "orange",
          "pink",
          "red",
          "indigo",
          "yellow",
          "cyan",
          "emerald",
          "violet",
          "rose",
          "sky",
          "lime",
          "slate",
          "gray",
          "zinc",
          "neutral",
          "stone",
          "amber",
        ];
        // Generate consistent color based on user's name/email
        newColor = colors[Math.floor(Math.random() * colors.length)];
        return newColor;
      },
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    lastLogin: {
      type: Date,
    },
    emailVerified: {
      type: Boolean,
      default: false,
    },
    emailVerificationToken: String,
    passwordResetToken: String,
    passwordResetExpires: Date,
  },
  {
    timestamps: true,
  }
);

// Hash password before saving
userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();

  try {
    const salt = await bcrypt.genSalt(12);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Compare password method
userSchema.methods.comparePassword = async function (candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

// Generate email verification token
userSchema.methods.generateEmailVerificationToken = function () {
  const crypto = require("crypto");
  const token = crypto.randomBytes(32).toString("hex");
  this.emailVerificationToken = token;
  return token;
};

// Generate password reset token
userSchema.methods.generatePasswordResetToken = function () {
  const crypto = require("crypto");
  const token = crypto.randomBytes(32).toString("hex");
  this.passwordResetToken = token;
  this.passwordResetExpires = Date.now() + 15 * 60 * 1000; // 15 minutes
  return token;
};

// Remove password from JSON output
userSchema.methods.toJSON = function () {
  const userObject = this.toObject();
  delete userObject.password;
  delete userObject.emailVerificationToken;
  delete userObject.passwordResetToken;
  delete userObject.passwordResetExpires;
  return userObject;
};

module.exports = mongoose.model("User", userSchema);
