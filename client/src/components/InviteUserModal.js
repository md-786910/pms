import React, { useState, useRef, useEffect } from "react";
import { X, Mail, UserPlus, Send } from "lucide-react";
import { useUser } from "../contexts/UserContext";
import { useProject } from "../contexts/ProjectContext";
import { useNotification } from "../contexts/NotificationContext";
import Avatar from "./Avatar";

const InviteUserModal = ({ project, onClose, onUserInvited }) => {
  const { users } = useUser();
  const { addProjectMember } = useProject();
  const { showToast } = useNotification();

  const [formData, setFormData] = useState({
    email: "",
    message: "",
  });
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [inviteType, setInviteType] = useState("email"); // "email" or "existing"
  const modalRef = useRef(null);

  // Handle click outside to close modal
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (modalRef.current && !modalRef.current.contains(event.target)) {
        onClose();
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [onClose]);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (inviteType === "email") {
      if (!formData.email.trim()) {
        showToast("Please enter an email address", "error");
        return;
      }

      setLoading(true);
      try {
        const response = await addProjectMember(
          project._id,
          formData.email.trim(),
          "member"
        );
        showToast(
          response.message || "User invited to project successfully!",
          "success"
        );
        if (onUserInvited) {
          onUserInvited();
        }
        onClose();
      } catch (error) {
        console.error("Error inviting user:", error);
        const errorMessage =
          error.response?.data?.message || "Failed to invite user";
        showToast(errorMessage, "error");
      } finally {
        setLoading(false);
      }
    } else {
      if (selectedUsers.length === 0) {
        showToast("Please select at least one user", "error");
        return;
      }

      setLoading(true);
      try {
        const results = [];
        for (const user of selectedUsers) {
          try {
            const response = await addProjectMember(
              project._id,
              user.email,
              "member"
            );
            results.push({
              success: true,
              user: user.name,
              message: response.message || "User added successfully",
            });
          } catch (error) {
            results.push({
              success: false,
              user: user.name,
              message: error.response?.data?.message || "Failed to add user",
            });
          }
        }

        const successCount = results.filter((r) => r.success).length;
        const failCount = results.filter((r) => !r.success).length;

        if (successCount > 0) {
          showToast(
            `${successCount} user(s) added to project successfully`,
            "success"
          );
        }
        if (failCount > 0) {
          showToast(`${failCount} user(s) failed to add`, "error");
        }

        if (onUserInvited) {
          onUserInvited();
        }
        onClose();
      } catch (error) {
        console.error("Error adding users to project:", error);
        showToast("Failed to add users to project", "error");
      } finally {
        setLoading(false);
      }
    }
  };

  const handleUserToggle = (user) => {
    setSelectedUsers((prev) =>
      prev.some((selectedUser) => selectedUser._id === user._id)
        ? prev.filter((selectedUser) => selectedUser._id !== user._id)
        : [...prev, user]
    );
  };

  const availableUsers = users.filter(
    (user) =>
      !project.members?.some((member) => member.user?._id === user._id) &&
      user.role === "member"
  );

  return (
    <div className="modal-overlay">
      <div ref={modalRef} className="modal-content max-w-2xl">
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white flex items-center justify-between px-6 py-3">
          <div>
            <h2 className="text-xl font-bold">Invite Users to Project</h2>
            <p className="text-primary-100 text-md">{project.name}</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-secondary-100 bg-primary-100 transition-colors duration-200 hover:scale-105"
          >
            <X className="w-4 h-4 text-secondary-600" />
          </button>
        </div>

        <div className="p-6">
          {/* Invite Type Tabs */}
          <div className="flex space-x-1 mb-6 bg-secondary-100 rounded-lg p-1">
            <button
              onClick={() => setInviteType("email")}
              className={`flex-1 flex items-center justify-center space-x-2 py-2 px-4 rounded-md transition-colors duration-200 ${
                inviteType === "email"
                  ? "bg-white text-primary-700 shadow-sm"
                  : "text-secondary-600 hover:text-secondary-900"
              }`}
            >
              <Mail className="w-4 h-4" />
              <span className="font-medium">Email Invite</span>
            </button>
            <button
              onClick={() => setInviteType("existing")}
              className={`flex-1 flex items-center justify-center space-x-2 py-2 px-4 rounded-md transition-colors duration-200 ${
                inviteType === "existing"
                  ? "bg-white text-primary-700 shadow-sm"
                  : "text-secondary-600 hover:text-secondary-900"
              }`}
            >
              <UserPlus className="w-4 h-4" />
              <span className="font-medium">Existing Users</span>
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {inviteType === "email" ? (
              <>
                <div>
                  <label
                    htmlFor="email"
                    className="block text-sm font-medium text-secondary-700 mb-2"
                  >
                    Email Address *
                  </label>
                  <input
                    type="email"
                    id="email"
                    name="email"
                    value={formData.email}
                    onChange={(e) =>
                      setFormData({ ...formData, email: e.target.value })
                    }
                    className="input-field"
                    placeholder="Enter email address"
                    required
                  />
                </div>

                <div>
                  <label
                    htmlFor="message"
                    className="block text-sm font-medium text-secondary-700 mb-2"
                  >
                    Personal Message (Optional)
                  </label>
                  <textarea
                    id="message"
                    name="message"
                    value={formData.message}
                    onChange={(e) => {
                      setFormData({ ...formData, message: e.target.value });
                    }}
                    placeholder="Add a personal message to the invitation..."
                    className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                    rows={3}
                  />
                </div>
              </>
            ) : (
              <div>
                <label className="block text-sm font-medium text-secondary-700 mb-3">
                  Select Users to Add ({selectedUsers.length} selected)
                </label>

                {availableUsers.length === 0 ? (
                  <div className="text-center py-8 bg-secondary-50 rounded-lg">
                    <UserPlus className="w-12 h-12 text-secondary-300 mx-auto mb-3" />
                    <p className="text-secondary-600">
                      All available users are already in this project
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2 max-h-60 overflow-y-auto">
                    {availableUsers.map((user) => (
                      <div
                        key={user._id}
                        className={`flex items-center space-x-3 p-3 rounded-lg border-2 transition-colors duration-200 cursor-pointer ${
                          selectedUsers.some(
                            (selectedUser) => selectedUser._id === user._id
                          )
                            ? "border-primary-200 bg-primary-50"
                            : "border-secondary-200 hover:border-secondary-300"
                        }`}
                        onClick={() => handleUserToggle(user)}
                      >
                        <input
                          type="checkbox"
                          checked={selectedUsers.some(
                            (selectedUser) => selectedUser._id === user._id
                          )}
                          onChange={() => handleUserToggle(user)}
                          className="w-4 h-4 text-primary-600 border-secondary-300 rounded focus:ring-primary-500 cursor-pointer"
                        />
                        <Avatar user={user} size="sm" />
                        <div className="flex-1">
                          <p className="font-medium text-secondary-900">
                            {user.name}
                          </p>
                          <p className="text-sm text-secondary-600">
                            {user.email}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            <div className="flex items-center justify-end space-x-3 pt-4 border-t border-secondary-200">
              <button
                type="button"
                onClick={onClose}
                className="btn-secondary"
                disabled={loading}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="btn-primary flex items-center space-x-2"
                disabled={loading}
              >
                {loading ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    <span>
                      {inviteType === "email" ? "Send Invitation" : "Add Users"}
                    </span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default InviteUserModal;
