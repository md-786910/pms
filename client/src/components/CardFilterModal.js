import React, { useState, useEffect } from "react";
import { X, User, Calendar, Tag } from "lucide-react";
import { useUser } from "../contexts/UserContext";
import Avatar from "./Avatar";

// Color mapping for label colors
const colorMap = {
  blue: "#3B82F6",
  red: "#EF4444",
  green: "#10B981",
  yellow: "#F59E0B",
  orange: "#F97316",
  purple: "#8B5CF6",
  pink: "#EC4899",
  gray: "#6B7280",
  indigo: "#6366F1",
  teal: "#14B8A6",
};

const CardFilterModal = ({
  isOpen,
  onClose,
  cards,
  columns,
  onFilterChange,
}) => {
  const { user, users } = useUser();
  const [keyword, setKeyword] = useState("");
  const [selectedMembers, setSelectedMembers] = useState([]);
  const [showMemberDropdown, setShowMemberDropdown] = useState(false);
  const [dueDateFilter, setDueDateFilter] = useState(null);
  const [selectedLabels, setSelectedLabels] = useState([]);
  const [noLabelsSelected, setNoLabelsSelected] = useState(false);

  // Extract unique labels from cards
  const availableLabels = React.useMemo(() => {
    const labelMap = new Map();
    cards.forEach((card) => {
      if (card.labels && card.labels.length > 0) {
        card.labels.forEach((label) => {
          // Use label ID if available, otherwise use name+color as unique key
          const labelId =
            label._id || label.id || `${label.name}-${label.color}`;
          if (!labelMap.has(labelId)) {
            labelMap.set(labelId, {
              ...label,
              _id: labelId,
            });
          }
        });
      }
    });
    return Array.from(labelMap.values());
  }, [cards]);

  // Get all members who are assigned to cards
  const availableMembers = React.useMemo(() => {
    const memberSet = new Set();
    cards.forEach((card) => {
      if (card.assignees && card.assignees.length > 0) {
        card.assignees.forEach((assignee) => {
          const userId = typeof assignee === "object" ? assignee._id : assignee;
          memberSet.add(userId);
        });
      }
    });
    return Array.from(memberSet)
      .map((userId) => users.find((u) => u._id === userId))
      .filter(Boolean);
  }, [cards, users]);

  // Apply filters
  useEffect(() => {
    if (!isOpen) return;

    // Check if any filters are active
    const hasFilters =
      keyword.trim() ||
      selectedMembers.length > 0 ||
      dueDateFilter !== null ||
      selectedLabels.length > 0 ||
      noLabelsSelected;

    // If no filters are active, show all cards (by passing null)
    if (!hasFilters) {
      onFilterChange(null);
      return;
    }

    const filteredCards = cards.filter((card) => {
      // Keyword filter
      if (keyword.trim()) {
        const keywordLower = keyword.toLowerCase();
        const keywordTrimmed = keyword.trim();
        const keywordWithoutHash = keywordTrimmed.replace(/^#/, "");
        
        // Check if query matches card number (handle "#27" or "27")
        const cardNumberStr = card.cardNumber?.toString() || "";
        const cardNumberMatch = 
          cardNumberStr === keywordWithoutHash ||
          cardNumberStr.includes(keywordWithoutHash) ||
          `#${cardNumberStr}`.toLowerCase().includes(keywordLower);
        
        const matchesKeyword =
          cardNumberMatch ||
          card.title?.toLowerCase().includes(keywordLower) ||
          card.description?.toLowerCase().includes(keywordLower) ||
          card.labels?.some((label) =>
            label.name?.toLowerCase().includes(keywordLower)
          ) ||
          card.assignees?.some((assignee) => {
            const userObj = users.find(
              (u) =>
                u._id ===
                (typeof assignee === "object" ? assignee._id : assignee)
            );
            return userObj?.name?.toLowerCase().includes(keywordLower);
          });

        if (!matchesKeyword) return false;
      }

      // Member filter
      if (selectedMembers.length > 0) {
        const hasNoMembers = selectedMembers.includes("no-members");
        const assignedToMe = selectedMembers.includes("me");
        const hasSpecificMembers = selectedMembers.filter(
          (m) => m !== "no-members" && m !== "me"
        );

        const cardAssignees = card.assignees || [];
        const cardAssigneeIds = cardAssignees.map((a) =>
          typeof a === "object" ? a._id : a
        );

        let matchesMember = false;

        if (hasNoMembers && cardAssigneeIds.length === 0) {
          matchesMember = true;
        }
        if (assignedToMe && cardAssigneeIds.includes(user?._id)) {
          matchesMember = true;
        }
        if (
          hasSpecificMembers.length > 0 &&
          hasSpecificMembers.some((memberId) =>
            cardAssigneeIds.includes(memberId)
          )
        ) {
          matchesMember = true;
        }

        if (!matchesMember) return false;
      }

      // Due date filter
      if (dueDateFilter !== null && card.dueDate) {
        const now = new Date();
        const dueDate = new Date(card.dueDate);
        const diffTime = dueDate - now;
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        switch (dueDateFilter) {
          case "overdue":
            if (diffDays >= 0) return false;
            break;
          case "today":
            if (diffDays !== 0) return false;
            break;
          case "week":
            if (diffDays < 0 || diffDays > 7) return false;
            break;
          case "month":
            if (diffDays < 0 || diffDays > 30) return false;
            break;
          default:
            break;
        }
      } else if (dueDateFilter === "no-dates" && card.dueDate) {
        return false;
      }

      // Label filter
      if (selectedLabels.length > 0 || noLabelsSelected) {
        const cardLabelIds =
          card.labels?.map((l) => l._id || l.id || `${l.name}-${l.color}`) ||
          [];
        const hasLabels = cardLabelIds.length > 0;

        if (noLabelsSelected && hasLabels) return false;
        if (
          selectedLabels.length > 0 &&
          !selectedLabels.some((labelId) => cardLabelIds.includes(labelId))
        )
          return false;
      }

      return true;
    });

    onFilterChange(filteredCards);
  }, [
    keyword,
    selectedMembers,
    dueDateFilter,
    selectedLabels,
    noLabelsSelected,
    cards,
    users,
    user,
    isOpen,
    onFilterChange,
  ]);

  const handleMemberToggle = (memberId) => {
    setSelectedMembers((prev) =>
      prev.includes(memberId)
        ? prev.filter((id) => id !== memberId)
        : [...prev, memberId]
    );
  };

  const handleLabelToggle = (labelId) => {
    setSelectedLabels((prev) =>
      prev.includes(labelId)
        ? prev.filter((id) => id !== labelId)
        : [...prev, labelId]
    );
  };

  const handleClearFilters = () => {
    setKeyword("");
    setSelectedMembers([]);
    setDueDateFilter(null);
    setSelectedLabels([]);
    setNoLabelsSelected(false);
  };

  const hasActiveFilters =
    keyword.trim() ||
    selectedMembers.length > 0 ||
    dueDateFilter !== null ||
    selectedLabels.length > 0 ||
    noLabelsSelected;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-md max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-2 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Filter</h2>
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-6">
          {/* Keyword */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Keyword
            </label>
            <input
              type="text"
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              placeholder="Enter a keyword..."
              className="w-full px-3 py-2 border border-blue-500 dark:border-blue-400 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder:text-gray-400 dark:placeholder:text-gray-500"
            />
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              Search cards (#27), members, labels, and more.
            </p>
          </div>

          {/* Members */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Members
            </label>
            <div className="space-y-2">
              <label className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={selectedMembers.includes("no-members")}
                  onChange={() => handleMemberToggle("no-members")}
                  className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                />
                <User className="w-4 h-4 text-gray-400 dark:text-gray-500" />
                <span className="text-sm text-gray-700 dark:text-gray-300">No members</span>
              </label>

              <label className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={selectedMembers.includes("me")}
                  onChange={() => handleMemberToggle("me")}
                  className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                />
                <div className="w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center text-white text-xs font-medium">
                  {user?.name?.charAt(0)?.toUpperCase() || "?"}
                </div>
                <span className="text-sm text-gray-700 dark:text-gray-300">
                  Cards assigned to me
                </span>
              </label>

              {availableMembers.length > 0 && (
                <div className="relative">
                  <button
                    onClick={() => setShowMemberDropdown(!showMemberDropdown)}
                    className="w-full flex items-center justify-between p-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 bg-white dark:bg-gray-700"
                  >
                    <span className="text-sm text-gray-700 dark:text-gray-300">
                      Select members
                    </span>
                    <ChevronDown
                      className={`w-4 h-4 text-gray-500 dark:text-gray-400 transition-transform ${
                        showMemberDropdown ? "transform rotate-180" : ""
                      }`}
                    />
                  </button>

                  {showMemberDropdown && (
                    <div className="absolute z-10 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                      {availableMembers.map((member) => (
                        <label
                          key={member._id}
                          className="flex items-center space-x-2 p-2 hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer"
                        >
                          <input
                            type="checkbox"
                            checked={selectedMembers.includes(member._id)}
                            onChange={() => handleMemberToggle(member._id)}
                            className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                          />
                          <Avatar user={member} size="sm" />
                          <span className="text-sm text-gray-700 dark:text-gray-300">
                            {member.name}
                          </span>
                        </label>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Due Date */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Due date
            </label>
            <div className="space-y-2">
              <label className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={dueDateFilter === "no-dates"}
                  onChange={() =>
                    setDueDateFilter(
                      dueDateFilter === "no-dates" ? null : "no-dates"
                    )
                  }
                  className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                />
                <Calendar className="w-4 h-4 text-gray-400 dark:text-gray-500" />
                <span className="text-sm text-gray-700 dark:text-gray-300">No dates</span>
              </label>

              <label className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={dueDateFilter === "overdue"}
                  onChange={() =>
                    setDueDateFilter(
                      dueDateFilter === "overdue" ? null : "overdue"
                    )
                  }
                  className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                />
                <div className="w-5 h-5 bg-red-500 rounded-full flex items-center justify-center">
                  <Calendar className="w-3 h-3 text-white" />
                </div>
                <span className="text-sm text-gray-700 dark:text-gray-300">Overdue</span>
              </label>

              <label className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={dueDateFilter === "today"}
                  onChange={() =>
                    setDueDateFilter(dueDateFilter === "today" ? null : "today")
                  }
                  className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                />
                <div className="w-5 h-5 bg-yellow-500 rounded-full flex items-center justify-center">
                  <Calendar className="w-3 h-3 text-white" />
                </div>
                <span className="text-sm text-gray-700 dark:text-gray-300">
                  Due in the next day
                </span>
              </label>

              <label className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={dueDateFilter === "week"}
                  onChange={() =>
                    setDueDateFilter(dueDateFilter === "week" ? null : "week")
                  }
                  className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                />
                <div className="w-5 h-5 bg-gray-400 rounded-full flex items-center justify-center">
                  <Calendar className="w-3 h-3 text-white" />
                </div>
                <span className="text-sm text-gray-700 dark:text-gray-300">
                  Due in the next week
                </span>
              </label>

              <label className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={dueDateFilter === "month"}
                  onChange={() =>
                    setDueDateFilter(dueDateFilter === "month" ? null : "month")
                  }
                  className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                />
                <div className="w-5 h-5 bg-gray-400 rounded-full flex items-center justify-center">
                  <Calendar className="w-3 h-3 text-white" />
                </div>
                <span className="text-sm text-gray-700 dark:text-gray-300">
                  Due in the next month
                </span>
              </label>
            </div>
          </div>

          {/* Labels */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Labels
            </label>
            <div className="space-y-2">
              <label className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={noLabelsSelected}
                  onChange={() => {
                    setNoLabelsSelected(!noLabelsSelected);
                    // If selecting "no labels", clear other label selections
                    if (!noLabelsSelected) {
                      setSelectedLabels([]);
                    }
                  }}
                  className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                />
                <Tag className="w-4 h-4 text-gray-400 dark:text-gray-500" />
                <span className="text-sm text-gray-700 dark:text-gray-300">No labels</span>
              </label>

              {availableLabels.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {availableLabels.map((label) => {
                    // Get the actual color value from the color map
                    const actualColor = colorMap[label.color] || label.color;
                    const labelId =
                      label._id || label.id || `${label.name}-${label.color}`;
                    return (
                      <label
                        key={labelId}
                        className="flex items-center space-x-2 cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          checked={selectedLabels.includes(labelId)}
                          onChange={() => {
                            handleLabelToggle(labelId);
                            // If selecting a specific label, uncheck "no labels"
                            if (!selectedLabels.includes(labelId)) {
                              setNoLabelsSelected(false);
                            }
                          }}
                          className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                        />
                        <div className="flex items-center space-x-1">
                          <div
                            className="w-8 h-4 rounded border border-gray-300 dark:border-gray-600"
                            style={{ backgroundColor: actualColor }}
                          />
                          <span className="text-sm text-gray-700 dark:text-gray-300">
                            {label.name}
                          </span>
                        </div>
                      </label>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-gray-200 dark:border-gray-700 p-4 flex justify-end">
          {hasActiveFilters && (
            <button
              onClick={handleClearFilters}
              className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 transition-colors"
            >
              Clear all filters
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

// Helper component for ChevronDown icon
const ChevronDown = ({ className }) => (
  <svg
    className={className}
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M19 9l-7 7-7-7"
    />
  </svg>
);

export default CardFilterModal;
