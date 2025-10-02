import React, { useState, useEffect, useRef } from "react";
import { MoreVertical, Edit2, Trash2, Plus } from "lucide-react";
import CardItem from "./CardItem";
import ConfirmationModal from "./ConfirmationModal";

const ListColumn = ({
  title,
  status,
  cards,
  color,
  bgColor,
  borderColor,
  textColor,
  onCardUpdated,
  onCardDeleted,
  onStatusChange,
  onCardClick,
  projectId,
  onColumnRename,
  onColumnDelete,
  onAddCard,
}) => {
  const [isHovered, setIsHovered] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [newTitle, setNewTitle] = useState(title);
  const menuRef = useRef(null);

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setShowMenu(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const handleRename = () => {
    if (newTitle.trim() && newTitle !== title) {
      onColumnRename(status, newTitle.trim());
    }
    setIsEditing(false);
  };

  const handleKeyPress = (e) => {
    if (e.key === "Enter") {
      handleRename();
    } else if (e.key === "Escape") {
      setNewTitle(title);
      setIsEditing(false);
    }
  };

  const handleDelete = () => {
    setShowDeleteConfirm(true);
    setShowMenu(false);
  };

  const confirmDelete = () => {
    onColumnDelete(status);
    setShowDeleteConfirm(false);
  };

  const handleAddCard = () => {
    onAddCard(status);
    setShowMenu(false);
  };

  return (
    <div
      className={`bg-gray-50 rounded-lg border border-gray-200 h-[600px] transition-all duration-200 ${
        isHovered ? "shadow-lg" : "shadow-sm"
      }`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Column Header */}
      <div className="p-4 border-b border-gray-200 bg-white rounded-t-lg">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3 flex-1">
            {isEditing ? (
              <input
                type="text"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                onBlur={handleRename}
                onKeyPress={handleKeyPress}
                className="text-sm font-semibold bg-transparent border-none outline-none focus:outline-none flex-1"
                autoFocus
              />
            ) : (
              <h3
                className={`text-sm font-semibold ${textColor} uppercase tracking-wide flex-1 cursor-pointer hover:bg-gray-100 px-2 py-1 rounded`}
                onClick={() => setIsEditing(true)}
                title="Click to rename column"
              >
                {title}
              </h3>
            )}
            <span
              className={`px-2 py-1 rounded-full text-xs font-medium ${textColor} bg-gray-100`}
            >
              {cards.length}
            </span>
          </div>

          <div className="relative" ref={menuRef}>
            <button
              onClick={() => setShowMenu(!showMenu)}
              className="p-1.5 rounded hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors duration-200"
            >
              <MoreVertical className="w-4 h-4" />
            </button>

            {showMenu && (
              <div className="absolute right-0 top-8 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-2 z-20">
                <button
                  onClick={() => {
                    setIsEditing(true);
                    setShowMenu(false);
                  }}
                  className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center space-x-2"
                >
                  <Edit2 className="w-4 h-4" />
                  <span>Rename Column</span>
                </button>
                <div className="border-t border-gray-100 my-1"></div>
                <button
                  onClick={handleDelete}
                  className="w-full text-left px-3 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center space-x-2"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>Delete Column</span>
                </button>
                <button
                  onClick={() => {
                    onAddCard(status);
                    setShowMenu(false);
                  }}
                  className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center space-x-2"
                >
                  <Plus className="w-4 h-4" />
                  <span>Add Card</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Cards List */}
      <div className="p-3 space-y-3 h-[540px] overflow-y-auto">
        {cards.map((card) => (
          <CardItem
            key={card._id || card.id}
            card={card}
            onCardUpdated={onCardUpdated}
            onCardDeleted={onCardDeleted}
            onStatusChange={onStatusChange}
            onCardClick={onCardClick}
            projectId={projectId}
          />
        ))}

        {/* Empty state for when no cards */}
        {cards.length === 0 && (
          <div className="text-center py-8">
            <div className="w-8 h-8 mx-auto mb-2 rounded-lg bg-gray-100 flex items-center justify-center">
              <span className="text-lg text-gray-400">📋</span>
            </div>
            <p className="text-xs text-gray-400">No cards yet</p>
          </div>
        )}
      </div>

      {/* Add Card Button - Always Visible */}
      <div className="p-3 border-t border-gray-100">
        <button
          onClick={() => onAddCard(status)}
          className="w-full flex items-center justify-center space-x-2 py-2 px-3 text-sm text-gray-600 hover:text-gray-800 hover:bg-gray-50 rounded-lg transition-colors duration-200 border border-dashed border-gray-300 hover:border-gray-400"
        >
          <Plus className="w-4 h-4" />
          <span>Add a card</span>
        </button>
      </div>

      {/* Delete Column Confirmation Modal */}
      <ConfirmationModal
        isOpen={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        onConfirm={confirmDelete}
        title="Delete Column"
        message={`Are you sure you want to delete the "${title}" column? All cards in this column will be moved to "To Do".`}
        confirmText="Delete Column"
        cancelText="Cancel"
        type="danger"
        isLoading={false}
      />
    </div>
  );
};

export default ListColumn;
