import React, {
  useState,
  useEffect,
  useRef,
  useCallback,
  useMemo,
} from "react";
import { useParams, Link, useNavigate, useLocation } from "react-router-dom";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragOverlay,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
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
import MoveAllCardsModal from "./MoveAllCardsModal";
// import { stripHtmlTags } from "../utils/htmlUtils";
import {
  getProjectStatusColors,
  getCardStatusColors,
} from "../utils/statusColors";

// Horizontal Scroll Position Indicator Component (Jira-style)
const HorizontalScrollIndicator = React.memo(
  ({ scrollLeft, scrollWidth, clientWidth, onScroll }) => {
    const isScrollable = scrollWidth > clientWidth;
    const indicatorRef = useRef(null);
    const isDraggingRef = useRef(false);
    const [isDragging, setIsDragging] = useState(false);

    if (!isScrollable) return null;

    const indicatorWidth = 120; // Width of the minimap
    const totalLines = 8; // Number of vertical lines
    const viewportRatio = clientWidth / scrollWidth;
    const thumbWidth = Math.max(viewportRatio * indicatorWidth, 28);
    const maxScroll = scrollWidth - clientWidth;
    const scrollRatio = maxScroll > 0 ? scrollLeft / maxScroll : 0;
    const thumbLeft = scrollRatio * (indicatorWidth - thumbWidth);

    const handleMouseDown = (e) => {
      e.preventDefault();
      e.stopPropagation();
      isDraggingRef.current = true;
      setIsDragging(true);
      document.body.style.cursor = "grabbing";
      document.body.style.userSelect = "none";

      const startX = e.clientX;
      const startThumbLeft = thumbLeft;

      const handleMouseMove = (moveEvent) => {
        if (!isDraggingRef.current) return;

        const deltaX = moveEvent.clientX - startX;
        const newThumbLeft = Math.max(
          0,
          Math.min(startThumbLeft + deltaX, indicatorWidth - thumbWidth)
        );
        const newScrollRatio =
          indicatorWidth - thumbWidth > 0
            ? newThumbLeft / (indicatorWidth - thumbWidth)
            : 0;
        const newScrollLeft = newScrollRatio * maxScroll;

        if (onScroll) {
          onScroll(newScrollLeft, false);
        }
      };

      const handleMouseUp = () => {
        isDraggingRef.current = false;
        setIsDragging(false);
        document.body.style.cursor = "";
        document.body.style.userSelect = "";
        document.removeEventListener("mousemove", handleMouseMove);
        document.removeEventListener("mouseup", handleMouseUp);
      };

      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
    };

    // Handle click on the track to jump to position
    const handleTrackClick = (e) => {
      // Don't trigger if clicking on thumb
      if (e.target.classList.contains("scroll-thumb")) return;

      const rect = indicatorRef.current.getBoundingClientRect();
      const relativeX = e.clientX - rect.left - 10;
      const clickPosition = Math.max(
        0,
        Math.min(relativeX - thumbWidth / 2, indicatorWidth - thumbWidth)
      );
      const newScrollRatio =
        indicatorWidth - thumbWidth > 0
          ? clickPosition / (indicatorWidth - thumbWidth)
          : 0;
      const newScrollLeft = newScrollRatio * maxScroll;

      if (onScroll) {
        onScroll(newScrollLeft, true);
      }
    };

    return (
      <div className="absolute right-5 bottom-6 z-20">
        <div
          ref={indicatorRef}
          onClick={handleTrackClick}
          className="relative bg-white rounded-[14px] shadow-lg p-2.5 cursor-pointer"
          style={{
            width: `${indicatorWidth + 20}px`,
            height: "44px",
            boxShadow:
              "0 2px 8px rgba(0, 0, 0, 0.12), 0 0 1px rgba(0, 0, 0, 0.08)",
          }}
        >
          {/* Content lines representation (vertical bars) */}
          <div className="flex gap-[4px] h-full w-full">
            {Array.from({ length: totalLines }).map((_, i) => (
              <div key={i} className="flex-1 bg-gray-200 rounded-[2px]" />
            ))}
          </div>

          {/* Viewport indicator (highlighted section) - draggable thumb */}
          <div
            onMouseDown={handleMouseDown}
            className="scroll-thumb absolute top-2 bottom-2 border-2 border-blue-500 rounded-md bg-transparent cursor-grab active:cursor-grabbing"
            style={{
              left: `${thumbLeft + 10}px`,
              width: `${thumbWidth}px`,
              transition: isDragging ? "none" : "left 0.1s ease-out",
            }}
          />
        </div>
      </div>
    );
  }
);

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
  const [projectData, setProjectData] = useState(null);
  const [draggingColumnId, setDraggingColumnId] = useState(null);
  const [dragOverColumnId, setDragOverColumnId] = useState(null);

  // Card drag-and-drop state
  const [activeCardId, setActiveCardId] = useState(null);

  // Configure sensors for drag-and-drop
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8, // Require 8px of movement before starting drag
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

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
  const [showMoveAllCardsModal, setShowMoveAllCardsModal] = useState(false);
  const [sourceColumnForMove, setSourceColumnForMove] = useState(null);
  const [isMovingCards, setIsMovingCards] = useState(false);

  // Horizontal scroll state for Jira-style indicator
  const [horizontalScrollState, setHorizontalScrollState] = useState({
    scrollLeft: 0,
    scrollWidth: 0,
    clientWidth: 0,
  });

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

  // Sync projectData with currentProject when it updates (e.g., after saving changes)
  useEffect(() => {
    if (currentProject && actualProjectId === currentProject._id) {
      setProjectData((prev) => ({
        ...(prev || {}),
        project: currentProject,
      }));
    }
  }, [currentProject, actualProjectId]);

  // Track recently viewed projects (store ids + timestamp in localStorage)
  useEffect(() => {
    if (!currentProject || !actualProjectId) return;
    try {
      const raw = localStorage.getItem("recentlyViewedProjects");
      const list = raw ? JSON.parse(raw) : [];
      const cutoff = Date.now() - 1000 * 60 * 60; // 1 hour

      // Remove expired and the current id if already present
      const filtered = list.filter((item) => item.viewedAt >= cutoff && item.id !== actualProjectId);

      // Add current project at the front
      filtered.unshift({ id: actualProjectId, viewedAt: Date.now() });

      // Limit to 10 items
      const next = filtered.slice(0, 10);
      localStorage.setItem("recentlyViewedProjects", JSON.stringify(next));
    } catch (e) {
      console.error("Failed to update recently viewed projects", e);
    }
  }, [currentProject, actualProjectId]);

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

    const handleCardRestoredSocket = (data) => {
      // Only handle socket events from other users, not our own actions
      if (data.card && data.userId !== user?._id && data.userId !== user?.id) {
        // Refresh cards when another user restores a card
        cardAPI
          .getCards(actualProjectId, true)
          .then((response) => {
            const fetchedCards = response.data.cards || [];
            setCards(fetchedCards);
            setFilteredCards(fetchedCards);

            // Update selected card if it's the one being restored
            if (selectedCard && selectedCard._id === data.card._id) {
              setSelectedCard(data.card);
            }
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

    const handleCardsBulkMoved = (data) => {
      if (data.projectId === actualProjectId) {
        // Refresh cards to get updated data
        fetchCards();
        if (data.userId !== user?._id && data.userId !== user?.id) {
          showToast(
            `${data.cardCount} card(s) moved from one column to another`,
            "info"
          );
        }
      }
    };

    socket.on("card-created", handleCardCreated);
    socket.on("card-updated", handleCardUpdated);
    socket.on("card-archived", handleCardArchived);
    socket.on("card-restored", handleCardRestoredSocket);
    socket.on("card-status-changed", handleCardStatusChanged);
    socket.on("card-completion-toggled", handleCardUpdated);
    socket.on("card-user-assigned", handleCardUpdated);
    socket.on("card-user-unassigned", handleCardUpdated);
    socket.on("card-label-added", handleCardUpdated);
    socket.on("card-label-removed", handleCardUpdated);
    socket.on("card-attachment-added", handleCardUpdated);
    socket.on("card-attachment-removed", handleCardUpdated);
    socket.on("card-files-uploaded", handleCardUpdated);
    socket.on("column-created", handleColumnCreated);
    socket.on("column-updated", handleColumnUpdated);
    socket.on("cards-bulk-moved", handleCardsBulkMoved);

    return () => {
      socket.off("card-created", handleCardCreated);
      socket.off("card-updated", handleCardUpdated);
      socket.off("card-archived", handleCardArchived);
      socket.off("card-restored", handleCardRestoredSocket);
      socket.off("card-status-changed", handleCardStatusChanged);
      socket.off("card-completion-toggled", handleCardUpdated);
      socket.off("card-user-assigned", handleCardUpdated);
      socket.off("card-user-unassigned", handleCardUpdated);
      socket.off("card-label-added", handleCardUpdated);
      socket.off("card-label-removed", handleCardUpdated);
      socket.off("card-attachment-added", handleCardUpdated);
      socket.off("card-attachment-removed", handleCardUpdated);
      socket.off("card-files-uploaded", handleCardUpdated);
      socket.off("column-created", handleColumnCreated);
      socket.off("column-updated", handleColumnUpdated);
      socket.off("cards-bulk-moved", handleCardsBulkMoved);
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

  const handleCardUpdated = useCallback((updatedCard) => {
    setCards((prev) =>
      prev.map((card) => (card._id === updatedCard._id ? updatedCard : card))
    );
    setFilteredCards((prev) =>
      prev.map((card) => (card._id === updatedCard._id ? updatedCard : card))
    );
    // Update selected card if it's the one being updated
    setSelectedCard((prev) =>
      prev && prev._id === updatedCard._id ? updatedCard : prev
    );
  }, []);

  const handleCardDeleted = useCallback(
    (cardId) => {
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
      setSelectedCard((prev) => {
        if (prev && prev._id === cardId) {
          setShowCardModal(false);
          navigate(`/project/${actualProjectId}`);
          return null;
        }
        return prev;
      });
    },
    [actualProjectId, navigate, showToast]
  );

  const handleCardPermanentlyDeleted = async (cardId) => {
    try {
      // Remove the card from state permanently (optimistic update)
      setCards((prev) => prev.filter((card) => card._id !== cardId));
      setFilteredCards((prev) => prev.filter((card) => card._id !== cardId));

      // Refresh cards to ensure sync with server
      await fetchCards();

      // Close modal if the deleted card was selected
      if (selectedCard && selectedCard._id === cardId) {
        setShowCardModal(false);
        setSelectedCard(null);
        // Navigate back to project view
        navigate(`/project/${actualProjectId}`);
      }
    } catch (error) {
      console.error("Error handling card deletion:", error);
      // Refresh cards as fallback
      await fetchCards();
    }
  };

  const handleCardRestored = useCallback(async (cardId, restoredCard) => {
    try {
      // Refresh cards to get updated data (API is already called in CardModal)
      await fetchCards();

      // Update selected card if it's the one being restored
      setSelectedCard((prev) => {
        if (prev && prev._id === cardId) {
          if (restoredCard) {
            return restoredCard;
          }
          return {
            ...prev,
            isArchived: false,
            archivedAt: null,
            archivedBy: null,
            status: prev.originalStatus || "todo",
          };
        }
        return prev;
      });
    } catch (error) {
      console.error("Error handling card restoration:", error);
    }
  }, []);

  const handleStatusChange = useCallback(
    async (cardId, newStatus) => {
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
        setSelectedCard((prev) =>
          prev && prev._id === cardId ? { ...prev, status: newStatus } : prev
        );
      } catch (error) {
        console.error("Error updating card status:", error);
        showToast("Failed to update card status", "error");
      }
    },
    [showToast]
  );

  // Handle card drag end (for drag-and-drop)
  const handleCardDragEnd = async (event) => {
    const { active, over } = event;
    setActiveCardId(null);

    if (!over || !active) return;

    const cardId = active.id;
    const sourceStatus = active.data.current?.status;
    const targetStatus = over.data.current?.status || over.id;

    // If dropped on a column (not another card)
    if (over.data.current?.droppableType === "column") {
      const newStatus = targetStatus;

      // Prevent dropping cards into archive column
      if (newStatus === "archive") {
        showToast(
          "Cards cannot be moved to Archive. Use the Archive button in the card details.",
          "warning"
        );
        return;
      }

      // Get cards in the target column
      const targetCards = getCardsByStatus(newStatus);

      // If moving to a different column, add to end
      if (sourceStatus !== newStatus) {
        const newOrder = targetCards.length;

        // Update locally first for instant feedback
        const updatedCards = cards.map((card) => {
          if (card._id === cardId) {
            return { ...card, status: newStatus, order: newOrder };
          }
          return card;
        });
        setCards(updatedCards);
        setFilteredCards(updatedCards);

        // Update backend
        try {
          const cardOrders = [
            { cardId: String(cardId), order: newOrder, status: newStatus },
          ];
          const response = await cardAPI.reorderCards(cardOrders);
          if (response.data.success && response.data.cards) {
            // Update with server response
            const updatedCard = response.data.cards[0];
            setCards((prev) =>
              prev.map((card) => (card._id === cardId ? updatedCard : card))
            );
            setFilteredCards((prev) =>
              prev.map((card) => (card._id === cardId ? updatedCard : card))
            );
          }
        } catch (error) {
          console.error("Error reordering card:", error);
          const errorMessage =
            error.response?.data?.message || "Failed to move card";
          showToast(errorMessage, "error");
          // Revert on error
          fetchCards();
        }
      }
      return;
    }

    // If dropped on another card
    const overCardId = over.id;
    if (cardId === overCardId) return;

    const sourceCards = getCardsByStatus(sourceStatus);
    const targetCards = getCardsByStatus(targetStatus);
    const sourceIndex = sourceCards.findIndex((c) => c._id === cardId);
    const overIndex = targetCards.findIndex((c) => c._id === overCardId);

    if (sourceIndex === -1 || overIndex === -1) return;

    // Prevent any drag-and-drop operations in archive column
    if (sourceStatus === "archive" || targetStatus === "archive") {
      showToast("Unable to move the card to the Archive list.", "warning");
      return;
    }

    // Same column reordering
    if (sourceStatus === targetStatus) {
      const reorderedCards = arrayMove(sourceCards, sourceIndex, overIndex);

      // Update locally first
      const updatedCards = cards.map((card) => {
        const newIndex = reorderedCards.findIndex((c) => c._id === card._id);
        if (newIndex !== -1 && card.status === sourceStatus) {
          return { ...card, order: newIndex };
        }
        return card;
      });
      setCards(updatedCards);
      setFilteredCards(updatedCards);

      // Update backend
      try {
        const cardOrders = reorderedCards.map((card, index) => ({
          cardId: String(card._id),
          order: index,
        }));
        const response = await cardAPI.reorderCards(cardOrders);
        if (response.data.success && response.data.cards) {
          // Update with server response
          const updatedCardsMap = {};
          response.data.cards.forEach((card) => {
            updatedCardsMap[card._id] = card;
          });
          setCards((prev) =>
            prev.map((card) => updatedCardsMap[card._id] || card)
          );
          setFilteredCards((prev) =>
            prev.map((card) => updatedCardsMap[card._id] || card)
          );
        }
      } catch (error) {
        console.error("Error reordering cards:", error);
        const errorMessage =
          error.response?.data?.message || "Failed to reorder cards";
        showToast(errorMessage, "error");
        fetchCards();
      }
    } else {
      // Moving between columns

      // Prevent dropping cards into archive column
      if (targetStatus === "archive") {
        showToast(
          "Cards cannot be moved to Archive. Use the Archive button in the card details.",
          "warning"
        );
        return;
      }

      const newTargetCards = [...targetCards];
      newTargetCards.splice(overIndex, 0, sourceCards[sourceIndex]);

      // Update locally first
      const updatedCards = cards.map((card) => {
        if (card._id === cardId) {
          return { ...card, status: targetStatus, order: overIndex };
        }
        // Update orders in target column
        if (card.status === targetStatus) {
          const newIndex = newTargetCards.findIndex((c) => c._id === card._id);
          if (newIndex !== -1) {
            return { ...card, order: newIndex };
          }
        }
        // Update orders in source column
        if (card.status === sourceStatus && card._id !== cardId) {
          const newIndex = sourceCards
            .filter((c) => c._id !== cardId)
            .findIndex((c) => c._id === card._id);
          if (newIndex !== -1) {
            return { ...card, order: newIndex };
          }
        }
        return card;
      });
      setCards(updatedCards);
      setFilteredCards(updatedCards);

      // Update backend
      try {
        const cardOrders = [];
        // Add moved card
        cardOrders.push({
          cardId: String(cardId),
          order: overIndex,
          status: targetStatus,
        });
        // Add all target column cards
        newTargetCards.forEach((card, index) => {
          if (card._id !== cardId) {
            cardOrders.push({ cardId: String(card._id), order: index });
          }
        });
        const response = await cardAPI.reorderCards(cardOrders);
        if (response.data.success && response.data.cards) {
          // Update with server response
          const updatedCardsMap = {};
          response.data.cards.forEach((card) => {
            updatedCardsMap[card._id] = card;
          });
          setCards((prev) =>
            prev.map((card) => updatedCardsMap[card._id] || card)
          );
          setFilteredCards((prev) =>
            prev.map((card) => updatedCardsMap[card._id] || card)
          );
        }
      } catch (error) {
        console.error("Error moving card:", error);
        const errorMessage =
          error.response?.data?.message || "Failed to move card";
        showToast(errorMessage, "error");
        fetchCards();
      }
    }
  };

  // Card modal handlers
  const handleCardClick = useCallback(
    (card) => {
      setSelectedCard(card);
      setShowCardModal(true);
      // Update URL to include card ID
      navigate(`/project/${actualProjectId}/card/${card._id}`);
    },
    [actualProjectId, navigate]
  );

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

  // Memoize cards by status to prevent unnecessary re-renders
  const cardsByStatus = useMemo(() => {
    const result = {};

    // Group cards by status
    columns.forEach((column) => {
      let statusCards;
      if (column.status === "archive") {
        statusCards = filteredCards.filter((card) => card.isArchived === true);
      } else {
        statusCards = filteredCards.filter(
          (card) => card.status === column.status && card.isArchived !== true
        );
      }
      // Sort by order field (ascending), then by updatedAt (descending) as fallback
      result[column.status] = statusCards.sort((a, b) => {
        const orderA = a.order ?? 0;
        const orderB = b.order ?? 0;
        if (orderA !== orderB) {
          return orderA - orderB;
        }
        const dateA = new Date(a.updatedAt || 0);
        const dateB = new Date(b.updatedAt || 0);
        return dateB - dateA;
      });
    });

    return result;
  }, [filteredCards, columns]);

  const getCardsByStatus = (status) => {
    return cardsByStatus[status] || [];
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
    } catch (_) { }
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

  const handleMoveAllCards = (sourceStatus) => {
    const column = columns.find((col) => col.status === sourceStatus);
    if (column) {
      setSourceColumnForMove(column);
      setShowMoveAllCardsModal(true);
    }
  };

  const handleConfirmMoveAllCards = async (targetColumnId) => {
    if (!sourceColumnForMove || !targetColumnId) return;

    try {
      setIsMovingCards(true);
      const targetColumn = columns.find(
        (col) => col._id === targetColumnId || col.status === targetColumnId
      );

      if (!targetColumn) {
        showToast("Target column not found", "error");
        return;
      }

      const response = await cardAPI.moveAllCards(
        actualProjectId,
        sourceColumnForMove.status,
        targetColumn.status
      );

      if (response.data.success) {
        // Refresh cards to get updated data
        await fetchCards();
        showToast(
          `Successfully moved ${response.data.movedCount} card(s)`,
          "success"
        );
        setShowMoveAllCardsModal(false);
        setSourceColumnForMove(null);
      }
    } catch (error) {
      console.error("Error moving all cards:", error);
      showToast(
        error.response?.data?.message || "Failed to move cards",
        "error"
      );
    } finally {
      setIsMovingCards(false);
    }
  };

  // Use ref to track if we have a pending animation frame
  const scrollRAFRef = useRef(null);

  const handleScroll = () => {
    // Cancel any pending animation frame to throttle updates
    if (scrollRAFRef.current) {
      cancelAnimationFrame(scrollRAFRef.current);
    }

    scrollRAFRef.current = requestAnimationFrame(() => {
      if (scrollContainerRef.current) {
        const { scrollLeft, scrollWidth, clientWidth } =
          scrollContainerRef.current;
        setShowScrollButton(scrollLeft < scrollWidth - clientWidth - 10);
        // Update horizontal scroll state for Jira-style indicator
        setHorizontalScrollState({
          scrollLeft,
          scrollWidth,
          clientWidth,
        });
      }
    });
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

  // if (!currentProject) {
  //   return (
  //     <div className="text-center py-12">
  //       <h3 className="text-lg font-medium text-secondary-900 mb-2">
  //         Project not found
  //       </h3>
  //       <p className="text-secondary-600 mb-6">
  //         The project you're looking for doesn't exist.
  //       </p>
  //       <Link to="/" className="btn-primary">
  //         Back to Dashboard
  //       </Link>
  //     </div>
  //   );
  // }


  if (!currentProject) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    );
  }
  return (
    <div className="h-full flex flex-col max-h-full">
      {/* Compact Header */}
      <div className="   bg-white  border border-gray-200  rounded-lg px-5 py-4   mb-4 flex-shrink-0">
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
              <h1 className="text-base font-semibold truncate max-w-[40vw]">
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

              {/* Demo URLs */}
              {currentProject.demoSiteUrls && currentProject.demoSiteUrls.length > 0 && (() => {
                // Always show the last URL in the array
                const lastIndex = currentProject.demoSiteUrls.length - 1;
                const selectedUrl = currentProject.demoSiteUrls[lastIndex];

                return selectedUrl ? (
                  <a
                    href={selectedUrl}
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
                ) : null;
              })()}

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
                // title="Project members"
                >
                  {currentProject.members.slice(0, 3).map((m, idx) => (
                    <div
                      key={(m.user && (m.user._id || m.user.id)) || idx}
                      className="relative inline-flex border-2 border-white/40 rounded-full shadow-sm transition-transform group-hover:scale-[1.02] bg-white/0"
                      style={{ zIndex: 10 - idx }}
                    >
                      <Avatar user={m.user} size="sm" showTooltip={true} />
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
                className={`px-3 py-1 rounded-full text-xs font-semibold border-2 shadow-sm cursor-default ${getProjectStatusColors(currentProject.projectStatus).bgColor
                  } ${getProjectStatusColors(currentProject.projectStatus).textColor
                  } ${getProjectStatusColors(currentProject.projectStatus)
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
            {(projectData?.project?.startDate ||
              projectData?.project?.endDate) && (
                <div className="flex items-center gap-1.5">
                  {/* Start Date */}
                  {projectData?.project?.startDate && (
                    <div className="flex border bg-white/15 items-center gap-1.5 rounded-full px-2 py-1.5">
                      <div className="w-6 h-6  bg-[#26de81] rounded-full flex items-center justify-center">
                        <Calendar className="w-3.5 h-3.5 stroke-white " />
                      </div>
                      <div className="text-xs">
                        <div className=" font-medium text-[10px] leading-none">
                          Start Date
                        </div>
                        <div className=" font-semibold leading-tight">
                          {formatDate(projectData?.project?.startDate)}
                        </div>
                      </div>
                    </div>
                  )}
                  {/* End Date */}
                  {projectData?.project?.endDate && (
                    <div className="flex items-center gap-1.5 border bg-white/15 rounded-full px-2 py-1.5">
                      <div className="w-6 h-6 bg-[#fa8231] rounded-full flex items-center justify-center">
                        <Calendar className="w-3.5 h-3.5 stroke-white" />
                      </div>
                      <div className="text-xs">
                        <div className=" font-medium text-[10px] leading-none">
                          End Date
                        </div>
                        <div className=" font-semibold leading-tight">
                          {formatDate(projectData?.project?.endDate)}
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
      <div className="relative p-2 border-4 rounded-t-xl flex-1 overflow-hidden min-h-0">
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragStart={(event) => {
            if (event.active.data.current?.type === "card") {
              setActiveCardId(event.active.id);
            }
          }}
          onDragEnd={handleCardDragEnd}
        >
          <div
            ref={scrollContainerRef}
            onScroll={handleScroll}
            className="h-full overflow-x-auto rounded-lg  pb-4 scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100"
          >
            <div className="flex gap-4  rounded-lg  lg:gap-6 min-w-max ">
              {columns.map((column) => {
                const config = getColumnConfig(column);
                const colKey = column._id || column.status;
                const columnCards = getCardsByStatus(column.status);
                return (
                  <div
                    key={colKey}
                    className={`w-80  flex-shrink-0 transition-all duration-150 cursor-grab active:cursor-grabbing   ${draggingColumnId === colKey
                      ? "opacity-100 scale-[0.98]"
                      : "opacity-100"
                      } ${dragOverColumnId === colKey
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
                      cards={columnCards}
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
                      onMoveAllCards={handleMoveAllCards}
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

          {/* Drag Overlay for visual feedback */}
          <DragOverlay>
            {activeCardId ? (
              <div className="bg-white rounded-lg shadow-xl border-2 border-blue-500 p-3 w-80 opacity-95 rotate-3 transform">
                <div className="text-sm font-semibold text-gray-800">
                  {cards.find((c) => c._id === activeCardId)?.title || "Card"}
                </div>
              </div>
            ) : null}
          </DragOverlay>
        </DndContext>

        {/* Scroll indicators */}
        <div className="absolute top-0 left-0 bg-gradient-to-r from-white to-transparent w-8 h-full pointer-events-none opacity-50"></div>
        <div className="absolute top-0 right-0 bg-gradient-to-l from-white to-transparent w-8 h-full pointer-events-none opacity-50"></div>

        {/* Jira-style Horizontal Scroll Indicator */}
        <HorizontalScrollIndicator
          scrollLeft={horizontalScrollState.scrollLeft || 16}
          scrollWidth={horizontalScrollState.scrollWidth || 1695}
          clientWidth={horizontalScrollState.clientWidth || 1001}
          onScroll={(newScrollLeft, smooth = false) => {
            if (scrollContainerRef.current) {
              if (smooth) {
                scrollContainerRef.current.scrollTo({
                  left: newScrollLeft,
                  behavior: "smooth",
                });
              } else {
                scrollContainerRef.current.scrollLeft = newScrollLeft;
              }
            }
          }}
        />

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
            <h3 className="text-base font-semibold mb-4">Add New Column</h3>

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
                        className={`w-8 h-8 rounded-full border-2 ${newColumnColor === color
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
          onCardPermanentlyDeleted={handleCardPermanentlyDeleted}
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

      {/* Move All Cards Modal */}
      {showMoveAllCardsModal && sourceColumnForMove && (
        <MoveAllCardsModal
          isOpen={showMoveAllCardsModal}
          onClose={() => {
            setShowMoveAllCardsModal(false);
            setSourceColumnForMove(null);
          }}
          onConfirm={handleConfirmMoveAllCards}
          sourceColumn={sourceColumnForMove}
          columns={columns}
          cardCount={getCardsByStatus(sourceColumnForMove.status).length}
          isLoading={isMovingCards}
        />
      )}
    </div>
  );
};

export default ProjectBoard;
