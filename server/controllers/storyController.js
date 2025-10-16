const Story = require("../models/Story");
const Project = require("../models/Project");
const User = require("../models/User");
const Notification = require("../models/Notification");
const { validationResult } = require("express-validator");
const { deleteFile, getFilePathFromUrl } = require("../middleware/upload");

// @route   GET /api/projects/:projectId/stories
// @desc    Get all stories for a project
// @access  Private
const getStories = async (req, res) => {
  try {
    const projectId = req.params.id || req.params.projectId;
    const userId = req.user._id;
    const userRole = req.user.role;

    // Check if user has access to this project
    const project = await Project.findById(projectId);
    if (!project) {
      return res.status(404).json({
        success: false,
        message: "Project not found",
      });
    }

    const isOwner = project.owner.toString() === userId.toString();
    const isMember = project.members.some(
      (member) => member.user.toString() === userId.toString()
    );

    if (!isOwner && !isMember && userRole !== "admin") {
      return res.status(403).json({
        success: false,
        message: "Access denied. You are not a member of this project.",
      });
    }

    // Get all stories for the project
    const stories = await Story.find({ project: projectId })
      .populate("assignees", "name email avatar color")
      .populate("createdBy", "name email avatar color")
      .populate("parentStory", "title")
      .populate("comments.user", "name email avatar color")
      .sort({ createdAt: -1 });

    // Count sub-stories for each story
    const storiesWithSubCount = await Promise.all(
      stories.map(async (story) => {
        const subCount = await Story.countDocuments({
          parentStory: story._id,
        });
        return {
          ...story.toObject(),
          subStoriesCount: subCount,
        };
      })
    );

    // Sort comments with latest at top
    storiesWithSubCount.forEach((story) => {
      if (story.comments && story.comments.length > 0) {
        story.comments.sort((a, b) => {
          const aTime = a.updatedAt || a.timestamp || a.createdAt;
          const bTime = b.updatedAt || b.timestamp || b.createdAt;
          return new Date(bTime) - new Date(aTime);
        });
      }
    });

    res.json({
      success: true,
      stories: storiesWithSubCount,
    });
  } catch (error) {
    console.error("Get stories error:", error);
    res.status(500).json({
      success: false,
      message: "Server error while fetching stories",
    });
  }
};

// @route   GET /api/stories/:id
// @desc    Get single story with sub-stories
// @access  Private
const getStory = async (req, res) => {
  try {
    const storyId = req.params.id;
    const userId = req.user._id;
    const userRole = req.user.role;

    const story = await Story.findById(storyId)
      .populate("assignees", "name email avatar color")
      .populate("createdBy", "name email avatar color")
      .populate("parentStory", "title")
      .populate("comments.user", "name email avatar color")
      .populate("project", "name");

    if (!story) {
      return res.status(404).json({
        success: false,
        message: "Story not found",
      });
    }

    // Check if user has access to this story's project
    const project = await Project.findById(story.project._id);
    const isOwner = project.owner.toString() === userId.toString();
    const isMember = project.members.some(
      (member) => member.user.toString() === userId.toString()
    );

    if (!isOwner && !isMember && userRole !== "admin") {
      return res.status(403).json({
        success: false,
        message: "Access denied. You are not a member of this project.",
      });
    }

    // Get sub-stories
    const subStories = await Story.find({ parentStory: storyId })
      .populate("assignees", "name email avatar color")
      .populate("createdBy", "name email avatar color")
      .sort({ createdAt: -1 });

    // Sort comments with latest at top
    if (story.comments && story.comments.length > 0) {
      story.comments.sort((a, b) => {
        const aTime = a.updatedAt || a.timestamp || a.createdAt;
        const bTime = b.updatedAt || b.timestamp || b.createdAt;
        return new Date(bTime) - new Date(aTime);
      });
    }

    res.json({
      success: true,
      story: {
        ...story.toObject(),
        subStories,
      },
    });
  } catch (error) {
    console.error("Get story error:", error);
    res.status(500).json({
      success: false,
      message: "Server error while fetching story",
    });
  }
};

