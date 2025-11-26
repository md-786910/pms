import React, { useState, useEffect, useRef } from "react";
import { MoreVertical, Edit2, Trash2, Plus, ArrowRight } from "lucide-react";
import { useDroppable } from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import CardItem from "./CardItem";
import ConfirmationModal from "./ConfirmationModal";

const ListColumn = React.memo(
  ({
    title,
    status,
    cards,
    color,
    bgColor,
    borderColor,
    textColor,
    onCardUpdated,
    onCardDeleted,
    onCardRestored,
    onStatusChange,
    onCardClick,
    projectId,
    onColumnRename,
    onColumnDelete,
    onAddCard,
    onMoveAllCards,
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

    textColor = `text-${color}-700`;
    bgColor = `bg-${color}-50`;
    borderColor = `border-${color}-200`;

    // Droppable component for column
    const ColumnDroppable = ({ status, children }) => {
      const { setNodeRef, isOver } = useDroppable({
        id: status,
        data: {
          type: "column",
          droppableType: "column",
          status: status,
        },
      });

      return (
        <div
          ref={setNodeRef}
          className={`transition-all duration-200 ${
            isOver
              ? "bg-blue-50 border-2 border-blue-400 border-dashed rounded-lg"
              : ""
          }`}
        >
          {children}
        </div>
      );
    };

    return (
      <div
        className={`bg-[#f1f2f4] rounded-lg border border-gray-200 h-[644px] transition-all duration-200 ${
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
                  className={`text-sm font-semibold ${textColor} uppercase tracking-wide flex-1 ${
                    status !== "archive"
                      ? "cursor-pointer hover:bg-gray-100"
                      : "cursor-not-allowed"
                  } px-2 py-1 rounded`}
                  onClick={() => {
                    if (status !== "archive") setIsEditing(true);
                  }}
                  title={
                    status !== "archive"
                      ? "Click to rename column"
                      : "Archive column cannot be renamed"
                  }
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
                onClick={() => status !== "archive" && setShowMenu(!showMenu)}
                className={`p-1.5 rounded ${
                  status !== "archive"
                    ? "hover:bg-gray-100 text-gray-400 hover:text-gray-600"
                    : "text-gray-300 cursor-not-allowed"
                } transition-colors duration-200`}
                title={
                  status !== "archive"
                    ? "Column actions"
                    : "Archive column actions are disabled"
                }
              >
                <MoreVertical className="w-4 h-4" />
              </button>

              {showMenu && status !== "archive" && (
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
                  {/* Only show delete button if column has no cards */}
                  {cards.length === 0 && (
                    <>
                      <div className="border-t border-gray-100 my-1"></div>
                      <button
                        onClick={handleDelete}
                        className="w-full text-left px-3 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center space-x-2"
                      >
                        <Trash2 className="w-4 h-4" />
                        <span>Delete Column</span>
                      </button>
                    </>
                  )}
                  {status !== "archive" && (
                    <>
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
                      {cards.length > 0 && onMoveAllCards && (
                        <>
                          <div className="border-t border-gray-100 my-1"></div>
                          <button
                            onClick={() => {
                              onMoveAllCards(status);
                              setShowMenu(false);
                            }}
                            className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center space-x-2"
                          >
                            <ArrowRight className="w-4 h-4" />
                            <span>Move all cards</span>
                          </button>
                        </>
                      )}
                    </>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Cards List */}
        <ColumnDroppable status={status}>
          <SortableContext
            items={cards.map((card) => card._id || card.id)}
            strategy={verticalListSortingStrategy}
          >
            <div className="p-3 space-y-3 h-[580px] overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-transparent">
              {cards.map((card) => (
                <CardItem
                  key={card._id || card.id}
                  card={card}
                  onCardUpdated={onCardUpdated}
                  onCardDeleted={onCardDeleted}
                  onCardRestored={onCardRestored}
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
          </SortableContext>
        </ColumnDroppable>

        {/* Add Card Button - Always Visible (except for Archive column) */}
        {status !== "archive" && (
          <div className="p-3 border-t border-gray-100">
            <button
              onClick={() => onAddCard(status)}
              className="w-full flex items-center justify-center space-x-2 py-2 px-3 text-sm text-white hover:text-white  rounded-lg transition-colors duration-200 border border-dashed border-gray-300 hover:border-gray-400 bg-[#4338ca] font-medium transition-all duration-300 hover:from-blue-400 hover:to-indigo-400
        hover:scale-105 hover:shadow-blue-500/40"
            >
              <Plus className="w-4 h-4" />
              <span>Add a card</span>
            </button>
          </div>
        )}

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
  },
  (prevProps, nextProps) => {
    // Custom comparison to prevent unnecessary re-renders
    // Compare primitive props
    if (
      prevProps.title !== nextProps.title ||
      prevProps.status !== nextProps.status ||
      prevProps.color !== nextProps.color ||
      prevProps.projectId !== nextProps.projectId
    ) {
      return false;
    }

    // Compare cards array - check if same cards in same order
    if (prevProps.cards.length !== nextProps.cards.length) {
      return false;
    }

    // Compare each card by ID and key properties that affect rendering
    for (let i = 0; i < prevProps.cards.length; i++) {
      const prevCard = prevProps.cards[i];
      const nextCard = nextProps.cards[i];
      if (
        prevCard._id !== nextCard._id ||
        prevCard.order !== nextCard.order ||
        prevCard.title !== nextCard.title ||
        prevCard.status !== nextCard.status ||
        prevCard.isArchived !== nextCard.isArchived ||
        prevCard.updatedAt !== nextCard.updatedAt
      ) {
        return false;
      }
    }

    // Props are equal, don't re-render
    return true;
  }
);

export default ListColumn;
