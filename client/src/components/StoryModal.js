import React, { useState, useEffect } from "react";
import {
  X,
  Save,
  Trash2,
  Upload,
  Eye,
  Download,
  Plus,
  Edit2,
  Edit,
} from "lucide-react";
import { useUser } from "../contexts/UserContext";
import { useProject } from "../contexts/ProjectContext";
import { useNotification } from "../contexts/NotificationContext";
import { storyAPI } from "../utils/api";
import Avatar from "./Avatar";
import AssignUserModal from "./AssignUserModal";
import ConfirmationModal from "./ConfirmationModal";
import SimpleQuillEditor from "./SimpleQuillEditor";
import SimpleCommentEditor from "./SimpleCommentEditor";
import CreateStoryModal from "./CreateStoryModal";
import { API_URL } from "../utils/endpoints";

const StoryModal = ({
  story,
  onClose,
  onStoryUpdated,
  onStoryDeleted,
  isEmbedded = false,
}) => {
  const { users, user } = useUser();
  const { currentProject } = useProject();
  const { showToast } = useNotification();

  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    title: story.title,
    description: story.description,
    status: story.status,
    priority: story.priority,
    storyType: story.storyType,
    dueDate: story.dueDate
      ? new Date(story.dueDate).toISOString().slice(0, 10)
      : "",
    estimatedHours: story.estimatedHours || 0,
    actualHours: story.actualHours || 0,
  });
  const [commentText, setCommentText] = useState("");
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [editingComment, setEditingComment] = useState(null);
  const [editCommentText, setEditCommentText] = useState("");
  const [mentions, setMentions] = useState([]);
  const [selectedImage, setSelectedImage] = useState(null);
  const [showImageModal, setShowImageModal] = useState(false);
  const [subStories, setSubStories] = useState([]);
  const [showCreateSubStoryModal, setShowCreateSubStoryModal] = useState(false);

  useEffect(() => {
    if (story._id) {
      fetchSubStories();
    }
  }, [story._id]);

  const fetchSubStories = async () => {
    try {
      const response = await storyAPI.getSubStories(story._id);
      if (response.data.success) {
        setSubStories(response.data.subStories || []);
      }
    } catch (error) {
      console.error("Error fetching sub-stories:", error);
    }
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      const updateData = {
        title: formData.title,
        description: formData.description,
        status: formData.status,
        priority: formData.priority,
        storyType: formData.storyType,
        dueDate: formData.dueDate,
        estimatedHours: parseFloat(formData.estimatedHours) || 0,
        actualHours: parseFloat(formData.actualHours) || 0,
      };

      const response = await storyAPI.updateStory(story._id, updateData);

      if (response.data.success) {
        onStoryUpdated(response.data.story);
        setIsEditing(false);
        showToast("Story updated successfully!", "success");
      }
    } catch (error) {
      console.error("Error updating story:", error);
      showToast("Failed to update story", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = () => {
    setShowDeleteConfirm(true);
  };

  const confirmDelete = async () => {
    try {
      setLoading(true);
      const response = await storyAPI.deleteStory(story._id);

      if (response.data.success) {
        onStoryDeleted(story._id);
        onClose();
        showToast("Story deleted successfully!", "success");
      }
    } catch (error) {
      console.error("Error deleting story:", error);
      showToast("Failed to delete story", "error");
    } finally {
      setLoading(false);
      setShowDeleteConfirm(false);
    }
  };

  const handleAddComment = async () => {
    if (!commentText.trim()) return;

    try {
      const response = await storyAPI.addComment(
        story._id,
        commentText,
        mentions
      );

      if (response.data.success) {
        onStoryUpdated(response.data.story);
        setCommentText("");
        setMentions([]);
        showToast("Comment added successfully!", "success");
      }
    } catch (error) {
      console.error("Error adding comment:", error);
      showToast("Failed to add comment", "error");
    }
  };

  const handleUpdateComment = async (commentId, newText) => {
    try {
      const response = await storyAPI.updateComment(
        story._id,
        commentId,
        newText
      );

      if (response.data.success) {
        onStoryUpdated(response.data.story);
        showToast("Comment updated successfully!", "success");
        setEditingComment(null);
        setEditCommentText("");
      }
    } catch (error) {
      console.error("Error updating comment:", error);
      showToast("Failed to update comment", "error");
    }
  };

  const handleFileUpload = async (files) => {
    if (!files || files.length === 0) return;

    if (files.length > 5) {
      showToast("Maximum 5 files can be uploaded at once", "error");
      return;
    }

    for (const file of files) {
      if (file.size > 10 * 1024 * 1024) {
        showToast(`File "${file.name}" size must be less than 10MB`, "error");
        return;
      }
    }

    try {
      setLoading(true);

      const formData = new FormData();
      for (const file of files) {
        formData.append("images", file);
      }

      const response = await storyAPI.uploadFiles(story._id, formData);

      if (response.data.success) {
        onStoryUpdated(response.data.story);
        const fileCount = files.length;
        const imageCount = files.filter((f) =>
          f.type.startsWith("image/")
        ).length;
        const docCount = fileCount - imageCount;

        let message = `${fileCount} file(s) uploaded successfully!`;
        if (imageCount > 0 && docCount > 0) {
          message = `${imageCount} image(s) and ${docCount} document(s) uploaded successfully!`;
        } else if (imageCount > 0) {
          message = `${imageCount} image(s) uploaded successfully!`;
        } else if (docCount > 0) {
          message = `${docCount} document(s) uploaded successfully!`;
        }

        showToast(message, "success");
      }
    } catch (error) {
      console.error("Error uploading files:", error);
      const errorMessage =
        error.response?.data?.message || "Failed to upload files";
      showToast(errorMessage, "error");
    } finally {
      setLoading(false);
    }
  };

  const handleFileSelect = (event) => {
    const files = Array.from(event.target.files);
    if (files.length > 0) {
      handleFileUpload(files);
    }
    event.target.value = "";
  };

  const handleDeleteAttachment = async (attachmentId) => {
    try {
      const response = await storyAPI.deleteAttachment(story._id, attachmentId);

      if (response.data.success) {
        onStoryUpdated(response.data.story);
        showToast("Attachment deleted successfully!", "success");
      }
    } catch (error) {
      console.error("Error deleting attachment:", error);
      showToast("Failed to delete attachment", "error");
    }
  };

  const handleUserAssigned = async () => {
    try {
      const response = await storyAPI.getStory(story._id);
      if (response.data.success) {
        onStoryUpdated(response.data.story);
      }
    } catch (error) {
      console.error("Error refreshing story data:", error);
    }
    setShowAssignModal(false);
  };

  const handleUnassignUser = async (userId) => {
    try {
      const response = await storyAPI.unassignUser(story._id, userId);

      if (response.data.success) {
        onStoryUpdated(response.data.story);
        showToast("User unassigned successfully!", "success");
      }
    } catch (error) {
      console.error("Error unassigning user:", error);
      showToast("Failed to unassign user", "error");
    }
  };

  const handleSubStoryCreated = (newSubStory) => {
    setSubStories((prev) => [newSubStory, ...prev]);
    setShowCreateSubStoryModal(false);
    showToast("Sub-story created successfully!", "success");
  };

  const isImageAttachment = (attachment) => {
    return (
      attachment.type === "image" ||
      attachment.mimeType?.startsWith("image/") ||
      (attachment.originalName &&
        /\.(jpg|jpeg|png|gif|webp|svg)$/i.test(attachment.originalName)) ||
      (attachment.filename &&
        /\.(jpg|jpeg|png|gif|webp|svg)$/i.test(attachment.filename))
    );
  };

  const getImageAttachments = () => {
    return (story.attachments || []).filter(isImageAttachment);
  };

  const getOtherAttachments = () => {
    return (story.attachments || []).filter(
      (attachment) => !isImageAttachment(attachment)
    );
  };

  const getFileIcon = (attachment) => {
    const mimeType = attachment.mimeType || "";
    const fileName =
      attachment.originalName || attachment.filename || attachment.name || "";

    if (mimeType.includes("pdf")) return "📄";
    if (mimeType.includes("word") || fileName.match(/\.(doc|docx)$/i))
      return "📝";
    if (mimeType.includes("excel") || fileName.match(/\.(xls|xlsx)$/i))
      return "📊";
    if (mimeType.includes("powerpoint") || fileName.match(/\.(ppt|pptx)$/i))
      return "📋";
    if (mimeType.includes("zip") || fileName.match(/\.(zip|rar|7z)$/i))
      return "🗜️";
    if (mimeType.includes("text") || fileName.match(/\.(txt|csv)$/i))
      return "📄";
    if (mimeType.includes("json") || fileName.match(/\.json$/i)) return "🔧";
    if (mimeType.includes("xml") || fileName.match(/\.xml$/i)) return "📋";

    return "📎";
  };

  const getAssignees = () => {
    if (!story.assignees || !Array.isArray(story.assignees)) {
      return [];
    }

    return story.assignees
      .map((assignee) => {
        if (typeof assignee === "object" && assignee.name) {
          return assignee;
        }
        return users.find(
          (user) => user._id === assignee || user.id === assignee
        );
      })
      .filter(Boolean);
  };

  const renderCommentWithMentions = (text) => {
    if (!text) return "";

    const parts = text.split(/(@\w+)/g);

    return parts
      .map((part) => {
        if (part.startsWith("@")) {
          const username = part.substring(1);
          const user = currentProject?.members?.find(
            (member) =>
              member.user.name.toLowerCase().replace(/\s+/g, "") ===
              username.toLowerCase()
          );

          if (user) {
            const userColor = user.user.color || "#3b82f6";
            const rgb = hexToRgb(userColor);
            const backgroundColor = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.15)`;

            return `<span style="background-color: ${backgroundColor}; color: ${userColor}; padding: 2px 8px; border-radius: 6px; font-weight: 600; display: inline-block; margin: 0 2px; font-size: 14px; line-height: 1.2; border: 1px solid ${userColor}20; box-shadow: 0 1px 2px ${userColor}20; vertical-align: baseline; text-decoration: none;">${part}</span>`;
          } else {
            return `<span style="color: #ef4444; font-weight: 500;">${part}</span>`;
          }
        }
        return part;
      })
      .join("");
  };

  const hexToRgb = (hex) => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result
      ? {
          r: parseInt(result[1], 16),
          g: parseInt(result[2], 16),
          b: parseInt(result[3], 16),
        }
      : { r: 59, g: 130, b: 246 };
  };

  const statusOptions = [
    { value: "todo", label: "To Do", color: "gray" },
    { value: "in_progress", label: "In Progress", color: "blue" },
    { value: "review", label: "Review", color: "yellow" },
    { value: "done", label: "Done", color: "green" },
  ];

  const priorityOptions = [
    { value: "low", label: "Low" },
    { value: "medium", label: "Medium" },
    { value: "high", label: "High" },
    { value: "urgent", label: "Urgent" },
  ];

  const typeOptions = [
    { value: "story", label: "Story", icon: "📖" },
    { value: "task", label: "Task", icon: "✓" },
    { value: "bug", label: "Bug", icon: "🐛" },
    { value: "epic", label: "Epic", icon: "🎯" },
  ];

  const assignees = getAssignees();

  const content = (
    <div
      className={
        isEmbedded
          ? "h-full flex flex-col"
          : "bg-white rounded-2xl shadow-2xl w-full max-w-7xl max-h-[95vh] overflow-hidden"
      }
    >
      {/* Modal Header */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="w-12 h-12 bg-white bg-opacity-20 rounded-xl flex items-center justify-center">
              <span className="text-2xl">
                {typeOptions.find((t) => t.value === story.storyType)?.icon ||
                  "📖"}
              </span>
            </div>
            <div>
              <h2 className="text-2xl font-bold">
                {isEditing ? (
                  <input
                    type="text"
                    value={formData.title}
                    onChange={(e) =>
                      setFormData({ ...formData, title: e.target.value })
                    }
                    className="bg-transparent border-none outline-none focus:outline-none text-2xl font-bold text-white placeholder-white placeholder-opacity-70"
                    placeholder="Story title..."
                    autoFocus
                  />
                ) : (
                  story.title
                )}
              </h2>
              <p className="text-blue-100 text-sm">
                {story.parentStory
                  ? `Sub-story of ${story.parentStory.title}`
                  : "Story Details"}
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            {isEditing ? (
              <>
                <button
                  onClick={handleSave}
                  disabled={loading}
                  className="bg-white text-blue-600 hover:bg-blue-50 font-medium py-2 px-3 rounded-lg transition-colors duration-200 flex items-center space-x-1 shadow-sm text-sm"
                >
                  <Save className="w-4 h-4" />
                  <span>{loading ? "Saving..." : "Save"}</span>
                </button>
                <button
                  onClick={() => setIsEditing(false)}
                  className="bg-white bg-opacity-20 text-white hover:bg-opacity-30 font-medium py-2 px-3 rounded-lg transition-colors duration-200 flex items-center space-x-1 text-sm"
                >
                  <X className="w-4 h-4" />
                  <span>Cancel</span>
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={handleDelete}
                  className="bg-red-500 text-white hover:bg-red-600 font-medium py-2 px-3 rounded-lg transition-colors duration-200 flex items-center space-x-1 text-sm"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </>
            )}
            {!isEmbedded && (
              <button
                onClick={onClose}
                className="p-2 rounded-lg hover:bg-white hover:bg-opacity-20 transition-colors duration-200"
              >
                <X className="w-5 h-5" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Modal Content */}
      <div
        className={
          isEmbedded
            ? "flex-1 p-8 overflow-auto"
            : "p-8 max-h-[calc(95vh-200px)]"
        }
      >
        <div
          className={
            isEmbedded
              ? "grid grid-cols-1"
              : "grid grid-cols-1 lg:grid-cols-3 gap-6"
          }
        >
          {/* Main Content */}
          <div
            className={
              isEmbedded
                ? "space-y-6 divide-y divide-gray-200"
                : "lg:col-span-2 space-y-6 max-h-[70vh] overflow-y-auto"
            }
          >
            {/* Description */}
            <div className={isEmbedded ? "pt-6 first:pt-0" : ""}>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-base font-semibold text-gray-900">
                  Description
                </h3>
                {!isEditing && (
                  <button
                    onClick={() => setIsEditing(true)}
                    className="text-gray-600 hover:text-blue-600 text-sm font-medium flex items-center space-x-1 transition-colors"
                  >
                    <Edit2 className="w-4 h-4" />
                    <span>Edit</span>
                  </button>
                )}
              </div>

              <div className="relative">
                {isEditing ? (
                  <div className="simple-quill-editor description-editor">
                    <SimpleQuillEditor
                      value={formData.description || ""}
                      onChange={(content) => {
                        setFormData({
                          ...formData,
                          description: content,
                        });
                      }}
                      placeholder="Add a description..."
                    />
                  </div>
                ) : (
                  <div
                    className={`w-full ${
                      isEmbedded
                        ? "p-0"
                        : "p-4 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors duration-200"
                    }`}
                    onClick={() => !isEmbedded && setIsEditing(true)}
                  >
                    {formData.description && formData.description.trim() ? (
                      <div
                        className="prose prose-sm max-w-none"
                        style={{
                          fontSize: "14px",
                          lineHeight: "1.6",
                          color: "#374151",
                        }}
                        dangerouslySetInnerHTML={{
                          __html: formData.description,
                        }}
                      />
                    ) : (
                      <div className="flex items-center text-gray-400 text-sm py-4">
                        <span>No description provided</span>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {isEditing && (
                <div className="mt-3 flex items-center justify-end space-x-2">
                  <button
                    onClick={handleSave}
                    disabled={loading}
                    className="bg-blue-600 text-white hover:bg-blue-700 font-medium py-2 px-4 rounded-lg transition-colors duration-200 flex items-center space-x-1 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Save className="w-4 h-4" />
                    <span>{loading ? "Saving..." : "Save"}</span>
                  </button>
                  <button
                    onClick={() => {
                      setIsEditing(false);
                      setFormData({
                        ...formData,
                        description: story.description,
                      });
                    }}
                    className="text-gray-600 hover:text-gray-800 font-medium py-2 px-4 rounded-lg transition-colors duration-200 text-sm"
                  >
                    Cancel
                  </button>
                </div>
              )}
            </div>

            {/* Sub-Stories Section */}
            <div className={isEmbedded ? "pt-6" : ""}>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-base font-semibold text-gray-900">
                  Sub-Stories ({subStories.length})
                </h3>
                <button
                  onClick={() => setShowCreateSubStoryModal(true)}
                  className="text-gray-600 hover:text-blue-600 text-sm font-medium flex items-center space-x-1 transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  <span>Add Sub-Story</span>
                </button>
              </div>

              {subStories.length > 0 ? (
                <div className="space-y-2">
                  {subStories.map((subStory) => (
                    <div
                      key={subStory._id}
                      className="p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors duration-200"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <h4 className="text-sm font-medium text-gray-900">
                            {subStory.title}
                          </h4>
                          <div className="flex items-center space-x-2 mt-1">
                            <span className="text-xs text-gray-500">
                              {subStory.status.replace("_", " ")}
                            </span>
                            <span className="text-xs text-gray-400">•</span>
                            <span className="text-xs text-gray-500">
                              {subStory.priority}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500 italic text-sm">
                  No sub-stories yet
                </p>
              )}
            </div>

            {/* Images */}
            {getImageAttachments().length > 0 && (
              <div className={isEmbedded ? "pt-6" : ""}>
                <h3 className="text-base font-semibold text-gray-900 mb-3">
                  Attachments ({getImageAttachments().length})
                </h3>
                <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2 mb-4">
                  {getImageAttachments().map((attachment) => (
                    <div
                      key={attachment._id || attachment.id}
                      className="relative group cursor-pointer"
                      onClick={() => {
                        setSelectedImage(attachment);
                        setShowImageModal(true);
                      }}
                    >
                      <img
                        src={
                          attachment.url.startsWith("http")
                            ? attachment.url
                            : `${API_URL}${attachment.url}`
                        }
                        alt={
                          attachment.originalName ||
                          attachment.filename ||
                          attachment.name
                        }
                        className="w-full h-28 object-cover rounded-lg border border-gray-200 hover:border-blue-300 transition-colors duration-200"
                        onError={(e) => {
                          e.target.src = "/placeholder-image.png";
                        }}
                      />
                      <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 rounded-lg transition-all duration-200 flex items-center justify-center">
                        <Eye className="w-5 h-5 text-white opacity-0 group-hover:opacity-100 transition-opacity duration-200" />
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteAttachment(
                            attachment._id || attachment.id
                          );
                        }}
                        className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 p-1 rounded-full bg-red-500 text-white hover:bg-red-600 transition-all duration-200"
                        title="Delete image"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Comment Editor */}
            <div className={isEmbedded ? "pt-6 space-y-4" : "space-y-4"}>
              <div className="comment-editor">
                <SimpleCommentEditor
                  value={commentText || ""}
                  onChange={(content) => {
                    setCommentText(content);
                  }}
                  onMentionSelect={(mention) => {
                    setMentions((prev) => [...prev, mention]);
                  }}
                  onSend={(content) => {
                    setCommentText(content);
                    handleAddComment();
                  }}
                  placeholder="Add a comment... (use @ to mention someone)"
                  projectMembers={currentProject?.members || []}
                  currentUser={user}
                  cardMembers={getAssignees()}
                />
              </div>
            </div>

            {/* Comments */}
            <div className={isEmbedded ? "bg-white pt-6" : "bg-white p-6"}>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-base font-semibold text-gray-900">
                  Activity
                </h3>
                <span className="text-sm text-gray-500">
                  {(story.comments || []).length}{" "}
                  {(story.comments || []).length === 1 ? "comment" : "comments"}
                </span>
              </div>

              <div className="space-y-3 mb-6 pr-2">
                {(story.comments || [])
                  .sort((a, b) => {
                    const aTime = a.updatedAt || a.timestamp || a.createdAt;
                    const bTime = b.updatedAt || b.timestamp || b.createdAt;
                    return new Date(bTime) - new Date(aTime);
                  })
                  .map((comment) => (
                    <div
                      key={comment._id || comment.id}
                      className="bg-gray-50 rounded-lg p-4 hover:bg-gray-100 transition-colors duration-200"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center space-x-3">
                          <Avatar
                            user={comment.user}
                            size="sm"
                            fallback={
                              comment.user?.name
                                ? comment.user.name.charAt(0).toUpperCase()
                                : "U"
                            }
                          />
                          <div>
                            <span className="font-medium text-gray-900">
                              {comment.user?.name ||
                                (comment.user &&
                                typeof comment.user === "string"
                                  ? "Loading..."
                                  : "Unknown User")}
                            </span>
                            <span className="text-xs text-gray-500 ml-2">
                              {new Date(
                                comment.timestamp || comment.createdAt
                              ).toLocaleString()}
                              {comment.updatedAt &&
                                comment.updatedAt !== comment.timestamp && (
                                  <span className="text-gray-400 ml-1">
                                    (edited)
                                  </span>
                                )}
                            </span>
                          </div>
                        </div>
                        {(comment.user?._id === user?._id ||
                          comment.user?._id === user?.id) && (
                          <button
                            onClick={() => {
                              setEditingComment(comment._id || comment.id);
                              setEditCommentText(comment.text);
                            }}
                            className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-blue-100 text-blue-500 hover:text-blue-700 transition-all duration-200"
                            title="Edit comment"
                          >
                            <Edit className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                      {editingComment === (comment._id || comment.id) ? (
                        <div className="space-y-2">
                          <textarea
                            value={editCommentText}
                            onChange={(e) => setEditCommentText(e.target.value)}
                            className="w-full p-2 border border-gray-300 rounded-lg resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            rows="3"
                            placeholder="Edit your comment..."
                          />
                          <div className="flex space-x-2">
                            <button
                              onClick={() => {
                                if (editCommentText.trim()) {
                                  handleUpdateComment(
                                    comment._id || comment.id,
                                    editCommentText.trim()
                                  );
                                }
                              }}
                              className="px-3 py-1 bg-blue-500 text-white text-xs rounded hover:bg-blue-600 transition-colors"
                            >
                              Save
                            </button>
                            <button
                              onClick={() => {
                                setEditingComment(null);
                                setEditCommentText("");
                              }}
                              className="px-3 py-1 bg-gray-500 text-white text-xs rounded hover:bg-gray-600 transition-colors"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div
                          className="text-sm text-gray-700 prose prose-sm max-w-none"
                          dangerouslySetInnerHTML={{
                            __html:
                              renderCommentWithMentions(comment.text) ||
                              "<p><br></p>",
                          }}
                        />
                      )}
                    </div>
                  ))}
              </div>
            </div>
          </div>

          {/* Sidebar */}
          {!isEmbedded && (
            <div className="lg:col-span-1 space-y-6 max-h-[70vh] overflow-y-auto">
              {/* Type */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Type
                </label>
                <select
                  value={formData.storyType}
                  onChange={(e) =>
                    setFormData({ ...formData, storyType: e.target.value })
                  }
                  className="w-full p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                  disabled={!isEditing}
                >
                  {typeOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.icon} {option.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Status */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Status
                </label>
                <select
                  value={formData.status}
                  onChange={(e) =>
                    setFormData({ ...formData, status: e.target.value })
                  }
                  className="w-full p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                >
                  {statusOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Priority */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Priority
                </label>
                <select
                  value={formData.priority}
                  onChange={(e) =>
                    setFormData({ ...formData, priority: e.target.value })
                  }
                  className="w-full p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                >
                  {priorityOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Due Date */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Due Date
                </label>
                <input
                  type="date"
                  value={formData.dueDate}
                  onChange={(e) =>
                    setFormData({ ...formData, dueDate: e.target.value })
                  }
                  className="w-full p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                />
              </div>

              {/* Estimated Hours */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Estimated Hours
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.5"
                  value={formData.estimatedHours}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      estimatedHours: e.target.value,
                    })
                  }
                  className="w-full p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                  disabled={!isEditing}
                />
              </div>

              {/* Actual Hours */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Actual Hours
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.5"
                  value={formData.actualHours}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      actualHours: e.target.value,
                    })
                  }
                  className="w-full p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                  disabled={!isEditing}
                />
              </div>

              {/* Assignees */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-sm font-semibold text-gray-700">
                    Assignees ({assignees.length})
                  </label>
                  <button
                    onClick={() => setShowAssignModal(true)}
                    className="text-blue-600 hover:text-blue-700 text-sm font-medium"
                  >
                    Manage
                  </button>
                </div>
                <div className="space-y-1 max-h-32 overflow-y-auto">
                  {assignees.length > 0 ? (
                    assignees.map((user) => (
                      <div
                        key={user._id || user.id}
                        className="flex items-center justify-between p-2 bg-gray-50 rounded-lg"
                      >
                        <div className="flex items-center space-x-2">
                          <Avatar user={user} size="xs" />
                          <span className="text-xs text-gray-700">
                            {user.name || "Unknown User"}
                          </span>
                        </div>
                        <button
                          onClick={() =>
                            handleUnassignUser(user._id || user.id)
                          }
                          className="text-red-500 hover:text-red-700 text-xs"
                        >
                          Remove
                        </button>
                      </div>
                    ))
                  ) : (
                    <p className="text-gray-500 italic text-xs">No assignees</p>
                  )}
                </div>
              </div>

              {/* File Attachments */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Documents ({getOtherAttachments().length})
                </label>

                <div className="space-y-1 mb-2 max-h-40 overflow-y-auto">
                  {getOtherAttachments().length > 0 ? (
                    getOtherAttachments().map((attachment) => (
                      <div
                        key={attachment._id || attachment.id}
                        className="flex items-center space-x-2 p-2 bg-gray-50 rounded-lg group hover:bg-gray-100 transition-colors duration-200"
                      >
                        <span className="text-lg">
                          {getFileIcon(attachment)}
                        </span>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-gray-900 text-xs truncate">
                            {attachment.originalName ||
                              attachment.filename ||
                              attachment.name}
                          </p>
                          <p className="text-xs text-gray-600">
                            {attachment.uploadedAt
                              ? new Date(attachment.uploadedAt).toLocaleString()
                              : "Unknown date"}
                          </p>
                        </div>
                        <div className="flex items-center space-x-1">
                          <a
                            href={
                              attachment.url.startsWith("http")
                                ? attachment.url
                                : `${API_URL}${attachment.url}`
                            }
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:text-blue-800 text-xs"
                          >
                            View
                          </a>
                          <button
                            onClick={() =>
                              handleDeleteAttachment(
                                attachment._id || attachment.id
                              )
                            }
                            className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-red-100 text-red-500 hover:text-red-700 transition-all duration-200 text-xs"
                            title="Delete attachment"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-gray-500 italic text-xs">
                      No file attachments
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <div className="space-y-1">
                    <div className="flex space-x-1">
                      <input
                        type="file"
                        multiple
                        accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv,.rtf,.zip,.rar,.7z,.json,.xml,.odt,.ods,.odp"
                        onChange={handleFileSelect}
                        className="hidden"
                        id="file-upload"
                      />
                      <label
                        htmlFor="file-upload"
                        className="flex-1 bg-blue-600 text-white hover:bg-blue-700 font-medium py-1.5 px-2 rounded-lg transition-colors duration-200 text-xs cursor-pointer flex items-center justify-center space-x-1"
                      >
                        <Upload className="w-3 h-3" />
                        <span>Upload Files (Max 5)</span>
                      </label>
                    </div>
                    <p className="text-xs text-gray-500 text-center">
                      Max 5 files, 10MB each. Supports images and documents.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <>
      {isEmbedded ? content : <div className="modal-overlay">{content}</div>}

      {/* Assign User Modal */}
      {showAssignModal && (
        <AssignUserModal
          project={currentProject}
          card={story}
          onClose={() => setShowAssignModal(false)}
          onUserAssigned={handleUserAssigned}
        />
      )}

      {/* Image Modal */}
      {showImageModal && selectedImage && (
        <div className="modal-overlay">
          <div className="bg-white rounded-2xl shadow-2xl max-w-6xl max-h-[95vh] overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b border-gray-200">
              <div className="flex items-center space-x-3">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">
                    {selectedImage.originalName ||
                      selectedImage.filename ||
                      selectedImage.name}
                  </h3>
                  <p className="text-sm text-gray-500">
                    {selectedImage.size &&
                      `${(selectedImage.size / 1024 / 1024).toFixed(2)} MB`}
                    {selectedImage.uploadedAt &&
                      ` • ${new Date(
                        selectedImage.uploadedAt
                      ).toLocaleString()}`}
                  </p>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <a
                  href={
                    selectedImage.url.startsWith("http")
                      ? selectedImage.url
                      : `${API_URL}${selectedImage.url}`
                  }
                  download={
                    selectedImage.originalName ||
                    selectedImage.filename ||
                    selectedImage.name
                  }
                  className="p-2 rounded-lg hover:bg-gray-100 transition-colors duration-200"
                  title="Download image"
                >
                  <Download className="w-5 h-5 text-gray-600" />
                </a>
                <button
                  onClick={() => setShowImageModal(false)}
                  className="p-2 rounded-lg hover:bg-gray-100 transition-colors duration-200"
                >
                  <X className="w-5 h-5 text-gray-600" />
                </button>
              </div>
            </div>

            <div className="p-4 max-h-[calc(90vh-120px)] overflow-y-auto">
              <div className="flex justify-center">
                <img
                  src={
                    selectedImage.url.startsWith("http")
                      ? selectedImage.url
                      : `${API_URL}${selectedImage.url}`
                  }
                  alt={
                    selectedImage.originalName ||
                    selectedImage.filename ||
                    selectedImage.name
                  }
                  className="max-w-full max-h-[calc(90vh-200px)] object-contain rounded-lg shadow-lg"
                  onError={(e) => {
                    e.target.src = "/placeholder-image.png";
                  }}
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Story Confirmation Modal */}
      <ConfirmationModal
        isOpen={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        onConfirm={confirmDelete}
        title="Delete Story"
        message={`Are you sure you want to delete "${story.title}"? This action cannot be undone and will also delete all sub-stories.`}
        confirmText="Delete Story"
        cancelText="Cancel"
        type="danger"
        isLoading={loading}
      />

      {/* Create Sub-Story Modal */}
      {showCreateSubStoryModal && (
        <CreateStoryModal
          projectId={story.project._id || story.project}
          parentStoryId={story._id}
          onClose={() => setShowCreateSubStoryModal(false)}
          onStoryCreated={handleSubStoryCreated}
        />
      )}
    </>
  );
};

export default StoryModal;
