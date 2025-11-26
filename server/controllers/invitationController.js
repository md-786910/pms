const Invitation = require("../models/Invitation");
const Project = require("../models/Project");
const User = require("../models/User");
const Notification = require("../models/Notification");
const { auth } = require("../middleware/auth");
const { getIO } = require("../config/socket");

// @route   GET /api/invitations/:token
// @desc    Get invitation details by token
// @access  Public
const getInvitation = async (req, res) => {
  try {
    const { token } = req.params;
    console.log("Getting invitation with token:", token);

    const invitation = await Invitation.findOne({ token })
      .populate("project", "name description owner")
      .populate("invitedBy", "name email");

    console.log("Found invitation:", invitation);

    if (!invitation) {
      return res.status(404).json({
        success: false,
        message: "Invitation not found",
      });
    }

    console.log("Invitation status:", invitation.status);
    console.log("Invitation expires at:", invitation.expiresAt);
    console.log("Is valid:", invitation.isValid());

    if (!invitation.isValid()) {
      return res.status(400).json({
        success: false,
        message: "Invitation has expired or is no longer valid",
      });
    }

    res.json({
      success: true,
      invitation: {
        email: invitation.email,
        project: invitation.project,
        invitedBy: invitation.invitedBy,
        role: invitation.role,
        expiresAt: invitation.expiresAt,
      },
    });
  } catch (error) {
    console.error("Get invitation error:", error);
    res.status(500).json({
      success: false,
      message: "Server error while fetching invitation",
    });
  }
};

// @route   POST /api/invitations/:token/accept
// @desc    Accept invitation and join project
// @access  Public (can create user account if needed)
const acceptInvitation = async (req, res) => {
  try {
    const { token } = req.params;
    const { userId, userData } = req.body; // userId for existing users, userData for new users

    const invitation = await Invitation.findOne({ token });

    if (!invitation) {
      return res.status(404).json({
        success: false,
        message: "Invitation not found",
      });
    }

    if (!invitation.isValid()) {
      return res.status(400).json({
        success: false,
        message: "Invitation has expired or is no longer valid",
      });
    }

    let user;

    if (userId) {
      // Existing user - get by ID
      user = await User.findById(userId);
      if (!user) {
        return res.status(404).json({
          success: false,
          message: "User not found",
        });
      }
    } else if (userData) {
      // New user - create account
      const { name, email, password } = userData;

      // Check if user already exists
      const existingUser = await User.findOne({ email });
      if (existingUser) {
        user = existingUser;
      } else {
        // Create new user
        user = new User({
          name,
          email,
          password,
          role: invitation.role,
          emailVerified: true, // Auto-verify for invited users
        });

        await user.save();
      }
    } else {
      return res.status(400).json({
        success: false,
        message: "Either userId or userData is required",
      });
    }

    // Check if user email matches invitation email (case-insensitive)
    // If emails don't match, we'll still allow the user to join but log a warning
    const emailMatches =
      user.email.toLowerCase() === invitation.email.toLowerCase();

    if (!emailMatches) {
      console.log(
        `Warning: User ${user.email} is accepting invitation for ${invitation.email}`
      );
      // We'll allow this but could add additional verification in the future
    }

    // Get the project
    const project = await Project.findById(invitation.project);
    if (!project) {
      return res.status(404).json({
        success: false,
        message: "Project not found",
      });
    }

    // Check if user is already a member
    const isAlreadyMember = project.members.some(
      (member) => member.user.toString() === user._id.toString()
    );

    if (isAlreadyMember) {
      // User is already a member, just mark invitation as accepted and return project
      await invitation.accept(user._id);

      // Populate project data
      await project.populate("owner", "name email avatar color");
      await project.populate("members.user", "name email avatar color");

      return res.json({
        success: true,
        message: "You are already a member of this project",
        alreadyMember: true,
        project,
      });
    }

    // Add user to project
    project.members.push({
      user: user._id,
      role: invitation.role,
    });

    await project.save();

    // Mark invitation as accepted
    await invitation.accept(user._id);

    // Create notification
    const notification = new Notification({
      user: user._id,
      sender: invitation.invitedBy,
      type: "project_joined",
      title: "Joined Project",
      message: `You have successfully joined the project "${project.name}"`,
      relatedProject: project._id,
    });

    await notification.save();

    // Populate the notification with related data
    await notification.populate("sender", "name email avatar color");
    await notification.populate("relatedProject", "name");

    // Emit Socket.IO event for real-time notification
    try {
      const io = getIO();
      io.to(`user-${user._id}`).emit("new-notification", {
        notification,
      });
      console.log(`📬 Real-time notification sent to user ${user._id}`);
    } catch (socketError) {
      console.error("Socket.IO error while sending notification:", socketError);
    }

    // Populate project data
    await project.populate("owner", "name email avatar color");
    await project.populate("members.user", "name email avatar color");

    // Generate JWT token for new users
    let jwtToken = null;
    if (userData) {
      const jwt = require("jsonwebtoken");
      const config = require("../config/config");
      jwtToken = jwt.sign(
        { userId: user._id, email: user.email },
        config.JWT_SECRET,
        { expiresIn: config.JWT_EXPIRE }
      );
    }

    res.json({
      success: true,
      message: "Successfully joined the project",
      project,
      user: userData
        ? {
            _id: user._id,
            name: user.name,
            email: user.email,
            role: user.role,
            avatar: user.avatar,
            color: user.color,
          }
        : undefined,
      token: jwtToken,
    });
  } catch (error) {
    console.error("Accept invitation error:", error);
    res.status(500).json({
      success: false,
      message: "Server error while accepting invitation",
    });
  }
};

// @route   GET /api/invitations
// @desc    Get user's pending invitations
// @access  Private
const getUserInvitations = async (req, res) => {
  try {
    const userId = req.user._id;
    const user = await User.findById(userId);

    const invitations = await Invitation.find({
      email: user.email,
      status: "pending",
    })
      .populate("project", "name description")
      .populate("invitedBy", "name email")
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      invitations,
    });
  } catch (error) {
    console.error("Get user invitations error:", error);
    res.status(500).json({
      success: false,
      message: "Server error while fetching invitations",
    });
  }
};

// @route   GET /api/invitations/by-email/:email
// @desc    Get pending invitations by email
// @access  Public
const getInvitationsByEmail = async (req, res) => {
  try {
    const { email } = req.params;

    const invitations = await Invitation.find({
      email: email,
      status: "pending",
    })
      .populate("project", "name description")
      .populate("invitedBy", "name email")
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      invitations,
    });
  } catch (error) {
    console.error("Get invitations by email error:", error);
    res.status(500).json({
      success: false,
      message: "Server error while fetching invitations",
    });
  }
};

// @route   DELETE /api/invitations/:token
// @desc    Cancel/decline invitation
// @access  Private
const declineInvitation = async (req, res) => {
  try {
    const { token } = req.params;
    const userId = req.user._id;
    const user = await User.findById(userId);

    const invitation = await Invitation.findOne({
      token,
      email: user.email,
      status: "pending",
    });

    if (!invitation) {
      return res.status(404).json({
        success: false,
        message: "Invitation not found",
      });
    }

    invitation.status = "cancelled";
    await invitation.save();

    res.json({
      success: true,
      message: "Invitation declined successfully",
    });
  } catch (error) {
    console.error("Decline invitation error:", error);
    res.status(500).json({
      success: false,
      message: "Server error while declining invitation",
    });
  }
};

module.exports = {
  getInvitation,
  acceptInvitation,
  getUserInvitations,
  getInvitationsByEmail,
  declineInvitation,
};
