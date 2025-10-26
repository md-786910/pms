import React, { useState, useRef, useEffect } from "react";
import { X } from "lucide-react";
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
        <div className="flex items-center justify-between p-6 border-b border-slate-200/50 bg-gradient-to-r from-indigo-50/50 to-white rounded-t-3xl">
          <h2 className="text-xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-purple-600">
            Create New Card
          </h2>
          <button
            onClick={onClose}
            className="p-2 rounded-xl hover:bg-slate-100 transition-all duration-300"
          >
            <X className="w-5 h-5 text-slate-600" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          <div>
            <label
              htmlFor="title"
              className="block text-sm font-semibold text-slate-700 mb-2"
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
              className="block text-sm font-semibold text-slate-700 mb-2"
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
              className="w-full p-4 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 min-h-[120px] resize-y transition-all duration-300 bg-white"
              placeholder="Enter card description (use @ to mention someone, # for tags)"
              rows={4}
            />
          </div>

          <div className="flex items-center justify-end space-x-3 pt-6 border-t border-slate-200/50">
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
