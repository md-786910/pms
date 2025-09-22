import React, { useState } from "react";
import { X } from "lucide-react";
import { useNotification } from "../contexts/NotificationContext";
import { cardAPI } from "../utils/api";

const CreateCardModal = ({ projectId, onClose, onCardCreated }) => {
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    dueDate: "",
  });
  const [loading, setLoading] = useState(false);
  const { showToast } = useNotification();

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.title.trim()) {
      showToast("Card title is required", "error");
      return;
    }

    setLoading(true);
    try {
      const response = await cardAPI.createCard({
        ...formData,
        project: projectId,
      });

      onCardCreated(response.data.card);
      onClose();
    } catch (error) {
      console.error("Error creating card:", error);
      showToast("Failed to create card", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <div className="flex items-center justify-between p-6 border-b border-secondary-200">
          <h2 className="text-xl font-semibold text-secondary-900">
            Create New Card
          </h2>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-secondary-100 transition-colors duration-200"
          >
            <X className="w-5 h-5 text-secondary-600" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label
              htmlFor="title"
              className="block text-sm font-medium text-secondary-700 mb-2"
            >
              Card Title *
            </label>
            <input
              type="text"
              id="title"
              name="title"
              value={formData.title}
              onChange={handleChange}
              className="input-field"
              placeholder="Enter card title"
              required
            />
          </div>

          <div>
            <label
              htmlFor="description"
              className="block text-sm font-medium text-secondary-700 mb-2"
            >
              Description
            </label>
            <textarea
              id="description"
              name="description"
              value={formData.description}
              onChange={handleChange}
              className="input-field resize-none"
              rows={4}
              placeholder="Enter card description"
            />
          </div>

          <div>
            <label
              htmlFor="dueDate"
              className="block text-sm font-medium text-secondary-700 mb-2"
            >
              Due Date
            </label>
            <input
              type="datetime-local"
              id="dueDate"
              name="dueDate"
              value={formData.dueDate}
              onChange={handleChange}
              className="input-field"
            />
          </div>

          <div className="flex items-center justify-end space-x-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="btn-secondary"
              disabled={loading}
            >
              Cancel
            </button>
            <button type="submit" className="btn-primary" disabled={loading}>
              {loading ? "Creating..." : "Create Card"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateCardModal;
