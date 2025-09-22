import React, { useState } from "react";
import { X, UserPlus, UserMinus } from "lucide-react";
import { useUser } from "../contexts/UserContext";
import { useProject } from "../contexts/ProjectContext";
import { useNotification } from "../contexts/NotificationContext";

const AssignUserModal = ({ project, card, onClose, onUserAssigned }) => {
  const { users } = useUser();
  const { addProjectMember, removeProjectMember } = useProject();
  const { showToast } = useNotification();
  const [loading, setLoading] = useState({});

  const handleAssignUser = async (user) => {
    setLoading((prev) => ({ ...prev, [user._id]: true }));
    try {
      if (card) {
        // Assign to card
        const { cardAPI } = await import("../utils/api");
        const response = await cardAPI.assignUser(card._id, user._id);

        if (response.data.success) {
          showToast("User assigned to card successfully!", "success");
          if (onUserAssigned) {
            onUserAssigned();
          }
        }
      } else {
        // Assign to project
        await addProjectMember(project._id, user.email, "member");
        showToast("User added to project successfully!", "success");
      }
    } catch (error) {
      console.error("Error assigning user:", error);
      showToast("Failed to assign user", "error");
    } finally {
      setLoading((prev) => ({ ...prev, [user._id]: false }));
    }
  };

  const handleRemoveUser = async (user) => {
    setLoading((prev) => ({ ...prev, [user._id]: true }));
    try {
      if (card) {
        // Remove from card
        const { cardAPI } = await import("../utils/api");
        const response = await cardAPI.unassignUser(card._id, user._id);

        if (response.data.success) {
          showToast("User removed from card successfully!", "success");
          if (onUserAssigned) {
            onUserAssigned();
          }
        }
      } else {
        // Remove from project
        await removeProjectMember(project._id, user._id);
        showToast("User removed from project successfully!", "success");
      }
    } catch (error) {
      console.error("Error removing user:", error);
      showToast("Failed to remove user", "error");
    } finally {
      setLoading((prev) => ({ ...prev, [user._id]: false }));
    }
  };

  const isAssigned = (user) => {
    if (card) {
      return card.assignees?.some((assignee) => {
        if (typeof assignee === "object") {
          return assignee._id === user._id || assignee.id === user._id;
        }
        return assignee === user._id;
      });
    }
    return project.members?.some((member) => {
      if (typeof member === "object") {
        return member.user?._id === user._id || member.user === user._id;
      }
      return member === user._id;
    });
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content max-w-2xl">
        <div className="flex items-center justify-between p-6 border-b border-secondary-200">
          <div>
            <h2 className="text-xl font-semibold text-secondary-900">
              {card ? "Assign Users to Card" : "Manage Project Members"}
            </h2>
            <p className="text-sm text-secondary-600 mt-1">
              {card ? card.title : project.name}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-secondary-100 transition-colors duration-200"
          >
            <X className="w-5 h-5 text-secondary-600" />
          </button>
        </div>

        <div className="p-6">
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-secondary-900">
              {card ? "Project Members" : "All Users"}
            </h3>

            <div className="space-y-2 max-h-96 overflow-y-auto">
              {(card
                ? users.filter((user) =>
                    project.members?.some((member) => {
                      if (typeof member === "object") {
                        return (
                          member.user?._id === user._id ||
                          member.user === user._id
                        );
                      }
                      return member === user._id;
                    })
                  )
                : users
              ).map((user) => {
                const isAssignedUser = isAssigned(user);
                const isLoading = loading[user._id];

                return (
                  <div
                    key={user._id}
                    className="flex items-center justify-between p-3 bg-secondary-50 rounded-lg"
                  >
                    <div className="flex items-center space-x-3">
                      <div
                        className={`w-8 h-8 rounded-full flex items-center justify-center text-white font-medium ${
                          user.color || "bg-blue-500"
                        }`}
                      >
                        {user.name?.charAt(0).toUpperCase() || "U"}
                      </div>
                      <div>
                        <p className="font-medium text-secondary-900">
                          {user.name}
                        </p>
                        <p className="text-sm text-secondary-600">
                          {user.email}
                        </p>
                        <span
                          className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                            user.role === "admin"
                              ? "bg-red-100 text-red-800"
                              : "bg-blue-100 text-blue-800"
                          }`}
                        >
                          {user.role}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center space-x-2">
                      {isAssignedUser ? (
                        <button
                          onClick={() => handleRemoveUser(user)}
                          disabled={isLoading}
                          className="flex items-center space-x-1 px-3 py-1 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors duration-200 disabled:opacity-50"
                        >
                          <UserMinus className="w-4 h-4" />
                          <span className="text-sm font-medium">
                            {isLoading ? "Removing..." : "Remove"}
                          </span>
                        </button>
                      ) : (
                        <button
                          onClick={() => handleAssignUser(user)}
                          disabled={isLoading}
                          className="flex items-center space-x-1 px-3 py-1 bg-primary-100 text-primary-700 rounded-lg hover:bg-primary-200 transition-colors duration-200 disabled:opacity-50"
                        >
                          <UserPlus className="w-4 h-4" />
                          <span className="text-sm font-medium">
                            {isLoading ? "Adding..." : "Add"}
                          </span>
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="flex items-center justify-end pt-6 border-t border-secondary-200 mt-6">
            <button onClick={onClose} className="btn-secondary">
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AssignUserModal;
