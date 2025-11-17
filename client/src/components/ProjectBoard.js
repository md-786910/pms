import React, { useState, useEffect, useRef } from "react";
import { useParams, Link, useNavigate, useLocation } from "react-router-dom";
import {
  ArrowLeft,
  Plus,
  ChevronRight,
  Settings,
  Calendar,
  Filter,
  X,
  ExternalLink,
  Users,
  UserPlus,
  UserMinus,
} from "lucide-react";
import Avatar from "./Avatar";
import InviteUserModal from "./InviteUserModal";
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
// import { stripHtmlTags } from "../utils/htmlUtils";
import {
  getProjectStatusColors,
  getCardStatusColors,
} from "../utils/statusColors";

const ProjectBoard = () => {
  const { id, projectId, cardId } = useParams();
  const navigate = useNavigate();
  const { currentProject, fetchProject, loading, removeProjectMember } =
    useProject();
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
  const [showMembersPopover, setShowMembersPopover] = useState(false);
  const membersBtnRef = useRef(null);
  const membersPopoverRef = useRef(null);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [removingMemberId, setRemovingMemberId] = useState(null);
  const [confirmingUserId, setConfirmingUserId] = useState(null);

  useEffect(() => {
    const fetchProjectData = async () => {
      try {
        const response = await projectAPI.getProject(id);
        setProjectData(response.data);
      } catch (error) {
        console.error("Error fetching project data:", error);
      }
    };

    if (!selectedCard) {
      fetchProjectData();
    }
  }, [id]);

  // Close members popover on outside click
  useEffect(() => {
    if (!showMembersPopover) return;
    const handleClickOutside = (e) => {
      // Check if click is outside both the button AND the popover content
      const isOutsideButton =
        membersBtnRef.current && !membersBtnRef.current.contains(e.target);
      const isOutsidePopover =
        membersPopoverRef.current &&
        !membersPopoverRef.current.contains(e.target);

      if (isOutsideButton && isOutsidePopover) {
        setShowMembersPopover(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showMembersPopover]);

  const handleRemoveMember = async (memberUserId) => {
    if (!currentProject?._id) return;
    try {
      setRemovingMemberId(memberUserId);
      await removeProjectMember(currentProject._id, memberUserId);
      await fetchProject(currentProject._id);
      showToast("Member removed from project", "success");
    } catch (error) {
      console.error("Error removing member:", error);
      showToast(
        error.response?.data?.message || "Failed to remove member",
        "error"
      );
    } finally {
      setRemovingMemberId(null);
    }
  };

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
      // Only update if not created by current user
      if (data.card && data.userId !== user?._id && data.userId !== user?.id) {
        setCards((prev) => [...prev, data.card]);
        setFilteredCards((prev) => [...prev, data.card]);
        showToast(`New card "${data.card.title}" created!`, "success");
      }
    };

    const handleCardUpdated = (data) => {
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
  }, [socket, selectedCard, showToast, user, actualProjectId]);

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
      const response = await cardAPI.getCards(actualProjectId, true); // Include archived cards
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
      const response = await columnAPI.getColumns(actualProjectId);
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

  const handleNavigateCard = (card) => {
    setSelectedCard(card);
    // Update URL to include card ID
    navigate(`/project/${actualProjectId}/card/${card._id}`);
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
    // Open modal and update the URL so refreshing preserves modal state
    if (actualProjectId) {
      navigate(`/project/${actualProjectId}/edit`);
    }
    setShowEditProjectModal(true);
  };

  // Keep edit modal state in sync with the URL so refreshing the page
  // with /edit stays open, and navigating away closes it.
  const location = useLocation();

  useEffect(() => {
    if (!actualProjectId) return;

    const pathname = location.pathname || "";
    // If path contains /edit or /settings at the end, show modal
    if (
      pathname.endsWith(`/${actualProjectId}/edit`) ||
      pathname.endsWith(`/${actualProjectId}/settings`) ||
      pathname.endsWith(`/project/${actualProjectId}/edit`) ||
      pathname.endsWith(`/project/${actualProjectId}/settings`) ||
      pathname.includes(`/${actualProjectId}/edit`) ||
      pathname.includes(`/${actualProjectId}/settings`)
    ) {
      setShowEditProjectModal(true);
    } else {
      setShowEditProjectModal(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname, actualProjectId]);

  if (loading || loadingCards || loadingColumns) {
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
      {/* Compact Header */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-lg px-5 py-4 text-white mb-4 flex-shrink-0">
        <div className="flex items-center justify-between gap-3">
          {/* Left: Back + title + description */}
          <div className="flex items-center gap-3 min-w-0">
            {/* <Link
              to="/"
              className="p-2 rounded-lg hover:bg-blue-500 text-white transition-colors"
              title="Back"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link> */}
            <div className="min-w-0">
              <h1 className="text-lg font-semibold truncate max-w-[40vw]">
                {currentProject.name}
              </h1>
              {/* <p className="text-blue-100 text-sm truncate max-w-[50vw]">
                {stripHtmlTags(currentProject.description)}
              </p> */}
            </div>
          </div>

          {/* Right: Members + Status pills + Date pill + Filter + Settings */}
          <div className="flex items-center gap-2 relative">
            <div className="flex flex-wrap items-center justify-center gap-2 mr-6">
              {/* Live URL */}
              {currentProject.liveSiteUrl && (
                <a
                  href={currentProject.liveSiteUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="
        group relative flex items-center gap-2
        px-2 py-2 rounded-lg text-xs font-medium
        text-white shadow-md transition-all duration-300
        bg-gradient-to-r from-emerald-500/80 to-teal-500/80
        hover:from-emerald-400 hover:to-teal-400
        hover:scale-105 hover:shadow-emerald-500/40
      "
                >
                  <span>Live Site</span>
                  <ExternalLink className="w-4 h-4 text-white group-hover:rotate-12 transition-transform duration-300" />
                </a>
              )}

              {/* Demo URL */}
              {currentProject.demoSiteUrl && (
                <a
                  href={currentProject.demoSiteUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="
        group relative flex items-center gap-2
        px-2 py-2 rounded-lg text-xs font-medium
        text-white shadow-md transition-all duration-300
        bg-gradient-to-r from-blue-500/80 to-indigo-500/80
        hover:from-blue-400 hover:to-indigo-400
        hover:scale-105 hover:shadow-blue-500/40
      "
                >
                  <span>Demo Site</span>
                  <ExternalLink className="w-4 h-4 text-white group-hover:rotate-12 transition-transform duration-300" />
                </a>
              )}

              {/* Markup URL */}
              {currentProject.markupUrl && (
                <a
                  href={currentProject.markupUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="
        group relative flex items-center gap-2
        px-2 py-2 rounded-lg text-xs font-medium
        text-white shadow-md transition-all duration-300
        bg-gradient-to-r from-pink-500/80 to-rose-500/80
        hover:from-pink-400 hover:to-rose-400
        hover:scale-105 hover:shadow-pink-500/40
      "
                >
                  <span>Markup</span>
                  <ExternalLink className="w-4 h-4 text-white group-hover:rotate-12 transition-transform duration-300" />
                </a>
              )}
            </div>

            {/* Members avatar group */}
            {Array.isArray(currentProject.members) && (
              <div className="flex items-center gap-2 relative z-[20]">
                <button
                  ref={membersBtnRef}
                  onClick={() => setShowMembersPopover((s) => !s)}
                  className="flex items-center -space-x-2 group"
                  title="Project members"
                >
                  {currentProject.members.slice(0, 3).map((m, idx) => (
                    <div
                      key={(m.user && (m.user._id || m.user.id)) || idx}
                      className="relative inline-flex border-2 border-white/40 rounded-full shadow-sm transition-transform group-hover:scale-[1.02] bg-white/0"
                      style={{ zIndex: 10 - idx }}
                    >
                      <Avatar user={m.user} size="sm" />
                    </div>
                  ))}
                  {currentProject.members.length > 3 && (
                    <div className="inline-flex w-8 h-8 items-center justify-center rounded-full bg-white/20 text-white text-[11px] font-semibold border-2 border-white/40 shadow-sm">
                      +{currentProject.members.length - 3}
                    </div>
                  )}
                </button>

                {/* Popover listing all members */}
                {showMembersPopover && (
                  <div
                    ref={membersPopoverRef}
                    className="absolute left-0 top-full mt-2 w-80 bg-white text-secondary-900 rounded-xl shadow-lg ring-1 ring-black/5 overflow-hidden animate-[fadeIn_120ms_ease-out]"
                  >
                    <div className="px-3 py-2 bg-gradient-to-r from-blue-600 to-blue-700 text-white flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <Users className="w-4 h-4" />
                        <span className="text-sm font-semibold">
                          {currentProject.members.length} members
                        </span>
                      </div>
                      <button
                        onClick={() => {
                          setShowInviteModal(true);
                          setShowMembersPopover(false);
                        }}
                        className="p-1.5 rounded-lg hover:bg-white/20 transition-colors"
                        title="Add members"
                      >
                        <UserPlus className="w-4 h-4" />
                      </button>
                    </div>
                    <div className="max-h-64 overflow-auto divide-y divide-secondary-100 cursor-pinter">
                      {currentProject.members.map((m, idx) => (
                        <div
                          key={(m.user && (m.user._id || m.user.id)) || idx}
                          className="flex items-center gap-3 px-3 py-2 hover:bg-secondary-50 transition-colors"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <Avatar user={m.user} size="sm" />
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-medium truncate">
                              {m.user?.name || m.user?.email || "Unknown"}
                            </div>
                            <div className="text-xs text-secondary-500 capitalize truncate">
                              {m.role || "member"}
                            </div>
                          </div>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              const userId = m.user?._id || m.user?.id;

                              if (userId) {
                                // handleRemoveMember(userId);
                                setConfirmingUserId(userId);
                              } else {
                                console.error(
                                  "No user ID found for member:",
                                  m
                                );
                                showToast("Unable to identify member", "error");
                              }
                            }}
                            className="p-1.5 rounded-md hover:bg-secondary-100 text-secondary-500 hover:text-red-600 transition-colors cursor-pointer"
                            title="Remove member"
                            disabled={
                              removingMemberId === (m.user?._id || m.user?.id)
                            }
                          >
                            {removingMemberId ===
                            (m.user?._id || m.user?.id) ? (
                              <svg
                                className="w-4 h-4 animate-spin"
                                viewBox="0 0 24 24"
                              >
                                <circle
                                  className="opacity-25"
                                  cx="12"
                                  cy="12"
                                  r="10"
                                  stroke="currentColor"
                                  strokeWidth="4"
                                ></circle>
                                <path
                                  className="opacity-75"
                                  fill="currentColor"
                                  d="M4 12a8 8 0 018-8v4l3.5-3.5L12 0v4a8 8 0 100 16v4l3.5-3.5L12 20v4a8 8 0 01-8-8z"
                                ></path>
                              </svg>
                            ) : (
                              <UserMinus className="w-4 h-4" />
                            )}
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
            {/* Status pills */}
            <div className="flex items-center gap-2">
              <span
                className={`px-3 py-1 rounded-full text-xs font-semibold border-2 shadow-sm cursor-default ${
                  getProjectStatusColors(currentProject.projectStatus).bgColor
                } ${
                  getProjectStatusColors(currentProject.projectStatus).textColor
                } ${
                  getProjectStatusColors(currentProject.projectStatus)
                    .borderColor
                }`}
                title="Project status"
              >
                {getProjectStatusColors(currentProject.projectStatus).label}
              </span>
              {/* <span
                className={`px-3 py-1 rounded-full text-xs font-semibold border-2 shadow-sm ${
                  getProjectTypeColors(currentProject.projectType).bgColor
                } ${
                  getProjectTypeColors(currentProject.projectType).textColor
                } ${
                  getProjectTypeColors(currentProject.projectType).borderColor
                }`}
                title="Project type"
              >
                {getProjectTypeColors(currentProject.projectType).label}
              </span> */}
            </div>
            {/* Date pills */}
            {(projectData.project?.startDate ||
              projectData.project?.endDate) && (
              <div className="flex items-center gap-1.5">
                {/* Start Date */}
                {projectData.project?.startDate && (
                  <div className="flex bg-white/15 items-center gap-1.5 rounded-full px-2 py-1.5">
                    <div className="w-6 h-6 text-white bg-[#26de81] rounded-full flex items-center justify-center">
                      <Calendar className="w-3.5 h-3.5 " />
                    </div>
                    <div className="text-xs">
                      <div className="text-white/80 font-medium text-[10px] leading-none">
                        Start Date
                      </div>
                      <div className="text-white font-semibold leading-tight">
                        {formatDate(projectData.project.startDate)}
                      </div>
                    </div>
                  </div>
                )}
                {/* End Date */}
                {projectData.project?.endDate && (
                  <div className="flex items-center gap-1.5 bg-white/15 rounded-full px-2 py-1.5">
                    <div className="w-6 h-6 bg-[#fa8231] rounded-full flex items-center justify-center">
                      <Calendar className="w-3.5 h-3.5" />
                    </div>
                    <div className="text-xs">
                      <div className="text-white/80 font-medium text-[10px] leading-none">
                        End Date
                      </div>
                      <div className="text-white font-semibold leading-tight">
                        {formatDate(projectData.project.endDate)}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
            {/* Filter button and Cancel Filter button */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowFilterPanel(!showFilterPanel)}
                className="p-2 rounded-lg hover:bg-blue-500 text-white transition-colors relative"
                title="Filter cards"
              >
                <Filter className="w-5 h-5" />
                {hasActiveFilters && (
                  <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full border-2 border-blue-700"></span>
                )}
              </button>
              {hasActiveFilters && (
                <button
                  onClick={handleCancelFilter}
                  className="p-2 rounded-lg bg-red-500 hover:bg-red-600 text-white transition-colors flex items-center gap-1.5 px-3"
                  title="Cancel all filters"
                >
                  <X className="w-4 h-4" />
                  <span className="text-sm font-medium">Cancel Filter</span>
                </button>
              )}
            </div>
            {/* Settings button */}
            <button
              onClick={handleEditProject}
              className="p-2 rounded-lg hover:bg-blue-500 text-white transition-colors"
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
          <div
            ref={addColumnModalRef}
            className="bg-white rounded-lg p-6 w-96 max-w-md mx-4"
          >
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
                  {["blue", "green", "yellow", "red", "purple", "pink"].map(
                    (color) => (
                      <button
                        key={color}
                        onClick={() => setNewColumnColor(color)}
                        className={`w-8 h-8 rounded-full border-2 ${
                          newColumnColor === color
                            ? "border-gray-800"
                            : "border-gray-300"
                        } bg-${color}-500 hover:opacity-80 transition-opacity`}
                      />
                    )
                  )}
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
      <ConfirmationModal
        isOpen={!!confirmingUserId}
        title="Remove Member"
        message="Are you sure you want to Delete user"
        onCancel={() => setConfirmingUserId(null)}
        onConfirm={() => {
          handleRemoveMember(confirmingUserId);
          setConfirmingUserId(null);
        }}
        onClose={() => {
          setConfirmingUserId(false);
        }}
      />

      {/* Card Modal */}
      {showCardModal && selectedCard && (
        <CardModal
          card={selectedCard}
          cards={filteredCards}
          onClose={handleCardModalClose}
          onCardUpdated={handleCardUpdated}
          onCardDeleted={handleCardDeleted}
          onCardRestored={handleCardRestored}
          onStatusChange={handleStatusChange}
          onNavigateCard={handleNavigateCard}
        />
      )}

      {/* Edit Project Modal */}
      {showEditProjectModal && currentProject && (
        <EditProjectModal
          project={currentProject}
          onClose={() => {
            setShowEditProjectModal(false);
            // Ensure we return to the main project view path when modal closes
            navigate(`/project/${actualProjectId}`);
          }}
        />
      )}

      {/* Invite/Add Members Modal */}
      {showInviteModal && currentProject && (
        <InviteUserModal
          project={currentProject}
          onClose={() => setShowInviteModal(false)}
          onUserInvited={() => fetchProject(currentProject._id)}
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
