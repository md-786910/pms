import React, { useState, useRef, useEffect } from "react";
import { X, Calendar } from "lucide-react";
import { useNotification } from "../contexts/NotificationContext";
import { cardAPI } from "../utils/api";

const CreateCardModal = ({
  projectId,
  onClose,
  onCardCreated,
  defaultStatus = "todo",
}) => {
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    status: defaultStatus,
    dueDate: "",
  });
  const [loading, setLoading] = useState(false);
  const { showToast } = useNotification();
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

    if (!formData.title.trim()) {
      showToast("Card title is required", "error");
      return;
    }

    setLoading(true);
    try {
      const cardData = {
        title: formData.title,
        description: formData.description,
        project: projectId,
        status: formData.status,
        dueDate: formData.dueDate || undefined,
      };

      console.log("Creating card with data:", cardData);

      const response = await cardAPI.createCard(cardData);

      console.log("Card created successfully:", response.data);
      onCardCreated(response.data.card);
      onClose();
    } catch (error) {
      console.error("Error creating card:", error);
      console.error("Error response:", error.response?.data);
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
      <div ref={modalRef} className="modal-content">
        <div className="flex items-center bg-gradient-to-r from-blue-600 to-blue-700  justify-between px-6 py-2 border-b border-secondary-200">
          <h2 className="text-xl font-semibold text-white">Create New Card</h2>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-secondary-400 transition-colors duration-200"
          >
            <X className="w-5 h-5 text-white" />
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
              onChange={(e) => {
                setFormData({
                  ...formData,
                  description: e.target.value,
                });
              }}
              className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent min-h-[100px] resize-y"
              placeholder="Enter card description"
              rows={4}
            />
          </div>

          <div>
            <label
              htmlFor="dueDate"
              className="block text-sm font-medium text-secondary-700 mb-2"
            >
              Due Date
            </label>
            <div className="relative">
              <input
                type="date"
                id="dueDate"
                name="dueDate"
                value={formData.dueDate}
                onChange={handleChange}
                className="w-full h-12 px-4 py-3 pr-10 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                style={{
                  colorScheme: formData.dueDate ? 'normal' : 'light',
                }}
              />
              <style>{`
                input[type="date"]::-webkit-calendar-picker-indicator {
                  opacity: 0;
                  position: absolute;
                  right: 0;
                  width: 100%;
                  height: 100%;
                  cursor: pointer;
                }
              `}</style>
              {formData.dueDate ? (
                <button
                  type="button"
                  onClick={() =>
                    setFormData({
                      ...formData,
                      dueDate: "",
                    })
                  }
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-red-500 transition-colors"
                  title="Clear due date"
                >
                  <X className="w-5 h-5" />
                </button>
              ) : (
                <Calendar className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
              )}
            </div>
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
