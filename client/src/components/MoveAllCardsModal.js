import React, { useState, useRef, useEffect } from "react";
import { X } from "lucide-react";

const MoveAllCardsModal = ({
  isOpen,
  onClose,
  onConfirm,
  sourceColumn,
  columns,
  cardCount,
  isLoading = false,
}) => {
  const [selectedColumnId, setSelectedColumnId] = useState("");
  const modalRef = useRef(null);

  // Reset selection when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      setSelectedColumnId("");
    }
  }, [isOpen]);

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

  // Filter out the source column and archive column from options
  const availableColumns = columns.filter(
    (col) =>
      col.status !== sourceColumn?.status &&
      col.status !== "archive" &&
      !col.isArchived
  );

  const handleConfirm = (e) => {
    e.stopPropagation();
    if (selectedColumnId) {
      onConfirm(selectedColumnId);
    }
  };

  const handleCancel = (e) => {
    e.stopPropagation();
    if (!isLoading) {
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
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
      <div className="flex min-h-full items-center justify-center p-4">
        <div
          ref={modalRef}
          onClick={(e) => e.stopPropagation()}
          className="relative w-full max-w-md transform overflow-hidden rounded-lg bg-white shadow-xl transition-all"
        >
          {/* Header */}
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">
                Move All Cards
              </h3>
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
            <p className="text-gray-600 mb-4">
              Move all <strong>{cardCount}</strong> card
              {cardCount !== 1 ? "s" : ""} from{" "}
              <strong>"{sourceColumn?.name}"</strong> to:
            </p>

            {availableColumns.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-gray-500 text-sm">
                  No other columns available to move cards to.
                </p>
              </div>
            ) : (
              <div>
                <select
                  value={selectedColumnId}
                  onChange={(e) => setSelectedColumnId(e.target.value)}
                  disabled={isLoading || availableColumns.length === 0}
                  className="w-full px-4 py-3 rounded-lg border-2 border-gray-300 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 bg-white text-gray-900 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <option value="">Select a column...</option>
                  {availableColumns.map((column) => (
                    <option
                      key={column._id || column.status}
                      value={column._id || column.status}
                    >
                      {column.name}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="px-6 py-4 bg-gray-50 flex justify-end space-x-3">
            <button
              onClick={handleCancel}
              disabled={isLoading}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Cancel
            </button>
            <button
              onClick={handleConfirm}
              disabled={
                isLoading || !selectedColumnId || availableColumns.length === 0
              }
              className="px-4 py-2 text-sm font-medium rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed bg-blue-600 hover:bg-blue-700 text-white"
            >
              {isLoading ? (
                <div className="flex items-center space-x-2">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Moving...</span>
                </div>
              ) : (
                "Move All Cards"
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MoveAllCardsModal;
