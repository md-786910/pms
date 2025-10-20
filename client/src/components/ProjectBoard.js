import React, { useState, useEffect, useRef } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Plus,
  MoreVertical,
  ChevronRight,
  Settings,
  Calendar,
} from "lucide-react";
import { useProject } from "../contexts/ProjectContext";
import { useNotification } from "../contexts/NotificationContext";
import { cardAPI, columnAPI, projectAPI } from "../utils/api";
import ListColumn from "./ListColumn";
import CreateCardModal from "./CreateCardModal";
import ConfirmationModal from "./ConfirmationModal";
import CardModal from "./CardModal";
import { stripHtmlTags } from "../utils/htmlUtils";
import {
  getProjectStatusColors,
  getProjectTypeColors,
  getStatusBadgeClasses,
  getCardStatusColors,
} from "../utils/statusColors";

const ProjectBoard = () => {
  const { id, projectId, cardId } = useParams();
  const navigate = useNavigate();
  const { currentProject, fetchProject, loading } = useProject();
  const { showToast } = useNotification();
  const [cards, setCards] = useState([]);
  const [columns, setColumns] = useState([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [columnToDelete, setColumnToDelete] = useState(null);
  const [selectedStatus, setSelectedStatus] = useState("todo");
  const [showScrollButton, setShowScrollButton] = useState(false);
  const scrollContainerRef = useRef(null);
  const [loadingCards, setLoadingCards] = useState(true);
  const [loadingColumns, setLoadingColumns] = useState(true);
  const [showAddColumnModal, setShowAddColumnModal] = useState(false);
  const [newColumnName, setNewColumnName] = useState("");
  const [newColumnColor, setNewColumnColor] = useState("gray");

  // Card modal state
  const [selectedCard, setSelectedCard] = useState(null);
  const [showCardModal, setShowCardModal] = useState(false);
  const [projectData, setProjectData] = useState([]);

  useEffect(() => {
    const fetchProjectData = async () => {
      try {
        const response = await projectAPI.getProject(id);
        setProjectData(response.data);
      } catch (error) {
        console.error("Error fetching project data:", error);
      }
    };

    fetchProjectData();
  }, []);

  const formatDate = (dateString) => {
    if (!dateString) return "";
    const options = { year: "numeric", month: "long", day: "numeric" };
    return new Date(dateString).toLocaleDateString(undefined, options);
  };

  // Determine the actual project ID
  const actualProjectId = projectId || id;

  useEffect(() => {
    if (actualProjectId) {
      fetchProject(actualProjectId);
      fetchCards();
      fetchColumns();
    }
  }, [actualProjectId]);

  // Handle card modal opening from URL
  useEffect(() => {
    if (cardId && cards.length > 0) {
      const card = cards.find((c) => c._id === cardId);
      if (card) {
        setSelectedCard(card);
        setShowCardModal(true);
      }
    } else if (!cardId && showCardModal) {
      // If cardId is removed from URL, close the modal
      setShowCardModal(false);
      setSelectedCard(null);
    }
  }, [cardId, cards, showCardModal]);

  // Handle browser back/forward navigation
  useEffect(() => {
    const handlePopState = () => {
      // When user navigates back/forward, check if we should close the modal
      if (!cardId && showCardModal) {
        setShowCardModal(false);
        setSelectedCard(null);
      }
    };

    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, [cardId, showCardModal]);

  // Check scroll state when columns change
  useEffect(() => {
    const timer = setTimeout(() => {
      handleScroll();
    }, 100);
    return () => clearTimeout(timer);
  }, [columns.length]);

  const fetchCards = async () => {
    try {
      console.log("Fetching cards for project:", actualProjectId);
      const response = await cardAPI.getCards(actualProjectId);
      console.log("Cards response:", response);
      setCards(response.data.cards || []);
    } catch (error) {
      console.error("Error fetching cards:", error);
      console.error("Error details:", error.response?.data);
      showToast("Failed to load cards", "error");
    } finally {
      setLoadingCards(false);
    }
  };

  const fetchColumns = async () => {
    try {
      console.log("Fetching columns for project:", actualProjectId);
      const response = await columnAPI.getColumns(actualProjectId);
      console.log("Columns response:", response);
      setColumns(response.data.columns || []);
    } catch (error) {
      console.error("Error fetching columns:", error);
      console.error("Error details:", error.response?.data);
      showToast("Failed to load columns", "error");
    } finally {
      setLoadingColumns(false);
    }
  };

  const handleCardCreated = (newCard) => {
    setCards((prev) => [...prev, newCard]);
    showToast("Card created successfully!", "success");
  };

  const handleCardUpdated = (updatedCard) => {
    setCards((prev) =>
      prev.map((card) => (card._id === updatedCard._id ? updatedCard : card))
    );
    // Update selected card if it's the one being updated
    if (selectedCard && selectedCard._id === updatedCard._id) {
      setSelectedCard(updatedCard);
    }
  };

  const handleCardDeleted = (cardId) => {
    setCards((prev) => prev.filter((card) => card._id !== cardId));
    showToast("Card deleted successfully!", "success");
    // Close modal if the deleted card was selected
    if (selectedCard && selectedCard._id === cardId) {
      setShowCardModal(false);
      setSelectedCard(null);
      // Navigate back to project view
      navigate(`/project/${actualProjectId}`);
    }
  };

  const handleStatusChange = async (cardId, newStatus) => {
    try {
      await cardAPI.updateStatus(cardId, { status: newStatus });
      setCards((prev) =>
        prev.map((card) =>
          card._id === cardId ? { ...card, status: newStatus } : card
        )
      );
      // Update selected card if it's the one being updated
      if (selectedCard && selectedCard._id === cardId) {
        setSelectedCard((prev) => ({ ...prev, status: newStatus }));
      }
    } catch (error) {
      console.error("Error updating card status:", error);
      showToast("Failed to update card status", "error");
    }
  };

  // Card modal handlers
  const handleCardClick = (card) => {
    setSelectedCard(card);
    setShowCardModal(true);
    // Update URL to include card ID
    navigate(`/project/${actualProjectId}/card/${card._id}`);
  };

  const handleCardModalClose = () => {
    setShowCardModal(false);
    setSelectedCard(null);
    // Navigate back to project view
    navigate(`/project/${actualProjectId}`);
  };

  const getCardsByStatus = (status) => {
    return cards.filter((card) => card.status === status);
  };

  const getColumnConfig = (column) => {
    // Use card status colors for better design consistency
    const cardStatusColors = getCardStatusColors(column.status);

    return {
      title: column.name,
      color: column.color,
      bgColor: cardStatusColors.bgColor,
      borderColor: cardStatusColors.borderColor,
      textColor: cardStatusColors.textColor,
    };
  };

  const handleColumnRename = async (status, newTitle) => {
    try {
      // Find the column
      const column = columns.find((col) => col.status === status);
      if (!column) {
        showToast("Column not found", "error");
        return;
      }

      const newStatus = newTitle.toLowerCase().replace(/\s+/g, "_");
      let response;

      // All columns are now custom columns, so always update existing entry
      response = await columnAPI.updateColumn(id, column._id, {
        name: newTitle,
        status: newStatus,
        position: column.position, // Preserve original position
      });

      if (response.data.success) {
        // Update existing custom column
        setColumns((prev) =>
          prev.map((col) =>
            col._id === column._id
              ? {
                  ...col,
                  name: newTitle,
                  status: newStatus,
                  position: column.position, // Keep original position
                }
              : col
          )
        );

        // Update cards with the old status to use the new status
        setCards((prev) =>
          prev.map((card) =>
            card.status === status ? { ...card, status: newStatus } : card
          )
        );

        showToast("Column renamed successfully!", "success");
      }
    } catch (error) {
      console.error("Error renaming column:", error);
      showToast("Failed to rename column", "error");
    }
  };

  const handleColumnDelete = (status) => {
    // Find the column
    const column = columns.find((col) => col.status === status);
    if (!column || column.isDefault) {
      showToast("Cannot delete default columns", "error");
      return;
    }

    setColumnToDelete(column);
    setShowDeleteConfirm(true);
  };

  const confirmDeleteColumn = async () => {
    if (!columnToDelete) return;

    try {
      const response = await columnAPI.deleteColumn(id, columnToDelete._id);
      if (response.data.success) {
        setColumns((prev) =>
          prev.filter((col) => col._id !== columnToDelete._id)
        );
        showToast("Column deleted successfully!", "success");
      }
    } catch (error) {
      console.error("Error deleting column:", error);
      showToast("Failed to delete column", "error");
    } finally {
      setShowDeleteConfirm(false);
      setColumnToDelete(null);
    }
  };

  const handleAddColumn = async () => {
    if (!newColumnName.trim()) {
      showToast("Column name is required", "error");
      return;
    }

    try {
      const response = await columnAPI.createColumn(id, {
        name: newColumnName.trim(),
        color: newColumnColor,
      });

      if (response.data.success) {
        setColumns((prev) => [...prev, response.data.column]);
        setNewColumnName("");
        setNewColumnColor("gray");
        setShowAddColumnModal(false);
        showToast("Column created successfully!", "success");
      }
    } catch (error) {
      console.error("Error creating column:", error);
      showToast("Failed to create column", "error");
    }
  };

  const handleAddCardToColumn = (status) => {
    console.log("Add card button clicked for status:", status);
    setSelectedStatus(status);
    setShowCreateModal(true);
  };

  const handleScroll = () => {
    if (scrollContainerRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } =
        scrollContainerRef.current;
      setShowScrollButton(scrollLeft < scrollWidth - clientWidth - 10);
    }
  };

  const scrollToEnd = () => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTo({
        left: scrollContainerRef.current.scrollWidth,
        behavior: "smooth",
      });
    }
  };

  if (loading || loadingCards) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (!currentProject) {
    return (
      <div className="text-center py-12">
        <h3 className="text-lg font-medium text-secondary-900 mb-2">
          Project not found
        </h3>
        <p className="text-secondary-600 mb-6">
          The project you're looking for doesn't exist.
        </p>
        <Link to="/" className="btn-primary">
          Back to Dashboard
        </Link>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col max-h-full">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-lg p-6 text-white mb-8 flex-shrink-0">
        <div className="flex items-center justify-between">
          {/* Left Section - Navigation & Project Info */}
          <div className="flex items-center space-x-4">
            {/* Back Button */}
            <Link
              to="/"
              className="p-2 rounded-lg hover:bg-blue-500 text-white hover:text-white transition-colors duration-200"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>

            {/* Project Information */}
            <div>
              <h1 className="text-2xl font-bold mb-2">{currentProject.name}</h1>
              <p className="text-blue-100 text-lg">
                {stripHtmlTags(currentProject.description)?.length > 120
                  ? stripHtmlTags(currentProject.description).substring(
                      0,
                      120
                    ) + "..."
                  : stripHtmlTags(currentProject.description)}
              </p>
            </div>
          </div>

          {/* Right Section - Project Dates Card */}
          <div className="flex items-center space-x-3">
            {/* Status Badges */}
            <div className="flex items-center space-x-2">
              <span
                className={`px-2.5 py-0.5 rounded-full text-xs font-medium border ${
                  getProjectStatusColors(currentProject.projectStatus).bgColor
                } ${
                  getProjectStatusColors(currentProject.projectStatus).textColor
                } ${
                  getProjectStatusColors(currentProject.projectStatus)
                    .borderColor
                }`}
              >
                {getProjectStatusColors(currentProject.projectStatus).label}
              </span>
              <span
                className={`px-2.5 py-0.5 rounded-full text-xs font-medium border ${
                  getProjectTypeColors(currentProject.projectType).bgColor
                } ${
                  getProjectTypeColors(currentProject.projectType).textColor
                } ${
                  getProjectTypeColors(currentProject.projectType).borderColor
                }`}
              >
                {getProjectTypeColors(currentProject.projectType).label}
              </span>
            </div>

            {/* Project Dates Card */}
            <div className="bg-white bg-opacity-20 rounded-xl p-3 text-white">
              <div className="flex items-center space-x-3">
                <div className="w-12 h-12 bg-white bg-opacity-20 rounded-xl flex items-center justify-center">
                  <Calendar className="w-6 h-6" />
                </div>
                <div className="text-center">
                  <div className="text-sm font-semibold">
                    {formatDate(projectData.project?.startDate)}
                  </div>
                  <div className="text-blue-100 text-xs">Start Date</div>
                  {projectData.project?.endDate && (
                    <>
                      <div className="text-sm font-semibold mt-1">
                        {formatDate(projectData.project?.endDate)}
                      </div>
                      <div className="text-blue-100 text-xs">End Date</div>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Board */}
      <div className="relative flex-1 overflow-hidden min-h-0">
        <div
          ref={scrollContainerRef}
          onScroll={handleScroll}
          className="h-full overflow-x-auto pb-4 scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100 scroll-smooth"
        >
          <div className="flex gap-4 lg:gap-6 min-w-max h-full">
            {columns.map((column) => {
              const config = getColumnConfig(column);
              return (
                <div
                  key={column._id || column.status}
                  className="w-80 flex-shrink-0"
                >
                  <ListColumn
                    title={config.title}
                    status={column.status}
                    cards={getCardsByStatus(column.status)}
                    color={config.color}
                    bgColor={config.bgColor}
                    borderColor={config.borderColor}
                    textColor={config.textColor}
                    onCardUpdated={handleCardUpdated}
                    onCardDeleted={handleCardDeleted}
                    onStatusChange={handleStatusChange}
                    onCardClick={handleCardClick}
                    projectId={actualProjectId}
                    onColumnRename={handleColumnRename}
                    onColumnDelete={handleColumnDelete}
                    onAddCard={handleAddCardToColumn}
                  />
                </div>
              );
            })}

            {/* Add Column Button - Fixed Position */}
            <div className="w-80 flex-shrink-0">
              <div className="bg-gray-50 rounded-lg border-2 border-dashed border-gray-300 h-[600px] flex items-center justify-center hover:bg-gray-100 hover:border-gray-400 transition-all duration-200 group">
                <button
                  onClick={() => setShowAddColumnModal(true)}
                  className="flex flex-col items-center space-y-3 text-gray-500 hover:text-gray-700 transition-colors duration-200 group-hover:scale-105"
                >
                  <div className="w-12 h-12 rounded-full bg-gray-200 group-hover:bg-gray-300 flex items-center justify-center transition-colors duration-200">
                    <Plus className="w-6 h-6" />
                  </div>
                  <div className="text-center">
                    <p className="text-sm font-medium">Add Column</p>
                    <p className="text-xs text-gray-400 mt-1">
                      Create a new workflow stage
                    </p>
                  </div>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Scroll indicators */}
        <div className="absolute top-0 left-0 bg-gradient-to-r from-white to-transparent w-8 h-full pointer-events-none opacity-50"></div>
        <div className="absolute top-0 right-0 bg-gradient-to-l from-white to-transparent w-8 h-full pointer-events-none opacity-50"></div>

        {/* Scroll to end button */}
        {showScrollButton && (
          <button
            onClick={scrollToEnd}
            className="absolute bottom-6 right-6 bg-blue-600 text-white p-3 rounded-full shadow-lg hover:bg-blue-700 transition-colors duration-200 z-10"
            title="Scroll to end"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Create Card Modal */}
      {showCreateModal && (
        <CreateCardModal
          projectId={id}
          onClose={() => setShowCreateModal(false)}
          onCardCreated={handleCardCreated}
          defaultStatus={selectedStatus}
        />
      )}

      {/* Add Column Modal */}
      {showAddColumnModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-96 max-w-md mx-4">
            <h3 className="text-lg font-semibold mb-4">Add New Column</h3>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Column Name
                </label>
                <input
                  type="text"
                  value={newColumnName}
                  onChange={(e) => setNewColumnName(e.target.value)}
                  placeholder="Enter column name"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Color
                </label>
                <div className="flex space-x-2">
                  {["blue", "green", "red", "gray", "yellow"].map((color) => (
                    <button
                      key={color}
                      onClick={() => setNewColumnColor(color)}
                      className={`w-8 h-8 rounded-full border-2 ${
                        newColumnColor === color
                          ? "border-gray-800"
                          : "border-gray-300"
                      } bg-${color}-500 hover:opacity-80 transition-opacity`}
                    />
                  ))}
                </div>
              </div>
            </div>

            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={() => {
                  setShowAddColumnModal(false);
                  setNewColumnName("");
                  setNewColumnColor("gray");
                }}
                className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleAddColumn}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Create Column
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Column Confirmation Modal */}
      <ConfirmationModal
        isOpen={showDeleteConfirm}
        onClose={() => {
          setShowDeleteConfirm(false);
          setColumnToDelete(null);
        }}
        onConfirm={confirmDeleteColumn}
        title="Delete Column"
        message={
          columnToDelete
            ? `Are you sure you want to delete the "${columnToDelete.name}" column? All cards in this column will be moved to "To Do".`
            : "Are you sure you want to delete this column?"
        }
        confirmText="Delete Column"
        cancelText="Cancel"
        type="danger"
        isLoading={false}
      />

      {/* Card Modal */}
      {showCardModal && selectedCard && (
        <CardModal
          card={selectedCard}
          onClose={handleCardModalClose}
          onCardUpdated={handleCardUpdated}
          onCardDeleted={handleCardDeleted}
          onStatusChange={handleStatusChange}
        />
      )}
    </div>
  );
};

export default ProjectBoard;
