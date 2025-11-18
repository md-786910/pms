import React, { useState, useEffect, useRef } from "react";
import {
  X,
  Search,
  Users,
  Calendar,
  Tag,
  Clock,
  ChevronDown,
  User,
} from "lucide-react";
import { useUser } from "../contexts/UserContext";
import Avatar from "./Avatar";

const FilterPanel = ({
  isOpen,
  onClose,
  cards,
  onFilterChange,
  columns,
  project,
}) => {
  const { users, user } = useUser();

  // Get project members (only users who are actual members of the project)
  const projectMembers = project?.members
    ? project.members
        .map((member) => {
          const userId =
            typeof member === "object" && member.user
              ? member.user._id || member.user.id || member.user
              : member;
          return users.find((u) => u._id === userId || u.id === userId);
        })
        .filter(Boolean)
    : [];
  const [keyword, setKeyword] = useState("");
  const [memberFilters, setMemberFilters] = useState({
    noMembers: false,
    assignedToMe: false,
    selectedMembers: [],
  });
  const [dueDateFilters, setDueDateFilters] = useState({
    noDates: false,
    overdue: false,
    dueInNextDay: false,
    dueInNextWeek: false,
    dueInNextMonth: false,
  });
  const [labelFilters, setLabelFilters] = useState([]);
  const [showMemberDropdown, setShowMemberDropdown] = useState(false);
  const [showLabelDropdown, setShowLabelDropdown] = useState(false);
  const memberDropdownRef = useRef(null);
  const labelDropdownRef = useRef(null);
  const modalRef = useRef(null);

  // Get all unique labels from cards with their colors
  const getAllLabels = () => {
    const labelMap = new Map();
    cards.forEach((card) => {
      if (card.labels) {
        card.labels.forEach((label) => {
          if (!labelMap.has(label.name)) {
            labelMap.set(label.name, {
              name: label.name,
              color: label.color || "green",
            });
          }
        });
      }
    });
    return Array.from(labelMap.values());
  };

  const allLabels = getAllLabels();

  // Label colors - matching other components
  const labelColors = [
    {
      value: "light-green",
      bg: "bg-green-300",
      text: "text-black",
    },
    { value: "green", bg: "bg-green-500", text: "text-white" },
    {
      value: "dark-green",
      bg: "bg-green-700",
      text: "text-white",
    },
    {
      value: "light-yellow",
      bg: "bg-yellow-300",
      text: "text-black",
    },
    { value: "yellow", bg: "bg-yellow-500", text: "text-black" },
    {
      value: "dark-yellow",
      bg: "bg-yellow-700",
      text: "text-white",
    },
    { value: "orange", bg: "bg-orange-500", text: "text-white" },
    { value: "red", bg: "bg-red-500", text: "text-white" },
    { value: "purple", bg: "bg-purple-500", text: "text-white" },
    { value: "pink", bg: "bg-pink-500", text: "text-white" },
    { value: "blue", bg: "bg-blue-500", text: "text-white" },
    { value: "gray", bg: "bg-gray-500", text: "text-white" },
  ];

  // Get label color config
  const getLabelColorConfig = (labelColor) => {
    let colorConfig = labelColors.find((c) => c.value === labelColor);

    // Map light colors to their saturated equivalents for consistency
    if (!colorConfig) {
      colorConfig = labelColors.find((c) => c.value === "green");
    } else if (labelColor === "light-green") {
      colorConfig = labelColors.find((c) => c.value === "green");
    } else if (labelColor === "light-yellow") {
      colorConfig = labelColors.find((c) => c.value === "yellow");
    }

    return colorConfig || labelColors.find((c) => c.value === "green");
  };

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        memberDropdownRef.current &&
        !memberDropdownRef.current.contains(event.target)
      ) {
        setShowMemberDropdown(false);
      }
      if (
        labelDropdownRef.current &&
        !labelDropdownRef.current.contains(event.target)
      ) {
        setShowLabelDropdown(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  // Handle click outside to close modal
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (event) => {
      if (modalRef.current && !modalRef.current.contains(event.target)) {
        onClose();
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen, onClose]);

  // Apply filters whenever filter states change
  useEffect(() => {
    applyFilters();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [keyword, memberFilters, dueDateFilters, labelFilters]);

  const applyFilters = () => {
    let filteredCards = [...cards];

    // Keyword filter
    if (keyword.trim()) {
      const searchTerm = keyword.toLowerCase();
      const searchTermTrimmed = keyword.trim();
      const searchTermWithoutHash = searchTermTrimmed.replace(/^#/, "");
      
      filteredCards = filteredCards.filter((card) => {
        // Check if query matches card number (handle "#27" or "27")
        const cardNumberStr = card.cardNumber?.toString() || "";
        const cardNumberMatch = 
          cardNumberStr === searchTermWithoutHash ||
          cardNumberStr.includes(searchTermWithoutHash) ||
          `#${cardNumberStr}`.toLowerCase().includes(searchTerm);
        
        const titleMatch = card.title?.toLowerCase().includes(searchTerm);
        const descriptionMatch = card.description
          ?.toLowerCase()
          .includes(searchTerm);
        const assigneeMatch = card.assignees?.some((assignee) => {
          const userId = typeof assignee === "object" ? assignee._id : assignee;
          const assigneeUser = users.find(
            (u) => u._id === userId || u.id === userId
          );
          return assigneeUser?.name?.toLowerCase().includes(searchTerm);
        });
        const labelMatch = card.labels?.some((label) =>
          label.name?.toLowerCase().includes(searchTerm)
        );
        return cardNumberMatch || titleMatch || descriptionMatch || assigneeMatch || labelMatch;
      });
    }

    // Member filters
    if (memberFilters.noMembers) {
      filteredCards = filteredCards.filter(
        (card) => !card.assignees || card.assignees.length === 0
      );
    }
    if (memberFilters.assignedToMe) {
      filteredCards = filteredCards.filter((card) =>
        card.assignees?.some((assignee) => {
          const userId = typeof assignee === "object" ? assignee._id : assignee;
          return userId === user?._id || userId === user?.id;
        })
      );
    }
    if (memberFilters.selectedMembers.length > 0) {
      filteredCards = filteredCards.filter((card) =>
        card.assignees?.some((assignee) => {
          const userId = typeof assignee === "object" ? assignee._id : assignee;
          return memberFilters.selectedMembers.includes(userId);
        })
      );
    }

    // Due date filters
    if (dueDateFilters.noDates) {
      filteredCards = filteredCards.filter((card) => !card.dueDate);
    }
    if (dueDateFilters.overdue) {
      const now = new Date();
      filteredCards = filteredCards.filter(
        (card) => card.dueDate && new Date(card.dueDate) < now
      );
    }
    if (dueDateFilters.dueInNextDay) {
      const now = new Date();
      const tomorrow = new Date(now);
      tomorrow.setDate(tomorrow.getDate() + 1);
      filteredCards = filteredCards.filter(
        (card) =>
          card.dueDate &&
          new Date(card.dueDate) >= now &&
          new Date(card.dueDate) <= tomorrow
      );
    }
    if (dueDateFilters.dueInNextWeek) {
      const now = new Date();
      const nextWeek = new Date(now);
      nextWeek.setDate(nextWeek.getDate() + 7);
      filteredCards = filteredCards.filter(
        (card) =>
          card.dueDate &&
          new Date(card.dueDate) >= now &&
          new Date(card.dueDate) <= nextWeek
      );
    }
    if (dueDateFilters.dueInNextMonth) {
      const now = new Date();
      const nextMonth = new Date(now);
      nextMonth.setMonth(nextMonth.getMonth() + 1);
      filteredCards = filteredCards.filter(
        (card) =>
          card.dueDate &&
          new Date(card.dueDate) >= now &&
          new Date(card.dueDate) <= nextMonth
      );
    }

    // Label filters
    if (labelFilters.length > 0) {
      filteredCards = filteredCards.filter((card) =>
        card.labels?.some((label) => labelFilters.includes(label.name))
      );
    }

    onFilterChange(filteredCards);
  };

  const handleMemberToggle = (memberId) => {
    setMemberFilters((prev) => ({
      ...prev,
      selectedMembers: prev.selectedMembers.includes(memberId)
        ? prev.selectedMembers.filter((id) => id !== memberId)
        : [...prev.selectedMembers, memberId],
    }));
  };

  const handleLabelToggle = (labelName) => {
    setLabelFilters((prev) =>
      prev.includes(labelName)
        ? prev.filter((name) => name !== labelName)
        : [...prev, labelName]
    );
  };

  const clearAllFilters = () => {
    setKeyword("");
    setMemberFilters({
      noMembers: false,
      assignedToMe: false,
      selectedMembers: [],
    });
    setDueDateFilters({
      noDates: false,
      overdue: false,
      dueInNextDay: false,
      dueInNextWeek: false,
      dueInNextMonth: false,
    });
    setLabelFilters([]);
  };

  const hasActiveFilters = () => {
    return (
      keyword.trim() ||
      memberFilters.noMembers ||
      memberFilters.assignedToMe ||
      memberFilters.selectedMembers.length > 0 ||
      dueDateFilters.noDates ||
      dueDateFilters.overdue ||
      dueDateFilters.dueInNextDay ||
      dueDateFilters.dueInNextWeek ||
      dueDateFilters.dueInNextMonth ||
      labelFilters.length > 0
    );
  };

  // Calculate counts for each filter option
  const getNoMembersCount = () => {
    return cards.filter(
      (card) => !card.assignees || card.assignees.length === 0
    ).length;
  };

  const getAssignedToMeCount = () => {
    return cards.filter((card) =>
      card.assignees?.some((assignee) => {
        const userId = typeof assignee === "object" ? assignee._id : assignee;
        return userId === user?._id || userId === user?.id;
      })
    ).length;
  };

  const getOverdueCount = () => {
    const now = new Date();
    return cards.filter((card) => card.dueDate && new Date(card.dueDate) < now)
      .length;
  };

  const getDueInNextDayCount = () => {
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    return cards.filter(
      (card) =>
        card.dueDate &&
        new Date(card.dueDate) >= now &&
        new Date(card.dueDate) <= tomorrow
    ).length;
  };

  const getDueInNextWeekCount = () => {
    const now = new Date();
    const nextWeek = new Date(now);
    nextWeek.setDate(nextWeek.getDate() + 7);
    return cards.filter(
      (card) =>
        card.dueDate &&
        new Date(card.dueDate) >= now &&
        new Date(card.dueDate) <= nextWeek
    ).length;
  };

  const getDueInNextMonthCount = () => {
    const now = new Date();
    const nextMonth = new Date(now);
    nextMonth.setMonth(nextMonth.getMonth() + 1);
    return cards.filter(
      (card) =>
        card.dueDate &&
        new Date(card.dueDate) >= now &&
        new Date(card.dueDate) <= nextMonth
    ).length;
  };

  const getNoDatesCount = () => {
    return cards.filter((card) => !card.dueDate).length;
  };

  const getLabelCount = (labelName) => {
    return cards.filter((card) =>
      card.labels?.some((label) => label.name === labelName)
    ).length;
  };

  return (
    <>
      {/* Filter Modal */}
      {isOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div
            ref={modalRef}
            className="bg-white rounded-lg shadow-2xl w-full max-w-md mx-4 max-h-[90vh] flex flex-col"
          >
            {/* Header */}
            <div className="p-4 border-b border-gray-200 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-t-lg">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold">Filter</h2>
                <button
                  onClick={onClose}
                  className="p-1 rounded hover:bg-white hover:bg-opacity-20 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-4 space-y-6">
              {/* Keyword */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Keyword
                </label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    value={keyword}
                    onChange={(e) => setKeyword(e.target.value)}
                    placeholder="Enter a keyword..."
                    className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                  />
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Search cards (#27), members, labels, and more.
                </p>
              </div>

              {/* Members */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Members
                </label>
                <div className="space-y-2">
                  <label className="flex items-center space-x-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={memberFilters.noMembers}
                      onChange={(e) =>
                        setMemberFilters((prev) => ({
                          ...prev,
                          noMembers: e.target.checked,
                        }))
                      }
                      className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    />
                    <User className="w-4 h-4 text-gray-400" />
                    <span className="text-sm text-gray-700">No members</span>
                    {memberFilters.noMembers && (
                      <span className="text-xs text-gray-500 ml-auto">
                        ({getNoMembersCount()})
                      </span>
                    )}
                  </label>
                  <label className="flex items-center space-x-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={memberFilters.assignedToMe}
                      onChange={(e) =>
                        setMemberFilters((prev) => ({
                          ...prev,
                          assignedToMe: e.target.checked,
                        }))
                      }
                      className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    />
                    <div className="flex items-center space-x-2 flex-1">
                      <Avatar user={user} size="xs" />
                      <span className="text-sm text-gray-700">
                        Cards assigned to me
                      </span>
                    </div>
                    {memberFilters.assignedToMe && (
                      <span className="text-xs text-gray-500">
                        ({getAssignedToMeCount()})
                      </span>
                    )}
                  </label>
                  <div className="relative" ref={memberDropdownRef}>
                    <button
                      onClick={() => setShowMemberDropdown(!showMemberDropdown)}
                      className="w-full flex items-center justify-between px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors text-sm"
                    >
                      <span className="text-gray-700">Select members</span>
                      <ChevronDown
                        className={`w-4 h-4 text-gray-400 transform transition-transform ${
                          showMemberDropdown ? "rotate-180" : ""
                        }`}
                      />
                    </button>
                    {showMemberDropdown && (
                      <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-10 max-h-60 overflow-y-auto">
                        {projectMembers.length > 0 ? (
                          projectMembers.map((u) => (
                            <label
                              key={u._id || u.id}
                              className="flex items-center space-x-2 px-3 py-2 hover:bg-gray-50 cursor-pointer"
                            >
                              <input
                                type="checkbox"
                                checked={memberFilters.selectedMembers.includes(
                                  u._id || u.id
                                )}
                                onChange={() =>
                                  handleMemberToggle(u._id || u.id)
                                }
                                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                              />
                              <Avatar user={u} size="xs" />
                              <span className="text-sm text-gray-700">
                                {u.name}
                              </span>
                            </label>
                          ))
                        ) : (
                          <div className="px-3 py-2 text-sm text-gray-500">
                            No project members found
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Due Date */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Due date
                </label>
                <div className="space-y-2">
                  <label className="flex items-center space-x-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={dueDateFilters.noDates}
                      onChange={(e) =>
                        setDueDateFilters((prev) => ({
                          ...prev,
                          noDates: e.target.checked,
                        }))
                      }
                      className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    />
                    <Calendar className="w-4 h-4 text-gray-400" />
                    <span className="text-sm text-gray-700">No dates</span>
                    {dueDateFilters.noDates && (
                      <span className="text-xs text-gray-500 ml-auto">
                        ({getNoDatesCount()})
                      </span>
                    )}
                  </label>
                  <label className="flex items-center space-x-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={dueDateFilters.overdue}
                      onChange={(e) =>
                        setDueDateFilters((prev) => ({
                          ...prev,
                          overdue: e.target.checked,
                        }))
                      }
                      className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    />
                    <Clock className="w-4 h-4 text-red-500" />
                    <span className="text-sm text-gray-700">Overdue</span>
                    {dueDateFilters.overdue && (
                      <span className="text-xs text-gray-500 ml-auto">
                        ({getOverdueCount()})
                      </span>
                    )}
                  </label>
                  <label className="flex items-center space-x-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={dueDateFilters.dueInNextDay}
                      onChange={(e) =>
                        setDueDateFilters((prev) => ({
                          ...prev,
                          dueInNextDay: e.target.checked,
                        }))
                      }
                      className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    />
                    <Clock className="w-4 h-4 text-yellow-500" />
                    <span className="text-sm text-gray-700">
                      Due in the next day
                    </span>
                    {dueDateFilters.dueInNextDay && (
                      <span className="text-xs text-gray-500 ml-auto">
                        ({getDueInNextDayCount()})
                      </span>
                    )}
                  </label>
                  <label className="flex items-center space-x-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={dueDateFilters.dueInNextWeek}
                      onChange={(e) =>
                        setDueDateFilters((prev) => ({
                          ...prev,
                          dueInNextWeek: e.target.checked,
                        }))
                      }
                      className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    />
                    <Clock className="w-4 h-4 text-gray-400" />
                    <span className="text-sm text-gray-700">
                      Due in the next week
                    </span>
                    {dueDateFilters.dueInNextWeek && (
                      <span className="text-xs text-gray-500 ml-auto">
                        ({getDueInNextWeekCount()})
                      </span>
                    )}
                  </label>
                  <label className="flex items-center space-x-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={dueDateFilters.dueInNextMonth}
                      onChange={(e) =>
                        setDueDateFilters((prev) => ({
                          ...prev,
                          dueInNextMonth: e.target.checked,
                        }))
                      }
                      className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    />
                    <Clock className="w-4 h-4 text-gray-400" />
                    <span className="text-sm text-gray-700">
                      Due in the next month
                    </span>
                    {dueDateFilters.dueInNextMonth && (
                      <span className="text-xs text-gray-500 ml-auto">
                        ({getDueInNextMonthCount()})
                      </span>
                    )}
                  </label>
                </div>
              </div>

              {/* Labels */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Labels
                </label>
                <div className="space-y-2">
                  {allLabels.length > 0 && (
                    <label className="flex items-center space-x-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={labelFilters.length === 0}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setLabelFilters([]);
                          }
                        }}
                        className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                      />
                      <Tag className="w-4 h-4 text-gray-400" />
                      <span className="text-sm text-gray-700">No labels</span>
                    </label>
                  )}
                  {allLabels.length > 0 && (
                    <div className="relative" ref={labelDropdownRef}>
                      <button
                        onClick={() => setShowLabelDropdown(!showLabelDropdown)}
                        className="w-full flex items-center justify-between px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors text-sm"
                      >
                        <span className="text-gray-700">Select labels</span>
                        <ChevronDown
                          className={`w-4 h-4 text-gray-400 transform transition-transform ${
                            showLabelDropdown ? "rotate-180" : ""
                          }`}
                        />
                      </button>
                      {showLabelDropdown && (
                        <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-10 max-h-60 overflow-y-auto">
                          {allLabels.map((label) => {
                            const colorConfig = getLabelColorConfig(
                              label.color
                            );
                            return (
                              <label
                                key={label.name}
                                className="flex items-center space-x-2 px-3 py-2 hover:bg-gray-50 cursor-pointer"
                              >
                                <input
                                  type="checkbox"
                                  checked={labelFilters.includes(label.name)}
                                  onChange={() => handleLabelToggle(label.name)}
                                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                                />
                                <span
                                  className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${colorConfig.bg} ${colorConfig.text}`}
                                >
                                  {label.name}
                                </span>
                                {labelFilters.includes(label.name) && (
                                  <span className="text-xs text-gray-500 ml-auto">
                                    ({getLabelCount(label.name)})
                                  </span>
                                )}
                              </label>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-gray-200 bg-gray-50 rounded-b-lg">
              {hasActiveFilters() && (
                <button
                  onClick={clearAllFilters}
                  className="w-full py-2 px-4 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors text-sm font-medium"
                >
                  Clear all filters
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default FilterPanel;