// @route   GET /api/stories/:id/substories
// @desc    Get sub-stories for a story
// @access  Private
const getSubStories = async (req, res) => {
  try {
    const parentStoryId = req.params.id;
    const userId = req.user._id;
    const userRole = req.user.role;

    const parentStory = await Story.findById(parentStoryId);
    if (!parentStory) {
      return res.status(404).json({
        success: false,
        message: "Parent story not found",
      });
    }

    // Check access
    const project = await Project.findById(parentStory.project);
    const isOwner = project.owner.toString() === userId.toString();
    const isMember = project.members.some(
      (member) => member.user.toString() === userId.toString()
    );

    if (!isOwner && !isMember && userRole !== "admin") {
      return res.status(403).json({
        success: false,
        message: "Access denied. You are not a member of this project.",
      });
    }

    const subStories = await Story.find({ parentStory: parentStoryId })
      .populate("assignees", "name email avatar color")
      .populate("createdBy", "name email avatar color")
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      subStories,
    });
  } catch (error) {
    console.error("Get sub-stories error:", error);
    res.status(500).json({
      success: false,
      message: "Server error while fetching sub-stories",
    });
  }
};

// @route   POST /api/stories
// @desc    Create new story
// @access  Private
const createStory = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: "Validation failed",
        errors: errors.array(),
      });
    }

    const {
      title,
      description,
      project,
      parentStory,
      status = "todo",
      priority = "medium",
      storyType = "story",
      assignees = [],
      labels = [],
      dueDate,
      estimatedHours = 0,
    } = req.body;

    const userId = req.user._id;

    // Check if user has access to this project
    const projectDoc = await Project.findById(project);
    if (!projectDoc) {
      return res.status(404).json({
        success: false,
        message: "Project not found",
      });
    }

    const isOwner = projectDoc.owner.toString() === userId.toString();
    const isMember = projectDoc.members.some(
      (member) => member.user.toString() === userId.toString()
    );

    if (!isOwner && !isMember && req.user.role !== "admin") {
      return res.status(403).json({
        success: false,
        message: "Access denied. You are not a member of this project.",
      });
    }

    // If parentStory is provided, verify it exists
    if (parentStory) {
      const parentStoryDoc = await Story.findById(parentStory);
      if (!parentStoryDoc) {
        return res.status(404).json({
          success: false,
          message: "Parent story not found",
        });
      }
    }

    const story = new Story({
      title,
      description,
      project,
      parentStory: parentStory || null,
      status,
      priority,
      storyType,
      assignees,
      labels,
      dueDate: dueDate ? new Date(dueDate) : undefined,
      estimatedHours,
      createdBy: userId,
    });

    await story.save();

    // Populate the story with user details
    await story.populate("assignees", "name email avatar color");
    await story.populate("createdBy", "name email avatar color");
    await story.populate("parentStory", "title");

    // Create notifications for assigned users
    for (const assigneeId of assignees) {
      if (assigneeId.toString() !== userId.toString()) {
        const notification = new Notification({
          user: assigneeId,
          sender: userId,
          type: "story_assigned",
          title: "Story Assigned",
          message: `You have been assigned to the story "${title}"`,
          relatedProject: project,
        });

        await notification.save();
      }
    }

    res.status(201).json({
      success: true,
      message: "Story created successfully",
      story,
    });
  } catch (error) {
    console.error("Create story error:", error);
    res.status(500).json({
      success: false,
      message: "Server error while creating story",
    });
  }
};

