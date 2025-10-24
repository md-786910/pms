import React, { useState, useEffect, useRef } from "react";
import {
  Users,
  Shield,
  Mail,
  Key,
  Edit,
  Trash2,
  Plus,
  Search,
  Filter,
  MoreVertical,
  UserCheck,
  UserX,
} from "lucide-react";
import { useUser } from "../contexts/UserContext";
import { useNotification } from "../contexts/NotificationContext";
import { userAPI } from "../utils/api";
import Avatar from "./Avatar";
import ConfirmationModal from "./ConfirmationModal";

const UserManagement = () => {
  const { user: currentUser } = useUser();
  const { showToast } = useNotification();
  const [users, setUsers] = useState([]);
  const [filteredUsers, setFilteredUsers] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [showAddUser, setShowAddUser] = useState(false);
  const [showEditUser, setShowEditUser] = useState(false);
  const [showResetPassword, setShowResetPassword] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [userToDelete, setUserToDelete] = useState(null);
  const [loading, setLoading] = useState(false);
  const addUserModalRef = useRef(null);
  const editUserModalRef = useRef(null);
  const resetPasswordModalRef = useRef(null);

  // Form states
  const [userForm, setUserForm] = useState({
    name: "",
    email: "",
    role: "member",
  });

  const [resetPasswordForm, setResetPasswordForm] = useState({
    newPassword: "",
    confirmPassword: "",
  });

  useEffect(() => {
    fetchUsers();
  }, []);

  useEffect(() => {
    filterUsers();
  }, [users, searchTerm, roleFilter]);

  // Handle click outside to close add user modal
  useEffect(() => {
    if (!showAddUser) return;

    const handleClickOutside = (event) => {
      if (
        addUserModalRef.current &&
        !addUserModalRef.current.contains(event.target)
      ) {
        setShowAddUser(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [showAddUser]);

  // Handle click outside to close edit user modal
  useEffect(() => {
    if (!showEditUser) return;

    const handleClickOutside = (event) => {
      if (
        editUserModalRef.current &&
        !editUserModalRef.current.contains(event.target)
      ) {
        setShowEditUser(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [showEditUser]);

  // Handle click outside to close reset password modal
  useEffect(() => {
    if (!showResetPassword) return;

    const handleClickOutside = (event) => {
      if (
        resetPasswordModalRef.current &&
        !resetPasswordModalRef.current.contains(event.target)
      ) {
        setShowResetPassword(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [showResetPassword]);

  // Check if user is admin
  if (!currentUser || currentUser.role !== "admin") {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            Access Denied
          </h3>
          <p className="text-gray-600">
            You need admin privileges to access this page.
          </p>
        </div>
      </div>
    );
  }

  const fetchUsers = async () => {
    try {
      const response = await userAPI.getUsers();
      setUsers(response.data.users);
    } catch (error) {
      console.error("Error fetching users:", error);
      showToast("Failed to fetch users", "error");
    }
  };

  const filterUsers = () => {
    let filtered = users.filter((user) => {
      const matchesSearch =
        user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.email.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesRole = roleFilter === "all" || user.role === roleFilter;
      return matchesSearch && matchesRole;
    });
    setFilteredUsers(filtered);
  };

  const handleAddUser = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await userAPI.createUser(userForm);

      showToast("User created successfully", "success");
      setShowAddUser(false);
      setUserForm({ name: "", email: "", role: "member", password: "" });
      fetchUsers();
    } catch (error) {
      console.error("Error creating user:", error);
      const message = error.response?.data?.message || "Failed to create user";
      showToast(message, "error");
    } finally {
      setLoading(false);
    }
  };

  const handleEditUser = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Only send name, email, and role - no password
      const { name, email, role } = userForm;
      const response = await userAPI.updateUser(
        selectedUser._id || selectedUser.id,
        { name, email, role }
      );

      showToast("User updated successfully", "success");
      setShowEditUser(false);
      setSelectedUser(null);
      setUserForm({ name: "", email: "", role: "member" });
      fetchUsers();
    } catch (error) {
      console.error("Error updating user:", error);
      const message = error.response?.data?.message || "Failed to update user";
      showToast(message, "error");
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    setLoading(true);

    if (resetPasswordForm.newPassword !== resetPasswordForm.confirmPassword) {
      showToast("Passwords do not match", "error");
      setLoading(false);
      return;
    }

    try {
      const response = await userAPI.resetUserPassword(
        selectedUser._id || selectedUser.id,
        resetPasswordForm.newPassword
      );

      showToast("Password reset successfully", "success");
      setShowResetPassword(false);
      setSelectedUser(null);
      setResetPasswordForm({ newPassword: "", confirmPassword: "" });
    } catch (error) {
      console.error("Error resetting password:", error);
      const message =
        error.response?.data?.message || "Failed to reset password";
      showToast(message, "error");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteUser = (user) => {
    if (user._id === (currentUser._id || currentUser.id)) {
      showToast("Cannot delete your own account", "error");
      return;
    }

    setUserToDelete(user);
    setShowDeleteConfirm(true);
  };

  const confirmDeleteUser = async () => {
    if (!userToDelete) return;

    try {
      setLoading(true);
      const response = await userAPI.deleteUser(userToDelete._id);

      showToast("User deleted successfully", "success");
      fetchUsers();
      setShowDeleteConfirm(false);
      setUserToDelete(null);
    } catch (error) {
      console.error("Error deleting user:", error);
      const message = error.response?.data?.message || "Failed to delete user";
      showToast(message, "error");
    } finally {
      setLoading(false);
    }
  };

  const openEditUser = (user) => {
    setSelectedUser(user);
    setUserForm({
      name: user.name,
      email: user.email,
      role: user.role,
    });
    setShowEditUser(true);
  };

  const openResetPassword = (user) => {
    setSelectedUser(user);
    setResetPasswordForm({ newPassword: "", confirmPassword: "" });
    setShowResetPassword(true);
  };

  const getRoleColor = (role) => {
    switch (role) {
      case "admin":
        return "bg-red-100 text-red-800";
      case "member":
        return "bg-blue-100 text-blue-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getRoleIcon = (role) => {
    return role === "admin" ? (
      <Shield className="w-4 h-4" />
    ) : (
      <Users className="w-4 h-4" />
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-lg p-6 text-white">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold mb-2">User Management</h1>
            <p className="text-primary-100 text-lg">
              Manage users and their access to the system
            </p>
          </div>
          <button
            onClick={() => setShowAddUser(true)}
            className="bg-white text-blue-600 px-4 py-2 rounded-lg hover:bg-blue-50 transition-colors duration-200 flex items-center space-x-2"
          >
            <Plus className="w-4 h-4" />
            <span>Add User</span>
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-200">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Search users..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>
          <div className="sm:w-48">
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">All Roles</option>
              <option value="admin">Admin</option>
              <option value="member">Member</option>
            </select>
          </div>
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  User
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Role
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Email
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredUsers.map((user) => (
                <tr key={user._id || user.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <Avatar user={user} size="md" showTooltip={true} />
                      <div className="ml-4">
                        <div className="text-sm font-medium text-gray-900">
                          {user.name}
                        </div>
                        <div className="text-sm text-gray-500">
                          ID: {user._id || user.id}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getRoleColor(
                        user.role
                      )}`}
                    >
                      {getRoleIcon(user.role)}
                      <span className="ml-1 capitalize">{user.role}</span>
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {user.email}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                      <UserCheck className="w-3 h-3 mr-1" />
                      Active
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex items-center justify-end space-x-2">
                      <button
                        onClick={() => openEditUser(user)}
                        className="text-blue-600 hover:text-blue-900 p-1 rounded"
                        title="Edit User"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => openResetPassword(user)}
                        className="text-orange-600 hover:text-orange-900 p-1 rounded"
                        title="Reset Password"
                      >
                        <Key className="w-4 h-4" />
                      </button>
                      {(user._id || user.id) !==
                        (currentUser._id || currentUser.id) && (
                        <button
                          onClick={() => handleDeleteUser(user)}
                          className="text-red-600 hover:text-red-900 p-1 rounded"
                          title="Delete User"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add User Modal */}
      {showAddUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div
            ref={addUserModalRef}
            className="bg-white rounded-lg p-6 w-full max-w-md"
          >
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Add New User
            </h3>
            <form onSubmit={handleAddUser} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Name
                </label>
                <input
                  type="text"
                  value={userForm.name}
                  onChange={(e) =>
                    setUserForm({ ...userForm, name: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email
                </label>
                <input
                  type="email"
                  value={userForm.email}
                  onChange={(e) =>
                    setUserForm({ ...userForm, email: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Role
                </label>
                <select
                  value={userForm.role}
                  onChange={(e) =>
                    setUserForm({ ...userForm, role: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="member">Member</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Password
                </label>
                <input
                  type="password"
                  value={userForm.password}
                  onChange={(e) =>
                    setUserForm({ ...userForm, password: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
              </div>
              <div className="flex space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowAddUser(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  {loading ? "Creating..." : "Create User"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit User Modal */}
      {showEditUser && selectedUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div
            ref={editUserModalRef}
            className="bg-white rounded-lg p-6 w-full max-w-md"
          >
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Edit User
            </h3>
            <form onSubmit={handleEditUser} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Name
                </label>
                <input
                  type="text"
                  value={userForm.name}
                  onChange={(e) =>
                    setUserForm({ ...userForm, name: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email
                </label>
                <input
                  type="email"
                  value={userForm.email}
                  onChange={(e) =>
                    setUserForm({ ...userForm, email: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Role
                </label>
                <select
                  value={userForm.role}
                  onChange={(e) =>
                    setUserForm({ ...userForm, role: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="member">Member</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
              <div className="flex space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowEditUser(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  {loading ? "Updating..." : "Update User"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Reset Password Modal */}
      {showResetPassword && selectedUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div
            ref={resetPasswordModalRef}
            className="bg-white rounded-lg p-6 w-full max-w-md"
          >
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Reset Password
            </h3>
            <p className="text-sm text-gray-600 mb-4">
              Reset password for{" "}
              <strong className="font-semibold text-blue-600">
                {selectedUser.name}
              </strong>
            </p>
            <form onSubmit={handleResetPassword} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  New Password
                </label>
                <input
                  type="password"
                  placeholder="New Password"
                  value={resetPasswordForm.newPassword}
                  onChange={(e) =>
                    setResetPasswordForm({
                      ...resetPasswordForm,
                      newPassword: e.target.value,
                    })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Confirm Password
                </label>
                <input
                  type="password"
                  placeholder="Confirm Password"
                  value={resetPasswordForm.confirmPassword}
                  onChange={(e) =>
                    setResetPasswordForm({
                      ...resetPasswordForm,
                      confirmPassword: e.target.value,
                    })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
              </div>
              <div className="flex space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowResetPassword(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  {loading ? "Resetting..." : "Reset Password"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <ConfirmationModal
        isOpen={showDeleteConfirm}
        onClose={() => {
          setShowDeleteConfirm(false);
          setUserToDelete(null);
        }}
        onConfirm={confirmDeleteUser}
        title="Delete User"
        message={
          userToDelete
            ? `Are you sure you want to delete ${userToDelete.name}? This action will deactivate their account and cannot be undone.`
            : "Are you sure you want to delete this user?"
        }
        confirmText="Delete User"
        cancelText="Cancel"
        type="danger"
        isLoading={loading}
      />
    </div>
  );
};

export default UserManagement;
