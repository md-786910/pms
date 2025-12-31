import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  X,
  Edit2,
  Edit,
  Trash2,
  Save,
  X as XIcon,
  CheckSquare,
  Image as ImageIcon,
  Upload,
  Eye,
  Plus,
  Archive,
  RotateCcw,
  ChevronLeft,
  ChevronRight,
  Calendar,
  AlignLeft,
  MessageSquare,
  Tag,
  Clock4,
  Paperclip,
  UserPlus,
  AlertTriangle,
  MoveUpRight,
  DownloadCloud as CloudDownload,
} from "lucide-react";
import { useUser } from "../contexts/UserContext";
import { useProject } from "../contexts/ProjectContext";
import { useNotification } from "../contexts/NotificationContext";
import { useSocket } from "../contexts/SocketContext";
import { cardAPI, cardItemAPI } from "../utils/api";
import Avatar from "./Avatar";
import MembersDropdown from "./MembersDropdown";
import ConfirmationModal from "./ConfirmationModal";
import SimpleQuillEditor from "./SimpleQuillEditor";
import SimpleCommentEditor from "./SimpleCommentEditor";
import LabelsDropdown from "./LabelsDropdown";
import { TimeTrackerWidget } from "./TimeTracking";
import { API_URL } from "../utils/endpoints";
import { getCardStatusColors } from "../utils/statusColors";

