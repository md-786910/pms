import React, { useState, useEffect, useRef } from "react";
import { X, Edit2, Plus } from "lucide-react";
import { useNotification } from "../contexts/NotificationContext";
import { cardAPI } from "../utils/api";

const LabelsModal = ({
  isOpen,
  onClose,
  card,
  onCardUpdated,
  projectLabels = [],
}) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedLabels, setSelectedLabels] = useState(new Set());
  const [availableLabels, setAvailableLabels] = useState([]);
  const [showCreateLabel, setShowCreateLabel] = useState(false);
  const [newLabelName, setNewLabelName] = useState("");
  const [newLabelColor, setNewLabelColor] = useState("blue");
  const [editingLabel, setEditingLabel] = useState(null);
  const [editLabelName, setEditLabelName] = useState("");
  const [editLabelColor, setEditLabelColor] = useState("blue");
  const { showToast } = useNotification();
  const modalRef = useRef(null);
  const isInitializedRef = useRef(false);
  const editedLabelsRef = useRef(new Map()); // Track edited labels

  // Label colors like Trello
  const labelColors = [
    {
      name: "Light Green",
      value: "light-green",
      bg: "bg-green-300",
      text: "text-black",
    },
    { name: "Green", value: "green", bg: "bg-green-500", text: "text-white" },
    {
      name: "Dark Green",
      value: "dark-green",
      bg: "bg-green-700",
      text: "text-white",
    },
    {
      name: "Light Yellow",
      value: "light-yellow",
      bg: "bg-yellow-300",
      text: "text-black",
    },
    {
      name: "Yellow",
      value: "yellow",
      bg: "bg-yellow-500",
      text: "text-black",
    },
    {
      name: "Dark Yellow",
      value: "dark-yellow",
      bg: "bg-yellow-700",
      text: "text-white",
    },
    {
      name: "Orange",
      value: "orange",
      bg: "bg-orange-500",
      text: "text-white",
    },
    { name: "Red", value: "red", bg: "bg-red-500", text: "text-white" },
    {
      name: "Purple",
      value: "purple",
      bg: "bg-purple-500",
      text: "text-white",
    },
    { name: "Pink", value: "pink", bg: "bg-pink-500", text: "text-white" },
    { name: "Blue", value: "blue", bg: "bg-blue-500", text: "text-white" },
    { name: "Gray", value: "gray", bg: "bg-gray-500", text: "text-white" },
  ];

  // Initialize selected labels from card
  useEffect(() => {
    if (card && card.labels) {
      const labelNames = card.labels.map((label) => label.name);
      setSelectedLabels(new Set(labelNames));
    }
  }, [card]);

  // Set available labels from project when modal opens
  useEffect(() => {
    if (isOpen && projectLabels && projectLabels.length > 0) {
      if (!isInitializedRef.current) {
        // Initial load
        setAvailableLabels(projectLabels);
        isInitializedRef.current = true;
      } else {
        // Update - merge changes from projectLabels, preserving our edits
        setAvailableLabels((prev) => {
          const updated = [...prev];
          projectLabels.forEach((projectLabel) => {
            // Check if this label was edited
            const edit = editedLabelsRef.current.get(projectLabel.name);
            const labelToUse = edit
              ? { ...projectLabel, name: edit.newName, color: edit.color }
              : projectLabel;

            const existingIndex = updated.findIndex(
              (l) => l.name === projectLabel.name || l.name === edit?.newName
            );
            if (existingIndex === -1) {
              // New label, add it
              updated.push(labelToUse);
            } else {
              // Update existing label
              updated[existingIndex] = labelToUse;
            }
          });
          return updated;
        });
      }
    }

    // Reset initialization and edited labels when modal closes
    if (!isOpen) {
      isInitializedRef.current = false;
      editedLabelsRef.current.clear();
    }
  }, [isOpen, projectLabels]);

  // Handle click outside to close modal
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (modalRef.current && !modalRef.current.contains(event.target)) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen, onClose]);

  // Filter labels based on search term
  const filteredLabels = availableLabels.filter((label) =>
    label.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Handle label selection - apply immediately
  const handleLabelToggle = async (labelName, e) => {
    e.stopPropagation();
    const isCurrentlySelected = selectedLabels.has(labelName);

    if (isCurrentlySelected) {
      // Remove label from card
      console.log(`Removing ${labelName} from card`);
      const currentLabels = card.labels || [];
      const labelToRemove = currentLabels.find(
        (label) => label.name === labelName
      );

      if (labelToRemove && labelToRemove._id) {
        try {
          const response = await cardAPI.removeLabel(
            card._id,
            labelToRemove._id
          );
          if (response.data.success) {
            setSelectedLabels((prev) => {
              const newSet = new Set(prev);
              newSet.delete(labelName);
              return newSet;
            });
            onCardUpdated(response.data.card);
            showToast(`Removed "${labelName}" label`, "success");
          }
        } catch (error) {
          console.error(`Error removing label ${labelName}:`, error);
          showToast("Failed to remove label", "error");
        }
      }
    } else {
      // Add label to card
      console.log(`Adding ${labelName} to card`);
      const labelToAdd = availableLabels.find(
        (label) => label.name === labelName
      );

      if (labelToAdd) {
        try {
          const response = await cardAPI.addLabel(card._id, {
            name: labelToAdd.name,
            color: labelToAdd.color,
          });

          if (response.data.success) {
            setSelectedLabels((prev) => new Set([...prev, labelName]));
            onCardUpdated(response.data.card);
            showToast(`Added "${labelName}" label`, "success");
          }
        } catch (error) {
          console.error(`Error adding label ${labelName}:`, error);
          showToast("Failed to add label", "error");
        }
      }
    }
  };

  // Handle create new label
  const handleCreateLabel = async (e) => {
    e.stopPropagation();
    if (!newLabelName.trim()) return;

    try {
      // Add the label to the card immediately
      const response = await cardAPI.addLabel(card._id, {
        name: newLabelName.trim(),
        color: newLabelColor,
      });

      if (response.data.success) {
        // Add to available labels
        const newLabel = {
          name: newLabelName.trim(),
          color: newLabelColor,
        };
        setAvailableLabels((prev) => [...prev, newLabel]);

        // Also add to selected labels
        setSelectedLabels((prev) => new Set([...prev, newLabel.name]));

        // Update the card
        onCardUpdated(response.data.card);

        setNewLabelName("");
        setNewLabelColor("blue");
        setShowCreateLabel(false);
        showToast("Label created and applied successfully!", "success");
      }
    } catch (error) {
      console.error("Error creating label:", error);
      showToast("Failed to create label", "error");
    }
  };

  // Handle edit label
  const handleEditLabel = (label, e) => {
    e.stopPropagation();
    setEditingLabel(label.name);
    setEditLabelName(label.name);
    setEditLabelColor(label.color);
  };

  // Handle save edit
  const handleSaveEdit = async (e) => {
    e.stopPropagation();
    if (!editLabelName.trim()) return;

    try {
      // Find the original label on the card
      const currentLabels = card.labels || [];
      const labelToUpdate = currentLabels.find(
        (label) => label.name === editingLabel
      );

      if (labelToUpdate && labelToUpdate._id) {
        // Check if anything actually changed
        const nameChanged = editLabelName.trim() !== editingLabel;
        const colorChanged = editLabelColor !== labelToUpdate.color;

        if (nameChanged || colorChanged) {
          // Store the edit in ref for persistence
          editedLabelsRef.current.set(editingLabel, {
            oldName: editingLabel,
            newName: editLabelName.trim(),
            color: editLabelColor,
          });

          // First, update available labels list
          setAvailableLabels((prev) =>
            prev.map((label) =>
              label.name === editingLabel
                ? {
                    ...label,
                    name: editLabelName.trim(),
                    color: editLabelColor,
                  }
                : label
            )
          );

          // Remove old label
          const removeResponse = await cardAPI.removeLabel(
            card._id,
            labelToUpdate._id
          );

          if (removeResponse.data.success) {
            // Add updated label
            const addResponse = await cardAPI.addLabel(card._id, {
              name: editLabelName.trim(),
              color: editLabelColor,
            });

            if (addResponse.data.success) {
              // Update selected labels if name changed
              if (nameChanged) {
                setSelectedLabels((prev) => {
                  const newSet = new Set(prev);
                  newSet.delete(editingLabel);
                  newSet.add(editLabelName.trim());
                  return newSet;
                });
              }

              onCardUpdated(addResponse.data.card);
              showToast("Label updated successfully!", "success");
            } else {
              showToast("Failed to add updated label", "error");
            }
          } else {
            showToast("Failed to remove old label", "error");
          }
        } else {
          // Nothing changed
          showToast("No changes to save", "info");
        }
      }

      setEditingLabel(null);
      setEditLabelName("");
      setEditLabelColor("blue");
    } catch (error) {
      console.error("Error updating label:", error);
      showToast("Failed to update label", "error");
    }
  };

  // Handle cancel edit
  const handleCancelEdit = (e) => {
    e.stopPropagation();
    setEditingLabel(null);
    setEditLabelName("");
    setEditLabelColor("blue");
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] overflow-y-auto">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black bg-opacity-50 transition-opacity"
        onClick={(e) => {
          e.stopPropagation();
          onClose();
        }}
      />

      {/* Modal */}
      <div className="flex min-h-full items-center justify-center p-4">
        <div
          ref={modalRef}
          className="modal-content relative w-full max-w-md transform overflow-hidden rounded-lg bg-white shadow-xl transition-all"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">Labels</h3>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onClose();
                }}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Search Bar */}
          <div className="px-6 py-4">
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search labels..."
              className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
            />
          </div>

          {/* Labels List */}
          <div className="px-6 pb-4">
            <h4 className="text-sm font-medium text-gray-700 mb-3">Labels</h4>
            <div className="max-h-60 overflow-y-auto space-y-2">
              {filteredLabels.map((label) => {
                let colorConfig = labelColors.find(
                  (c) => c.value === label.color
                );

                // Map light colors to their saturated equivalents for consistency
                if (!colorConfig) {
                  colorConfig = labelColors.find((c) => c.value === "green");
                } else if (label.color === "light-green") {
                  colorConfig = labelColors.find((c) => c.value === "green");
                } else if (label.color === "light-yellow") {
                  colorConfig = labelColors.find((c) => c.value === "yellow");
                }

                const isSelected = selectedLabels.has(label.name);
                const isEditing = editingLabel === label.name;

                return (
                  <div
                    key={label.name}
                    className="flex items-center space-x-3 p-2 hover:bg-gray-50 rounded-lg"
                  >
                    {/* Checkbox */}
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={(e) => handleLabelToggle(label.name, e)}
                      className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    />

                    {/* Label */}
                    {isEditing ? (
                      <div className="flex-1 flex items-center space-x-2">
                        <input
                          type="text"
                          value={editLabelName}
                          onChange={(e) => setEditLabelName(e.target.value)}
                          className="flex-1 p-1 border border-gray-300 rounded text-sm"
                          autoFocus
                        />
                        <select
                          value={editLabelColor}
                          onChange={(e) => setEditLabelColor(e.target.value)}
                          className="p-1 border border-gray-300 rounded text-sm"
                        >
                          {labelColors.map((color) => (
                            <option key={color.value} value={color.value}>
                              {color.name}
                            </option>
                          ))}
                        </select>
                        <button
                          onClick={handleSaveEdit}
                          className="text-green-600 hover:text-green-800 text-sm"
                        >
                          Save
                        </button>
                        <button
                          onClick={handleCancelEdit}
                          className="text-red-600 hover:text-red-800 text-sm"
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <>
                        <div
                          className={`flex-1 px-3 py-2 rounded text-sm font-medium ${
                            colorConfig?.bg || "bg-blue-500"
                          } ${colorConfig?.text || "text-white"}`}
                        >
                          {label.name}
                        </div>
                        <button
                          onClick={(e) => handleEditLabel(label, e)}
                          className="text-gray-400 hover:text-gray-600 p-1"
                          title="Edit label"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="px-6 py-4 border-t border-gray-200 space-y-2">
            {showCreateLabel ? (
              <div className="space-y-2">
                <input
                  type="text"
                  value={newLabelName}
                  onChange={(e) => setNewLabelName(e.target.value)}
                  placeholder="Label name"
                  className="w-full p-2 border border-gray-300 rounded text-sm"
                  autoFocus
                />
                <select
                  value={newLabelColor}
                  onChange={(e) => setNewLabelColor(e.target.value)}
                  className="w-full p-2 border border-gray-300 rounded text-sm"
                >
                  {labelColors.map((color) => (
                    <option key={color.value} value={color.value}>
                      {color.name}
                    </option>
                  ))}
                </select>
                <div className="flex space-x-2">
                  <button
                    onClick={handleCreateLabel}
                    className="flex-1 bg-blue-600 text-white py-2 px-3 rounded text-sm hover:bg-blue-700"
                  >
                    Create
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowCreateLabel(false);
                    }}
                    className="flex-1 bg-gray-300 text-gray-700 py-2 px-3 rounded text-sm hover:bg-gray-400"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setShowCreateLabel(true);
                }}
                className="w-full bg-gray-100 text-gray-700 py-2 px-3 rounded text-sm hover:bg-gray-200 flex items-center justify-center space-x-2"
              >
                <Plus className="w-4 h-4" />
                <span>Create a new label</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default LabelsModal;