// @route   PUT /api/stories/:id
// @desc    Update story
// @access  Private
const updateStory = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: "Validation failed",
        errors: errors.array(),
      });
    }

    const storyId = req.params.id;
    const userId = req.user._id;
    const userRole = req.user.role;

    const story = await Story.findById(storyId);

    if (!story) {
      return res.status(404).json({
        success: false,
        message: "Story not found",
      });
    }

    // Check if user has access to this story's project
    const project = await Project.findById(story.project);
    const isOwner = project.owner.toString() === userId.toString();
    const isMember = project.members.some(
      (member) => member.user.toString() === userId.toString()
    );

    if (!isOwner && !isMember && userRole !== "admin") {
      return res.status(403).json({
        success: false,
        message: "Access denied. You are not a member of this project.",
      });
    }

    // Update story fields
    const {
      title,
      description,
      status,
      priority,
      storyType,
      assignees,
      labels,
      estimatedHours,
      actualHours,
    } = req.body;
    let dueDate = req.body?.dueDate || new Date();

    // Store previous values for comparison
    const previousStatus = story.status;
    const previousAssignees = [...story.assignees];

    if (title) story.title = title;
    if (description !== undefined) story.description = description;
    if (status) story.status = status;
    if (priority) story.priority = priority;
    if (storyType) story.storyType = storyType;
    if (assignees) story.assignees = assignees;
    if (labels) story.labels = labels;
    if (estimatedHours !== undefined) story.estimatedHours = estimatedHours;
    if (actualHours !== undefined) story.actualHours = actualHours;
    const previousDueDate = story.dueDate || new Date();

    // Update due date
    if (dueDate !== undefined) {
      story.dueDate = dueDate ? new Date(dueDate) : null;
    }

    // Get user information for activity comments
    const user = await User.findById(userId).select("name");

    // Add comment if due date changed
    if (
      dueDate !== undefined &&
      new Date(dueDate).toISOString().slice(0, 10) !==
        (previousDueDate
          ? new Date(previousDueDate).toISOString().slice(0, 10)
          : null)
    ) {
      const formattedNewDate = new Date(dueDate).toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
      });

      const formattedOldDate = previousDueDate
        ? new Date(previousDueDate).toLocaleDateString("en-US", {
            year: "numeric",
            month: "short",
            day: "numeric",
          })
        : "No due date";

      story.comments.push({
        user: userId,
        text: `<p><strong>${user.name}</strong> changed the due date from <span style="background-color: #fef3c7; padding: 2px 6px; border-radius: 4px; font-weight: 500;">${formattedOldDate}</span> to <span style="background-color: #d1fae5; padding: 2px 6px; border-radius: 4px; font-weight: 500;">${formattedNewDate}</span></p>`,
        timestamp: new Date(),
      });
    }

    // Add automatic comments for status changes
    if (
      status &&
      status !== previousStatus &&
      status.trim() !== previousStatus.trim()
    ) {
      story.comments.push({
        user: userId,
        text: `<p><strong>${user.name}</strong> changed status from <span style="background-color: #f3f4f6; padding: 2px 6px; border-radius: 4px; font-weight: 500;">${previousStatus}</span> to <span style="background-color: #dbeafe; padding: 2px 6px; border-radius: 4px; font-weight: 500;">${status}</span></p>`,
        timestamp: new Date(),
      });
    }

    // Add automatic comments for assignee changes
    if (assignees) {
      const newAssignees = assignees.map((id) => id.toString());
      const previousAssigneeIds = previousAssignees.map((id) => id.toString());

      // Find added assignees
      const addedAssignees = newAssignees.filter(
        (id) => !previousAssigneeIds.includes(id)
      );
      // Find removed assignees
      const removedAssignees = previousAssigneeIds.filter(
        (id) => !newAssignees.includes(id)
      );

      // Add comment for new assignees
      if (addedAssignees.length > 0) {
        const addedUsers = await User.find({
          _id: { $in: addedAssignees },
        }).select("name");
        const userNames = addedUsers.map((u) => u.name).join(", ");
        story.comments.push({
          user: userId,
          text: `<p><strong>${user.name}</strong> assigned <strong>${userNames}</strong> to this story</p>`,
          timestamp: new Date(),
        });
      }

      // Add comment for removed assignees
      if (removedAssignees.length > 0) {
        const removedUsers = await User.find({
          _id: { $in: removedAssignees },
        }).select("name");
        const userNames = removedUsers.map((u) => u.name).join(", ");
        story.comments.push({
          user: userId,
          text: `<p><strong>${user.name}</strong> removed <strong>${userNames}</strong> from this story</p>`,
          timestamp: new Date(),
        });
      }
    }

    // Add activity log entry
    story.activityLog.push({
      action: "updated",
      user: userId,
      timestamp: new Date(),
      details: "Story was updated",
    });

    await story.save();

    // Populate the story with user details
    await story.populate("assignees", "name email avatar color");
    await story.populate("createdBy", "name email avatar color");
    await story.populate("parentStory", "title");

    res.json({
      success: true,
      message: "Story updated successfully",
      story,
    });
  } catch (error) {
    console.error("Update story error:", error);
    res.status(500).json({
      success: false,
      message: "Server error while updating story",
    });
  }
};