const CardModal = ({
  card,
  cards = [],
  onClose,
  onCardUpdated,
  onCardDeleted,
  onCardRestored,
  onCardPermanentlyDeleted,
  onStatusChange,
  onNavigateCard,
}) => {
  const { users, user } = useUser();
  const { currentProject } = useProject();
  const { showToast } = useNotification();
  const { socket } = useSocket();

  // Check if card is archived
  const isArchived = card.isArchived || card.status === "archive";

  // Helper function to check if a comment is a system-generated comment
  const isSystemComment = (comment) => {
    const text = comment.text || "";
    // Check if comment contains HTML tags or system-generated content
    return (
      text.includes("<p><strong>") || // System comments have HTML structure
      text.includes("uploaded an image") ||
      text.includes("uploaded an attachment") ||
      text.includes("moved this card") ||
      text.includes("archived this card") ||
      text.includes("restored this card") ||
      text.includes("<img src=") ||
      text.includes("<a href=") ||
      text.includes("</p>")
    );
  };

  // Label colors like Trello - matching LabelsModal
  const labelColors = [
    {
      name: "Light Green",
      value: "light-green",
      bg: "bg-green-300",
      text: "text-black",
    },
    { name: "Green", value: "green", bg: "bg-green-500", text: "text-white" },
    {
      name: "Dark Green",
      value: "dark-green",
      bg: "bg-green-700",
      text: "text-white",
    },
    {
      name: "Light Yellow",
      value: "light-yellow",
      bg: "bg-yellow-300",
      text: "text-black",
    },
    {
      name: "Yellow",
      value: "yellow",
      bg: "bg-yellow-500",
      text: "text-black",
    },
    {
      name: "Dark Yellow",
      value: "dark-yellow",
      bg: "bg-yellow-700",
      text: "text-white",
    },
    {
      name: "Orange",
      value: "orange",
      bg: "bg-orange-500",
      text: "text-white",
    },
    { name: "Red", value: "red", bg: "bg-red-500", text: "text-white" },
    {
      name: "Purple",
      value: "purple",
      bg: "bg-purple-500",
      text: "text-white",
    },
    { name: "Pink", value: "pink", bg: "bg-pink-500", text: "text-white" },
    { name: "Blue", value: "blue", bg: "bg-blue-500", text: "text-white" },
    { name: "Gray", value: "gray", bg: "bg-gray-500", text: "text-white" },
  ];
  // Mention functionality - now handled by QuillEditor
  const handleMentionSelect = (mention, newText) => {
    setMentions((prev) => [...prev, mention]);
  };

  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    title: card.title,
    description: card.description,
    dueDate: card.dueDate
      ? new Date(card.dueDate).toISOString().slice(0, 10)
      : "",
  });
  const [commentText, setCommentText] = useState("");
  const [attachmentUrl, setAttachmentUrl] = useState("");
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showDeleteCardConfirm, setShowDeleteCardConfirm] = useState(false);
  const [showLabelsModal, setShowLabelsModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [newLabel, setNewLabel] = useState("");
  const [newLabelColor, setNewLabelColor] = useState("blue");
  const [showLabelDropdown, setShowLabelDropdown] = useState(false);
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [newChecklist, setNewChecklist] = useState("");
  const [items, setItems] = useState([]);
  const [showAddItem, setShowAddItem] = useState(false);
  const [newItemTitle, setNewItemTitle] = useState("");
  const [loadingItems, setLoadingItems] = useState(false);
  const [editingItemId, setEditingItemId] = useState(null);
  const [editingItemTitle, setEditingItemTitle] = useState("");
  const [selectedImage, setSelectedImage] = useState(null);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [showImageModal, setShowImageModal] = useState(false);
  const [imageFile, setImageFile] = useState(null);
  const [showDeleteAttachmentConfirm, setShowDeleteAttachmentConfirm] = useState(false);
  const [attachmentToDelete, setAttachmentToDelete] = useState(null);
  const [deletingAttachment, setDeletingAttachment] = useState(false);
  const [editingComment, setEditingComment] = useState(null);
  const [editCommentText, setEditCommentText] = useState("");
  const [mentions, setMentions] = useState([]);
  const [columns, setColumns] = useState([]);
  const [loadingColumns, setLoadingColumns] = useState(false);
  const [showFormattingHelp, setShowFormattingHelp] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [showRichText, setShowRichText] = useState(true); // Default to rich text
  const [activeFormatting, setActiveFormatting] = useState({
    bold: false,
    italic: false,
    underline: false,
    header: false,
    list: false,
    link: false,
  });
  const [autoSaving, setAutoSaving] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const modalRef = useRef(null);
  const imageModalRef = useRef(null);
  const formattingHelpModalRef = useRef(null);
  const initialDueDateRef = useRef(formData.dueDate);
  const cardIdRef = useRef(card._id);
  const dateInputRef = useRef(null);
  const labelsButtonRef = useRef(null);
  const membersButtonRef = useRef(null);

  // Mark card as read when modal opens
  useEffect(() => {
    const markCardAsRead = async () => {
      if (!card || !card._id || !user) return;

      // Check if card is already read by current user
      const isRead = card.readBy?.some(
        (readEntry) =>
          (readEntry.user?._id || readEntry.user) === (user._id || user.id)
      );

      if (!isRead) {
        try {
          const { cardAPI } = await import("../utils/api");
          const response = await cardAPI.markAsRead(card._id);
          if (response.data.success && onCardUpdated) {
            // Update card with read status
            onCardUpdated(response.data.card);
          }
        } catch (error) {
          console.error("Error marking card as read:", error);
          // Don't show error toast, just log it
        }
      }
    };

    markCardAsRead();
  }, [card._id, user, onCardUpdated]); // Only run when card ID or user changes

  // Handle click outside to close modal
  useEffect(() => {
    const handleClickOutside = (event) => {
      // Don't close if clicking on confirmation modal or its children
      const confirmationModal = document.querySelector('[class*="z-[100]"]');
      if (confirmationModal && confirmationModal.contains(event.target)) {
        return;
      }

      if (modalRef.current && !modalRef.current.contains(event.target)) {
        // Don't close modal if any confirmation modal is open
        if (
          !showDeleteConfirm &&
          !showDeleteCardConfirm &&
          !showAssignModal &&
          !showImageModal &&
          !showFormattingHelp &&
          !showLabelsModal
        ) {
          onClose();
        }
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [
    onClose,
    showDeleteConfirm,
    showDeleteCardConfirm,
    showAssignModal,
    showImageModal,
    showFormattingHelp,
    showLabelsModal,
  ]);

  // Handle click outside to close image modal
  useEffect(() => {
    if (!showImageModal) return;

    const handleClickOutside = (event) => {
      // If a confirmation modal (or any modal with high z-index) is open and
      // the click is inside it, don't close the image modal. This prevents
      // clicks on confirmation dialogs (e.g., delete confirmation) from
      // closing the image viewer when the user cancels.
      const confirmationModal = document.querySelector('[class*="z-[100]"]');
      if (confirmationModal && confirmationModal.contains(event.target)) {
        return;
      }

      if (
        imageModalRef.current &&
        !imageModalRef.current.contains(event.target)
      ) {
        setShowImageModal(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [showImageModal]);

  // Handle click outside to close formatting help modal
  useEffect(() => {
    if (!showFormattingHelp) return;

    const handleClickOutside = (event) => {
      if (
        formattingHelpModalRef.current &&
        !formattingHelpModalRef.current.contains(event.target)
      ) {
        setShowFormattingHelp(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [showFormattingHelp]);

  // Handle click outside to close label dropdowns
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (showLabelDropdown && !event.target.closest(".label-dropdown")) {
        setShowLabelDropdown(false);
      }
      if (showColorPicker && !event.target.closest(".color-picker")) {
        setShowColorPicker(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [showLabelDropdown, showColorPicker]);

  // Update ref when card changes
  useEffect(() => {
    cardIdRef.current = card._id;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [card._id]);

  // Sync formData when card prop changes (for real-time updates from other users)
  useEffect(() => {
    if (!isEditing) {
      // Only update if user is not currently editing
      const newDueDate = card.dueDate
        ? new Date(card.dueDate).toISOString().slice(0, 10)
        : "";

      // Update the initial due date ref BEFORE setting formData to prevent auto-save trigger
      initialDueDateRef.current = newDueDate;

      setFormData({
        title: card.title || "",
        description: card.description || "",
        dueDate: newDueDate,
      });
    }
  }, [card.title, card.description, card.dueDate, isEditing]);

  // Auto-save due date when it changes
  useEffect(() => {
    const autoSaveDueDate = async () => {
      // Skip if dueDate hasn't changed from initial value
      if (formData.dueDate === initialDueDateRef.current) {
        return;
      }

      // Skip if user is currently editing (let them save manually)
      if (isEditing) {
        return;
      }

      setAutoSaving(true);
      try {
        const updateData = {
          title: formData.title,
          description: formData.description,
          // Send null instead of empty string to properly clear the date
          dueDate: formData.dueDate || null,
        };

        const response = await cardAPI.updateCard(
          cardIdRef.current,
          updateData
        );

        if (response.data.success) {
          onCardUpdated(response.data.card);
          initialDueDateRef.current = formData.dueDate;
          showToast(
            formData.dueDate ? "Due date updated" : "Due date cleared",
            "success"
          );
        }
      } catch (error) {
        console.error("Error auto-saving due date:", error);
        showToast("Failed to update due date", "error");
      } finally {
        setAutoSaving(false);
      }
    };

    // Debounce auto-save for 1 second
    const timer = setTimeout(() => {
      autoSaveDueDate();
    }, 1000);

    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formData.dueDate, isEditing]);

  // File upload handler
  const handleFileUpload = useCallback(
    async (files) => {
      if (!files || files.length === 0) return;

      // Check file count limit
      if (files.length > 5) {
        showToast("Maximum 5 files can be uploaded at once", "error");
        return;
      }

      // Check file sizes (max 25MB each)
      for (const file of files) {
        if (file.size > 25 * 1024 * 1024) {
          showToast(`File "${file.name}" size must be less than 25MB`, "error");
          return;
        }
      }

      try {
        setIsUploading(true);

        // Create FormData for file upload
        const formData = new FormData();

        // Append all files
        for (const file of files) {
          formData.append("images", file);
        }

        // Upload the files using the API
        const response = await cardAPI.uploadFiles(card._id, formData);

        if (response.data.success) {
          onCardUpdated(response.data.card);
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
        setIsUploading(false);
      }
    },
    [card._id, onCardUpdated, showToast]
  );

  // Drag and Drop handlers
  useEffect(() => {
    const modal = modalRef.current;
    if (!modal) return;

    const handleDragEnter = (e) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(true);
    };

    const handleDragLeave = (e) => {
      e.preventDefault();
      e.stopPropagation();
      // Only set isDragging to false if we're leaving the modal entirely
      if (!modal.contains(e.relatedTarget)) {
        setIsDragging(false);
      }
    };

    const handleDragOver = (e) => {
      e.preventDefault();
      e.stopPropagation();
    };

    const handleDrop = (e) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);

      const files = Array.from(e.dataTransfer.files);
      if (files.length > 0) {
        handleFileUpload(files);
      }
    };

    // Paste handler
    const handlePaste = (e) => {
      const items = e.clipboardData.items;
      const files = [];

      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        if (item.kind === "file" && item.type.startsWith("image/")) {
          const file = item.getAsFile();
          if (file) {
            files.push(file);
          }
        }
      }

      if (files.length > 0) {
        handleFileUpload(files);
      }
    };

    modal.addEventListener("dragenter", handleDragEnter);
    modal.addEventListener("dragleave", handleDragLeave);
    modal.addEventListener("dragover", handleDragOver);
    modal.addEventListener("drop", handleDrop);
    document.addEventListener("paste", handlePaste);

    return () => {
      modal.removeEventListener("dragenter", handleDragEnter);
      modal.removeEventListener("dragleave", handleDragLeave);
      modal.removeEventListener("dragover", handleDragOver);
      modal.removeEventListener("drop", handleDrop);
      document.removeEventListener("paste", handlePaste);
    };
  }, [handleFileUpload]);

  // Dynamic status options based on project columns (excluding Archive)
  const statusOptions = columns
    .filter((column) => column.status !== "archive")
    .map((column) => ({
      value: column.status,
      label: column.name,
      color: column.color || "blue",
    }));

  // Add current card status if it's not in the columns (fallback)
  const allStatusOptions = [...statusOptions];
  if (card.status && !statusOptions.find((s) => s.value === card.status)) {
    allStatusOptions.push({
      value: card.status,
      label: card.statusLabel || card.status,
      color: "gray",
    });
  }

  const getAssignees = () => {
    if (!card.assignees || !Array.isArray(card.assignees)) {
      return [];
    }

    return card.assignees
      .map((assignee) => {
        // If assignee is already a populated user object
        if (typeof assignee === "object" && assignee.name) {
          return assignee;
        }
        // If assignee is a user ID, find the user
        return users.find(
          (user) => user._id === assignee || user.id === assignee
        );
      })
      .filter(Boolean);
  };

  // Helper function to convert hex to RGB
  const hexToRgb = (hex) => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result
      ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16),
      }
      : { r: 59, g: 130, b: 246 }; // Default blue
  };

  // Render comment text with styled mentions
  const renderCommentWithMentions = (text) => {
    if (!text) return "";

    // Split text by mentions (@username)
    const parts = text.split(/(@\w+)/g);

    return parts
      .map((part, index) => {
        if (part.startsWith("@")) {
          const username = part.substring(1);
          const user = currentProject?.members?.find(
            (member) =>
              member.user.name.toLowerCase().replace(/\s+/g, "") ===
              username.toLowerCase()
          );

          if (user) {
            const userColor = user.user.color || "#3b82f6";
            // Convert hex to RGB for better opacity control
            const rgb = hexToRgb(userColor);
            const backgroundColor = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.15)`;

            return `<span style="background-color: ${backgroundColor}; color: ${userColor}; padding: 2px 8px; border-radius: 6px; font-weight: 600; display: inline-block; margin: 0 2px; font-size: 14px; line-height: 1.2; border: 1px solid ${userColor}20; box-shadow: 0 1px 2px ${userColor}20; vertical-align: baseline; text-decoration: none;">${part}</span>`;
          } else {
            // Show unstyled mention if user not found
            return `<span style="color: #ef4444; font-weight: 500;">${part}</span>`;
          }
        }
        return part;
      })
      .join("");
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      // Only send the fields that can be updated
      const updateData = {
        title: formData.title,
        description: formData.description,
        dueDate: formData.dueDate,
      };

      const response = await cardAPI.updateCard(card._id, updateData);

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

        const statusLabel =
          allStatusOptions.find((s) => s.value === newStatus)?.label ||
          newStatus;
        showToast(`Card moved to ${statusLabel}`, "success");
      }
    } catch (error) {
      console.error("Error updating status:", error);
      showToast("Failed to update status", "error");
    }
  };

  const handleCompleteToggle = async () => {
    try {
      const response = await cardAPI.toggleComplete(card._id);

      if (response.data.success) {
        onCardUpdated(response.data.card);
        showToast(
          response.data.card.isComplete
            ? "Card marked as complete!"
            : "Card marked as incomplete!",
          "success"
        );
      }
    } catch (error) {
      console.error("Error toggling completion:", error);
      showToast("Failed to toggle completion", "error");
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

  const handleStartEditItem = (item) => {
    setEditingItemId(item._id);
    setEditingItemTitle(item.title);
  };

  const handleCancelEditItem = () => {
    setEditingItemId(null);
    setEditingItemTitle("");
  };

  const handleSaveEditItem = async (itemId) => {
    if (!editingItemTitle.trim()) {
      showToast("Item title cannot be empty", "error");
      return;
    }

    try {
      const response = await cardItemAPI.updateCardItem(card._id, itemId, {
        title: editingItemTitle.trim(),
      });

      if (response.data.success) {
        setItems((prev) =>
          prev.map((item) =>
            item._id === itemId
              ? { ...item, title: editingItemTitle.trim() }
              : item
          )
        );
        setEditingItemId(null);
        setEditingItemTitle("");
        showToast("Item updated successfully!", "success");
      }
    } catch (error) {
      console.error("Error updating item:", error);
      showToast("Failed to update item", "error");
    }
  };

  // Fetch columns for the project
  const fetchColumns = async () => {
    if (!currentProject?._id) return;

    try {
      setLoadingColumns(true);
      const { columnAPI } = await import("../utils/api");
      const response = await columnAPI.getColumns(currentProject._id);
      if (response.data.success) {
        setColumns(response.data.columns);
      }
    } catch (error) {
      console.error("Error fetching columns:", error);
    } finally {
      setLoadingColumns(false);
    }
  };

  // Refresh columns when project changes
  React.useEffect(() => {
    if (currentProject?._id) {
      fetchColumns();
    }
  }, [currentProject?._id]);

  // Fetch items when component mounts
  React.useEffect(() => {
    fetchItems();
  }, [card._id]);

  // Check if comments have incomplete user data and refetch if needed
  React.useEffect(() => {
    const hasIncompleteUserData = card.comments?.some(
      (comment) =>
        !comment.user || typeof comment.user === "string" || !comment.user.name
    );

    if (hasIncompleteUserData) {
      // Refetch the card to get properly populated user data
      const refetchCard = async () => {
        try {
          const response = await cardAPI.getCard(card._id);
          if (response.data.success) {
            onCardUpdated(response.data.card);
          }
        } catch (error) {
          console.error("Error refetching card:", error);
        }
      };
      refetchCard();
    }
  }, [card.comments, card._id, onCardUpdated]);

  // Listen for Socket.IO events for card updates
  React.useEffect(() => {
    if (!socket) return;

    const handleCardUpdated = (data) => {
      if (data.card && data.card._id === card._id) {
        // Skip if this event is from the current user (already updated via API)
        const currentUserId = user?._id || user?.id;
        if (data.userId === currentUserId) {
          return;
        }
        onCardUpdated(data.card);
      }
    };

    const handleCardCommentAdded = (data) => {
      if (data.card && data.card._id === card._id) {
        onCardUpdated(data.card);
      }
    };

    const handleCardLabelAdded = (data) => {
      if (
        data.card &&
        data.card._id === card._id &&
        data.userId !== user?._id &&
        data.userId !== user?.id
      ) {
        onCardUpdated(data.card);
      }
    };

    const handleCardLabelRemoved = (data) => {
      if (
        data.card &&
        data.card._id === card._id &&
        data.userId !== user?._id &&
        data.userId !== user?.id
      ) {
        onCardUpdated(data.card);
      }
    };

    const handleCardItemCreated = (data) => {
      if (
        data.cardId === card._id &&
        data.userId !== user?._id &&
        data.userId !== user?.id
      ) {
        setItems((prev) => [...prev, data.item]);
      }
    };

    const handleCardItemUpdated = (data) => {
      if (
        data.cardId === card._id &&
        data.userId !== user?._id &&
        data.userId !== user?.id
      ) {
        setItems((prev) =>
          prev.map((item) => (item._id === data.item._id ? data.item : item))
        );
      }
    };

    const handleCardItemDeleted = (data) => {
      if (
        data.cardId === card._id &&
        data.userId !== user?._id &&
        data.userId !== user?.id
      ) {
        setItems((prev) => prev.filter((item) => item._id !== data.itemId));
      }
    };

    const handleCardItemsReordered = (data) => {
      if (
        data.cardId === card._id &&
        data.userId !== user?._id &&
        data.userId !== user?.id
      ) {
        setItems(data.items);
      }
    };

    socket.on("card-updated", handleCardUpdated);
    socket.on("card-comment-added", handleCardCommentAdded);
    socket.on("card-comment-updated", handleCardUpdated);
    socket.on("card-label-added", handleCardLabelAdded);
    socket.on("card-label-removed", handleCardLabelRemoved);
    socket.on("card-user-assigned", handleCardUpdated);
    socket.on("card-user-unassigned", handleCardUpdated);
    socket.on("card-attachment-added", handleCardUpdated);
    socket.on("card-attachment-removed", handleCardUpdated);
    socket.on("card-files-uploaded", handleCardUpdated);
    socket.on("card-item-created", handleCardItemCreated);
    socket.on("card-item-updated", handleCardItemUpdated);
    socket.on("card-item-deleted", handleCardItemDeleted);
    socket.on("card-items-reordered", handleCardItemsReordered);

    return () => {
      socket.off("card-updated", handleCardUpdated);
      socket.off("card-comment-added", handleCardCommentAdded);
      socket.off("card-comment-updated", handleCardUpdated);
      socket.off("card-label-added", handleCardLabelAdded);
      socket.off("card-label-removed", handleCardLabelRemoved);
      socket.off("card-user-assigned", handleCardUpdated);
      socket.off("card-user-unassigned", handleCardUpdated);
      socket.off("card-attachment-added", handleCardUpdated);
      socket.off("card-attachment-removed", handleCardUpdated);
      socket.off("card-files-uploaded", handleCardUpdated);
      socket.off("card-item-created", handleCardItemCreated);
      socket.off("card-item-updated", handleCardItemUpdated);
      socket.off("card-item-deleted", handleCardItemDeleted);
      socket.off("card-items-reordered", handleCardItemsReordered);
    };
  }, [socket, card._id, onCardUpdated, user?._id, user?.id]);

  // Add selection change listener for rich text editor
  React.useEffect(() => {
    if (showRichText) {
      const handleSelectionChange = () => {
        const selection = window.getSelection();
        if (selection.rangeCount > 0) {
          const range = selection.getRangeAt(0);
          const container = range.commonAncestorContainer;
          const element =
            container.nodeType === Node.TEXT_NODE
              ? container.parentElement
              : container;

          setActiveFormatting({
            bold: element.closest("strong, b") !== null,
            italic: element.closest("em, i") !== null,
            underline: element.closest("u") !== null,
            header: element.closest("h1, h2, h3") !== null,
            list: element.closest("ul, ol, li") !== null,
            link: element.closest("a") !== null,
          });
        }
      };

      document.addEventListener("selectionchange", handleSelectionChange);
      return () => {
        document.removeEventListener("selectionchange", handleSelectionChange);
      };
    }
  }, [showRichText]);

  // Label Management
  const handleAddLabel = async () => {
    if (!newLabel.trim()) return;

    try {
      const response = await cardAPI.addLabel(card._id, {
        name: newLabel.trim(),
        color: newLabelColor,
      });

      if (response.data.success) {
        onCardUpdated(response.data.card);
        setNewLabel("");
        setNewLabelColor("blue");
        showToast("Label added successfully!", "success");
      }
    } catch (error) {
      console.error("Error adding label:", error);
      showToast("Failed to add label", "error");
    }
  };

  const handleAddExistingLabel = async (labelName, labelColor) => {
    try {
      const response = await cardAPI.addLabel(card._id, {
        name: labelName,
        color: labelColor,
      });

      if (response.data.success) {
        onCardUpdated(response.data.card);
        setShowLabelDropdown(false);
        showToast("Label added successfully!", "success");
      }
    } catch (error) {
      console.error("Error adding existing label:", error);
      showToast("Failed to add label", "error");
    }
  };

  const handleRemoveLabel = async (labelId) => {
    try {
      const response = await cardAPI.removeLabel(card._id, labelId);

      if (response.data.success) {
        onCardUpdated(response.data.card);
        showToast("Label removed successfully!", "success");
      }
    } catch (error) {
      console.error("Error removing label:", error);
      showToast("Failed to remove label", "error");
    }
  };

  // Attachment Management
  const handleAddAttachment = async () => {
    if (!attachmentUrl.trim()) return;

    try {
      const response = await cardAPI.addAttachment(card._id, {
        filename: attachmentUrl.split("/").pop(),
        originalName: attachmentUrl.split("/").pop(),
        mimeType: "application/octet-stream",
        size: 0,
        url: attachmentUrl,
      });

      if (response.data.success) {
        onCardUpdated(response.data.card);
        setAttachmentUrl("");
        showToast("Attachment added successfully!", "success");
      }
    } catch (error) {
      console.error("Error adding attachment:", error);
      showToast("Failed to add attachment", "error");
    }
  };

  const handleDeleteAttachment = async (attachmentId) => {
    try {
      const response = await cardAPI.deleteAttachment(card._id, attachmentId);

      if (response.data.success) {
        onCardUpdated(response.data.card);
        showToast("Attachment deleted successfully!", "success");
      }
    } catch (error) {
      console.error("Error deleting attachment:", error);
      showToast("Failed to delete attachment", "error");
    }
  };

  // Confirm delete attachment (shows modal)
  const confirmDeleteAttachment = async (e) => {
    if (e) {
      e.stopPropagation();
    }
    if (!attachmentToDelete) return;
    setDeletingAttachment(true);
    try {
      await handleDeleteAttachment(attachmentToDelete.id);
      if (attachmentToDelete.closeImageModal) {
        setShowImageModal(false);
      }
      setShowDeleteAttachmentConfirm(false);
      setAttachmentToDelete(null);
    } catch (err) {
      // handleDeleteAttachment handles errors/toasts
    } finally {
      setDeletingAttachment(false);
    }
  };

  // Verify an attachment URL before opening. Shows toast on 404 or failure.
  const handleViewAttachment = async (e, url) => {
  if (e) e.preventDefault();

  if (!url) {
    showToast("Attachment not found", "error");
    return;
  }

  try {
    const res = await fetch(url, { method: "HEAD" });

    if (res?.status === 404) {
      showToast("This attachment has been removed", "error");
      return;
    }

    if (!res.ok) {
      showToast("Unable to open attachment", "error");
      return;
    }

    // Open file only if it exists
    window.open(url, "_blank", "noopener,noreferrer");
  } catch (error) {
    console.error("Attachment check failed:", error);
    showToast("Attachment not found or server error", "error");
  }
};

  // Intercept clicks on links inside the modal (e.g., comments) and
  // verify attachments before opening them. This handles comment links
  // created via dangerouslySetInnerHTML.
  useEffect(() => {
    if (!modalRef?.current) return;

    const isLikelyAttachment = (href) => {
      if (!href) return false;
      const lower = href.toLowerCase();
      // Common file/video extensions
      if (lower.match(/\.(pdf|mp4|mov|webm|mkv|avi|zip|rar|7z|docx?|xlsx?|pptx?|txt|csv)(\?|$)/)) {
        return true;
      }
      // Links to the API uploads path
      if (lower.includes('/uploads') || lower.includes(API_URL.toLowerCase())) {
        return true;
      }
      return false;
    };

    const handler = (event) => {
      const anchor = event.target.closest && event.target.closest('a');
      if (!anchor) return;
      const href = anchor.getAttribute('href');
      if (!href || href.startsWith('#') || href.startsWith('javascript:')) return;

      const fullUrl = href.startsWith('http') ? href : `${API_URL}${href}`;
      if (isLikelyAttachment(fullUrl)) {
        event.preventDefault();
        handleViewAttachment(event, fullUrl);
      }
    };

    const node = modalRef.current;
    node.addEventListener('click', handler);
    return () => node.removeEventListener('click', handler);
  }, [modalRef, handleViewAttachment]);


  const handleArchive = () => {
    setShowDeleteConfirm(true);
  };

  const confirmArchive = async () => {
    try {
      setLoading(true);
      const response = await cardAPI.archiveCard(card._id);

      if (response.data.success) {
        onCardDeleted(card._id);
        onClose();
        showToast("Card archived successfully!", "success");
      }
    } catch (error) {
      console.error("Error archiving card:", error);
      showToast("Failed to archive card", "error");
    } finally {
      setLoading(false);
      setShowDeleteConfirm(false);
    }
  };

  const handleRestore = async () => {
    try {
      setLoading(true);
      const response = await cardAPI.restoreCard(card._id);
      if (response.data.success) {
        // Update card locally first
        onCardUpdated(response.data.card);
        // Notify parent component
        if (onCardRestored) {
          onCardRestored(card._id, response.data.card);
        }
        showToast("Card restored successfully!", "success");
        // Don't close modal - let user see the restored card
      }
    } catch (error) {
      console.error("Error restoring card:", error);
      showToast("Failed to restore card", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = () => {
    setShowDeleteCardConfirm(true);
  };

  const confirmDelete = async () => {
    if (!card || !card._id) {
      showToast("Card ID is missing", "error");
      setShowDeleteCardConfirm(false);
      return;
    }

    if (!card.isArchived) {
      showToast("Only archived cards can be permanently deleted", "error");
      setShowDeleteCardConfirm(false);
      return;
    }

    try {
      setLoading(true);
      console.log("Deleting card:", card._id);
      const response = await cardAPI.deleteCard(card._id);

      if (response && response.data && response.data.success) {
        // Close confirmation modal
        setShowDeleteCardConfirm(false);

        // Close card modal
        onClose();

        // Notify parent to remove card from state
        if (onCardPermanentlyDeleted) {
          await onCardPermanentlyDeleted(card._id);
        } else if (onCardDeleted) {
          await onCardDeleted(card._id);
        }

        showToast("Card deleted permanently", "success");
      } else {
        throw new Error("Delete request failed");
      }
    } catch (error) {
      console.error("Error deleting card:", error);
      const errorMessage =
        error.response?.data?.message ||
        error.message ||
        "Failed to delete card. Please try again.";
      showToast(errorMessage, "error");
      // Keep modal open on error so user can try again
    } finally {
      setLoading(false);
    }
  };

  const handleAddComment = async () => {
    if (!commentText.trim()) return;
    console.log({ commentText });
    try {
      // Extract mentions from the actual comment text
      const mentionRegex = /@([A-Za-z0-9._]+)/g;
      const mentionMatches = [...commentText.matchAll(mentionRegex)];

      console.log("Comment text:", commentText);
      console.log("Mention matches:", mentionMatches);
      console.log("Current project members:", currentProject?.members);

      // Find users for each mention in the text
      const actualMentions = mentionMatches
        .map((match) => {
          const username = match[1].toLowerCase();
          console.log("Looking for username:", username);

          // Find the user in project members
          const member = currentProject?.members?.find((m) => {
            if (!m.user) return false;
            const memberUsername = m.user.name
              .toLowerCase()
              .replace(/\s+/g, "");
            console.log(
              "Comparing with member:",
              memberUsername,
              "against:",
              username
            );
            return memberUsername === username;
          });

          if (member && member.user) {
            console.log("Found member:", member.user);
            // Return user object with required fields
            return {
              id: ["allmembersonthecard", "allmembersontheboard"].includes(
                username
              )
                ? "card"
                : member.user._id,
              name: member.user.name,
              email: member.user.email,
              avatar: member.user.avatar,
              color: member.user.color,
              type: ["allmembersonthecard", "allmembersontheboard"].includes(
                username
              )
                ? "group"
                : "user",
            };
          }

          console.log("Member not found for username:", username);
          return null;
        })
        .filter((user) => user !== null); // Remove null entries

      console.log("Actual mentions to send:", actualMentions);

      const response = await cardAPI.addComment(
        card._id,
        commentText,
        actualMentions
      );

      if (response.data.success) {
        onCardUpdated(response.data.card);
        setCommentText("");
        setMentions([]);
        showToast("Comment added successfully!", "success");
      }
    } catch (error) {
      console.error("Error adding comment:", error);
      console.error("Error response:", error.response?.data);
      showToast("Failed to add comment", "error");
    }
  };

  const handleUpdateComment = async (commentId, newText) => {
    try {
      const response = await cardAPI.updateComment(
        card._id,
        commentId,
        newText
      );

      if (response.data.success) {
        onCardUpdated(response.data.card);
        showToast("Comment updated successfully!", "success");
        setEditingComment(null);
        setEditCommentText("");
      }
    } catch (error) {
      console.error("Error updating comment:", error);
      showToast("Failed to update comment", "error");
    }
  };

  const handleStartEditComment = (comment) => {
    // Prevent editing system-generated comments
    if (isSystemComment(comment)) {
      showToast("Cannot edit system-generated comments", "error");
      return;
    }
    setEditingComment(comment._id || comment.id);
    setEditCommentText(comment.text);
  };

  const handleCancelEditComment = () => {
    setEditingComment(null);
    setEditCommentText("");
  };

  const handleSaveEditComment = () => {
    if (editCommentText.trim()) {
      handleUpdateComment(editingComment, editCommentText.trim());
    }
  };

  const handleFileSelect = (event) => {
    const files = Array.from(event.target.files);
    if (files.length > 0) {
      handleFileUpload(files);
    }
    // Reset the input value to allow selecting the same files again
    event.target.value = "";
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
    return card.attachments.filter(isImageAttachment);
  };

  const getOtherAttachments = () => {
    return card.attachments.filter(
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

    return "📎"; // Default file icon
  };

  const handleSetPriority = (priority) => {
    const updatedCard = {
      ...card,
      priority: priority,
    };
    onCardUpdated(updatedCard);
    showToast(`Priority set to ${priority}`, "success");
  };

  const handleUnassignUser = async (userId) => {
    try {
      const response = await cardAPI.unassignUser(card._id, userId);

      if (response.data.success) {
        onCardUpdated(response.data.card);
        showToast("User unassigned successfully!", "success");
      }
    } catch (error) {
      console.error("Error unassigning user:", error);
      showToast("Failed to unassign user", "error");
    }
  };

  // Markdown formatting helpers

  // Convert HTML back to markdown with better handling

  const assignees = getAssignees();

  // Navigation helpers for next/prev cards in the same column
  const getCardsInSameColumn = () => {
    if (!card || !cards || cards.length === 0) return [];

    // Filter cards with the same status as current card
    const sameStatusCards = cards.filter((c) => {
      // Handle archived cards
      if (card.isArchived || card.status === "archive") {
        return c.isArchived === true;
      }
      // For non-archived cards, match status and ensure not archived
      return c.status === card.status && c.isArchived !== true;
    });

    // Sort by cardNumber or position if available
    return sameStatusCards.sort((a, b) => {
      if (a.cardNumber && b.cardNumber) {
        return a.cardNumber - b.cardNumber;
      }
      // Fallback to creation date or ID
      return new Date(a.createdAt || 0) - new Date(b.createdAt || 0);
    });
  };

  const getCurrentCardIndex = () => {
    const sameColumnCards = getCardsInSameColumn();
    return sameColumnCards.findIndex((c) => c._id === card._id);
  };

  const getNextCard = () => {
    const sameColumnCards = getCardsInSameColumn();
    const currentIndex = getCurrentCardIndex();
    if (currentIndex >= 0 && currentIndex < sameColumnCards.length - 1) {
      return sameColumnCards[currentIndex + 1];
    }
    return null;
  };

  const getPrevCard = () => {
    const sameColumnCards = getCardsInSameColumn();
    const currentIndex = getCurrentCardIndex();
    if (currentIndex > 0) {
      return sameColumnCards[currentIndex - 1];
    }
    return null;
  };

  const handleNavigateToCard = async (targetCard) => {
    if (targetCard && onNavigateCard) {
      try {
        // Fetch full card data from API
        const response = await cardAPI.getCard(targetCard._id);
        if (response.data.success) {
          // Use the fetched card data with all populated fields
          onNavigateCard(response.data.card);
        } else {
          // Fallback to the card from the list if API fails
          onNavigateCard(targetCard);
        }
      } catch (error) {
        console.error("Error fetching card data:", error);
        // Fallback to the card from the list if API fails
        onNavigateCard(targetCard);
      }
    }
  };

  const nextCard = getNextCard();
  const prevCard = getPrevCard();

  // Image carousel helpers
  const imageAttachments = getImageAttachments();
  const currentImage = imageAttachments[selectedImageIndex] || selectedImage;

  const showImageAt = (index) => {
    const images = getImageAttachments();
    if (!images || images.length === 0) return;
    const idx = ((index % images.length) + images.length) % images.length;
    setSelectedImageIndex(idx);
    setSelectedImage(images[idx]);
    setShowImageModal(true);
  };

  const showPrevImage = () => {
    const images = getImageAttachments();
    if (!images || images?.length <= 1) return;
    showImageAt(selectedImageIndex - 1);
  };

  const showNextImage = () => {
    const images = getImageAttachments();
    if (!images || images?.length <= 1) return;
    showImageAt(selectedImageIndex + 1);
  };

  useEffect(() => {
    if (!showImageModal) return;
    const onKey = (e) => {
      if (e.key === "Escape") setShowImageModal(false);
      else if (e.key === "ArrowLeft") showPrevImage();
      else if (e.key === "ArrowRight") showNextImage();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [showImageModal, selectedImageIndex, card.attachments]);

  return (
    <>
      {/* Rich Text Editor Styles */}
      <style
        dangerouslySetInnerHTML={{
          __html: `
          .rich-text-editor {
            outline: none !important;
            border: none !important;
            resize: none !important;
          }
          .rich-text-editor:focus {
            outline: none !important;
            border: none !important;
          }
          .rich-text-editor strong {
            font-weight: bold !important;
          }
          .rich-text-editor em {
            font-style: italic !important;
          }
          .rich-text-editor h1, .rich-text-editor h2, .rich-text-editor h3 {
            font-weight: bold !important;
            margin: 0.5rem 0 !important;
          }
          .rich-text-editor h1 {
            font-size: 1.5rem !important;
          }
          .rich-text-editor h2 {
            font-size: 1.25rem !important;
          }
          .rich-text-editor h3 {
            font-size: 1.125rem !important;
          }
          .rich-text-editor ul, .rich-text-editor ol {
            margin: 0.5rem 0 !important;
            padding-left: 1.5rem !important;
          }
          .rich-text-editor li {
            list-style-type: disc !important;
            margin: 0.25rem 0 !important;
          }
          .rich-text-editor a {
            color: #2563eb !important;
            text-decoration: underline !important;
          }
          .rich-text-editor hr {
            border: 1px solid #d1d5db !important;
            margin: 1rem 0 !important;
          }
          .rich-text-editor p {
            margin: 0.5rem 0 !important;
          }
          .markdown-preview strong {
            font-weight: bold !important;
          }
          .markdown-preview em {
            font-style: italic !important;
          }
          .markdown-preview h1, .markdown-preview h2, .markdown-preview h3 {
            font-weight: bold !important;
            margin: 0.5rem 0 !important;
          }
          .markdown-preview li {
            list-style-type: disc !important;
            margin-left: 1rem !important;
          }
          .markdown-preview a {
            color: #2563eb !important;
            text-decoration: underline !important;
          }
          .markdown-preview hr {
            border: 1px solid #d1d5db !important;
            margin: 1rem 0 !important;
          }
        `,
        }}
      />

      <div className="modal-overlay">
        <div
          ref={modalRef}
          className="bg-white rounded-2xl shadow-2xl w-full max-w-7xl max-h-[95vh] overflow-hidden relative"
        >
          {/* Modal Header */}
          <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white px-3 py-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4 flex-1 min-w-0">
                <div className="w-10 h-10 bg-white bg-opacity-20 rounded-xl flex items-center justify-center flex-shrink-0">
                  <span className="text-xl">📋</span>
                </div>
                <div className="flex-1 min-w-0">
                  <h2
                    className="text-xl font-bold cursor-pointer"
                    onClick={() => setIsEditing(true)}
                  >
                    {isEditing ? (
                      <input
                        type="text"
                        value={formData.title}
                        onChange={(e) =>
                          setFormData({ ...formData, title: e.target.value })
                        }
                        className="bg-transparent border-none outline-none focus:outline-none text-xl font-bold text-white placeholder-white placeholder-opacity-70 w-full px-2 py-1"
                        placeholder="Card title..."
                        autoFocus
                      />
                    ) : (
                      card.title
                    )}
                  </h2>
                  <p className="text-blue-100 text-sm">
                    {!isEditing && "Click to edit"}
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
                  <></>
                )}
                <button
                  onClick={onClose}
                  className="p-2 hover:bg-white hover:bg-opacity-20 transition-colors duration-200 rounded-full shadow-lg transition-all duration-200 hover:scale-105"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>

          {/* Modal Content */}
          <div className="pt-2 pb-8 px-4 max-h-[calc(95vh-200px)] ">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              {/* Main Content */}
              <div className="lg:col-span-2 space-y-4 max-h-[70vh] overflow-y-auto px-2">
                {/* Status and Due Date Display */}

                <div className="sticky top-0 z-50 bg-white pb-4">
                  {/* Status/Due Row */}
                  <div className="flex items-center gap-2">
                    {/* Completion Toggle - Hidden when archived */}
                    {!isArchived && (
                      <button
                        onClick={handleCompleteToggle}
                        className={`mt-6 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all duration-200 ${card.isComplete
                          ? "bg-green-500 border-green-500 hover:bg-green-600"
                          : "border-gray-400 hover:border-gray-600 hover:bg-gray-50"
                          } cursor-pointer`}
                        title={
                          card.isComplete
                            ? "Mark as incomplete"
                            : "Mark as complete"
                        }
                      >
                        {card.isComplete && (
                          <svg
                            className="w-5 h-5 text-white"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="3"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              d="M5 13l4 4L19 7"
                            />
                          </svg>
                        )}
                      </button>
                    )}
                    <div className="flex items-center gap-6">
                      {/* CARD NUMBER */}
                      <div className="flex flex-col">
                        <span className="text-sm font-semibold text-gray-700">Card Number</span>

                        <div
                          className="px-4 py-1.5 rounded-lg bg-blue-500 text-white 
                                     text-sm font-medium shadow-md text-center"
                        >
                          #{card.cardNumber || card._id?.slice(-4) || "0000"}
                        </div>
                      </div>

                      {/* STATUS */}
                      <div className="flex flex-col">
                        <span className="text-sm font-semibold text-gray-700">Status</span>

                        {(() => {
                          const colors = getCardStatusColors(card.status);
                          const label = card?.statusLabel;
                        
                          return (
                            <div
                              className={`
                                px-4 py-1.5 rounded-lg text-sm font-medium shadow-md
                                bg-green-600 text-white
                              `}
                            >
                              <span
                                className="w-2 h-2 rounded-full"
                                style={{ backgroundColor: colors.dotColor }}
                              />
                              {label}
                            </div>
                          );
                        })()}
                      </div>
                      
                      {/* DUE DATE */}
                      <div className="flex flex-col">
                        <span className="text-sm font-semibold text-gray-700">Due Date</span>
                      
                        <div
                          className={`px-4 py-1.5 rounded-lg text-sm font-medium shadow-md 
                            ${card.dueDate
                              ? "bg-gray-500 text-white"
                              : "bg-gray-500 text-white"
                            }`}
                        >
                          {card.dueDate
                            ? new Date(card.dueDate).toLocaleDateString("en-US", {
                                year: "numeric",
                                month: "short",
                                day: "numeric",
                              })
                            : "No due date"}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Description */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <label className="flex items-center gap-2 text-sm font-semibold text-gray-700">
                      <AlignLeft className="w-4 h-4 text-gray-600" />
                      Description
                    </label>

                    {!isEditing && (
                      <button
                        onClick={() => setIsEditing(true)}
                        className="text-blue-600 hover:text-blue-700 text-sm font-medium flex items-center space-x-1"
                      >
                        {/* <Edit2 className="w-4 h-4" />
                        <span>Edit</span> */}
                      </button>
                    )}
                  </div>

                  {/* Description Content */}
                  <div className="relative">
                    {isEditing ? (
                      <div className="simple-quill-editor description-editor ">
                        <SimpleQuillEditor
                          value={formData.description || ""}
                          onChange={(content) => {
                            setFormData({
                              ...formData,
                              description: content,
                            });
                          }}
                          placeholder="Add a description..."
                          height={200}
                        />
                      </div>
                    ) : (
                      <div
                        className="w-full p-4 min-h-[120px] border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors duration-200"
                        onClick={() => setIsEditing(true)}
                      >
                        {formData.description && formData.description.trim() ? (
                          <div
                            className="prose prose-sm max-w-none"
                            style={{
                              fontSize: "16px",
                              lineHeight: "1.5",
                              letterSpacing: "0.3px",
                              color: "#374151",
                              whiteSpace: "normal",
                              wordBreak: "break-word",
                              overflowWrap: "break-word",
                            }}
                            dangerouslySetInnerHTML={{
                              __html: formData.description,
                            }}
                          />
                        ) : (
                          <div className="flex items-center text-gray-500 text-sm">
                            <Edit2 className="w-4 h-4 mr-2" />
                            <span>Click to edit</span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Action Buttons - Only show when editing */}
                  {isEditing && (
                    <div className="mt-14 flex items-center justify-end space-x-2">
                      <button
                        onClick={handleSave}
                        disabled={loading}
                        className=" bg-blue-600 text-white hover:bg-blue-700 font-medium py-2 px-4 rounded-lg transition-colors duration-200 flex items-center space-x-1 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <Save className="w-4 h-4" />
                        <span>Save</span>
                      </button>
                      <button
                        onClick={() => {
                          setIsEditing(false);
                          // Reset to original description if user cancels
                          setFormData({
                            ...formData,
                            description: card.description,
                          });
                        }}
                        className="text-gray-600 hover:text-gray-800 font-medium py-2 px-4 rounded-lg transition-colors duration-200 text-sm"
                      >
                        Cancel
                      </button>
                    </div>
                  )}
                </div>

                {/* Card Items Section */}
                <div className="flex flex-col">
                  <div className="flex items-center justify-between mb-2">
                    <label className="flex items-center gap-2 text-sm font-semibold text-gray-700">
                      <CheckSquare className="w-4 h-4 text-gray-400" />
                      Checklist ({items.length})
                    </label>
                  </div>

                  {/* Progress Bar - Show when checklist is active or has items */}
                  {(items.length > 0 || showAddItem) && (
                    <div className="mb-3">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs text-gray-500 font-medium">
                          {items.length > 0
                            ? `${items.filter((item) => item.completed).length
                            }/${items.length} items`
                            : "0 items"}
                        </span>
                        <span className="text-xs text-gray-500 font-medium">
                          {items.length > 0
                            ? `${Math.round(
                              (items.filter((item) => item.completed).length /
                                items.length) *
                              100
                            )}%`
                            : "0%"}
                        </span>
                      </div>
                      <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-blue-500 transition-all duration-300"
                          style={{
                            width: `${items.length > 0
                              ? Math.round(
                                (items.filter((item) => item.completed)
                                  .length /
                                  items.length) *
                                100
                              )
                              : 0
                              }%`,
                          }}
                        />
                      </div>
                    </div>
                  )}

                  {/* Items List - Scrollable area */}
                  <div className="space-y-2 mb-3 max-h-64 overflow-y-auto">
                    {loadingItems ? (
                      <div className="text-center py-2">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mx-auto"></div>
                      </div>
                    ) : items.length > 0 ? (
                      items.map((item) => (
                        <div key={item._id}>
                          {editingItemId === item._id ? (
                            /* Edit Mode */
                            <div className="p-2 bg-white border-2 border-blue-300 rounded-lg">
                              <input
                                type="text"
                                value={editingItemTitle}
                                onChange={(e) =>
                                  setEditingItemTitle(e.target.value)
                                }
                                onKeyPress={(e) => {
                                  if (e.key === "Enter") {
                                    handleSaveEditItem(item._id);
                                  } else if (e.key === "Escape") {
                                    handleCancelEditItem();
                                  }
                                }}
                                className="w-full p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm mb-2"
                                autoFocus
                              />
                              <div className="flex space-x-2">
                                <button
                                  onClick={() => handleSaveEditItem(item._id)}
                                  disabled={!editingItemTitle.trim()}
                                  className="flex-1 bg-blue-600 text-white hover:bg-blue-700 font-medium py-1.5 px-3 rounded-lg transition-colors text-xs disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                  Save
                                </button>
                                <button
                                  onClick={handleCancelEditItem}
                                  className="flex-1 bg-gray-200 text-gray-700 hover:bg-gray-300 font-medium py-1.5 px-3 rounded-lg transition-colors text-xs"
                                >
                                  Cancel
                                </button>
                              </div>
                            </div>
                          ) : (
                            /* View Mode */
                            <div
                              onClick={() =>
                                handleToggleItem(item._id, item.completed)
                              }
                              className="flex items-center space-x-2 p-2 bg-gray-50 rounded-lg group hover:bg-gray-100 transition-colors cursor-pointer"
                            >
                              <div
                                className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${item.completed
                                  ? "bg-green-500 border-green-500 text-white"
                                  : "border-gray-300"
                                  }`}
                              >
                                {item.completed && (
                                  <CheckSquare className="w-3 h-3" />
                                )}
                              </div>
                              <div
                                onDoubleClick={(e) => {
                                  e.stopPropagation();
                                  handleStartEditItem(item);
                                }}
                                className={`flex-1 text-left text-sm ${item.completed
                                  ? "line-through text-gray-400"
                                  : "text-gray-700"
                                  }`}
                              >
                                {item.title}
                              </div>
                              <div className="flex items-center space-x-1">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleStartEditItem(item);
                                  }}
                                  className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-blue-100 text-blue-500 hover:text-blue-700 transition-all"
                                  title="Edit item"
                                >
                                  <Edit className="w-3 h-3" />
                                </button>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleDeleteItem(item._id);
                                  }}
                                  className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-red-100 text-red-500 hover:text-red-700 transition-all"
                                  title="Delete item"
                                >
                                  <X className="w-3 h-3" />
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      ))
                    ) : (
                      <p className="text-gray-500 italic text-sm text-center py-2">
                        No checklist yet
                      </p>
                    )}
                  </div>

                  {/* Add Item Box - Fixed at bottom */}
                  {showAddItem ? (
                    <div className="bg-white border-2 border-blue-300 rounded-lg p-3">
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
                        className="w-full p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm mb-2"
                        autoFocus
                      />
                      <div className="flex space-x-2">
                        <button
                          onClick={handleAddItem}
                          disabled={!newItemTitle.trim()}
                          className="flex-1 bg-blue-600 text-white hover:bg-blue-700 font-medium py-2 px-4 rounded-lg transition-colors text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          Add
                        </button>
                        <button
                          onClick={() => {
                            setShowAddItem(false);
                            setNewItemTitle("");
                          }}
                          className="bg-gray-200 text-gray-700 hover:bg-gray-300 font-medium py-2 px-4 rounded-lg transition-colors text-sm"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      onClick={() => setShowAddItem(!showAddItem)}
                      className="w-full p-3 border-2 border-dashed border-gray-300 rounded-lg hover:border-blue-400 hover:bg-blue-50 transition-all duration-200 flex items-center justify-center space-x-2"
                    >
                      <Plus className="w-4 h-4 text-gray-400" />
                      <span className="text-sm font-medium text-gray-600">
                        Add Checklist
                      </span>
                    </button>
                  )}
                </div>

                {/* Images */}
                {getImageAttachments().length > 0 && (
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Images ({getImageAttachments().length})
                    </label>
                    <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2 mb-4">
                      {getImageAttachments().map((attachment, idx) => (
                        <div
                          key={attachment._id || attachment.id}
                          className="relative group cursor-pointer"
                          onClick={() => {
                            setSelectedImage(attachment);
                            setSelectedImageIndex(idx);
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
                              try {
                                showToast("Image attachment not found or removed", "error");
                              } catch (err) {}
                              e.target.src = "/placeholder-image.png"; // Fallback image
                            }}
                          />
                          <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 rounded-lg transition-all duration-200 flex items-center justify-center">
                            <Eye className="w-5 h-5 text-white opacity-0 group-hover:opacity-100 transition-opacity duration-200" />
                          </div>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setAttachmentToDelete({
                                id: attachment._id || attachment.id,
                                closeImageModal: false,
                              });
                              setShowDeleteAttachmentConfirm(true);
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
                {/* Time Tracking - Trello Style */}
                <TimeTrackerWidget
                  card={card}
                  onCardUpdated={onCardUpdated}
                  isArchived={isArchived}
                  socket={socket}
                />

                <div className="space-y-4">
                  <label className="flex items-center gap-2 text-sm font-semibold text-gray-700">
                    <MessageSquare className="w-4 h-4 text-gray-600" />
                    Add Comment
                  </label>
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
                      projectMembers={(() => {
                        const members = currentProject?.members || [];
                        return members;
                      })()}
                      currentUser={user}
                      cardMembers={getAssignees()}
                    />
                  </div>
                </div>

                {/* Comments */}
                <div className="bg-white p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-gray-900">
                      Comments ({card.comments.length})
                    </h3>
                  </div>

                  <div className="space-y-3 mb-6 pr-2">
                    {card.comments
                      .sort((a, b) => {
                        // Sort by updatedAt if available, otherwise by timestamp
                        const aTime = a.updatedAt || a.timestamp || a.createdAt;
                        const bTime = b.updatedAt || b.timestamp || b.createdAt;
                        return new Date(bTime) - new Date(aTime);
                      })
                      .map((comment) => {
                        // console.log("Rendering comment:", comment);
                        // console.log("Comment user:", comment.user);
                        return (
                          <div
                            key={comment._id || comment.id}
                            className="bg-gray-50 rounded-lg p-4 transition-colors duration-200 group"
                          >
                            <div className="flex items-center justify-between mb-2">
                              <div className="flex items-center space-x-3">
                                <Avatar
                                  user={comment.user}
                                  size="sm"
                                  fallback={
                                    comment.user?.name
                                      ? comment.user.name
                                        .charAt(0)
                                        .toUpperCase()
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
                                    {(() => {
                                      const date = new Date(comment.timestamp || comment.createdAt);

                                      const day = String(date.getDate()).padStart(2, "0");
                                      const month = date.toLocaleString("en-US", { month: "short" });
                                      const year = date.getFullYear();

                                      const time = date.toLocaleString("en-US", {
                                        hour: "2-digit",
                                        minute: "2-digit",
                                        hour12: true,
                                      });
                                      return `${day} ${month}, ${year}, ${time}`;
                                    })()}
                                    {comment.updatedAt &&
                                      comment.updatedAt !== comment.timestamp && (
                                        <span className="text-gray-400 ml-1">(edited)</span>
                                      )}
                                  </span>
                                </div>
                              </div>
                              {(comment.user?._id === user?._id ||
                                comment.user?._id === user?.id) &&
                                !isSystemComment(comment) && (
                                  <button
                                    onClick={() =>
                                      handleStartEditComment(comment)
                                    }
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
                                  onChange={(e) =>
                                    setEditCommentText(e.target.value)
                                  }
                                  className="w-full p-2 border border-gray-300 rounded-lg resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                  rows="3"
                                  placeholder="Edit your comment..."
                                />
                                <div className="flex space-x-2">
                                  <button
                                    onClick={handleSaveEditComment}
                                    className="px-3 py-1 bg-blue-500 text-white text-xs rounded hover:bg-blue-600 transition-colors"
                                  >
                                    Save
                                  </button>
                                  <button
                                    onClick={handleCancelEditComment}
                                    className="px-3 py-1 bg-gray-500 text-white text-xs rounded hover:bg-gray-600 transition-colors"
                                  >
                                    Cancel
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <div
                                className={`text-sm text-gray-700 prose prose-sm max-w-none ${(comment.text &&
                                  comment.text.includes(
                                    "moved this card from"
                                  )) ||
                                  (comment.text &&
                                    comment.text.includes("assigned")) ||
                                  (comment.text &&
                                    comment.text.includes("removed"))
                                  ? "activity-comment"
                                  : ""
                                  }`}
                                dangerouslySetInnerHTML={{
                                  __html:
                                    renderCommentWithMentions(comment.text) ||
                                    "<p><br></p>",
                                }}
                              />
                            )}
                          </div>
                        );
                      })}
                  </div>
                </div>
              </div>

              {/* Sidebar */}
              <div className="lg:col-span-1 space-y-6 max-h-[70vh] overflow-y-auto px-2">
                {/* Navigation Buttons */}
                <div className="flex items-center justify-between gap-2 pt-4">
                  <button
                    onClick={() => handleNavigateToCard(prevCard)}
                    disabled={!prevCard}
                    className={`flex items-center justify-center gap-1 px-2 py-1.5 rounded-md text-xs font-medium transition-colors duration-200 ${prevCard
                      ? "bg-gray-100 text-gray-700 hover:bg-gray-200"
                      : "bg-gray-50 text-gray-400 cursor-not-allowed"
                      }`}
                    title={prevCard ? "Previous card" : "No previous card"}
                  >
                    <ChevronLeft className="w-4 h-4" />
                    <span>Prev card</span>
                  </button>
                  <button
                    onClick={() => handleNavigateToCard(nextCard)}
                    disabled={!nextCard}
                    className={`flex items-center justify-center gap-1 px-2 py-1.5 rounded-md text-xs font-medium transition-colors duration-200 ${nextCard
                      ? "bg-gray-100 text-gray-700 hover:bg-gray-200"
                      : "bg-gray-50 text-gray-400 cursor-not-allowed"
                      }`}
                    title={nextCard ? "Next card" : "No next card"}
                  >
                    <span>Next card</span>
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>

                {/* Status */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Status
                    {isArchived && (
                      <span className="text-xs text-gray-500 ml-2 font-normal">
                        (Disabled for archived cards)
                      </span>
                    )}
                  </label>
                  <select
                    value={card.status}
                    onChange={(e) => handleStatusChange(e.target.value)}
                    className={`w-full p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm ${isArchived ? "bg-gray-100 cursor-not-allowed" : ""
                      }`}
                    disabled={loadingColumns || isArchived}
                  >
                    {loadingColumns ? (
                      <option value="">Loading columns...</option>
                    ) : allStatusOptions.length > 0 ? (
                      allStatusOptions.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))
                    ) : (
                      <option value="">No columns available</option>
                    )}
                  </select>
                </div>

                {/* Due Date */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Clock4 className="w-4 h-4 text-gray-700" />

                      <label className="text-sm font-semibold text-gray-700 flex items-center gap-1">
                        Due Date
                        {isArchived && (
                          <span className="text-xs text-gray-500 font-normal">
                            (Disabled for archived cards)
                          </span>
                        )}
                      </label>
                    </div>

                    {autoSaving && (
                      <span className="text-xs text-blue-600 flex items-center">
                        <svg
                          className="animate-spin h-3 w-3 mr-1"
                          xmlns="http://www.w3.org/2000/svg"
                          fill="none"
                          viewBox="0 0 24 24"
                        >
                          <circle
                            className="opacity-25"
                            cx="12"
                            cy="12"
                            r="10"
                            stroke="currentColor"
                            strokeWidth="4"
                          ></circle>
                          <path
                            className="opacity-75"
                            fill="currentColor"
                            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                          ></path>
                        </svg>
                        Saving...
                      </span>
                    )}
                  </div>
                  <div className="relative">
                    <input
                      ref={dateInputRef}
                      type="date"
                      value={formData.dueDate}
                      onChange={(e) =>
                        setFormData({ ...formData, dueDate: e.target.value })
                      }
                      className={`w-full p-2 pr-10 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm ${isArchived ? "bg-gray-100 cursor-not-allowed" : ""
                        }`}
                      style={{
                        colorScheme: formData.dueDate ? 'normal' : 'light',
                      }}
                      disabled={autoSaving || isArchived}
                    />
                    <style>{`
                      input[type="date"]::-webkit-calendar-picker-indicator {
                        opacity: 0;
                        position: absolute;
                        right: 0;
                        width: 100%;
                        height: 100%;
                        cursor: pointer;
                      }
                    `}</style>
                    {formData.dueDate && !isArchived ? (
                      <button
                        type="button"
                        onClick={() =>
                          setFormData({ ...formData, dueDate: "" })
                        }
                        className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-red-500 transition-colors"
                        title="Clear due date"
                        disabled={autoSaving}
                      >
                        <X className="w-4 h-4" />
                      </button>
                    ) : !isArchived ? (
                      <Calendar className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                    ) : null}
                  </div>
                  {/* <div className="p-2 bg-gray-50 rounded-lg">
                    <p className="text-gray-700 text-sm">
                      {card.dueDate
                        ? new Date(card.dueDate).toLocaleString()
                        : "No due date set"}
                    </p>
                  </div> */}
                </div>

                {/* Priority */}
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <AlertTriangle className="w-4 h-4 text-gray-700" />
                    <label className="text-sm font-semibold text-gray-700">
                      Priority
                    </label>
                  </div>

                  <div className="flex space-x-1">
                    {["low", "medium", "high"].map((priority) => (
                      <button
                        key={priority}
                        onClick={() => handleSetPriority(priority)}
                        className={`px-2 py-1 rounded text-xs font-medium ${card.priority === priority
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
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2 mb-2">
                      <Tag className="w-4 h-4 text-gray-700" />
                      <label className="block text-sm font-semibold text-gray-700">
                        Labels ({card.labels?.length || 0})
                      </label>
                    </div>
                    <div className="relative">
                      <button
                        ref={labelsButtonRef}
                        onClick={() => setShowLabelsModal(true)}
                        className="text-blue-600 hover:text-blue-800 text-xs font-medium"
                      >
                        Manage Labels
                      </button>
                      {/* Labels Dropdown */}
                      <LabelsDropdown
                        isOpen={showLabelsModal}
                        onClose={() => setShowLabelsModal(false)}
                        card={card}
                        onCardUpdated={onCardUpdated}
                        anchorRef={labelsButtonRef}
                      />
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-1 mb-2 max-h-32 overflow-y-auto">
                    {card.labels?.map((label) => {
                      let colorConfig = labelColors.find(
                        (c) => c.value === (label.color || "blue")
                      );

                      // Map light colors to their saturated equivalents for consistency
                      if (!colorConfig) {
                        colorConfig = labelColors.find(
                          (c) => c.value === "green"
                        );
                      } else if (label.color === "light-green") {
                        colorConfig = labelColors.find(
                          (c) => c.value === "green"
                        );
                      } else if (label.color === "light-yellow") {
                        colorConfig = labelColors.find(
                          (c) => c.value === "yellow"
                        );
                      }

                      return (
                        <span
                          key={label._id || label.id}
                          className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${colorConfig?.bg || "bg-blue-500"
                            } ${colorConfig?.text || "text-white"}`}
                        >
                          {label.name}
                          <button
                            onClick={() =>
                              handleRemoveLabel(label._id || label.id)
                            }
                            className="ml-1 hover:opacity-75 text-xs"
                          >
                            ×
                          </button>
                        </span>
                      );
                    })}
                  </div>

                  {card.labels?.length === 0 && (
                    <div className="text-center py-4 text-gray-500 text-xs">
                      No labels assigned
                    </div>
                  )}
                </div>

                {/* Assignees */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2 mb-2">
                      <UserPlus className="w-4 h-4 text-gray-700" />
                      <label className="text-sm font-semibold text-gray-700">
                        Members ({card.members?.length || 0})
                      </label>
                    </div>

                    <div className="relative">
                      <button
                        ref={membersButtonRef}
                        onClick={() => setShowAssignModal(true)}
                        className="text-blue-600 hover:text-blue-700 text-xs font-medium"
                      >
                        Manage
                      </button>
                      {/* Members Dropdown */}
                      <MembersDropdown
                        isOpen={showAssignModal}
                        onClose={() => setShowAssignModal(false)}
                        card={card}
                        onCardUpdated={onCardUpdated}
                        anchorRef={membersButtonRef}
                      />
                    </div>
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
                      <p className="text-gray-500 italic text-xs">
                        No assignees
                      </p>
                    )}
                  </div>
                </div>

                {/* File Attachments */}
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <Paperclip className="w-4 h-4 text-gray-700" />
                    <label className="text-sm font-semibold text-gray-700">
                      Documents ({getOtherAttachments().length})
                    </label>
                  </div>
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
                                ? new Date(
                                  attachment.uploadedAt
                                ).toLocaleString()
                                : "Unknown date"}
                            </p>
                          </div>
                          <div className="flex items-center space-x-1">
                            <a
                              href={
                                attachment?.url?.startsWith("http")
                                  ? attachment?.url
                                  : `${API_URL}${attachment?.url}`
                              }
                              onClick={(e) =>
                                handleViewAttachment(
                                  e,
                                  attachment?.url?.startsWith("http")
                                    ? attachment?.url
                                    : `${API_URL}${attachment?.url}`
                                )
                              }
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-600 hover:text-blue-800 text-xs"
                            >
                              View
                            </a>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setAttachmentToDelete({
                                  id: attachment._id || attachment.id,
                                  closeImageModal: false,
                                });
                                setShowDeleteAttachmentConfirm(true);
                              }}
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
                    {/* File Upload */}
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
                        Max 5 files, 25MB each. Supports images and documents.
                      </p>
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

                {/* Archive Card Button */}
                <div className="space-y-2">
                  {card.isArchived ? (
                    <>
                      <button
                        onClick={handleRestore}
                        disabled={loading}
                        className="w-full bg-green-600 text-white hover:bg-green-700 font-medium py-1 px-4 rounded-lg transition-colors duration-200 flex items-center justify-center space-x-2 text-sm disabled:opacity-50"
                        title="Restore card"
                      >
                        <RotateCcw className="w-4 h-4" />
                        <span>Restore Card</span>
                      </button>
                      <button
                        onClick={handleDelete}
                        disabled={loading}
                        className="w-full bg-red-600 text-white hover:bg-red-700 font-medium py-1 px-4 rounded-lg transition-colors duration-200 flex items-center justify-center space-x-2 text-sm disabled:opacity-50"
                        title="Permanently delete card"
                      >
                        <Trash2 className="w-4 h-4" />
                        <span>Delete</span>
                      </button>
                    </>
                  ) : (
                    // Hide Archive button when card is complete
                    !card.isComplete && (
                      <button
                        onClick={handleArchive}
                        className="w-full bg-[#4b6584] text-white hover:bg-[#778ca3] font-medium py-1 px-4 rounded-lg transition-colors duration-200 flex items-center justify-center space-x-2 text-sm"
                        title="Archive card"
                      >
                        <Archive className="w-4 h-4" />
                        <span>Archive Card</span>
                      </button>
                    )
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Drag Overlay */}
        {isDragging && (
          <div
            className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 m-0 bg-blue-600 bg-opacity-90 z-50 flex items-center justify-center pointer-events-none rounded-2xl"
            style={{ width: "40%", height: "30%" }}
          >
            <div className="text-center text-white">
              <Upload className="w-12 h-12 mx-auto mb-3 animate-bounce" />
              <p className="text-lg font-bold">Drop files here to upload</p>
              <p className="text-sm mt-1 opacity-90">
                Supports images and documents
              </p>
            </div>
          </div>
        )}

        {/* Upload Overlay */}
        {isUploading && (
          <div
            className="absolute top-0 left-0 right-0 bottom-0 m-0 bg-black bg-opacity-70 z-50 flex items-center justify-center pointer-events-none rounded-2xl"
            style={{ width: "100%", height: "100%" }}
          >
            <div className="text-center text-white">
              <div className="w-12 h-12 border-4 border-white border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
              <p className="text-lg font-semibold">Uploading files...</p>
              <p className="text-xs mt-1 opacity-80">Please wait</p>
            </div>
          </div>
        )}
      </div>

      // image carousel helpers moved above

      {/* Image Modal */}
      {showImageModal && (imageAttachments.length > 0 || selectedImage) && (
        <div className="modal-overlay bg-black bg-opacity-70">
          <div
            ref={imageModalRef}
            className="relative w-full h-full flex items-center justify-center"
          >
            {/* Close button */}
            <button
              onClick={() => setShowImageModal(false)}
              className="absolute top-0 right-0 z-50 p-2 rounded-full bg-black bg-opacity-60 text-white hover:bg-opacity-80"
              title="Close"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Prev / Next buttons */}
            {imageAttachments?.length > 1 && (
              <>
                <button
                  onClick={(e) => { e.stopPropagation(); showPrevImage(); }}
                  className="absolute left-6 bottom-5 z-50 -translate-y-1/2 p-3 rounded-full bg-black bg-opacity-40 text-white cursor-pointer"
                  title="Previous"
                >
                  <ChevronLeft className="w-6 h-6" />
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); showNextImage(); }}
                  className="absolute right-6 bottom-5 z-50 -translate-y-1/2 p-3 rounded-full bg-black bg-opacity-40 text-white cursor-pointer"
                  title="Next"
                >
                  <ChevronRight className="w-6 h-6" />
                </button>
              </>
            )}

            <div className="flex flex-col items-center space-y-4 px-4">
              <div className="w-full h-[85%] md:w-[85%] md:h-[85%] max-w-[100vw] max-h-[100vh] flex items-center justify-center">
                <img
                  src={
                    currentImage?.url && currentImage.url.startsWith("http")
                      ? currentImage.url
                      : `${API_URL}${currentImage?.url}`
                  }
                  alt={
                    currentImage?.originalName || currentImage?.filename || currentImage?.name
                  }
                  className="w-full h-full object-contain rounded-lg shadow-2xl"
                  onError={(e) => {
                    try {
                      showToast("Image attachment not found or removed", "error");
                    } catch (err) {}
                    e.target.src = "/placeholder-image.png"; // Fallback image
                  }}
                />
              </div>
            </div>

            {/* Actions bar (fixed bottom center) */}
            <div className="text-center my-4 fixed bottom-[2.9rem] left-0 right-0 -z-1 px-4">
              <h3 className="text-lg text-white font-bold">
                {currentImage?.originalName || currentImage?.filename || currentImage?.name}
              </h3>
              <p className="text-sm text-white font-semibold my-1">
                Added{" "}
                {currentImage?.uploadedAt &&
                  `${new Date(currentImage.uploadedAt).toLocaleString("en-US", {
                    month: "short",
                    day: "2-digit",
                    year: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                    hour12: true,
                  })} • `}
                {currentImage?.size &&
                  `${(currentImage?.size / 1024 / 1024).toFixed(2)} MB`}
              </p>
            </div>
            <div className="fixed bottom-4 left-0 right-0 -z-1 px-4">
              <div className="mx-auto flex w-fit items-center gap-3 rounded-lg p-2">

                {/* Open */}
                <a
                  href={
                    currentImage?.url && currentImage.url.startsWith("http")
                      ? currentImage.url
                      : `${API_URL}${currentImage?.url}`
                  }
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 px-3 py-2 rounded-md hover:bg-white/20 text-white text-sm font-bold"
                  title="Open in new tab"
                >
                  <MoveUpRight className="w-3 h-3" />
                  <span>Open in new tab</span>
                </a>
                
                {/* Download */}
                <a
                  href={
                    currentImage?.url && currentImage.url.startsWith("http")
                      ? currentImage.url
                      : `${API_URL}${currentImage?.url}`
                  }
                  target="_blank"
                  download={
                    currentImage?.originalName ||
                    currentImage?.filename ||
                    currentImage?.name
                  }
                  className="flex items-center gap-2 px-3 py-2 rounded-md hover:bg-white/20 text-white text-sm font-bold"
                  title="Download"
                >
                  <CloudDownload className="w-3 h-3" />
                  <span>Download</span>
                </a>
                
                {/* Delete */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    if (!currentImage) return;
                    setAttachmentToDelete({
                      id: currentImage._id || currentImage.id,
                      closeImageModal: true,
                    });
                    setShowDeleteAttachmentConfirm(true);
                  }}
                  className="flex items-center gap-2 px-3 py-2 rounded-md hover:bg-red-500/20 text-white text-sm font-bold"
                  title="Delete"
                >
                  <X className="w-3 h-3" />
                  <span>Delete</span>
                </button>
                
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Archive Card Confirmation Modal */}
      <ConfirmationModal
        isOpen={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        onConfirm={confirmArchive}
        title="Archive Card"
        message={`Are you sure you want to archive "${card.title}"? The card will be moved to the Archive column and can be restored later.`}
        confirmText="Archive Card"
        cancelText="Cancel"
        type="warning"
        isLoading={loading}
      />

      {/* Delete Card Confirmation Modal */}
      {showDeleteCardConfirm && (
        <ConfirmationModal
          isOpen={showDeleteCardConfirm}
          onClose={(e) => {
            // Prevent event propagation to card modal
            if (e) {
              e.stopPropagation();
            }
            if (!loading) {
              setShowDeleteCardConfirm(false);
            }
          }}
          onConfirm={(e) => {
            // Prevent event propagation to card modal
            if (e) {
              e.stopPropagation();
            }
            confirmDelete();
          }}
          title="Permanently Delete Card"
          message={`Are you sure you want to permanently delete "${card.title}"? This action cannot be undone and will remove the card from the database.`}
          confirmText="Delete Permanently"
          cancelText="Cancel"
          type="danger"
          isLoading={loading}
        />
      )}

      {/* Delete attachment confirmation modal */}
      <ConfirmationModal
        isOpen={showDeleteAttachmentConfirm}
        onClose={(e) => {
          if (e) {
            e.stopPropagation();
          }
          if (!deletingAttachment) {
            setShowDeleteAttachmentConfirm(false);
            setAttachmentToDelete(null);
          }
        }}
        onConfirm={(e) => {
          if (e) {
            e.stopPropagation();
          }
          confirmDeleteAttachment(e);
        }}
        title="Delete attachment?"
        message="Deleting an attachment is permanent. There is no undo."
        confirmText="Delete"
        cancelText="Cancel"
        type="danger"
        isLoading={deletingAttachment}
      />

      {/* Formatting Help Modal */}
      {showFormattingHelp && (
        <div className="modal-overlay">
          <div
            ref={formattingHelpModalRef}
            className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4"
          >
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">
                  Markdown Formatting Help
                </h3>
                <button
                  onClick={() => setShowFormattingHelp(false)}
                  className="p-1 rounded hover:bg-gray-100 transition-colors duration-200"
                >
                  <X className="w-5 h-5 text-gray-500" />
                </button>
              </div>

              <div className="space-y-3 text-sm">
                <div>
                  <code className="bg-gray-100 px-2 py-1 rounded text-xs">
                    **bold**
                  </code>
                  <span className="ml-2 text-gray-600">
                    → <strong>bold</strong>
                  </span>
                </div>
                <div>
                  <code className="bg-gray-100 px-2 py-1 rounded text-xs">
                    *italic*
                  </code>
                  <span className="ml-2 text-gray-600">
                    → <em>italic</em>
                  </span>
                </div>
                <div>
                  <code className="bg-gray-100 px-2 py-1 rounded text-xs">
                    ## Header
                  </code>
                  <span className="ml-2 text-gray-600">→ Header (larger)</span>
                </div>
                <div>
                  <code className="bg-gray-100 px-2 py-1 rounded text-xs">
                    - List item
                  </code>
                  <span className="ml-2 text-gray-600">→ • List item</span>
                </div>
                <div>
                  <code className="bg-gray-100 px-2 py-1 rounded text-xs">
                    [link](url)
                  </code>
                  <span className="ml-2 text-gray-600">
                    →{" "}
                    <a href="#" className="text-blue-600">
                      link
                    </a>
                  </span>
                </div>
                <div>
                  <code className="bg-gray-100 px-2 py-1 rounded text-xs">
                    ---
                  </code>
                  <span className="ml-2 text-gray-600">→ Horizontal rule</span>
                </div>
                <div className="pt-2 border-t border-gray-200">
                  <div className="flex items-center space-x-2">
                    <span className="text-xs font-medium text-gray-700">
                      🧹 Clear Formatting:
                    </span>
                    <span className="text-xs text-gray-600">
                      Removes all markdown from selected text
                    </span>
                  </div>
                </div>
              </div>

              <div className="mt-6 pt-4 border-t border-gray-200">
                <button
                  onClick={() => setShowFormattingHelp(false)}
                  className="w-full bg-blue-600 text-white hover:bg-blue-700 font-medium py-2 px-4 rounded-lg transition-colors duration-200"
                >
                  Got it!
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default CardModal;
