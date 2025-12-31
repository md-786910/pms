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

  const handleConfirm = (e) => {
    if (e) {
      e.stopPropagation();
      e.preventDefault();
    }
    onConfirm(e);
  };

  const handleCancel = (e) => {
    if (e) {
      e.stopPropagation();
      e.preventDefault();
    }
    if (!isLoading) {
      onClose(e);
    }
  };

  return (
    <div 
      className="fixed inset-0 z-[100] overflow-y-auto"
      onClick={(e) => {
        // Stop propagation to prevent closing parent modals
        e.stopPropagation();
      }}
    >
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black bg-opacity-50 transition-opacity"
        onClick={(e) => {
          e.stopPropagation();
          if (!isLoading) {
            onClose();
          }
        }}
      />

      {/* Modal */}
      <div 
        className="flex min-h-full items-center justify-center p-4"
        onClick={(e) => {
          // Stop propagation to prevent closing parent modals
          e.stopPropagation();
        }}
      >
        <div
          ref={modalRef}
          onClick={(e) => {
            // Stop all event propagation
            e.stopPropagation();
            e.preventDefault();
          }}
          className="relative w-full max-w-md transform overflow-hidden rounded-lg bg-white dark:bg-gray-800 shadow-xl transition-all"
        >
          {/* Header */}
          <div className={`px-6 py-4 border-b ${styles.border}`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                {styles.icon}
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">{title}</h3>
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleCancel(e);
                }}
                disabled={isLoading}
                className="text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Body */}
          <div className="px-6 py-4">
            <p className="text-gray-600 dark:text-gray-300 leading-relaxed">{message}</p>
          </div>

          {/* Footer */}
          <div className="px-6 py-4 bg-gray-50 dark:bg-gray-900 flex justify-end space-x-3">
            <button
              onClick={handleCancel}
              disabled={isLoading}
              className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 dark:focus:ring-offset-gray-800 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
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