// @route   DELETE /api/stories/:id
// @desc    Delete story and its sub-stories
// @access  Private
const deleteStory = async (req, res) => {
  try {
    const storyId = req.params.id;
    const userId = req.user._id;
    const userRole = req.user.role;

    const story = await Story.findById(storyId);

    if (!story) {
      return res.status(404).json({
        success: false,
        message: "Story not found",
      });
    }

    // Check if user has access to this story's project
    const project = await Project.findById(story.project);
    const isOwner = project.owner.toString() === userId.toString();
    const isMember = project.members.some(
      (member) => member.user.toString() === userId.toString()
    );

    if (!isOwner && !isMember && userRole !== "admin") {
      return res.status(403).json({
        success: false,
        message: "Access denied. You are not a member of this project.",
      });
    }

    // Delete all sub-stories
    await Story.deleteMany({ parentStory: storyId });

    // Delete the story
    await Story.findByIdAndDelete(storyId);

    res.json({
      success: true,
      message: "Story and sub-stories deleted successfully",
    });
  } catch (error) {
    console.error("Delete story error:", error);
    res.status(500).json({
      success: false,
      message: "Server error while deleting story",
    });
  }
};

// @route   POST /api/stories/:id/comments
// @desc    Add comment to story
// @access  Private
const addComment = async (req, res) => {
  try {
    const storyId = req.params.id;
    const { comment, mentions = [] } = req.body;
    const userId = req.user._id;
    const userRole = req.user.role;

    const story = await Story.findById(storyId);

    if (!story) {
      return res.status(404).json({
        success: false,
        message: "Story not found",
      });
    }

    // Check if user has access to this story's project
    const project = await Project.findById(story.project);
    const isOwner = project.owner.toString() === userId.toString();
    const isMember = project.members.some(
      (member) => member.user.toString() === userId.toString()
    );

    if (!isOwner && !isMember && userRole !== "admin") {
      return res.status(403).json({
        success: false,
        message: "Access denied. You are not a member of this project.",
      });
    }

    const newComment = {
      text: comment,
      user: userId,
      timestamp: new Date(),
    };

    story.comments.push(newComment);

    // Add activity log entry
    story.activityLog.push({
      action: "commented",
      user: userId,
      timestamp: new Date(),
      details: "Added a comment",
    });

    await story.save();

    // Process mentions
    if (mentions && mentions.length > 0) {
      const mentionedUserIds = mentions
        .filter((mention) => mention.type === "user")
        .map((mention) => mention.id);

      if (mentionedUserIds.length > 0) {
        const notifications = mentionedUserIds
          .filter((id) => id !== userId.toString())
          .map((userId) => ({
            user: userId,
            type: "comment_mention",
            title: "You were mentioned in a comment",
            message: `${req.user.name} mentioned you in a comment on story "${story.title}"`,
            relatedProject: story.project,
          }));

        if (notifications.length > 0) {
          await Notification.insertMany(notifications);
        }
      }
    }

    // Populate the story with user details
    await story.populate("assignees", "name email avatar color");
    await story.populate("createdBy", "name email avatar color");
    await story.populate("comments.user", "name email avatar color");
    await story.populate("parentStory", "title");

    res.json({
      success: true,
      message: "Comment added successfully",
      story,
    });
  } catch (error) {
    console.error("Add comment error:", error);
    res.status(500).json({
      success: false,
      message: "Server error while adding comment",
    });
  }
};

