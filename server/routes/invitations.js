const express = require("express");
const { auth } = require("../middleware/auth");
const {
  getInvitation,
  acceptInvitation,
  getUserInvitations,
  getInvitationsByEmail,
  declineInvitation,
} = require("../controllers/invitationController");

const router = express.Router();

// @route   GET /api/invitations/:token
// @desc    Get invitation details by token
// @access  Public
router.get("/:token", getInvitation);

// @route   POST /api/invitations/:token/accept
// @desc    Accept invitation and join project
// @access  Public (requires user to be logged in)
router.post("/:token/accept", acceptInvitation);

// @route   GET /api/invitations
// @desc    Get user's pending invitations
// @access  Private
router.get("/", auth, getUserInvitations);

// @route   GET /api/invitations/by-email/:email
// @desc    Get pending invitations by email
// @access  Public
router.get("/by-email/:email", getInvitationsByEmail);

// @route   DELETE /api/invitations/:token
// @desc    Cancel/decline invitation
// @access  Private
router.delete("/:token", auth, declineInvitation);

module.exports = router;
