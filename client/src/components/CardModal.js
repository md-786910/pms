import React, { useState, useEffect } from "react";
import {
  X,
  Calendar,
  Users,
  MessageSquare,
  Paperclip,
  Plus,
  Edit2,
  Trash2,
  Save,
  X as XIcon,
  Tag,
  CheckSquare,
  Clock,
  Image as ImageIcon,
  Upload,
  Eye,
  Download,
} from "lucide-react";
import { useUser } from "../contexts/UserContext";
import { useProject } from "../contexts/ProjectContext";
import { useNotification } from "../contexts/NotificationContext";
import { cardAPI, cardItemAPI } from "../utils/api";
import AssignUserModal from "./AssignUserModal";

const CardModal = ({
  card,
  onClose,
  onCardUpdated,
  onCardDeleted,
  onStatusChange,
}) => {
  const { users } = useUser();
  const { currentProject } = useProject();
  const { showToast } = useNotification();

  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    title: card.title,
    description: card.description,
    dueDate: card.dueDate
      ? new Date(card.dueDate).toISOString().slice(0, 16)
      : "",
  });
  const [commentText, setCommentText] = useState("");
  const [attachmentUrl, setAttachmentUrl] = useState("");
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [newLabel, setNewLabel] = useState("");
  const [newChecklist, setNewChecklist] = useState("");
  const [items, setItems] = useState([]);
  const [showAddItem, setShowAddItem] = useState(false);
  const [newItemTitle, setNewItemTitle] = useState("");
  const [loadingItems, setLoadingItems] = useState(false);
  const [selectedImage, setSelectedImage] = useState(null);
  const [showImageModal, setShowImageModal] = useState(false);
  const [imageFile, setImageFile] = useState(null);

  const statusOptions = [
    { value: "todo", label: "To Do", color: "blue" },
    { value: "doing", label: "Doing", color: "yellow" },
    { value: "review", label: "Review", color: "purple" },
    { value: "done", label: "Done", color: "green" },
  ];

  const getAssignees = () => {
    return card.assignees
      .map((userId) => users.find((user) => user.id === userId))
      .filter(Boolean);
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      const response = await cardAPI.updateCard(card._id, {
        ...card,
        ...formData,
      });

      if (response.data.success) {
        onCardUpdated(response.data.card);
        setIsEditing(false);
        showToast("Card updated successfully!", "success");
      }
    } catch (error) {
      console.error("Error updating card:", error);
      showToast("Failed to update card", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (newStatus) => {
    try {
      const response = await cardAPI.updateStatus(card._id, newStatus);

      if (response.data.success) {
        onCardUpdated(response.data.card);
        onStatusChange(card._id, newStatus);

        const statusLabel = statusOptions.find(
          (s) => s.value === newStatus
        )?.label;
        showToast(`Card moved to ${statusLabel}`, "success");
      }
    } catch (error) {
      console.error("Error updating status:", error);
      showToast("Failed to update status", "error");
    }
  };

  // Card Items Management
  const fetchItems = async () => {
    try {
      setLoadingItems(true);
      const response = await cardItemAPI.getCardItems(card._id);
      setItems(response.data.items || []);
    } catch (error) {
      console.error("Error fetching card items:", error);
    } finally {
      setLoadingItems(false);
    }
  };

  const handleAddItem = async () => {
    if (!newItemTitle.trim()) {
      showToast("Item title is required", "error");
      return;
    }

    try {
      const response = await cardItemAPI.createCardItem(card._id, {
        title: newItemTitle.trim(),
      });

      if (response.data.success) {
        setItems((prev) => [...prev, response.data.item]);
        setNewItemTitle("");
        setShowAddItem(false);
        showToast("Item added successfully!", "success");
      }
    } catch (error) {
      console.error("Error adding item:", error);
      showToast("Failed to add item", "error");
    }
  };

  const handleToggleItem = async (itemId, completed) => {
    try {
      const response = await cardItemAPI.updateCardItem(card._id, itemId, {
        completed: !completed,
      });

      if (response.data.success) {
        setItems((prev) =>
          prev.map((item) =>
            item._id === itemId ? { ...item, completed: !completed } : item
          )
        );
      }
    } catch (error) {
      console.error("Error updating item:", error);
      showToast("Failed to update item", "error");
    }
  };

  const handleDeleteItem = async (itemId) => {
    try {
      const response = await cardItemAPI.deleteCardItem(card._id, itemId);

      if (response.data.success) {
        setItems((prev) => prev.filter((item) => item._id !== itemId));
        showToast("Item deleted successfully!", "success");
      }
    } catch (error) {
      console.error("Error deleting item:", error);
      showToast("Failed to delete item", "error");
    }
  };

  // Fetch items when component mounts
  React.useEffect(() => {
    fetchItems();
  }, [card._id]);

  const handleDelete = async () => {
    if (
      window.confirm(
        "Are you sure you want to delete this card? This action cannot be undone."
      )
    ) {
      try {
        const response = await cardAPI.deleteCard(card._id);

        if (response.data.success) {
          onCardDeleted(card._id);
          onClose();
          showToast("Card deleted successfully!", "success");
        }
      } catch (error) {
        console.error("Error deleting card:", error);
        showToast("Failed to delete card", "error");
      }
    }
  };

  const handleAddComment = async () => {
    if (!commentText.trim()) return;

    try {
      const response = await fetch(`/api/cards/${card.id}/comments`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ text: commentText }),
      });

      if (!response.ok) {
        throw new Error("Failed to add comment");
      }

      const newComment = await response.json();
      const updatedCard = {
        ...card,
        comments: [...card.comments, newComment],
      };
      onCardUpdated(updatedCard);
      setCommentText("");
      showToast("Comment added successfully!", "success");
    } catch (error) {
      console.error("Error adding comment:", error);
      showToast("Failed to add comment", "error");
    }
  };

  const handleDeleteComment = async (commentId) => {
    if (window.confirm("Are you sure you want to delete this comment?")) {
      try {
        const response = await fetch(
          `/api/cards/${card.id}/comments/${commentId}`,
          {
            method: "DELETE",
          }
        );

        if (!response.ok) {
          throw new Error("Failed to delete comment");
        }

        const updatedCard = {
          ...card,
          comments: card.comments.filter((c) => c.id !== commentId),
        };
        onCardUpdated(updatedCard);
        showToast("Comment deleted successfully!", "success");
      } catch (error) {
        console.error("Error deleting comment:", error);
        showToast("Failed to delete comment", "error");
      }
    }
  };

  const handleAddAttachment = async () => {
    if (!attachmentUrl.trim()) return;

    try {
      const response = await fetch(`/api/cards/${card.id}/attachments`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: attachmentUrl.split("/").pop() || "Attachment",
          url: attachmentUrl.trim(),
          type: "link",
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to add attachment");
      }

      const newAttachment = await response.json();
      const updatedCard = {
        ...card,
        attachments: [...card.attachments, newAttachment],
      };
      onCardUpdated(updatedCard);
      setAttachmentUrl("");
      showToast("Attachment added successfully!", "success");
    } catch (error) {
      console.error("Error adding attachment:", error);
      showToast("Failed to add attachment", "error");
    }
  };

  const handleImageUpload = async (file) => {
    if (!file) return;

    // Check if file is an image
    if (!file.type.startsWith("image/")) {
      showToast("Please select a valid image file", "error");
      return;
    }

    // Check file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      showToast("Image size must be less than 5MB", "error");
      return;
    }

    try {
      // Create a preview URL for immediate display
      const previewUrl = URL.createObjectURL(file);

      // For demo purposes, we'll create a mock attachment
      // In a real app, you'd upload to a cloud service
      const newAttachment = {
        id: Date.now().toString(),
        name: file.name,
        url: previewUrl,
        type: "image",
        uploadedAt: new Date().toISOString(),
        size: file.size,
        mimeType: file.type,
      };

      const updatedCard = {
        ...card,
        attachments: [...card.attachments, newAttachment],
      };
      onCardUpdated(updatedCard);
      showToast("Image uploaded successfully!", "success");
    } catch (error) {
      console.error("Error uploading image:", error);
      showToast("Failed to upload image", "error");
    }
  };

  const handleFileSelect = (event) => {
    const file = event.target.files[0];
    if (file) {
      handleImageUpload(file);
    }
  };

  const isImageAttachment = (attachment) => {
    return (
      attachment.type === "image" ||
      attachment.mimeType?.startsWith("image/") ||
      /\.(jpg|jpeg|png|gif|webp|svg)$/i.test(attachment.name)
    );
  };

  const getImageAttachments = () => {
    return card.attachments.filter(isImageAttachment);
  };

  const getOtherAttachments = () => {
    return card.attachments.filter(
      (attachment) => !isImageAttachment(attachment)
    );
  };

  const handleDeleteAttachment = async (attachmentId) => {
    if (window.confirm("Are you sure you want to delete this attachment?")) {
      try {
        const response = await fetch(
          `/api/cards/${card.id}/attachments/${attachmentId}`,
          {
            method: "DELETE",
          }
        );

        if (!response.ok) {
          throw new Error("Failed to delete attachment");
        }

        const updatedCard = {
          ...card,
          attachments: card.attachments.filter((a) => a.id !== attachmentId),
        };
        onCardUpdated(updatedCard);
        showToast("Attachment deleted successfully!", "success");
      } catch (error) {
        console.error("Error deleting attachment:", error);
        showToast("Failed to delete attachment", "error");
      }
    }
  };

  const handleAddLabel = () => {
    if (!newLabel.trim()) return;

    const updatedCard = {
      ...card,
      labels: [
        ...(card.labels || []),
        {
          id: Date.now().toString(),
          name: newLabel.trim(),
          color: "blue",
        },
      ],
    };
    onCardUpdated(updatedCard);
    setNewLabel("");
    showToast("Label added successfully!", "success");
  };

  const handleRemoveLabel = (labelId) => {
    const updatedCard = {
      ...card,
      labels: (card.labels || []).filter((l) => l.id !== labelId),
    };
    onCardUpdated(updatedCard);
    showToast("Label removed successfully!", "success");
  };

  const handleSetPriority = (priority) => {
    const updatedCard = {
      ...card,
      priority: priority,
    };
    onCardUpdated(updatedCard);
    showToast(`Priority set to ${priority}`, "success");
  };

  const handleAddChecklist = () => {
    if (!newChecklist.trim()) return;

    const updatedCard = {
      ...card,
      checklists: [
        ...(card.checklists || []),
        {
          id: Date.now().toString(),
          title: newChecklist.trim(),
          items: [],
        },
      ],
    };
    onCardUpdated(updatedCard);
    setNewChecklist("");
    showToast("Checklist added successfully!", "success");
  };

  const handleAssignUser = async (userId) => {
    try {
      const response = await fetch(`/api/cards/${card.id}/assign`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ userId }),
      });

      if (!response.ok) {
        throw new Error("Failed to assign user");
      }

      const updatedCard = await response.json();
      onCardUpdated(updatedCard);
      showToast("User assigned successfully!", "success");
    } catch (error) {
      console.error("Error assigning user:", error);
      showToast("Failed to assign user", "error");
    }
  };

  const handleUnassignUser = async (userId) => {
    try {
      const response = await fetch(`/api/cards/${card.id}/assign/${userId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("Failed to unassign user");
      }

      const updatedCard = await response.json();
      onCardUpdated(updatedCard);
      showToast("User unassigned successfully!", "success");
    } catch (error) {
      console.error("Error unassigning user:", error);
      showToast("Failed to unassign user", "error");
    }
  };

  const assignees = getAssignees();
  const projectMembers =
    currentProject?.members
      .map((userId) => users.find((user) => user.id === userId))
      .filter(Boolean) || [];

  return (
    <>
      <div className="modal-overlay">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-6xl max-h-[95vh] overflow-hidden">
          {/* Modal Header */}
          <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className="w-12 h-12 bg-white bg-opacity-20 rounded-xl flex items-center justify-center">
                  <span className="text-2xl">📋</span>
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
                        placeholder="Card title..."
                        autoFocus
                      />
                    ) : (
                      card.title
                    )}
                  </h2>
                  <p className="text-blue-100 text-sm">
                    {isEditing ? "Click to edit" : "Card Details"}
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
                      <XIcon className="w-4 h-4" />
                      <span>Cancel</span>
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      onClick={() => setIsEditing(true)}
                      className="bg-white bg-opacity-20 text-white hover:bg-opacity-30 font-medium py-2 px-3 rounded-lg transition-colors duration-200 flex items-center space-x-1 text-sm"
                    >
                      <Edit2 className="w-4 h-4" />
                      <span>Edit</span>
                    </button>
                    <button
                      onClick={handleDelete}
                      className="bg-red-500 text-white hover:bg-red-600 font-medium py-2 px-3 rounded-lg transition-colors duration-200 flex items-center space-x-1 text-sm"
                    >
                      <Trash2 className="w-4 h-4" />
                      <span>Delete</span>
                    </button>
                  </>
                )}
                <button
                  onClick={onClose}
                  className="p-2 rounded-lg hover:bg-white hover:bg-opacity-20 transition-colors duration-200"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>

          {/* Modal Content */}
          <div className="p-8 max-h-[calc(95vh-200px)] overflow-y-auto">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Main Content */}
              <div className="lg:col-span-2 space-y-6">
                {/* Description */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-3">
                    Description
                  </label>
                  {isEditing ? (
                    <textarea
                      value={formData.description}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          description: e.target.value,
                        })
                      }
                      className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                      rows={4}
                      placeholder="Add a description..."
                    />
                  ) : (
                    <div className="p-3 bg-gray-50 rounded-lg min-h-[100px]">
                      <p className="text-gray-700 whitespace-pre-wrap">
                        {card.description || "No description provided"}
                      </p>
                    </div>
                  )}
                </div>

                {/* Images */}
                {getImageAttachments().length > 0 && (
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Images ({getImageAttachments().length})
                    </label>
                    <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2 mb-4">
                      {getImageAttachments().map((attachment) => (
                        <div
                          key={attachment.id}
                          className="relative group cursor-pointer"
                          onClick={() => {
                            setSelectedImage(attachment);
                            setShowImageModal(true);
                          }}
                        >
                          <img
                            src={attachment.url}
                            alt={attachment.name}
                            className="w-full h-28 object-cover rounded-lg border border-gray-200 hover:border-blue-300 transition-colors duration-200"
                          />
                          <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 rounded-lg transition-all duration-200 flex items-center justify-center">
                            <Eye className="w-5 h-5 text-white opacity-0 group-hover:opacity-100 transition-opacity duration-200" />
                          </div>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteAttachment(attachment.id);
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

                {/* Comments */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Comments ({card.comments.length})
                  </label>

                  <div className="space-y-2 mb-3 max-h-64 overflow-y-auto pr-2">
                    {card.comments.map((comment) => (
                      <div
                        key={comment.id}
                        className="bg-gray-50 rounded-lg p-3 group hover:bg-gray-100 transition-colors duration-200"
                      >
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center space-x-3">
                            <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-xs text-white font-medium">
                              {comment.userName.charAt(0)}
                            </div>
                            <div>
                              <span className="font-medium text-gray-900">
                                {comment.userName}
                              </span>
                              <span className="text-xs text-gray-500 ml-2">
                                {new Date(comment.createdAt).toLocaleString()}
                              </span>
                            </div>
                          </div>
                          <button
                            onClick={() => handleDeleteComment(comment.id)}
                            className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-red-100 text-red-500 hover:text-red-700 transition-all duration-200"
                            title="Delete comment"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                        <p className="text-sm text-gray-700">{comment.text}</p>
                      </div>
                    ))}
                  </div>

                  <div className="flex space-x-2">
                    <input
                      type="text"
                      value={commentText}
                      onChange={(e) => setCommentText(e.target.value)}
                      placeholder="Add a comment..."
                      className="flex-1 p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                      onKeyPress={(e) =>
                        e.key === "Enter" && handleAddComment()
                      }
                    />
                    <button
                      onClick={handleAddComment}
                      disabled={!commentText.trim()}
                      className="bg-blue-600 text-white hover:bg-blue-700 font-medium py-2 px-3 rounded-lg transition-colors duration-200 flex items-center space-x-1 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <Plus className="w-3 h-3" />
                      <span>Add</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Sidebar */}
              <div className="space-y-6">
                {/* Status */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Status
                  </label>
                  <select
                    value={card.status}
                    onChange={(e) => handleStatusChange(e.target.value)}
                    className="w-full p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                  >
                    {statusOptions.map((option) => (
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
                  {isEditing ? (
                    <input
                      type="datetime-local"
                      value={formData.dueDate}
                      onChange={(e) =>
                        setFormData({ ...formData, dueDate: e.target.value })
                      }
                      className="w-full p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                    />
                  ) : (
                    <div className="p-2 bg-gray-50 rounded-lg">
                      <p className="text-gray-700 text-sm">
                        {card.dueDate
                          ? new Date(card.dueDate).toLocaleString()
                          : "No due date set"}
                      </p>
                    </div>
                  )}
                </div>

                {/* Priority */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Priority
                  </label>
                  <div className="flex space-x-1">
                    {["low", "medium", "high"].map((priority) => (
                      <button
                        key={priority}
                        onClick={() => handleSetPriority(priority)}
                        className={`px-2 py-1 rounded text-xs font-medium ${
                          card.priority === priority
                            ? priority === "high"
                              ? "bg-red-100 text-red-700"
                              : priority === "medium"
                              ? "bg-yellow-100 text-yellow-700"
                              : "bg-green-100 text-green-700"
                            : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                        }`}
                      >
                        {priority.charAt(0).toUpperCase() + priority.slice(1)}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Labels */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Labels ({card.labels?.length || 0})
                  </label>

                  <div className="flex flex-wrap gap-1 mb-2 max-h-32 overflow-y-auto">
                    {card.labels?.map((label) => (
                      <span
                        key={label.id}
                        className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-700"
                      >
                        {label.name}
                        <button
                          onClick={() => handleRemoveLabel(label.id)}
                          className="ml-1 hover:text-blue-900"
                        >
                          ×
                        </button>
                      </span>
                    ))}
                  </div>

                  <div className="flex space-x-1">
                    <input
                      type="text"
                      value={newLabel}
                      onChange={(e) => setNewLabel(e.target.value)}
                      placeholder="Add label..."
                      className="flex-1 p-1.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-xs"
                    />
                    <button
                      onClick={handleAddLabel}
                      disabled={!newLabel.trim()}
                      className="bg-gray-600 text-white hover:bg-gray-700 font-medium py-1.5 px-2 rounded-lg transition-colors duration-200 text-xs disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Add
                    </button>
                  </div>
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
                          key={user.id}
                          className="flex items-center justify-between p-2 bg-gray-50 rounded-lg"
                        >
                          <div className="flex items-center space-x-2">
                            <div className="w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center text-xs text-white font-medium">
                              {user.avatar}
                            </div>
                            <span className="text-xs text-gray-700">
                              {user.name}
                            </span>
                          </div>
                          <button
                            onClick={() => handleUnassignUser(user.id)}
                            className="text-red-500 hover:text-red-700 text-xs"
                          >
                            Remove
                          </button>
                        </div>
                      ))
                    ) : (
                      <p className="text-gray-500 italic text-xs">
                        No assignees
                      </p>
                    )}
                  </div>
                </div>

                {/* File Attachments */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Files ({getOtherAttachments().length})
                  </label>

                  <div className="space-y-1 mb-2 max-h-40 overflow-y-auto">
                    {getOtherAttachments().length > 0 ? (
                      getOtherAttachments().map((attachment) => (
                        <div
                          key={attachment.id}
                          className="flex items-center space-x-2 p-2 bg-gray-50 rounded-lg group hover:bg-gray-100 transition-colors duration-200"
                        >
                          <Paperclip className="w-3 h-3 text-gray-500" />
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-gray-900 text-xs truncate">
                              {attachment.name}
                            </p>
                            <p className="text-xs text-gray-600">
                              {new Date(attachment.uploadedAt).toLocaleString()}
                            </p>
                          </div>
                          <div className="flex items-center space-x-1">
                            <a
                              href={attachment.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-600 hover:text-blue-800 text-xs"
                            >
                              View
                            </a>
                            <button
                              onClick={() =>
                                handleDeleteAttachment(attachment.id)
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
                    {/* Image Upload */}
                    <div className="flex space-x-1">
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleFileSelect}
                        className="hidden"
                        id="image-upload"
                      />
                      <label
                        htmlFor="image-upload"
                        className="flex-1 bg-blue-600 text-white hover:bg-blue-700 font-medium py-1.5 px-2 rounded-lg transition-colors duration-200 text-xs cursor-pointer flex items-center justify-center space-x-1"
                      >
                        <Upload className="w-3 h-3" />
                        <span>Upload Image</span>
                      </label>
                    </div>

                    {/* URL Attachment */}
                    <div className="flex space-x-1">
                      <input
                        type="url"
                        value={attachmentUrl}
                        onChange={(e) => setAttachmentUrl(e.target.value)}
                        placeholder="Enter attachment URL..."
                        className="flex-1 p-1.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-xs"
                      />
                      <button
                        onClick={handleAddAttachment}
                        disabled={!attachmentUrl.trim()}
                        className="bg-gray-600 text-white hover:bg-gray-700 font-medium py-1.5 px-2 rounded-lg transition-colors duration-200 text-xs disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Add
                      </button>
                    </div>
                  </div>
                </div>

                {/* Card Items Section */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-sm font-semibold text-gray-700">
                      Items ({items.length})
                    </label>
                    <button
                      onClick={() => setShowAddItem(!showAddItem)}
                      className="text-blue-600 hover:text-blue-700 text-sm font-medium flex items-center space-x-1"
                    >
                      <Plus className="w-4 h-4" />
                      <span>Add Item</span>
                    </button>
                  </div>

                  {/* Items List */}
                  <div className="space-y-2 max-h-40 overflow-y-auto">
                    {loadingItems ? (
                      <div className="text-center py-2">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mx-auto"></div>
                      </div>
                    ) : items.length > 0 ? (
                      items.map((item) => (
                        <div
                          key={item._id}
                          className="flex items-center space-x-2 p-2 bg-gray-50 rounded-lg group hover:bg-gray-100 transition-colors"
                        >
                          <button
                            onClick={() =>
                              handleToggleItem(item._id, item.completed)
                            }
                            className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${
                              item.completed
                                ? "bg-green-500 border-green-500 text-white"
                                : "border-gray-300 hover:border-gray-400"
                            }`}
                          >
                            {item.completed && (
                              <CheckSquare className="w-3 h-3" />
                            )}
                          </button>
                          <span
                            className={`flex-1 text-sm ${
                              item.completed
                                ? "line-through text-gray-400"
                                : "text-gray-700"
                            }`}
                          >
                            {item.title}
                          </span>
                          <button
                            onClick={() => handleDeleteItem(item._id)}
                            className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-500 transition-all"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      ))
                    ) : (
                      <p className="text-gray-500 italic text-sm text-center py-2">
                        No items yet
                      </p>
                    )}
                  </div>

                  {/* Add Item Form */}
                  {showAddItem && (
                    <div className="mt-3 space-y-2">
                      <input
                        type="text"
                        value={newItemTitle}
                        onChange={(e) => setNewItemTitle(e.target.value)}
                        onKeyPress={(e) => {
                          if (e.key === "Enter") {
                            handleAddItem();
                          } else if (e.key === "Escape") {
                            setShowAddItem(false);
                            setNewItemTitle("");
                          }
                        }}
                        placeholder="Enter item title..."
                        className="w-full p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                        autoFocus
                      />
                      <div className="flex space-x-2">
                        <button
                          onClick={handleAddItem}
                          disabled={!newItemTitle.trim()}
                          className="bg-blue-600 text-white hover:bg-blue-700 font-medium py-1.5 px-3 rounded-lg transition-colors text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          Add Item
                        </button>
                        <button
                          onClick={() => {
                            setShowAddItem(false);
                            setNewItemTitle("");
                          }}
                          className="bg-gray-300 text-gray-700 hover:bg-gray-400 font-medium py-1.5 px-3 rounded-lg transition-colors text-sm"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Assign User Modal */}
      {showAssignModal && (
        <AssignUserModal
          project={currentProject}
          card={card}
          onClose={() => setShowAssignModal(false)}
          onUserAssigned={handleAssignUser}
        />
      )}

      {/* Image Modal */}
      {showImageModal && selectedImage && (
        <div className="modal-overlay">
          <div className="bg-white rounded-2xl shadow-2xl max-w-6xl max-h-[95vh] overflow-hidden">
            {/* Image Modal Header */}
            <div className="flex items-center justify-between p-4 border-b border-gray-200">
              <div className="flex items-center space-x-3">
                <ImageIcon className="w-6 h-6 text-blue-600" />
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">
                    {selectedImage.name}
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
                  href={selectedImage.url}
                  download={selectedImage.name}
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

            {/* Image Content */}
            <div className="p-4 max-h-[calc(90vh-120px)] overflow-y-auto">
              <div className="flex justify-center">
                <img
                  src={selectedImage.url}
                  alt={selectedImage.name}
                  className="max-w-full max-h-[calc(90vh-200px)] object-contain rounded-lg shadow-lg"
                />
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default CardModal;
