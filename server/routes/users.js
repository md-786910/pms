const express = require("express");
const { body, validationResult } = require("express-validator");
const User = require("../models/User");
const { auth, adminAuth } = require("../middleware/auth");
const { sendWelcomeEmail } = require("../config/email");

const router = express.Router();

// @route   GET /api/users/profile
// @desc    Get current user profile
// @access  Private
router.get("/profile", auth, async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select(
      "-password -emailVerificationToken -passwordResetToken -passwordResetExpires"
    );

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    res.json({
      success: true,
      user,
    });
  } catch (error) {
    console.error("Get profile error:", error);
    res.status(500).json({
      success: false,
      message: "Server error while fetching profile",
    });
  }
});

// @route   GET /api/users
// @desc    Get all users
// @access  Private (Admin only)
router.get("/", adminAuth, async (req, res) => {
  try {
    const users = await User.find({ isActive: true })
      .select(
        "-password -emailVerificationToken -passwordResetToken -passwordResetExpires"
      )
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      users,
    });
  } catch (error) {
    console.error("Get users error:", error);
    res.status(500).json({
      success: false,
      message: "Server error while fetching users",
    });
  }
});

// @route   GET /api/users/:id
// @desc    Get user by ID
// @access  Private (Admin only)
router.get("/:id", adminAuth, async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select(
      "-password -emailVerificationToken -passwordResetToken -passwordResetExpires"
    );

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    res.json({
      success: true,
      user,
    });
  } catch (error) {
    console.error("Get user error:", error);
    res.status(500).json({
      success: false,
      message: "Server error while fetching user",
    });
  }
});

// @route   POST /api/users
// @desc    Create new user
// @access  Private (Admin only)
router.post(
  "/",
  [
    adminAuth,
    body("name")
      .trim()
      .isLength({ min: 2, max: 50 })
      .withMessage("Name must be between 2 and 50 characters"),
    body("email")
      .isEmail()
      .normalizeEmail()
      .withMessage("Please provide a valid email"),
    body("password")
      .isLength({ min: 6 })
      .withMessage("Password must be at least 6 characters long"),
    body("role")
      .isIn(["admin", "member"])
      .withMessage("Role must be either admin or member"),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: "Validation failed",
          errors: errors.array(),
        });
      }

      const { name, email, password, role } = req.body;

      // Check if user already exists
      const existingUser = await User.findOne({ email });
      if (existingUser) {
        return res.status(400).json({
          success: false,
          message: "User with this email already exists",
        });
      }

      // Create new user
      const user = new User({
        name,
        email,
        password,
        role,
        emailVerified: true, // Admin created users are pre-verified
      });

      await user.save();

      // Send welcome email (async, non-blocking)
      setImmediate(async () => {
        try {
          await sendWelcomeEmail(user);
          console.log(`Welcome email sent to ${user.email}`);
        } catch (emailError) {
          console.error("Error sending welcome email:", emailError);
        }
      });

      res.status(201).json({
        success: true,
        message: "User created successfully",
        user: user.toJSON(),
      });
    } catch (error) {
      console.error("Create user error:", error);
      res.status(500).json({
        success: false,
        message: "Server error while creating user",
      });
    }
  }
);

