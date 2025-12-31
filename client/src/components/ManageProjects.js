import React, { useState, useEffect } from "react";
import { Link, Navigate } from "react-router-dom";
import {
  ArrowLeft,
  Plus,
  Pencil,
  Trash2,
  Folder,
  FolderOpen,
  Search,
  X,
  Check,
  Info,
} from "lucide-react";
import { categoryAPI } from "../utils/api";
import { useNotification } from "../contexts/NotificationContext";
import { useUser } from "../contexts/UserContext";
import ConfirmationModal from "./ConfirmationModal";

// Color palette for categories
const COLOR_OPTIONS = [
  { name: "Indigo", value: "#6366f1" },
  { name: "Blue", value: "#3b82f6" },
  { name: "Cyan", value: "#06b6d4" },
  { name: "Teal", value: "#14b8a6" },
  { name: "Green", value: "#22c55e" },
  { name: "Yellow", value: "#eab308" },
  { name: "Orange", value: "#f97316" },
  { name: "Red", value: "#ef4444" },
  { name: "Pink", value: "#ec4899" },
  { name: "Purple", value: "#a855f7" },
  { name: "Slate", value: "#64748b" },
];

const ManageProjects = () => {
  const { user } = useUser();
  const { showToast } = useNotification();
  const [categories, setCategories] = useState([]);
  const [uncategorizedCount, setUncategorizedCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  // Modal states
  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState("create");
  const [editingCategory, setEditingCategory] = useState(null);
  const [formData, setFormData] = useState({
    name: "",
    color: "#6366f1",
  });
  const [formLoading, setFormLoading] = useState(false);
  const [formError, setFormError] = useState("");

  // Delete confirmation
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Fetch categories
  const fetchCategories = async () => {
    try {
      setLoading(true);
      const response = await categoryAPI.getCategoriesWithCounts();
      setCategories(response.data.categories || []);
      setUncategorizedCount(response.data.uncategorizedCount || 0);
    } catch (error) {
      console.error("Error fetching categories:", error);
      showToast("Failed to load categories", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user?.role === "admin") {
      fetchCategories();
    }
  }, [user]);

  // Only admin can access this page
  if (user?.role !== "admin") {
    return <Navigate to="/" replace />;
  }

  // Filter categories by search
  const filteredCategories = categories.filter((cat) =>
    cat.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Open create modal
  const openCreateModal = () => {
    setModalMode("create");
    setFormData({ name: "", color: "#6366f1" });
    setFormError("");
    setEditingCategory(null);
    setShowModal(true);
  };

  // Open edit modal
  const openEditModal = (category) => {
    setModalMode("edit");
    setFormData({
      name: category.name,
      color: category.color || "#6366f1",
    });
    setFormError("");
    setEditingCategory(category);
    setShowModal(true);
  };

  // Close modal
  const closeModal = () => {
    setShowModal(false);
    setEditingCategory(null);
    setFormData({ name: "", color: "#6366f1" });
    setFormError("");
  };

  // Handle form submit
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      setFormError("Category name is required");
      return;
    }

    setFormLoading(true);
    setFormError("");

    try {
      if (modalMode === "create") {
        await categoryAPI.createCategory(formData);
        showToast("Category created successfully", "success");
      } else {
        await categoryAPI.updateCategory(editingCategory._id, formData);
        showToast("Category updated successfully", "success");
      }
      closeModal();
      fetchCategories();
    } catch (error) {
      console.error("Error saving category:", error);
      setFormError(error.response?.data?.message || "Failed to save category");
    } finally {
      setFormLoading(false);
    }
  };

  // Handle delete
  const handleDeleteClick = (category) => {
    setSelectedCategory(category);
    setShowDeleteConfirm(true);
  };

  const confirmDelete = async () => {
    if (!selectedCategory) return;

    try {
      setIsDeleting(true);
      const response = await categoryAPI.deleteCategory(selectedCategory._id);
      showToast(
        `Category deleted${response.data.projectCount > 0 ? ` (${response.data.projectCount} projects moved to uncategorized)` : ""}`,
        "success"
      );
      setShowDeleteConfirm(false);
      setSelectedCategory(null);
      fetchCategories();
    } catch (error) {
      console.error("Error deleting category:", error);
      showToast(error.response?.data?.message || "Failed to delete category", "error");
    } finally {
      setIsDeleting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-lg px-6 py-4 text-white">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Link
              to="/"
              className="p-2 rounded-lg hover:bg-blue-500 text-white hover:text-white transition-colors duration-200"
            >
              <ArrowLeft className="w-4 h-4" />
            </Link>

            <div>
              <h1 className="text-xl font-bold mb-1">Manage Projects</h1>
              <p className="text-primary-100 text-md">
                Create and manage project categories
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-4">
            <div className="text-center">
              <div className="text-xl font-bold">{categories.length}</div>
              <div className="text-primary-100 text-sm">Categories</div>
            </div>
            <button
              onClick={openCreateModal}
              className="flex items-center gap-2 px-4 py-2 bg-white text-blue-600 rounded-lg hover:bg-blue-50 transition-colors font-medium"
            >
              <Plus className="w-4 h-4" />
              New Category
            </button>
          </div>
        </div>
      </div>

      {/* Info Banner */}
      <div className="bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-700 rounded-lg p-4">
        <div className="flex items-start space-x-3">
          <Info className="w-5 h-5 text-blue-500 dark:text-blue-400 mt-0.5" />
          <div>
            <h3 className="font-medium text-blue-800 dark:text-blue-300">About Categories</h3>
            <p className="text-sm text-blue-700 dark:text-blue-400 mt-1">
              Categories help organize your projects in the sidebar. Projects are grouped
              alphabetically within each category for easy navigation.
            </p>
          </div>
        </div>
      </div>

      {/* Categories List */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center">
                <Folder className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
                  Project Categories
                </h2>
                <p className="text-gray-600 dark:text-gray-400">
                  Organize projects into categories
                </p>
              </div>
            </div>

            {/* Search */}
            <div className="relative w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-gray-500" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search categories..."
                className="w-full pl-9 pr-8 py-2 text-sm bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        </div>

        <div className="p-6">
          {filteredCategories.length === 0 && uncategorizedCount === 0 ? (
            <div className="text-center py-12">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center">
                <FolderOpen className="w-8 h-8 text-gray-400 dark:text-gray-500" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
                {searchQuery ? "No categories found" : "No categories yet"}
              </h3>
              <p className="text-gray-500 dark:text-gray-400 mb-6">
                {searchQuery
                  ? "Try a different search term"
                  : "Create your first category to organize projects"}
              </p>
              {!searchQuery && (
                <button
                  onClick={openCreateModal}
                  className="bg-blue-600 text-white hover:bg-blue-700 font-medium py-2 px-4 rounded-lg transition-colors duration-200 inline-flex items-center space-x-2"
                >
                  <Plus className="w-4 h-4" />
                  <span>Create Category</span>
                </button>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              {/* Category Rows */}
              {filteredCategories.map((category) => (
                <div
                  key={category._id}
                  className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors duration-200 border border-gray-200 dark:border-gray-600 group"
                >
                  <div className="flex items-center space-x-3">
                    <div
                      className="w-9 h-9 rounded-lg flex items-center justify-center"
                      style={{ backgroundColor: category.color || "#6366f1" }}
                    >
                      <Folder className="w-4 h-4 text-white" />
                    </div>
                    <h3 className="font-medium text-gray-900 dark:text-gray-100">{category.name}</h3>
                  </div>
                  <div className="flex items-center space-x-3">
                    <span
                      className="px-3 py-1 rounded-full text-sm font-medium"
                      style={{
                        backgroundColor: `${category.color}20` || "#6366f120",
                        color: category.color || "#6366f1",
                      }}
                    >
                      {category.projectCount || 0} projects
                    </span>
                    <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => openEditModal(category)}
                        className="p-2 text-gray-500 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg transition-colors"
                        title="Edit"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteClick(category)}
                        className="p-2 text-gray-500 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-colors"
                        title="Delete"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Create/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50" onClick={closeModal} />
          <div className="relative bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-sm mx-4 overflow-hidden">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100">
                {modalMode === "create" ? "Create Category" : "Edit Category"}
              </h2>
              <button
                onClick={closeModal}
                className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <form onSubmit={handleSubmit} className="p-5 space-y-4">
              {formError && (
                <div className="flex items-center gap-2 p-2.5 bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-lg text-sm border border-red-200 dark:border-red-700">
                  <Info className="w-4 h-4 flex-shrink-0" />
                  {formError}
                </div>
              )}

              {/* Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                  Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  placeholder="e.g., Web Development"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                  autoFocus
                />
              </div>

              {/* Color */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Color
                </label>
                <div className="flex flex-wrap gap-2">
                  {COLOR_OPTIONS.map((color) => (
                    <button
                      key={color.value}
                      type="button"
                      onClick={() =>
                        setFormData({ ...formData, color: color.value })
                      }
                      className={`w-8 h-8 rounded-lg transition-all duration-200 flex items-center justify-center ${
                        formData.color === color.value
                          ? "ring-2 ring-offset-2 ring-blue-500 dark:ring-offset-gray-800"
                          : "hover:scale-105"
                      }`}
                      style={{ backgroundColor: color.value }}
                      title={color.name}
                    >
                      {formData.color === color.value && (
                        <Check className="w-3.5 h-3.5 text-white" />
                      )}
                    </button>
                  ))}
                </div>
              </div>

              {/* Preview */}
              <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600">
                <div
                  className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                  style={{ backgroundColor: formData.color }}
                >
                  <Folder className="w-4 h-4 text-white" />
                </div>
                <span className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                  {formData.name || "Category Name"}
                </span>
              </div>

              {/* Actions */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-gray-200 dark:border-gray-700">
                <button
                  type="button"
                  onClick={closeModal}
                  className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 font-medium transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={formLoading}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium disabled:opacity-50"
                >
                  {formLoading && (
                    <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  )}
                  {modalMode === "create" ? "Create" : "Save"}
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
          setSelectedCategory(null);
        }}
        onConfirm={confirmDelete}
        title="Delete Category"
        message={
          selectedCategory?.projectCount > 0
            ? `Are you sure you want to delete "${selectedCategory?.name}"? ${selectedCategory?.projectCount} project(s) will be moved to uncategorized.`
            : `Are you sure you want to delete "${selectedCategory?.name}"? This action cannot be undone.`
        }
        confirmText="Delete"
        type="danger"
        isLoading={isDeleting}
      />
    </div>
  );
};

export default ManageProjects;
