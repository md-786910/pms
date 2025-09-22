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

const CardItem = ({ card, onCardUpdated, onCardDeleted, onStatusChange }) => {
  const { users } = useUser();
  const { showToast } = useNotification();
  const [showModal, setShowModal] = useState(false);
  const [showActions, setShowActions] = useState(false);
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
    setShowModal(true);
  };

  const handleQuickDelete = async (e) => {
    e.stopPropagation();
    if (window.confirm("Are you sure you want to delete this card?")) {
      try {
        const { cardAPI } = await import("../utils/api");
        await cardAPI.deleteCard(card._id);
        onCardDeleted(card._id);
        showToast("Card deleted successfully!", "success");
      } catch (error) {
        showToast("Failed to delete card", "error");
      }
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
    setShowModal(true);
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
        {/* Card Header with Actions */}
        <div className="p-4 pb-2">
          <div className="flex items-start justify-between mb-2">
            {isEditingTitle ? (
              <input
                ref={titleInputRef}
                type="text"
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                onBlur={handleTitleSave}
                onKeyPress={handleTitleKeyPress}
                className="font-medium text-gray-900 text-sm leading-tight flex-1 pr-2 bg-transparent border-none outline-none focus:outline-none"
              />
            ) : (
              <h4
                className="font-medium text-gray-900 text-sm leading-tight cursor-pointer hover:text-blue-600 transition-colors duration-200 flex-1 pr-2"
                onClick={handleTitleEdit}
                title="Click to edit title"
              >
                {card.title}
              </h4>
            )}

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

          {/* Card Description */}
          {card.description && (
            <p className="text-xs text-gray-600 mb-3 line-clamp-2 leading-relaxed">
              {card.description}
            </p>
          )}
        </div>

        {/* Card Footer */}
        <div className="px-4 pb-4">
          {/* Labels/Tags */}
          <div className="flex flex-wrap gap-1 mb-3">
            {/* Priority Label */}
            {card.priority && (
              <span
                className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                  card.priority === "high"
                    ? "bg-red-100 text-red-700"
                    : card.priority === "medium"
                    ? "bg-yellow-100 text-yellow-700"
                    : "bg-green-100 text-green-700"
                }`}
              >
                <Tag className="w-3 h-3 mr-1" />
                {card.priority}
              </span>
            )}

            {/* Due Date */}
            {dueDateInfo && (
              <span
                className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${dueDateInfo.color}`}
              >
                <Calendar className="w-3 h-3 mr-1" />
                {dueDateInfo.text}
              </span>
            )}

            {/* Checklist Progress */}
            {card.checklists && card.checklists.length > 0 && (
              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
                <CheckSquare className="w-3 h-3 mr-1" />
                {card.checklists.reduce(
                  (acc, list) =>
                    acc + list.items.filter((item) => item.completed).length,
                  0
                )}
                /
                {card.checklists.reduce(
                  (acc, list) => acc + list.items.length,
                  0
                )}
              </span>
            )}
          </div>

          {/* Bottom Row */}
          <div className="flex items-center justify-between">
            {/* Left side - Comments and Attachments */}
            <div className="flex items-center space-x-3 text-xs text-gray-500">
              {card.comments.length > 0 && (
                <div className="flex items-center space-x-1">
                  <MessageSquare className="w-3.5 h-3.5" />
                  <span className="font-medium">{card.comments.length}</span>
                </div>
              )}
              {card.attachments.length > 0 && (
                <div className="flex items-center space-x-1">
                  <Paperclip className="w-3.5 h-3.5" />
                  <span className="font-medium">{card.attachments.length}</span>
                </div>
              )}
            </div>

            {/* Right side - Assignees */}
            {assignees.length > 0 && (
              <div className="flex -space-x-1">
                {assignees.slice(0, 3).map((user) => (
                  <div
                    key={user.id}
                    className={`w-6 h-6 rounded-full border-2 border-white flex items-center justify-center text-xs text-white font-medium shadow-sm ${user.color}`}
                    title={user.name}
                  >
                    {user.avatar}
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

        {/* Card Items Section */}
        {items.length > 0 && (
          <div className="px-4 pb-2">
            <div className="space-y-1">
              {items.map((item) => (
                <div
                  key={item._id}
                  className="flex items-center space-x-2 text-xs text-gray-600"
                >
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleToggleItem(item._id, item.completed);
                    }}
                    className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${
                      item.completed
                        ? "bg-green-500 border-green-500 text-white"
                        : "border-gray-300 hover:border-gray-400"
                    }`}
                  >
                    {item.completed && <CheckSquare className="w-3 h-3" />}
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
            </div>
          </div>
        )}

        {/* Add Item Section */}
        <div className="px-4 pb-4">
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
              className="w-full flex items-center space-x-1 text-xs text-gray-500 hover:text-gray-700 py-1 rounded hover:bg-gray-50 transition-colors"
            >
              <Plus className="w-3 h-3" />
              <span>Add an item</span>
            </button>
          )}
        </div>

        {/* Click overlay for opening modal */}
        <div
          className="absolute inset-0 cursor-pointer"
          onClick={() => setShowModal(true)}
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
    </>
  );
};

export default CardItem;
