import React, { useRef, useEffect } from "react";
import { AlertTriangle, X } from "lucide-react";

const ConfirmationModal = ({
  isOpen,
  onClose,
  onConfirm,
  title = "Confirm Action",
  message = "Are you sure you want to proceed?",
  confirmText = "Confirm",
  cancelText = "Cancel",
  type = "warning", // warning, danger, info
  isLoading = false,
}) => {
  const modalRef = useRef(null);

  // Handle click outside to close modal
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (event) => {
      if (modalRef.current && !modalRef.current.contains(event.target)) {
        if (!isLoading) {
          onClose();
        }
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen, isLoading, onClose]);

  if (!isOpen) return null;

  const getTypeStyles = () => {
    switch (type) {
      case "danger":
        return {
          icon: <AlertTriangle className="w-6 h-6 text-red-500" />,
          confirmButton: "bg-red-600 hover:bg-red-700 text-white",
          border: "border-red-200",
        };
      case "info":
        return {
          icon: <AlertTriangle className="w-6 h-6 text-blue-500" />,
          confirmButton: "bg-blue-600 hover:bg-blue-700 text-white",
          border: "border-blue-200",
        };
      default: // warning
        return {
          icon: <AlertTriangle className="w-6 h-6 text-yellow-500" />,
          confirmButton: "bg-yellow-600 hover:bg-yellow-700 text-white",
          border: "border-yellow-200",
        };
    }
  };

  const styles = getTypeStyles();

  const handleConfirm = () => {
    onConfirm();
  };

  const handleCancel = () => {
    if (!isLoading) {
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black bg-opacity-50 transition-opacity" />

      {/* Modal */}
      <div className="flex min-h-full items-center justify-center p-4">
        <div
          ref={modalRef}
          className="relative w-full max-w-md transform overflow-hidden rounded-lg bg-white shadow-xl transition-all"
        >
          {/* Header */}
          <div className={`px-6 py-4 border-b ${styles.border}`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                {styles.icon}
                <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
              </div>
              <button
                onClick={handleCancel}
                disabled={isLoading}
                className="text-gray-400 hover:text-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Body */}
          <div className="px-6 py-4">
            <p className="text-gray-600 leading-relaxed">{message}</p>
          </div>

          {/* Footer */}
          <div className="px-6 py-4 bg-gray-50 flex justify-end space-x-3">
            <button
              onClick={handleCancel}
              disabled={isLoading}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {cancelText}
            </button>
            <button
              onClick={handleConfirm}
              disabled={isLoading}
              className={`px-4 py-2 text-sm font-medium rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed ${styles.confirmButton}`}
            >
              {isLoading ? (
                <div className="flex items-center space-x-2">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Processing...</span>
                </div>
              ) : (
                confirmText
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ConfirmationModal;
