import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  Calendar,
  MessageSquare,
  Paperclip,
  Edit2,
  Trash2,
  MoreVertical,
  UserPlus,
  Tag,
  CheckSquare,
  Plus,
  X,
} from "lucide-react";
import { useUser } from "../contexts/UserContext";
import { useNotification } from "../contexts/NotificationContext";
import { cardItemAPI } from "../utils/api";
import CardModal from "./CardModal";
import Avatar from "./Avatar";
import ConfirmationModal from "./ConfirmationModal";

const CardItem = ({
  card,
  onCardUpdated,
  onCardDeleted,
  onStatusChange,
  onCardClick,
  projectId,
}) => {
  const { users } = useUser();
  const { showToast } = useNotification();
  const [showModal, setShowModal] = useState(false);
  const [showActions, setShowActions] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [editTitle, setEditTitle] = useState(card.title);
  const [items, setItems] = useState([]);
  const [showAddItem, setShowAddItem] = useState(false);
  const [newItemTitle, setNewItemTitle] = useState("");
  const dropdownRef = useRef(null);
  const titleInputRef = useRef(null);
  const itemInputRef = useRef(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowActions(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  // Focus input when editing starts
  useEffect(() => {
    if (isEditingTitle && titleInputRef.current) {
      titleInputRef.current.focus();
      titleInputRef.current.select();
    }
  }, [isEditingTitle]);

  // Focus item input when adding item
  useEffect(() => {
    if (showAddItem && itemInputRef.current) {
      itemInputRef.current.focus();
    }
  }, [showAddItem]);

  const fetchItems = useCallback(async () => {
    try {
      const response = await cardItemAPI.getCardItems(card._id);
      setItems(response.data.items || []);
    } catch (error) {
      console.error("Error fetching card items:", error);
    }
  }, [card._id]);

  // Fetch card items
  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

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

  const formatDate = (dateString) => {
    if (!dateString) return null;
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = date - now;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays < 0) {
      return { text: "Overdue", color: "text-red-600 bg-red-100" };
    } else if (diffDays === 0) {
      return { text: "Due today", color: "text-orange-600 bg-orange-100" };
    } else if (diffDays === 1) {
      return { text: "Due tomorrow", color: "text-yellow-600 bg-yellow-100" };
    } else {
      return {
        text: `Due in ${diffDays} days`,
        color: "text-blue-600 bg-blue-100",
      };
    }
  };

  const getAssignees = () => {
    // If assignees are already populated objects, return them directly
    if (
      card.assignees &&
      card.assignees.length > 0 &&
      typeof card.assignees[0] === "object"
    ) {
      return card.assignees;
    }
    // Otherwise, map from user IDs
    return card.assignees
      .map((userId) => users.find((user) => user._id === userId))
      .filter(Boolean);
  };

  const handleQuickEdit = (e) => {
    e.stopPropagation();
    if (onCardClick) {
      onCardClick(card);
    } else {
      setShowModal(true);
    }
  };

  const handleQuickDelete = (e) => {
    e.stopPropagation();
    setShowDeleteConfirm(true);
  };

  const confirmQuickDelete = async () => {
    try {
      const { cardAPI } = await import("../utils/api");
      await cardAPI.deleteCard(card._id);
      onCardDeleted(card._id);
      showToast("Card deleted successfully!", "success");
    } catch (error) {
      showToast("Failed to delete card", "error");
    } finally {
      setShowDeleteConfirm(false);
    }
  };

  const handleQuickMove = (e, newStatus) => {
    e.stopPropagation();
    onStatusChange(card._id, newStatus);
    const statusLabels = {
      todo: "To Do",
      doing: "Doing",
      review: "Review",
      done: "Done",
    };
    showToast(`Card moved to ${statusLabels[newStatus]}`, "success");
  };

  const handleQuickAssign = (e) => {
    e.stopPropagation();
    if (onCardClick) {
      onCardClick(card);
    } else {
      setShowModal(true);
    }
  };

  const handleTitleEdit = (e) => {
    e.stopPropagation();
    setIsEditingTitle(true);
    setEditTitle(card.title);
  };

  const handleTitleSave = async () => {
    if (editTitle.trim() && editTitle !== card.title) {
      try {
        const { cardAPI } = await import("../utils/api");
        const response = await cardAPI.updateCard(card._id, {
          ...card,
          title: editTitle.trim(),
        });

        onCardUpdated(response.data.card);
        showToast("Card title updated!", "success");
      } catch (error) {
        console.error("Error updating title:", error);
        showToast("Failed to update title", "error");
      }
    }
    setIsEditingTitle(false);
  };

  const handleTitleKeyPress = (e) => {
    if (e.key === "Enter") {
      handleTitleSave();
    } else if (e.key === "Escape") {
      setEditTitle(card.title);
      setIsEditingTitle(false);
    }
  };

  const dueDateInfo = formatDate(card.dueDate);
  const assignees = getAssignees();

  return (
    <>
      <div
        className="bg-white rounded-lg shadow-sm border border-gray-200 hover:shadow-md hover:border-gray-300 transition-all duration-200 group relative"
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        {/* Card Header with Issue Number */}
        <div className="p-3 pb-2">
          <div className="flex items-start justify-between mb-2">
            <div className="flex-1">
              {isEditingTitle ? (
                <input
                  ref={titleInputRef}
                  type="text"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  onBlur={handleTitleSave}
                  onKeyPress={handleTitleKeyPress}
                  className="font-medium text-gray-900 text-sm leading-tight w-full bg-transparent border-none outline-none focus:outline-none"
                />
              ) : (
                <div>
                  <h4
                    className="font-medium text-gray-900 text-sm leading-tight cursor-pointer hover:text-blue-600 transition-colors duration-200 mb-1"
                    onClick={handleTitleEdit}
                    title="Click to edit title"
                  >
                    {card.title}
                  </h4>
                  {/* Issue Number and Priority */}
                  <div className="flex items-center space-x-2 text-xs text-gray-500">
                    <span className="bg-gray-100 px-2 py-0.5 rounded">
                      #{card._id?.slice(-4) || "0000"}
                    </span>
                    {card.priority && (
                      <span
                        className={`px-2 py-0.5 rounded text-xs ${
                          card.priority === "high"
                            ? "bg-red-100 text-red-700"
                            : card.priority === "medium"
                            ? "bg-yellow-100 text-yellow-700"
                            : "bg-green-100 text-green-700"
                        }`}
                      >
                        {card.priority}
                      </span>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Action Buttons - Show on Hover */}
            <div
              className={`flex items-center space-x-1 transition-opacity duration-200 ${
                isHovered ? "opacity-100" : "opacity-0"
              }`}
            >
              <button
                onClick={handleQuickEdit}
                className="p-1.5 rounded hover:bg-gray-100 text-gray-500 hover:text-gray-700 transition-colors duration-200"
                title="Edit card"
              >
                <Edit2 className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={handleQuickDelete}
                className="p-1.5 rounded hover:bg-red-100 text-gray-500 hover:text-red-600 transition-colors duration-200"
                title="Delete card"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
              <div className="relative" ref={dropdownRef}>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowActions(!showActions);
                  }}
                  className="p-1.5 rounded hover:bg-gray-100 text-gray-500 hover:text-gray-700 transition-colors duration-200"
                  title="More actions"
                >
                  <MoreVertical className="w-3.5 h-3.5" />
                </button>

                {/* Quick Actions Dropdown */}
                {showActions && (
                  <div className="absolute right-0 top-8 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-2 z-20">
                    <div className="px-3 py-2 text-xs font-medium text-gray-500 uppercase tracking-wide border-b border-gray-100">
                      Move to
                    </div>
                    <button
                      onClick={(e) => handleQuickMove(e, "todo")}
                      className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-700"
                    >
                      To Do
                    </button>
                    <button
                      onClick={(e) => handleQuickMove(e, "doing")}
                      className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-yellow-50 hover:text-yellow-700"
                    >
                      Doing
                    </button>
                    <button
                      onClick={(e) => handleQuickMove(e, "review")}
                      className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-purple-50 hover:text-purple-700"
                    >
                      Review
                    </button>
                    <button
                      onClick={(e) => handleQuickMove(e, "done")}
                      className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-green-50 hover:text-green-700"
                    >
                      Done
                    </button>
                    <div className="border-t border-gray-100 mt-1 pt-1">
                      <button
                        onClick={handleQuickAssign}
                        className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center space-x-2"
                      >
                        <UserPlus className="w-4 h-4" />
                        <span>Assign members</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Card Image or Description */}
          {(() => {
            // Debug: Log card attachments
            console.log("Card attachments:", card.attachments);
            console.log(
              "Card:",
              card.title,
              "has",
              card.attachments?.length || 0,
              "attachments"
            );

            // Get the first image attachment
            const firstImage = card.attachments?.find((attachment) => {
              console.log("Checking attachment:", attachment);
              // Check by MIME type first
              if (attachment.mimeType?.startsWith("image/")) {
                console.log("Found image by MIME type:", attachment.mimeType);
                return true;
              }
              // Check by file extension
              if (
                attachment.url?.match(
                  /\.(jpg|jpeg|png|gif|webp|svg|bmp|tiff|ico)$/i
                )
              ) {
                console.log("Found image by URL extension:", attachment.url);
                return true;
              }
              // Check by filename
              if (
                attachment.originalName?.match(
                  /\.(jpg|jpeg|png|gif|webp|svg|bmp|tiff|ico)$/i
                )
              ) {
                console.log(
                  "Found image by filename:",
                  attachment.originalName
                );
                return true;
              }
              return false;
            });

            console.log("First image found:", firstImage);

            if (firstImage) {
              // Construct proper image URL
              const imageUrl = firstImage.url.startsWith("http")
                ? firstImage.url
                : `http://localhost:5000${firstImage.url}`;

              console.log("Image URL:", imageUrl);

              return (
                <div className="mb-3 relative group cursor-pointer">
                  <img
                    src={imageUrl}
                    alt={firstImage.originalName || "Card attachment"}
                    className="w-full h-24 object-cover rounded-lg border border-gray-200 bg-gray-100 group-hover:opacity-90 transition-opacity duration-200"
                    loading="lazy"
                    onLoad={(e) => {
                      e.target.style.opacity = "1";
                      // Hide loading spinner
                      const spinner =
                        e.target.parentNode.querySelector(".loading-spinner");
                      if (spinner) spinner.style.display = "none";
                    }}
                    onError={(e) => {
                      e.target.style.display = "none";
                      // Hide loading spinner
                      const spinner =
                        e.target.parentNode.querySelector(".loading-spinner");
                      if (spinner) spinner.style.display = "none";
                      // Show description as fallback if image fails to load
                      const fallbackDiv = document.createElement("div");
                      fallbackDiv.className =
                        "text-xs text-gray-600 mb-3 line-clamp-2 leading-relaxed";
                      fallbackDiv.textContent = card.description || "";
                      e.target.parentNode.appendChild(fallbackDiv);
                    }}
                    style={{ opacity: 0, transition: "opacity 0.3s ease" }}
                  />
                  {/* Loading placeholder */}
                  <div className="loading-spinner absolute inset-0 bg-gray-100 rounded-lg border border-gray-200 flex items-center justify-center">
                    <div className="w-6 h-6 border-2 border-gray-300 border-t-blue-500 rounded-full animate-spin"></div>
                  </div>
                  {/* Hover overlay */}
                  <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-10 rounded-lg transition-all duration-200 flex items-center justify-center opacity-0 group-hover:opacity-100">
                    <div className="w-8 h-8 bg-white bg-opacity-90 rounded-full flex items-center justify-center">
                      <svg
                        className="w-4 h-4 text-gray-600"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7"
                        />
                      </svg>
                    </div>
                  </div>
                </div>
              );
            } else if (
              card.description &&
              card.description.trim() &&
              card.description !== "<p><br></p>" &&
              card.description !== "<p></p>"
            ) {
              console.log("No images found, showing description");
              return (
                <p className="text-xs text-gray-600 mb-3 line-clamp-2 leading-relaxed">
                  {card.description.replace(/<[^>]*>/g, "")}
                </p>
              );
            } else if (card.attachments && card.attachments.length > 0) {
              console.log(
                "Has attachments but no images, showing attachment count"
              );
              return (
                <div className="mb-3 p-2 bg-gray-50 rounded-lg border border-gray-200">
                  <div className="flex items-center space-x-2 text-xs text-gray-600">
                    <Paperclip className="w-3 h-3" />
                    <span>{card.attachments.length} attachment(s)</span>
                  </div>
                </div>
              );
            }
            console.log("No attachments or description found");
            return null;
          })()}
        </div>

        {/* Card Footer */}
        <div className="px-3 pb-3">
          {/* Bottom Row with Icons */}
          <div className="flex items-center justify-between">
            {/* Left side - Comments, Attachments, Labels */}
            <div className="flex items-center space-x-3 text-xs text-gray-500">
              {card.comments && card.comments.length > 0 && (
                <div className="flex items-center space-x-1">
                  <MessageSquare className="w-3.5 h-3.5" />
                  <span className="font-medium">{card.comments.length}</span>
                </div>
              )}
              {card.attachments && card.attachments.length > 0 && (
                <div className="flex items-center space-x-1">
                  <Paperclip className="w-3.5 h-3.5" />
                  <span className="font-medium">{card.attachments.length}</span>
                </div>
              )}
              {card.labels && card.labels.length > 0 && (
                <div className="flex items-center space-x-1">
                  <Tag className="w-3.5 h-3.5" />
                  <span className="font-medium">{card.labels.length}</span>
                </div>
              )}
              {dueDateInfo && (
                <div className="flex items-center space-x-1">
                  <Calendar className="w-3.5 h-3.5" />
                  <span className="font-medium">{dueDateInfo.text}</span>
                </div>
              )}
            </div>

            {/* Right side - Assignees */}
            {assignees.length > 0 && (
              <div className="flex -space-x-1">
                {assignees.slice(0, 3).map((user) => (
                  <div
                    key={user.id}
                    className="border-2 border-white shadow-sm rounded-full"
                  >
                    <Avatar user={user} size="xs" showTooltip={true} />
                  </div>
                ))}
                {assignees.length > 3 && (
                  <div className="w-6 h-6 bg-gray-300 rounded-full border-2 border-white flex items-center justify-center text-xs text-gray-600 font-medium shadow-sm">
                    +{assignees.length - 3}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Card Items Section with Progress */}
        {items.length > 0 && (
          <div className="px-3 pb-2">
            {/* Progress Bar */}
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-gray-500 font-medium">
                {items.filter((item) => item.completed).length}/{items.length}{" "}
                items
              </span>
              <div className="w-16 h-1 bg-gray-200 rounded-full overflow-hidden">
                <div
                  className="h-full bg-blue-500 transition-all duration-300"
                  style={{
                    width: `${
                      (items.filter((item) => item.completed).length /
                        items.length) *
                      100
                    }%`,
                  }}
                />
              </div>
            </div>

            {/* Items List */}
            <div className="space-y-1">
              {items.slice(0, 3).map((item) => (
                <div
                  key={item._id}
                  className="flex items-center space-x-2 text-xs text-gray-600"
                >
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleToggleItem(item._id, item.completed);
                    }}
                    className={`w-3 h-3 rounded border flex items-center justify-center transition-colors ${
                      item.completed
                        ? "bg-green-500 border-green-500 text-white"
                        : "border-gray-300 hover:border-gray-400"
                    }`}
                  >
                    {item.completed && <CheckSquare className="w-2 h-2" />}
                  </button>
                  <span
                    className={`flex-1 ${
                      item.completed ? "line-through text-gray-400" : ""
                    }`}
                  >
                    {item.title}
                  </span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteItem(item._id);
                    }}
                    className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-500 transition-all"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
              {items.length > 3 && (
                <p className="text-xs text-gray-400 pl-5">
                  +{items.length - 3} more items
                </p>
              )}
            </div>
          </div>
        )}

        {/* Add Item Section */}
        <div className="px-3 pb-3">
          {showAddItem ? (
            <div className="space-y-2">
              <input
                ref={itemInputRef}
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
                placeholder="Add an item..."
                className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                onClick={(e) => e.stopPropagation()}
              />
              <div className="flex space-x-1">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleAddItem();
                  }}
                  className="px-2 py-1 bg-blue-500 text-white text-xs rounded hover:bg-blue-600 transition-colors"
                >
                  Add
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowAddItem(false);
                    setNewItemTitle("");
                  }}
                  className="px-2 py-1 bg-gray-300 text-gray-700 text-xs rounded hover:bg-gray-400 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={(e) => {
                e.stopPropagation();
                setShowAddItem(true);
              }}
              className="w-full flex items-center space-x-1 text-xs text-gray-500 hover:text-gray-700 py-1 rounded hover:bg-gray-50 transition-colors opacity-0 group-hover:opacity-100"
            >
              <Plus className="w-3 h-3" />
              <span>Add an item</span>
            </button>
          )}
        </div>

        {/* Click overlay for opening modal */}
        <div
          className="absolute inset-0 cursor-pointer"
          onClick={() => {
            if (onCardClick) {
              onCardClick(card);
            } else {
              setShowModal(true);
            }
          }}
        />
      </div>

      {/* Card Modal */}
      {showModal && (
        <CardModal
          card={card}
          onClose={() => setShowModal(false)}
          onCardUpdated={onCardUpdated}
          onCardDeleted={onCardDeleted}
          onStatusChange={onStatusChange}
        />
      )}

      {/* Delete Card Confirmation Modal */}
      <ConfirmationModal
        isOpen={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        onConfirm={confirmQuickDelete}
        title="Delete Card"
        message={`Are you sure you want to delete "${card.title}"? This action cannot be undone.`}
        confirmText="Delete Card"
        cancelText="Cancel"
        type="danger"
        isLoading={false}
      />
    </>
  );
};

export default CardItem;
