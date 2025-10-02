import React, { useState } from "react";
import { X, Plus, Save } from "lucide-react";
import { useProject } from "../contexts/ProjectContext";
import { useNotification } from "../contexts/NotificationContext";

const CreateProjectModal = ({ onClose }) => {
  const [formData, setFormData] = useState({
    name: "",
    description: "",
  });
  const [loading, setLoading] = useState(false);
  const { createProject } = useProject();
  const { showToast } = useNotification();

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.name.trim()) {
      showToast("Project name is required", "error");
      return;
    }

    setLoading(true);
    try {
      await createProject(formData);
      showToast("Project created successfully!", "success");
      onClose();
    } catch (error) {
      showToast("Failed to create project", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  return (
    <div className="modal-overlay">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full mx-4">
        {/* Modal Header */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white p-6 rounded-t-2xl">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold">Create Project</h2>
              <p className="text-blue-100 text-sm mt-1">
                Set up a new project for your team
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-lg hover:bg-blue-500 text-white hover:text-white transition-colors duration-200"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Content */}
        <form onSubmit={handleSubmit} className="p-6">
          <div className="space-y-4">
            {/* Project Name */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Project Name *
              </label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Enter project name"
                required
              />
            </div>

            {/* Project Description */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Description
              </label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleChange}
                className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent min-h-[100px] resize-y"
                placeholder="Enter project description (use @ to mention someone, # for tags)"
                rows={4}
              />
            </div>
          </div>

          {/* Modal Actions */}
          <div className="flex items-center justify-end space-x-3 mt-6 pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-600 hover:text-gray-800 font-medium transition-colors duration-200"
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="bg-blue-600 text-white hover:bg-blue-700 font-medium py-2 px-4 rounded-lg transition-colors duration-200 flex items-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={loading}
            >
              {loading ? (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              ) : (
                <>
                  <Plus className="w-4 h-4" />
                  <span>Create Project</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateProjectModal;
