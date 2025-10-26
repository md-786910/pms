import React, { useState, useEffect, useRef } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Plus,
  MoreVertical,
  ChevronRight,
  Settings,
  Calendar,
  Filter,
  X,
} from "lucide-react";
import { useProject } from "../contexts/ProjectContext";
import { useNotification } from "../contexts/NotificationContext";
import { useSocket } from "../contexts/SocketContext";
import { useUser } from "../contexts/UserContext";
import { cardAPI, columnAPI, projectAPI } from "../utils/api";
import ListColumn from "./ListColumn";
import CreateCardModal from "./CreateCardModal";
import ConfirmationModal from "./ConfirmationModal";
import CardModal from "./CardModal";
import EditProjectModal from "./EditProjectModal";
import FilterPanel from "./FilterPanel";
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
  const { socket, joinProject, leaveProject } = useSocket();
  const { user } = useUser();
  const [cards, setCards] = useState([]);
  const [columns, setColumns] = useState([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [columnToDelete, setColumnToDelete] = useState(null);
  const [selectedStatus, setSelectedStatus] = useState("todo");
  const [showScrollButton, setShowScrollButton] = useState(false);
  const scrollContainerRef = useRef(null);
  const addColumnModalRef = useRef(null);
  const [loadingCards, setLoadingCards] = useState(true);
  const [loadingColumns, setLoadingColumns] = useState(true);
  const [showAddColumnModal, setShowAddColumnModal] = useState(false);
  const [newColumnName, setNewColumnName] = useState("");
  const [newColumnColor, setNewColumnColor] = useState("gray");
  const [showEditProjectModal, setShowEditProjectModal] = useState(false);

  // Card modal state
  const [selectedCard, setSelectedCard] = useState(null);
  const [showCardModal, setShowCardModal] = useState(false);
  const [projectData, setProjectData] = useState([]);
  const [draggingColumnId, setDraggingColumnId] = useState(null);
  const [dragOverColumnId, setDragOverColumnId] = useState(null);

  // Filter state
  const [filteredCards, setFilteredCards] = useState([]);
  const [showFilterPanel, setShowFilterPanel] = useState(false);
  const [hasActiveFilters, setHasActiveFilters] = useState(false);

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

  // Join/leave project room on mount/unmount
  useEffect(() => {
    if (actualProjectId && socket) {
      joinProject(actualProjectId);
      return () => {
        leaveProject(actualProjectId);
      };
    }
  }, [actualProjectId, socket, joinProject, leaveProject]);

  // Listen for Socket.IO events
  useEffect(() => {
    if (!socket) return;

    const handleCardCreated = (data) => {
      console.log("Card created event received:", data);
      // Only update if not created by current user
      if (data.card && data.userId !== user?._id && data.userId !== user?.id) {
        setCards((prev) => [...prev, data.card]);
        setFilteredCards((prev) => [...prev, data.card]);
        showToast(`New card "${data.card.title}" created!`, "success");
      }
    };

    const handleCardUpdated = (data) => {
      console.log("Card updated event received:", data);
      // Only update if not updated by current user
      if (data.card && data.userId !== user?._id && data.userId !== user?.id) {
        setCards((prev) =>
          prev.map((card) => (card._id === data.card._id ? data.card : card))
        );
        setFilteredCards((prev) =>
          prev.map((card) => (card._id === data.card._id ? data.card : card))
        );
        // Update selected card if it's the one being updated
        if (selectedCard && selectedCard._id === data.card._id) {
          setSelectedCard(data.card);
        }
      }
    };

    const handleCardArchived = (data) => {
      console.log("Card archived event received:", data);
      if (data.card) {
        setCards((prev) =>
          prev.map((card) =>
            card._id === data.card._id
              ? { ...card, isArchived: true, status: "archive" }
              : card
          )
        );
        setFilteredCards((prev) =>
          prev.map((card) =>
            card._id === data.card._id
              ? { ...card, isArchived: true, status: "archive" }
              : card
          )
        );
        // Close modal if the archived card was selected
        if (selectedCard && selectedCard._id === data.card._id) {
          setShowCardModal(false);
          setSelectedCard(null);
        }
      }
    };

    const handleCardRestored = (data) => {
      console.log("Card restored event received:", data);
      if (data.card) {
        // Use the function directly instead of calling fetchCards
        cardAPI
          .getCards(actualProjectId, true)
          .then((response) => {
            const fetchedCards = response.data.cards || [];
            setCards(fetchedCards);
            setFilteredCards(fetchedCards);
          })
          .catch((error) => {
            console.error("Error fetching cards:", error);
          });
      }
    };

    const handleCardStatusChanged = (data) => {
      console.log("Card status changed event received:", data);
      if (data.card) {
        setCards((prev) =>
          prev.map((card) =>
            card._id === data.card._id
              ? { ...card, status: data.card.status }
              : card
          )
        );
        setFilteredCards((prev) =>
          prev.map((card) =>
            card._id === data.card._id
              ? { ...card, status: data.card.status }
              : card
          )
        );
        // Update selected card if it's the one being updated
        if (selectedCard && selectedCard._id === data.card._id) {
          setSelectedCard((prev) => ({ ...prev, status: data.card.status }));
        }
      }
    };

    const handleColumnCreated = (data) => {
      console.log("Column created event received:", data);
      // Only update if not created by current user
      if (
        data.column &&
        data.userId !== user?._id &&
        data.userId !== user?.id
      ) {
        setColumns((prev) => [...prev, data.column]);
        showToast(`New column "${data.column.name}" created!`, "success");
      }
    };

    const handleColumnUpdated = (data) => {
      console.log("Column updated event received:", data);
      if (data.column) {
        setColumns((prev) =>
          prev.map((col) => (col._id === data.column._id ? data.column : col))
        );
      }
    };

    socket.on("card-created", handleCardCreated);
    socket.on("card-updated", handleCardUpdated);
    socket.on("card-archived", handleCardArchived);
    socket.on("card-restored", handleCardRestored);
    socket.on("card-status-changed", handleCardStatusChanged);
    socket.on("card-user-assigned", handleCardUpdated);
    socket.on("card-user-unassigned", handleCardUpdated);
    socket.on("card-label-added", handleCardUpdated);
    socket.on("card-label-removed", handleCardUpdated);
    socket.on("card-attachment-added", handleCardUpdated);
    socket.on("card-attachment-removed", handleCardUpdated);
    socket.on("card-files-uploaded", handleCardUpdated);
    socket.on("column-created", handleColumnCreated);
    socket.on("column-updated", handleColumnUpdated);

    return () => {
      socket.off("card-created", handleCardCreated);
      socket.off("card-updated", handleCardUpdated);
      socket.off("card-archived", handleCardArchived);
      socket.off("card-restored", handleCardRestored);
      socket.off("card-status-changed", handleCardStatusChanged);
      socket.off("card-user-assigned", handleCardUpdated);
      socket.off("card-user-unassigned", handleCardUpdated);
      socket.off("card-label-added", handleCardUpdated);
      socket.off("card-label-removed", handleCardUpdated);
      socket.off("card-attachment-added", handleCardUpdated);
      socket.off("card-attachment-removed", handleCardUpdated);
      socket.off("card-files-uploaded", handleCardUpdated);
      socket.off("column-created", handleColumnCreated);
      socket.off("column-updated", handleColumnUpdated);
    };
  }, [socket, selectedCard, showToast, user]);

  // Handle click outside to close add column modal
  useEffect(() => {
    if (!showAddColumnModal) return;

    const handleClickOutside = (event) => {
      if (
        addColumnModalRef.current &&
        !addColumnModalRef.current.contains(event.target)
      ) {
        setShowAddColumnModal(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [showAddColumnModal]);

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
      const response = await cardAPI.getCards(actualProjectId, true); // Include archived cards
      console.log("Cards response:", response);
      const fetchedCards = response.data.cards || [];
      setCards(fetchedCards);
      setFilteredCards(fetchedCards); // Initialize filtered cards
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
    setFilteredCards((prev) => [...prev, newCard]);
    showToast("Card created successfully!", "success");
  };

  const handleCancelFilter = () => {
    setFilteredCards(cards);
    setHasActiveFilters(false);
    showToast("Filters cleared", "success");
  };

  const handleCardUpdated = (updatedCard) => {
    setCards((prev) =>
      prev.map((card) => (card._id === updatedCard._id ? updatedCard : card))
    );
    setFilteredCards((prev) =>
      prev.map((card) => (card._id === updatedCard._id ? updatedCard : card))
    );
    // Update selected card if it's the one being updated
    if (selectedCard && selectedCard._id === updatedCard._id) {
      setSelectedCard(updatedCard);
    }
  };

  const handleCardDeleted = (cardId) => {
    // Update the card to be archived instead of removing it
    setCards((prev) =>
      prev.map((card) =>
        card._id === cardId
          ? { ...card, isArchived: true, status: "archive" }
          : card
      )
    );
    setFilteredCards((prev) =>
      prev.map((card) =>
        card._id === cardId
          ? { ...card, isArchived: true, status: "archive" }
          : card
      )
    );
    showToast("Card archived successfully!", "success");
    // Close modal if the archived card was selected
    if (selectedCard && selectedCard._id === cardId) {
      setShowCardModal(false);
      setSelectedCard(null);
      // Navigate back to project view
      navigate(`/project/${actualProjectId}`);
    }
  };

  const handleCardRestored = async (cardId) => {
    try {
      const response = await cardAPI.restoreCard(cardId);
      if (response.data.success) {
        // Refresh cards to get updated data
        await fetchCards();
        showToast("Card restored successfully!", "success");

        // Update selected card if it's the one being restored
        if (selectedCard && selectedCard._id === cardId) {
          setSelectedCard((prev) => ({
            ...prev,
            isArchived: false,
            archivedAt: null,
            archivedBy: null,
            status: response.data.card.status,
          }));
        }
      }
    } catch (error) {
      console.error("Error restoring card:", error);
      showToast("Failed to restore card", "error");
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
      setFilteredCards((prev) =>
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
    if (status === "archive") {
      // For archive column, show only archived cards
      return filteredCards.filter((card) => card.isArchived === true);
    } else {
      // For other columns, show only non-archived cards with matching status
      return filteredCards.filter(
        (card) => card.status === status && card.isArchived !== true
      );
    }
  };

  const getColumnConfig = (column) => {
    // Use card status colors for better design consistency
    const cardStatusColors = getCardStatusColors(column.status);

    return {
      title: column?.name,
      color: column?.color,
      bgColor: cardStatusColors?.bgColor,
      borderColor: cardStatusColors?.borderColor,
      textColor: cardStatusColors?.textColor,
    };
  };

  // Drag and Drop for columns
  const handleColumnDragStart = (columnId) => {
    setDraggingColumnId(columnId);
    // Improve UX cursor on drag
    try {
      if (window?.event?.dataTransfer) {
        window.event.dataTransfer.effectAllowed = "move";
      }
    } catch (_) {}
  };

  const handleColumnDragOver = (e) => {
    // Allow dropping by preventing default
    e.preventDefault();
  };

  const handleColumnDrop = async (targetColumnId) => {
    if (!draggingColumnId || draggingColumnId === targetColumnId) return;

    // Compute new order locally for instant UI feedback
    const nonArchiveColumns = columns.filter((c) => c.status !== "archive");
    const archiveColumn = columns.find((c) => c.status === "archive");

    const currentIndex = nonArchiveColumns.findIndex(
      (c) => (c._id || c.status) === draggingColumnId
    );
    const targetIndex = nonArchiveColumns.findIndex(
      (c) => (c._id || c.status) === targetColumnId
    );

    if (currentIndex === -1 || targetIndex === -1) {
      setDraggingColumnId(null);
      return;
    }

    const reordered = [...nonArchiveColumns];
    const [moved] = reordered.splice(currentIndex, 1);
    reordered.splice(targetIndex, 0, moved);

    const nextColumns = archiveColumn
      ? [...reordered, archiveColumn]
      : reordered;
    setColumns(nextColumns);

    // Persist order (send only non-archive column ids)
    try {
      const orderedIds = reordered.map((c) => c._id);
      await columnAPI.reorderColumns(actualProjectId, orderedIds);
    } catch (error) {
      console.error("Failed to persist column order:", error);
      showToast("Failed to save column order", "error");
      // Refetch to resync with server state
      fetchColumns();
    } finally {
      setDraggingColumnId(null);
      setDragOverColumnId(null);
    }
  };

  const handleColumnDragEnd = () => {
    setDraggingColumnId(null);
    setDragOverColumnId(null);
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
        setFilteredCards((prev) =>
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

  const handleEditProject = () => {
    setShowEditProjectModal(true);
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
        <h3 className="text-lg font-medium text-slate-900 mb-2">
          Project not found
        </h3>
        <p className="text-slate-600 mb-6">
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
      {/* Compact Modern Header */}
      <div className="bg-white rounded-2xl shadow-lg border border-slate-200/50 px-6 py-4 mb-6 flex-shrink-0">
        <div className="flex items-center justify-between gap-4">
          {/* Left: Back + title + description */}
          <div className="flex items-center gap-4 min-w-0 flex-1">
            <Link
              to="/"
              className="p-2 rounded-xl hover:bg-slate-100 text-slate-600 hover:text-indigo-600 transition-all duration-300"
              title="Back"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div className="min-w-0 flex-1">
              <h1 className="text-xl font-bold truncate tracking-tight bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                {currentProject.name}
              </h1>
              <p className="text-slate-500 text-xs truncate mt-0.5">
                {stripHtmlTags(currentProject.description)}
              </p>
            </div>
          </div>

          {/* Right: Status pills + Date pill + Filter + Settings */}
          <div className="flex items-center gap-3 flex-shrink-0">
            {/* Status pill */}
            <span
              className={`px-3 py-1.5 rounded-full text-xs font-semibold border shadow-sm ${
                getProjectStatusColors(currentProject.projectStatus).bgColor
              } ${
                getProjectStatusColors(currentProject.projectStatus).textColor
              } ${
                getProjectStatusColors(currentProject.projectStatus).borderColor
              }`}
              title="Project status"
            >
              {getProjectStatusColors(currentProject.projectStatus).label}
            </span>

            {/* Date pill - Compact */}
            <div className="flex items-center gap-2 bg-slate-50 rounded-full px-3 py-1.5">
              <Calendar className="w-4 h-4 text-slate-600" />
              <div className="text-xs text-slate-700">
                <span className="font-semibold">
                  {formatDate(projectData.project?.startDate)}
                </span>
                {projectData.project?.endDate && (
                  <>
                    <span className="text-slate-400 mx-1">→</span>
                    <span className="font-semibold">
                      {formatDate(projectData.project?.endDate)}
                    </span>
                  </>
                )}
              </div>
            </div>

            {/* Filter button */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowFilterPanel(!showFilterPanel)}
                className="p-2 rounded-xl hover:bg-slate-100 text-slate-600 hover:text-indigo-600 transition-all duration-300 relative"
                title="Filter cards"
              >
                <Filter className="w-5 h-5" />
                {hasActiveFilters && (
                  <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white shadow-lg"></span>
                )}
              </button>
              {hasActiveFilters && (
                <button
                  onClick={handleCancelFilter}
                  className="py-2 px-3 rounded-xl bg-gradient-to-r from-red-500 to-pink-500 hover:from-red-600 hover:to-pink-600 text-white transition-all duration-300 flex items-center gap-1.5 text-xs font-semibold shadow-lg"
                  title="Cancel all filters"
                >
                  <X className="w-3.5 h-3.5" />
                  <span>Cancel</span>
                </button>
              )}
            </div>

            {/* Settings button */}
            <button
              onClick={handleEditProject}
              className="p-2 rounded-xl hover:bg-slate-100 text-slate-600 hover:text-indigo-600 transition-all duration-300"
              title="Project Settings"
            >
              <Settings className="w-5 h-5" />
            </button>
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
              const colKey = column._id || column.status;
              return (
                <div
                  key={colKey}
                  className={`w-80 flex-shrink-0 transition-all duration-150 cursor-grab active:cursor-grabbing ${
                    draggingColumnId === colKey
                      ? "opacity-40 scale-[0.98]"
                      : "opacity-100"
                  } ${
                    dragOverColumnId === colKey
                      ? "ring-4 ring-blue-500 rounded-lg bg-blue-50 shadow-xl border-2 border-blue-300"
                      : ""
                  }`}
                  draggable={column.status !== "archive"}
                  onDragStart={() => handleColumnDragStart(colKey)}
                  onDragEnter={() => setDragOverColumnId(colKey)}
                  onDragOver={handleColumnDragOver}
                  onDragLeave={() => setDragOverColumnId(null)}
                  onDrop={() => handleColumnDrop(colKey)}
                  onDragEnd={handleColumnDragEnd}
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
                    onCardRestored={handleCardRestored}
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
              <div className="bg-gradient-to-br from-slate-50 to-indigo-50/30 rounded-2xl border-2 border-dashed border-slate-300 h-[600px] flex items-center justify-center hover:bg-gradient-to-br hover:from-slate-100 hover:to-indigo-100/50 hover:border-indigo-400 transition-all duration-300 group backdrop-blur-sm">
                <button
                  onClick={() => setShowAddColumnModal(true)}
                  className="flex flex-col items-center space-y-3 text-slate-600 hover:text-indigo-600 transition-all duration-300 group-hover:scale-105"
                >
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-100 to-purple-100 group-hover:from-indigo-200 group-hover:to-purple-200 flex items-center justify-center transition-all duration-300 shadow-lg">
                    <Plus className="w-7 h-7 text-indigo-600" />
                  </div>
                  <div className="text-center">
                    <p className="text-sm font-semibold">Add Column</p>
                    <p className="text-xs text-slate-500 mt-1">
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
            className="absolute bottom-6 right-6 bg-gradient-to-r from-indigo-600 to-purple-600 text-white p-3 rounded-full shadow-xl hover:shadow-2xl hover:scale-110 transition-all duration-300 z-10"
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
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
          <div
            ref={addColumnModalRef}
            className="bg-white/95 backdrop-blur-xl rounded-3xl p-6 w-96 max-w-md mx-4 shadow-2xl border border-slate-200/50"
          >
            <h3 className="text-lg font-bold text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-purple-600 mb-5">
              Add New Column
            </h3>

            <div className="space-y-5">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  Column Name
                </label>
                <input
                  type="text"
                  value={newColumnName}
                  onChange={(e) => setNewColumnName(e.target.value)}
                  placeholder="Enter column name"
                  className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-300 bg-white"
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  Color
                </label>
                <div className="flex space-x-3">
                  {["blue", "green", "red", "gray", "yellow"].map((color) => (
                    <button
                      key={color}
                      onClick={() => setNewColumnColor(color)}
                      className={`w-10 h-10 rounded-xl border-2 transition-all duration-300 ${
                        newColumnColor === color
                          ? "border-slate-800 shadow-lg"
                          : "border-slate-300 hover:border-slate-400"
                      } bg-${color}-500 hover:scale-110`}
                    />
                  ))}
                </div>
              </div>
            </div>

            <div className="flex justify-end space-x-3 mt-6 pt-5 border-t border-slate-200/50">
              <button
                onClick={() => {
                  setShowAddColumnModal(false);
                  setNewColumnName("");
                  setNewColumnColor("gray");
                }}
                className="px-5 py-2.5 text-slate-600 hover:text-slate-800 transition-all duration-300"
              >
                Cancel
              </button>
              <button onClick={handleAddColumn} className="btn-primary">
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
          onCardRestored={handleCardRestored}
          onStatusChange={handleStatusChange}
        />
      )}

      {/* Edit Project Modal */}
      {showEditProjectModal && currentProject && (
        <EditProjectModal
          project={currentProject}
          onClose={() => setShowEditProjectModal(false)}
        />
      )}

      {/* Filter Panel */}
      <FilterPanel
        isOpen={showFilterPanel}
        onClose={() => setShowFilterPanel(false)}
        cards={cards}
        onFilterChange={(filtered) => {
          setFilteredCards(filtered);
          setHasActiveFilters(filtered.length !== cards.length);
        }}
        columns={columns}
        project={currentProject}
      />
    </div>
  );
};

export default ProjectBoard;
