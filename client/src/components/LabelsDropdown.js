import React, { useState, useEffect, useRef } from "react";
import { X, Edit2, Plus, Trash2, Check } from "lucide-react";
import { useNotification } from "../contexts/NotificationContext";
import { useSocket } from "../contexts/SocketContext";
import { useUser } from "../contexts/UserContext";
import { cardAPI, projectAPI } from "../utils/api";

const LabelsDropdown = ({
  isOpen,
  onClose,
  card,
  onCardUpdated,
  anchorRef,
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
  const [labelToDelete, setLabelToDelete] = useState(null);
  const [loading, setLoading] = useState(false);
  const [togglingLabel, setTogglingLabel] = useState(null); // Track which label is being toggled
  const { showToast } = useNotification();
  const { socket } = useSocket();
  const { user } = useUser();
  const dropdownRef = useRef(null);

  // Label colors like Trello
  const labelColors = [
    { name: "Green", value: "green", bg: "bg-green-500", text: "text-white" },
    { name: "Yellow", value: "yellow", bg: "bg-yellow-500", text: "text-black" },
    { name: "Orange", value: "orange", bg: "bg-orange-500", text: "text-white" },
    { name: "Red", value: "red", bg: "bg-red-500", text: "text-white" },
    { name: "Purple", value: "purple", bg: "bg-purple-500", text: "text-white" },
    { name: "Pink", value: "pink", bg: "bg-pink-500", text: "text-white" },
    { name: "Blue", value: "blue", bg: "bg-blue-500", text: "text-white" },
    { name: "Gray", value: "gray", bg: "bg-gray-500", text: "text-white" },
  ];

  // Initialize selected labels from card - only when dropdown opens
  useEffect(() => {
    if (isOpen && card) {
      const labelNames = card.labels?.map((label) => label.name) || [];
      setSelectedLabels(new Set(labelNames));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]); // Only run when isOpen changes, not on card updates

  // Reset state when dropdown closes
  useEffect(() => {
    if (!isOpen) {
      setSearchTerm("");
      setShowCreateLabel(false);
      setEditingLabel(null);
      setLabelToDelete(null);
    }
  }, [isOpen]);

  // Get project ID
  const projectId = card?.project
    ? typeof card.project === "object"
      ? card.project._id || card.project.id
      : card.project
    : null;

  // Fetch project labels - only when dropdown opens
  useEffect(() => {
    const fetchProjectLabels = async () => {
      if (isOpen && projectId) {
        try {
          const response = await projectAPI.getProjectLabels(projectId);
          if (response.data.success && response.data.labels) {
            setAvailableLabels(response.data.labels);
          }
        } catch (error) {
          console.error("Error fetching project labels:", error);
        }
      }
    };

    if (isOpen) {
      fetchProjectLabels();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]); // Only fetch when dropdown opens

  // Socket listeners
  useEffect(() => {
    if (!socket || !isOpen) return;

    const handleLabelCreated = (data) => {
      if (data.label && data.userId !== (user?._id || user?.id)) {
        setAvailableLabels((prev) => {
          if (prev.some((l) => l._id === data.label._id)) return prev;
          return [...prev, data.label];
        });
      }
    };

    const handleLabelUpdated = (data) => {
      if (data.label && data.userId !== (user?._id || user?.id)) {
        setAvailableLabels((prev) =>
          prev.map((label) =>
            label._id === data.label._id ? data.label : label
          )
        );
      }
    };

    const handleLabelRemoved = (data) => {
      if (data.labelId && data.userId !== (user?._id || user?.id)) {
        setAvailableLabels((prev) =>
          prev.filter((label) => label._id !== data.labelId)
        );
        setSelectedLabels((prev) => {
          const newSet = new Set(prev);
          newSet.delete(data.labelName);
          return newSet;
        });
      }
    };

    socket.on("project-label-created", handleLabelCreated);
    socket.on("project-label-updated", handleLabelUpdated);
    socket.on("project-label-removed", handleLabelRemoved);

    return () => {
      socket.off("project-label-created", handleLabelCreated);
      socket.off("project-label-updated", handleLabelUpdated);
      socket.off("project-label-removed", handleLabelRemoved);
    };
  }, [socket, isOpen, user]);

  // Click outside to close
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (labelToDelete) return;
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        if (anchorRef?.current && anchorRef.current.contains(event.target)) {
          return;
        }
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen, onClose, labelToDelete, anchorRef]);

  const filteredLabels = availableLabels.filter((label) =>
    label.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleLabelToggle = async (labelName, e) => {
    e.stopPropagation();
    const isCurrentlySelected = selectedLabels.has(labelName);
    setTogglingLabel(labelName); // Only track this specific label

    try {
      if (isCurrentlySelected) {
        const labelToRemove = card.labels?.find((l) => l.name === labelName);
        if (labelToRemove?._id) {
          const response = await cardAPI.removeLabel(card._id, labelToRemove._id);
          if (response.data.success) {
            setSelectedLabels((prev) => {
              const newSet = new Set(prev);
              newSet.delete(labelName);
              return newSet;
            });
            onCardUpdated(response.data.card);
          }
        }
      } else {
        const labelToAdd = availableLabels.find((l) => l.name === labelName);
        if (labelToAdd) {
          const response = await cardAPI.addLabel(card._id, {
            name: labelToAdd.name,
            color: labelToAdd.color,
          });
          if (response.data.success) {
            setSelectedLabels((prev) => new Set([...prev, labelName]));
            onCardUpdated(response.data.card);
          }
        }
      }
    } catch (error) {
      console.error("Error toggling label:", error);
      showToast("Failed to update label", "error");
    } finally {
      setTogglingLabel(null);
    }
  };

  const handleCreateLabel = async (e) => {
    e.stopPropagation();
    if (!newLabelName.trim()) return;
    setLoading(true);

    try {
      const projectId =
        typeof card.project === "object" ? card.project._id : card.project;

      const projectResponse = await projectAPI.createLabel(projectId, {
        name: newLabelName.trim(),
        color: newLabelColor,
      });

      if (projectResponse.data.success) {
        const cardResponse = await cardAPI.addLabel(card._id, {
          name: newLabelName.trim(),
          color: newLabelColor,
        });

        if (cardResponse.data.success) {
          const newLabel = projectResponse.data.label || {
            name: newLabelName.trim(),
            color: newLabelColor,
          };
          setAvailableLabels((prev) => [...prev, newLabel]);
          setSelectedLabels((prev) => new Set([...prev, newLabel.name]));
          onCardUpdated(cardResponse.data.card);
          setNewLabelName("");
          setNewLabelColor("blue");
          setShowCreateLabel(false);
          showToast("Label created!", "success");
        }
      }
    } catch (error) {
      console.error("Error creating label:", error);
      showToast("Failed to create label", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleEditLabel = (label, e) => {
    e.stopPropagation();
    setEditingLabel(label.name);
    setEditLabelName(label.name);
    setEditLabelColor(label.color);
  };

  const handleSaveEdit = async (e) => {
    e.stopPropagation();
    if (!editLabelName.trim()) return;
    setLoading(true);

    try {
      const originalLabel = availableLabels.find((l) => l.name === editingLabel);
      if (!originalLabel) return;

      const projectId =
        typeof card.project === "object" ? card.project._id : card.project;

      const response = await projectAPI.updateLabel(
        projectId,
        originalLabel._id,
        { name: editLabelName.trim(), color: editLabelColor }
      );

      if (response.data.success) {
        const updatedLabel = response.data.label;
        setAvailableLabels((prev) =>
          prev.map((l) =>
            l._id === originalLabel._id
              ? { ...l, name: updatedLabel.name, color: updatedLabel.color }
              : l
          )
        );

        if (editLabelName.trim() !== editingLabel) {
          setSelectedLabels((prev) => {
            const newSet = new Set(prev);
            newSet.delete(editingLabel);
            newSet.add(editLabelName.trim());
            return newSet;
          });
        }

        // Update card labels if affected
        const labelOnCard = card.labels?.find((l) => l.name === editingLabel);
        if (labelOnCard) {
          const updatedLabels = card.labels.map((l) =>
            l.name === editingLabel
              ? { ...l, name: editLabelName.trim(), color: editLabelColor }
              : l
          );
          onCardUpdated({ ...card, labels: updatedLabels });
        }

        showToast("Label updated!", "success");
      }
    } catch (error) {
      console.error("Error updating label:", error);
      showToast("Failed to update label", "error");
    } finally {
      setLoading(false);
      setEditingLabel(null);
      setEditLabelName("");
      setEditLabelColor("blue");
    }
  };

  const handleDeleteLabel = (label, e) => {
    e.stopPropagation();
    setLabelToDelete(label);
  };

  const confirmDelete = async () => {
    if (!labelToDelete) return;
    setLoading(true);

    try {
      const projectId =
        typeof card.project === "object" ? card.project._id : card.project;

      const response = await projectAPI.deleteLabel(projectId, labelToDelete._id);

      if (response.data.success) {
        setSelectedLabels((prev) => {
          const newSet = new Set(prev);
          newSet.delete(labelToDelete.name);
          return newSet;
        });
        setAvailableLabels((prev) => prev.filter((l) => l._id !== labelToDelete._id));

        const labelOnCard = card.labels?.find((l) => l.name === labelToDelete.name);
        if (labelOnCard) {
          onCardUpdated({
            ...card,
            labels: card.labels.filter((l) => l._id !== labelOnCard._id),
          });
        }

        showToast(`Deleted "${labelToDelete.name}"`, "success");
      }
    } catch (error) {
      console.error("Error deleting label:", error);
      showToast("Failed to delete label", "error");
    } finally {
      setLoading(false);
      setLabelToDelete(null);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      ref={dropdownRef}
      className="absolute right-0 top-full mt-1 w-72 bg-white rounded-lg shadow-xl border border-gray-200 z-50 overflow-hidden animate-slideDownFade"
      onClick={(e) => e.stopPropagation()}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b bg-gray-50">
        <span className="text-sm font-semibold text-gray-700">Labels</span>
        <button
          onClick={onClose}
          className="p-1 hover:bg-gray-200 rounded transition-colors"
        >
          <X className="w-4 h-4 text-gray-500" />
        </button>
      </div>

      {/* Search */}
      <div className="px-3 py-2 border-b">
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Search labels..."
          className="w-full px-2.5 py-1.5 text-sm border border-gray-200 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
        />
      </div>

      {/* Labels List */}
      <div className="max-h-48 overflow-y-auto">
        {filteredLabels.length === 0 ? (
          <div className="px-3 py-4 text-center text-sm text-gray-500">
            No labels found
          </div>
        ) : (
          filteredLabels.map((label) => {
            const colorConfig = labelColors.find((c) => c.value === label.color) ||
              labelColors.find((c) => c.value === "blue");
            const isSelected = selectedLabels.has(label.name);
            const isEditing = editingLabel === label.name;

            return (
              <div
                key={label._id || label.name}
                className="flex items-center gap-2 px-3 py-1.5 hover:bg-gray-50"
              >
                {isEditing ? (
                  <div className="flex-1 flex items-center gap-1">
                    <input
                      type="text"
                      value={editLabelName}
                      onChange={(e) => setEditLabelName(e.target.value.toUpperCase())}
                      className="flex-1 px-2 py-1 text-xs border rounded"
                      autoFocus
                    />
                    <select
                      value={editLabelColor}
                      onChange={(e) => setEditLabelColor(e.target.value)}
                      className="px-1 py-1 text-xs border rounded"
                    >
                      {labelColors.map((c) => (
                        <option key={c.value} value={c.value}>{c.name}</option>
                      ))}
                    </select>
                    <button
                      onClick={handleSaveEdit}
                      disabled={loading}
                      className="p-1 text-green-600 hover:bg-green-50 rounded"
                    >
                      <Check className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setEditingLabel(null);
                      }}
                      className="p-1 text-gray-500 hover:bg-gray-100 rounded"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ) : (
                  <>
                    <button
                      onClick={(e) => handleLabelToggle(label.name, e)}
                      disabled={togglingLabel === label.name}
                      className={`flex-1 flex items-center gap-2 px-2 py-1.5 rounded text-xs font-medium transition-colors ${
                        colorConfig.bg
                      } ${colorConfig.text} ${togglingLabel === label.name ? "opacity-50" : ""}`}
                    >
                      {isSelected && <Check className="w-3.5 h-3.5" />}
                      <span className="truncate">{label.name}</span>
                    </button>
                    <button
                      onClick={(e) => handleEditLabel(label, e)}
                      className="p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={(e) => handleDeleteLabel(label, e)}
                      className="p-1 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Create New Label */}
      <div className="border-t px-3 py-2">
        {showCreateLabel ? (
          <div className="space-y-2">
            <input
              type="text"
              value={newLabelName}
              onChange={(e) => setNewLabelName(e.target.value.toUpperCase())}
              placeholder="Label name"
              className="w-full px-2.5 py-1.5 text-sm border border-gray-200 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
              autoFocus
            />
            <div className="flex gap-1 flex-wrap">
              {labelColors.map((c) => (
                <button
                  key={c.value}
                  onClick={() => setNewLabelColor(c.value)}
                  className={`w-6 h-6 rounded ${c.bg} ${
                    newLabelColor === c.value ? "ring-2 ring-offset-1 ring-gray-400" : ""
                  }`}
                />
              ))}
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleCreateLabel}
                disabled={loading || !newLabelName.trim()}
                className="flex-1 py-1.5 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 disabled:opacity-50"
              >
                Create
              </button>
              <button
                onClick={() => {
                  setShowCreateLabel(false);
                  setNewLabelName("");
                }}
                className="flex-1 py-1.5 bg-gray-100 text-gray-700 text-sm rounded hover:bg-gray-200"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setShowCreateLabel(true)}
            className="w-full flex items-center justify-center gap-1.5 py-1.5 text-sm text-gray-600 hover:bg-gray-100 rounded transition-colors"
          >
            <Plus className="w-4 h-4" />
            Create new label
          </button>
        )}
      </div>

      {/* Delete Confirmation */}
      {labelToDelete && (
        <div className="absolute inset-0 bg-white flex flex-col">
          <div className="flex items-center justify-between px-3 py-2 border-b bg-red-50">
            <span className="text-sm font-semibold text-red-700">Delete Label</span>
          </div>
          <div className="flex-1 px-3 py-3">
            <p className="text-sm text-gray-600 mb-2">
              Delete "<span className="font-medium">{labelToDelete.name}</span>"?
            </p>
            <p className="text-xs text-red-600">
              This removes it from ALL cards in this project.
            </p>
          </div>
          <div className="flex gap-2 px-3 py-2 border-t">
            <button
              onClick={confirmDelete}
              disabled={loading}
              className="flex-1 py-1.5 bg-red-600 text-white text-sm rounded hover:bg-red-700 disabled:opacity-50"
            >
              Delete
            </button>
            <button
              onClick={() => setLabelToDelete(null)}
              className="flex-1 py-1.5 bg-gray-100 text-gray-700 text-sm rounded hover:bg-gray-200"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default LabelsDropdown;