// @route   PUT /api/stories/:id/comments/:commentId
// @desc    Update comment in story
// @access  Private
const updateComment = async (req, res) => {
  try {
    const storyId = req.params.id;
    const commentId = req.params.commentId;
    const userId = req.user._id;
    const userRole = req.user.role;
    const { text } = req.body;

    const story = await Story.findById(storyId);

    if (!story) {
      return res.status(404).json({
        success: false,
        message: "Story not found",
      });
    }

    // Check if user has access to this story's project
    const project = await Project.findById(story.project);
    const isOwner = project.owner.toString() === userId.toString();
    const isMember = project.members.some(
      (member) => member.user.toString() === userId.toString()
    );

    if (!isOwner && !isMember && userRole !== "admin") {
      return res.status(403).json({
        success: false,
        message: "Access denied. You are not a member of this project.",
      });
    }

    // Find the comment
    const comment = story.comments.find(
      (comment) => comment._id.toString() === commentId
    );

    if (!comment) {
      return res.status(404).json({
        success: false,
        message: "Comment not found",
      });
    }

    // Check if user is the author of the comment or has admin privileges
    if (comment.user.toString() !== userId.toString() && userRole !== "admin") {
      return res.status(403).json({
        success: false,
        message: "Access denied. You can only update your own comments.",
      });
    }

    // Update the comment
    comment.text = text;
    comment.updatedAt = new Date();

    // Add activity log entry
    story.activityLog.push({
      action: "comment_updated",
      user: userId,
      timestamp: new Date(),
      details: "Updated a comment",
    });

    await story.save();

    // Populate the story with user details
    await story.populate("assignees", "name email avatar color");
    await story.populate("createdBy", "name email avatar color");
    await story.populate("comments.user", "name email avatar color");
    await story.populate("parentStory", "title");

    res.json({
      success: true,
      message: "Comment updated successfully",
      story,
    });
  } catch (error) {
    console.error("Update comment error:", error);
    res.status(500).json({
      success: false,
      message: "Server error while updating comment",
    });
  }
};

// @route   POST /api/stories/:id/upload-files
// @desc    Upload files to story
// @access  Private
const uploadFiles = async (req, res) => {
  try {
    const storyId = req.params.id;
    const userId = req.user._id;
    const userRole = req.user.role;
    const uploadedFiles = req.files || [];

    const story = await Story.findById(storyId);
    if (!story) {
      return res.status(404).json({
        success: false,
        message: "Story not found",
      });
    }

    // Check access
    const project = await Project.findById(story.project);
    const isOwner = project.owner.toString() === userId.toString();
    const isMember = project.members.some(
      (member) => member.user.toString() === userId.toString()
    );

    if (!isOwner && !isMember && userRole !== "admin") {
      return res.status(403).json({
        success: false,
        message: "Access denied. You are not a member of this project.",
      });
    }

    if (uploadedFiles.length === 0) {
      return res.status(400).json({
        success: false,
        message: "No files uploaded",
      });
    }

    // Add uploaded files as attachments
    const attachments = uploadedFiles.map((file) => ({
      filename: file.filename,
      originalName: file.originalName,
      mimeType: file.mimeType,
      size: file.size,
      url: file.url,
      uploadedBy: userId,
    }));

    story.attachments.push(...attachments);

    // Add activity log entry
    story.activityLog.push({
      action: "files_uploaded",
      user: userId,
      timestamp: new Date(),
      details: `Uploaded ${uploadedFiles.length} file(s)`,
    });

    // Add comment
    const user = await User.findById(userId).select("name");

    uploadedFiles.forEach((file) => {
      const isImage = file.mimeType && file.mimeType.startsWith("image/");
      const commentText = isImage
        ? `
          <p><strong>${user.name}</strong> uploaded an image:</p>
          <img src="${file.url}" alt="${file.originalName}" style="max-width: 300px; margin-top: 8px; border-radius: 6px;" />
        `
        : `
          <p><strong>${user.name}</strong> uploaded an attachment: 
            <a href="${file.url}" target="_blank" style="background-color: #e0f2fe; padding: 2px 6px; border-radius: 4px; font-weight: 500; text-decoration: none;">
              ${file.originalName}
            </a>
          </p>
        `;

      story.comments.push({
        user: userId,
        text: commentText,
        timestamp: new Date(),
      });
    });

    await story.save();

    // Populate user info for frontend
    await story.populate("assignees", "name email avatar color");
    await story.populate("createdBy", "name email avatar color");
    await story.populate("parentStory", "title");

    res.json({
      success: true,
      message: `${uploadedFiles.length} file(s) uploaded successfully`,
      story,
      uploadedFiles: attachments,
    });
  } catch (error) {
    console.error("Upload files error:", error);
    res.status(500).json({
      success: false,
      message: "Server error while uploading files",
    });
  }
};

