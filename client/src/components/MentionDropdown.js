import React, { useState, useEffect, useRef } from "react";
import { User, Users } from "lucide-react";
import Avatar from "./Avatar";

const MentionDropdown = ({
  isOpen,
  position,
  onClose,
  onSelect,
  projectMembers,
  currentUser,
  cardMembers = [],
  mentionQuery = "",
}) => {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const dropdownRef = useRef(null);

  // Create mention options
  const mentionOptions = [
    // Individual users
    ...projectMembers.map((member) => ({
      type: "user",
      id: member.user._id,
      name: member.user.name,
      email: member.user.email,
      avatar: member.user.avatar,
      color: member.user.color,
      username: `@${member.user.name.toLowerCase().replace(/\s+/g, "")}`,
    })),
    // Group mentions
    {
      type: "group",
      id: "card",
      name: "All members on the card",
      username: "@card",
      icon: <Users className="w-4 h-4" />,
    },
    {
      type: "group",
      id: "board",
      name: "All members on the board",
      username: "@board",
      icon: <Users className="w-4 h-4" />,
    },
  ];

  // Filter options based on query and exclude current user
  const filteredOptions = mentionOptions.filter((option) => {
    // Exclude current user from individual mentions
    if (option.type === "user" && option.id === currentUser?._id) {
      return false;
    }

    // Filter by query if there's a search term
    if (mentionQuery && mentionQuery.length > 0) {
      const searchTerm = mentionQuery.toLowerCase();
      return (
        option.name.toLowerCase().includes(searchTerm) ||
        option.username.toLowerCase().includes(searchTerm) ||
        (option.type === "group" &&
          option.name.toLowerCase().includes(searchTerm))
      );
    }

    return true;
  });

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (!isOpen) return;

      switch (e.key) {
        case "ArrowDown":
          e.preventDefault();
          setSelectedIndex((prev) =>
            prev < filteredOptions.length - 1 ? prev + 1 : 0
          );
          break;
        case "ArrowUp":
          e.preventDefault();
          setSelectedIndex((prev) =>
            prev > 0 ? prev - 1 : filteredOptions.length - 1
          );
          break;
        case "Enter":
          e.preventDefault();
          if (filteredOptions[selectedIndex]) {
            onSelect(filteredOptions[selectedIndex]);
          }
          break;
        case "Escape":
          e.preventDefault();
          onClose();
          break;
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, selectedIndex, filteredOptions, onSelect, onClose]);

  useEffect(() => {
    if (isOpen) {
      setSelectedIndex(0);
    }
  }, [isOpen]);

  if (!isOpen || filteredOptions.length === 0) return null;

  return (
    <div
      ref={dropdownRef}
      className="z-50 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md shadow-xl overflow-y-auto animate-in fade-in-0 zoom-in-95 duration-200"
      style={{
        top: position.top,
        left: position.left,
        minWidth: "240px",
        maxWidth: "320px",
        maxHeight: "200px", // Limit height to prevent off-screen issues
        boxShadow:
          "0 8px 16px rgba(0, 0, 0, 0.12), 0 0 0 1px rgba(0, 0, 0, 0.05)",
      }}
    >
      <div className="py-1">
        {filteredOptions.map((option, index) => (
          <button
            key={`${option.type}-${option.id}`}
            onClick={() => onSelect(option)}
            className={`w-full px-3 py-2 text-left flex items-center space-x-3 transition-colors duration-75 ${
              index === selectedIndex
                ? "bg-blue-500 text-white"
                : "hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-900 dark:text-gray-100"
            }`}
          >
            {option.type === "user" ? (
              <>
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium ${
                    index === selectedIndex
                      ? "bg-white text-blue-500"
                      : "bg-blue-500 text-white"
                  }`}
                >
                  {option.name
                    .split(" ")
                    .map((n) => n[0])
                    .join("")
                    .toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div
                    className={`text-sm font-medium truncate ${
                      index === selectedIndex ? "text-white" : "text-gray-900 dark:text-gray-100"
                    }`}
                  >
                    {option.name}
                  </div>
                  <div
                    className={`text-xs truncate ${
                      index === selectedIndex
                        ? "text-blue-100"
                        : "text-gray-500 dark:text-gray-400"
                    }`}
                  >
                    {option.username}
                  </div>
                </div>
              </>
            ) : (
              <>
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center ${
                    index === selectedIndex
                      ? "bg-white text-blue-500"
                      : "bg-gray-300 dark:bg-gray-600 text-gray-600 dark:text-gray-300"
                  }`}
                >
                  {option.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <div
                    className={`text-sm font-medium truncate ${
                      index === selectedIndex ? "text-white" : "text-gray-900 dark:text-gray-100"
                    }`}
                  >
                    {option.name}
                  </div>
                  <div
                    className={`text-xs truncate ${
                      index === selectedIndex
                        ? "text-blue-100"
                        : "text-gray-500 dark:text-gray-400"
                    }`}
                  >
                    {option.username}
                  </div>
                </div>
              </>
            )}
          </button>
        ))}
      </div>
    </div>
  );
};

export default MentionDropdown;