// @route   PUT /api/users/:id
// @desc    Update user
// @access  Private (Admin only)
router.put(
  "/:id",
  [
    adminAuth,
    body("name")
      .optional()
      .trim()
      .isLength({ min: 2, max: 50 })
      .withMessage("Name must be between 2 and 50 characters"),
    body("email")
      .optional()
      .isEmail()
      .normalizeEmail()
      .withMessage("Please provide a valid email"),
    body("role")
      .optional()
      .isIn(["admin", "member"])
      .withMessage("Role must be either admin or member"),
    body("password")
      .optional()
      .isLength({ min: 6 })
      .withMessage("Password must be at least 6 characters long"),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: "Validation failed",
          errors: errors.array(),
        });
      }

      const { name, email, role, password } = req.body;
      const userId = req.params.id;

      const user = await User.findById(userId);
      if (!user) {
        return res.status(404).json({
          success: false,
          message: "User not found",
        });
      }

      // Check if email is already taken by another user
      if (email && email !== user.email) {
        const existingUser = await User.findOne({
          email,
          _id: { $ne: userId },
        });
        if (existingUser) {
          return res.status(400).json({
            success: false,
            message: "Email already taken by another user",
          });
        }
      }

      // Update user fields
      if (name) user.name = name;
      if (email) user.email = email;
      if (role) user.role = role;
      if (password) user.password = password; // Will be hashed by pre-save middleware

      await user.save();

      res.json({
        success: true,
        message: "User updated successfully",
        user: user.toJSON(),
      });
    } catch (error) {
      console.error("Update user error:", error);
      res.status(500).json({
        success: false,
        message: "Server error while updating user",
      });
    }
  }
);

// @route   DELETE /api/users/:id
// @desc    Delete user
// @access  Private (Admin only)
router.delete("/:id", adminAuth, async (req, res) => {
  try {
    const userId = req.params.id;

    // Prevent admin from deleting themselves
    if (userId === req.user._id.toString()) {
      return res.status(400).json({
        success: false,
        message: "Cannot delete your own account",
      });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // Soft delete - deactivate user instead of removing
    user.isActive = false;
    await user.save();

    res.json({
      success: true,
      message: "User deactivated successfully",
    });
  } catch (error) {
    console.error("Delete user error:", error);
    res.status(500).json({
      success: false,
      message: "Server error while deleting user",
    });
  }
});

// @route   POST /api/users/:id/reset-password
// @desc    Reset user password (Admin only)
// @access  Private (Admin only)
router.post(
  "/:id/reset-password",
  [
    adminAuth,
    body("newPassword")
      .isLength({ min: 6 })
      .withMessage("Password must be at least 6 characters long"),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: "Validation failed",
          errors: errors.array(),
        });
      }

      const { newPassword } = req.body;
      const userId = req.params.id;

      const user = await User.findById(userId);
      if (!user) {
        return res.status(404).json({
          success: false,
          message: "User not found",
        });
      }

      // Update password
      user.password = newPassword; // Will be hashed by pre-save middleware
      await user.save();

      res.json({
        success: true,
        message: "Password reset successfully",
      });
    } catch (error) {
      console.error("Reset password error:", error);
      res.status(500).json({
        success: false,
        message: "Server error while resetting password",
      });
    }
  }
);

// @route   PUT /api/users/profile
// @desc    Update current user profile
// @access  Private
router.put(
  "/profile",
  [
    auth,
    body("name")
      .optional()
      .trim()
      .isLength({ min: 2, max: 50 })
      .withMessage("Name must be between 2 and 50 characters"),
    body("email")
      .optional()
      .isEmail()
      .normalizeEmail()
      .withMessage("Please provide a valid email"),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: "Validation failed",
          errors: errors.array(),
        });
      }

      const { name, email } = req.body;
      const userId = req.user._id;

      const user = await User.findById(userId);
      if (!user) {
        return res.status(404).json({
          success: false,
          message: "User not found",
        });
      }

      // Check if email is already taken by another user
      if (email && email !== user.email) {
        const existingUser = await User.findOne({
          email,
          _id: { $ne: userId },
        });
        if (existingUser) {
          return res.status(400).json({
            success: false,
            message: "Email already taken by another user",
          });
        }
      }

      // Update user fields
      if (name) user.name = name;
      if (email) user.email = email;

      await user.save();

      res.json({
        success: true,
        message: "Profile updated successfully",
        user: user.toJSON(),
      });
    } catch (error) {
      console.error("Update profile error:", error);
      res.status(500).json({
        success: false,
        message: "Server error while updating profile",
      });
    }
  }
);

module.exports = router;
