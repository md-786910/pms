import React, { useState } from "react";
import { X, Save } from "lucide-react";
import { useUser } from "../contexts/UserContext";
import { useNotification } from "../contexts/NotificationContext";
import { storyAPI } from "../utils/api";

const CreateStoryModal = ({
  projectId,
  parentStoryId = null,
  onClose,
  onStoryCreated,
}) => {
  const { user } = useUser();
  const { showToast } = useNotification();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    title: "",
    storyType: "story",
  });

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.title.trim()) {
      showToast("Please enter a story title", "error");
      return;
    }

    try {
      setLoading(true);

      const storyData = {
        title: formData.title.trim(),
        project: projectId,
        storyType: formData.storyType,
      };

      // Only include parentStory if it exists
      if (parentStoryId) {
        storyData.parentStory = parentStoryId;
      }

      const response = await storyAPI.createStory(storyData);

      if (response.data.success) {
        onStoryCreated(response.data.story);
        onClose();
        showToast(
          parentStoryId
            ? "Sub-story created successfully!"
            : "Story created successfully!",
          "success"
        );
      }
    } catch (error) {
      console.error("Error creating story:", error);
      showToast(
        error.response?.data?.message || "Failed to create story",
        "error"
      );
    } finally {
      setLoading(false);
    }
  };

  const typeOptions = [
    { value: "story", label: "Story", icon: "📖" },
    { value: "task", label: "Task", icon: "✓" },
    { value: "bug", label: "Bug", icon: "🐛" },
    { value: "epic", label: "Epic", icon: "🎯" },
  ];

  return (
    <div className="modal-overlay">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden">
        {/* Modal Header */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white p-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold">
                {parentStoryId ? "Create Sub-Story" : "Create New Story"}
              </h2>
              <p className="text-blue-100 text-sm mt-1">
                {parentStoryId
                  ? "Add a sub-story to break down work"
                  : "Create a new story for your project"}
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-lg hover:bg-white hover:bg-opacity-20 transition-colors duration-200"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Content */}
        <form onSubmit={handleSubmit} className="p-6">
          <div className="space-y-5">
            {/* Title */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Title <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) =>
                  setFormData({ ...formData, title: e.target.value })
                }
                placeholder="Enter story title..."
                className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                autoFocus
                required
              />
            </div>

            {/* Type */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Type
              </label>
              <select
                value={formData.storyType}
                onChange={(e) =>
                  setFormData({ ...formData, storyType: e.target.value })
                }
                className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                {typeOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.icon} {option.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Modal Footer */}
          <div className="flex items-center justify-end space-x-3 mt-6 pt-6 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-2.5 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors duration-200 font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !formData.title.trim()}
              className="px-6 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors duration-200 font-medium flex items-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Save className="w-4 h-4" />
              <span>{loading ? "Creating..." : "Create Story"}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateStoryModal;