// @route   DELETE /api/stories/:id/attachments/:attachmentId
// @desc    Remove attachment from story
// @access  Private
const removeAttachment = async (req, res) => {
  try {
    const storyId = req.params.id;
    const attachmentId = req.params.attachmentId;
    const userId = req.user._id;
    const userRole = req.user.role;

    const story = await Story.findById(storyId);
    if (!story) {
      return res.status(404).json({
        success: false,
        message: "Story not found",
      });
    }

    // Check access
    const project = await Project.findById(story.project);
    const isOwner = project.owner.toString() === userId.toString();
    const isMember = project.members.some(
      (member) => member.user.toString() === userId.toString()
    );

    if (!isOwner && !isMember && userRole !== "admin") {
      return res.status(403).json({
        success: false,
        message: "Access denied. You are not a member of this project.",
      });
    }

    // Find the attachment
    const attachmentToRemove = story.attachments.find(
      (attachment) => attachment._id.toString() === attachmentId
    );

    if (!attachmentToRemove) {
      return res.status(404).json({
        success: false,
        message: "Attachment not found",
      });
    }

    // Remove attachment from story
    story.attachments = story.attachments.filter(
      (attachment) => attachment._id.toString() !== attachmentId
    );

    // Add activity log entry
    story.activityLog.push({
      action: "attachment_removed",
      user: userId,
      timestamp: new Date(),
      details: `Removed attachment: ${attachmentToRemove.originalName}`,
    });

    await story.save();

    // Delete the physical file
    const filePath = getFilePathFromUrl(attachmentToRemove.url);
    const fileDeleted = deleteFile(filePath);

    if (!fileDeleted) {
      console.warn(`Failed to delete file: ${filePath}`);
    }

    // Populate the story with user details
    await story.populate("assignees", "name email avatar color");
    await story.populate("createdBy", "name email avatar color");
    await story.populate("parentStory", "title");

    res.json({
      success: true,
      message: "Attachment removed successfully",
      story,
    });
  } catch (error) {
    console.error("Remove attachment error:", error);
    res.status(500).json({
      success: false,
      message: "Server error while removing attachment",
    });
  }
};

