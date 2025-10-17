import React, { useState } from "react";
import { X, Plus, Save } from "lucide-react";
import { useProject } from "../contexts/ProjectContext";
import { useNotification } from "../contexts/NotificationContext";

const CreateProjectModal = ({ onClose }) => {
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    clientName: "",
    projectType: "",
    startDate: new Date(),
    endDate: new Date(),
  });
  const [loading, setLoading] = useState(false);
  const { createProject } = useProject();
  const { showToast } = useNotification();
  const columnCount =
    formData.projectType === "On Going" ? "md:grid-cols-3" : "md:grid-cols-2";

  // No need to set formData.endDate here; it's managed by React state.

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
    setFormData((prev) => {
      // If projectType changes and is not "On Going", clear endDate
      if (name === "projectType" && value !== "On Going") {
        return {
          ...prev,
          [name]: value,
          endDate: "",
        };
      }
      return {
        ...prev,
        [name]: value,
      };
    });
  };

  return (
    <div className="modal-overlay">
      <div className="bg-white rounded-2xl shadow-2xl max-w-[40vw] w-full mx-4">
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
            <div className="flex flex-col md:flex-row gap-4">
              {/* Project Name */}
              <div className="md:w-1/2">
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
              {/* Client Name */}
              <div className="md:w-1/2">
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Client Name *
                </label>
                <input
                  type="text"
                  name="clientName"
                  value={formData.clientName}
                  onChange={handleChange}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Enter client name"
                  required
                />
              </div>
            </div>
            <div className={`grid grid-cols-1 ${columnCount} gap-4`}>
              {/* Project Type Dropdown */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Project Type *
                </label>
                <select
                  name="projectType"
                  value={formData.projectType}
                  onChange={handleChange}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                >
                  <option>Project Type</option>
                  <option value="Maintenance">Maintenance</option>
                  <option value="One Time">One Time</option>
                  <option value="On Going">On Going</option>
                </select>
              </div>

              {/* Start Date */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Start Date *
                </label>
                <input
                  type="date"
                  name="startDate"
                  value={formData.startDate}
                  onChange={handleChange}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
              </div>

              {/* End Date — Only show when projectType is "On Going" */}
              {formData.projectType === "On Going" && (
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    End Date *
                  </label>
                  <input
                    type="date"
                    name="endDate"
                    value={formData.endDate}
                    onChange={handleChange}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  />
                </div>
              )}
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
