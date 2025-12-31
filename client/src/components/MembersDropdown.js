import React, { useState, useEffect, useRef } from "react";
import { X, Check, Search } from "lucide-react";
import { useNotification } from "../contexts/NotificationContext";
import { useProject } from "../contexts/ProjectContext";
import { cardAPI } from "../utils/api";
import Avatar from "./Avatar";

const MembersDropdown = ({
  isOpen,
  onClose,
  card,
  onCardUpdated,
  anchorRef,
}) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedMembers, setSelectedMembers] = useState(new Set());
  const [togglingMember, setTogglingMember] = useState(null);
  const { showToast } = useNotification();
  const { currentProject } = useProject();
  const dropdownRef = useRef(null);

  // Get project members
  const projectMembers = currentProject?.members || [];

  // Initialize selected members from card - only when dropdown opens
  useEffect(() => {
    if (isOpen && card) {
      const memberIds = card.members?.map((member) => {
        if (typeof member === "object") {
          return member._id || member.id;
        }
        return member;
      }) || [];
      setSelectedMembers(new Set(memberIds));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  // Reset state when dropdown closes
  useEffect(() => {
    if (!isOpen) {
      setSearchTerm("");
    }
  }, [isOpen]);

  // Click outside to close
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        if (anchorRef?.current && anchorRef.current.contains(event.target)) {
          return;
        }
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen, onClose, anchorRef]);

  // Filter members by search term
  const filteredMembers = projectMembers.filter((memberObj) => {
    const user = memberObj?.user;
    if (!user) return false;
    const name = user.name || "";
    const email = user.email || "";
    const search = searchTerm.toLowerCase();
    return name.toLowerCase().includes(search) || email.toLowerCase().includes(search);
  });

  const handleMemberToggle = async (user, e) => {
    e.stopPropagation();
    const userId = user._id || user.id;
    const isCurrentlySelected = selectedMembers.has(userId);
    setTogglingMember(userId);

    try {
      if (isCurrentlySelected) {
        // Remove member from card
        const response = await cardAPI.unassignUser(card._id, userId);
        if (response.data.success) {
          setSelectedMembers((prev) => {
            const newSet = new Set(prev);
            newSet.delete(userId);
            return newSet;
          });
          onCardUpdated(response.data.card);
        }
      } else {
        // Add member to card
        const response = await cardAPI.assignUser(card._id, userId);
        if (response.data.success) {
          setSelectedMembers((prev) => new Set([...prev, userId]));
          onCardUpdated(response.data.card);
        }
      }
    } catch (error) {
      console.error("Error toggling member:", error);
      showToast("Failed to update member", "error");
    } finally {
      setTogglingMember(null);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      ref={dropdownRef}
      className="absolute right-0 top-full mt-1 w-72 bg-white rounded-lg shadow-xl border border-gray-200 z-50 overflow-hidden animate-slideDownFade"
      onClick={(e) => e.stopPropagation()}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b bg-gray-50">
        <span className="text-sm font-semibold text-gray-700">Members</span>
        <button
          onClick={onClose}
          className="p-1 hover:bg-gray-200 rounded transition-colors"
        >
          <X className="w-4 h-4 text-gray-500" />
        </button>
      </div>

      {/* Search */}
      <div className="px-3 py-2 border-b">
        <div className="relative">
          <Search className="w-4 h-4 text-gray-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search members..."
            className="w-full pl-8 pr-2.5 py-1.5 text-sm border border-gray-200 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>
      </div>

      {/* Members List */}
      <div className="max-h-64 overflow-y-auto">
        {filteredMembers.length === 0 ? (
          <div className="px-3 py-4 text-center text-sm text-gray-500">
            No members found
          </div>
        ) : (
          filteredMembers.map((memberObj) => {
            const user = memberObj?.user;
            if (!user) return null;

            const userId = user._id || user.id;
            const isSelected = selectedMembers.has(userId);
            const isToggling = togglingMember === userId;

            return (
              <button
                key={userId}
                onClick={(e) => handleMemberToggle(user, e)}
                disabled={isToggling}
                className={`w-full flex items-center gap-3 px-3 py-2 hover:bg-gray-50 transition-colors ${
                  isToggling ? "opacity-50" : ""
                } ${isSelected ? "bg-blue-50" : ""}`}
              >
                {/* Checkmark indicator */}
                <div className="w-5 flex-shrink-0">
                  {isSelected && (
                    <Check className="w-4 h-4 text-blue-600" />
                  )}
                </div>
                <Avatar user={user} size="sm" />
                <div className="flex-1 text-left min-w-0">
                  <p className={`text-sm font-medium truncate ${isSelected ? "text-blue-900" : "text-gray-900"}`}>
                    {user.name || "Unknown"}
                  </p>
                  <p className="text-xs text-gray-500 truncate">
                    {user.email}
                  </p>
                </div>
                {memberObj.role && (
                  <span
                    className={`text-xs px-1.5 py-0.5 rounded ${
                      memberObj.role === "admin"
                        ? "bg-red-100 text-red-700"
                        : "bg-blue-100 text-blue-700"
                    }`}
                  >
                    {memberObj.role}
                  </span>
                )}
              </button>
            );
          })
        )}
      </div>

      {/* Footer */}
      <div className="px-3 py-2 border-t bg-gray-50">
        <p className="text-xs text-gray-500 text-center">
          Click to toggle member assignment
        </p>
      </div>
    </div>
  );
};

export default MembersDropdown;