// @route   POST /api/stories/:id/assign
// @desc    Assign user to story
// @access  Private
const assignUser = async (req, res) => {
  try {
    const storyId = req.params.id;
    const { userId: assigneeId } = req.body;
    const userId = req.user._id;
    const userRole = req.user.role;

    const story = await Story.findById(storyId);

    if (!story) {
      return res.status(404).json({
        success: false,
        message: "Story not found",
      });
    }

    // Check if user has access to this story's project
    const project = await Project.findById(story.project);
    const isOwner = project.owner.toString() === userId.toString();
    const isMember = project.members.some(
      (member) => member.user.toString() === userId.toString()
    );

    if (!isOwner && !isMember && userRole !== "admin") {
      return res.status(403).json({
        success: false,
        message: "Access denied. You are not a member of this project.",
      });
    }

    // Check if user is already assigned
    if (story.assignees.includes(assigneeId)) {
      return res.status(400).json({
        success: false,
        message: "User is already assigned to this story",
      });
    }

    story.assignees.push(assigneeId);

    // Get user information for activity comment
    const currentUser = await User.findById(userId).select("name");
    const assignedUser = await User.findById(assigneeId).select("name");

    // Add automatic comment for assignment
    story.comments.push({
      user: userId,
      text: `<p><strong>${currentUser.name}</strong> assigned <strong>${assignedUser.name}</strong> to this story</p>`,
      timestamp: new Date(),
    });

    // Add activity log entry
    story.activityLog.push({
      action: "assigned",
      user: userId,
      timestamp: new Date(),
      details: `User assigned to story`,
    });

    await story.save();

    // Create notification for the assigned user
    if (assigneeId !== userId.toString()) {
      const notification = new Notification({
        user: assigneeId,
        sender: userId,
        type: "story_assigned",
        title: "Story Assigned",
        message: `You have been assigned to the story "${story.title}"`,
        relatedProject: story.project,
      });

      await notification.save();
    }

    // Populate the story with user details
    await story.populate("assignees", "name email avatar color");
    await story.populate("createdBy", "name email avatar color");
    await story.populate("parentStory", "title");

    res.json({
      success: true,
      message: "User assigned successfully",
      story,
    });
  } catch (error) {
    console.error("Assign user error:", error);
    res.status(500).json({
      success: false,
      message: "Server error while assigning user",
    });
  }
};

// @route   DELETE /api/stories/:id/assign/:userId
// @desc    Unassign user from story
// @access  Private
const unassignUser = async (req, res) => {
  try {
    const storyId = req.params.id;
    const assigneeId = req.params.userId;
    const userId = req.user._id;
    const userRole = req.user.role;

    const story = await Story.findById(storyId);

    if (!story) {
      return res.status(404).json({
        success: false,
        message: "Story not found",
      });
    }

    // Check if user has access to this story's project
    const project = await Project.findById(story.project);
    const isOwner = project.owner.toString() === userId.toString();
    const isMember = project.members.some(
      (member) => member.user.toString() === userId.toString()
    );

    if (!isOwner && !isMember && userRole !== "admin") {
      return res.status(403).json({
        success: false,
        message: "Access denied. You are not a member of this project.",
      });
    }

    // Remove user from assignees
    story.assignees = story.assignees.filter(
      (id) => id.toString() !== assigneeId
    );

    // Get user information for activity comment
    const currentUser = await User.findById(userId).select("name");
    const unassignedUser = await User.findById(assigneeId).select("name");

    // Add automatic comment for unassignment
    story.comments.push({
      user: userId,
      text: `<p><strong>${currentUser.name}</strong> removed <strong>${unassignedUser.name}</strong> from this story</p>`,
      timestamp: new Date(),
    });

    // Add activity log entry
    story.activityLog.push({
      action: "unassigned",
      user: userId,
      timestamp: new Date(),
      details: `User unassigned from story`,
    });

    await story.save();

    // Populate the story with user details
    await story.populate("assignees", "name email avatar color");
    await story.populate("createdBy", "name email avatar color");
    await story.populate("parentStory", "title");

    res.json({
      success: true,
      message: "User unassigned successfully",
      story,
    });
  } catch (error) {
    console.error("Unassign user error:", error);
    res.status(500).json({
      success: false,
      message: "Server error while unassigning user",
    });
  }
};

module.exports = {
  getStories,
  getStory,
  getSubStories,
  createStory,
  updateStory,
  deleteStory,
  addComment,
  updateComment,
  uploadFiles,
  removeAttachment,
  assignUser,
  unassignUser,
};
