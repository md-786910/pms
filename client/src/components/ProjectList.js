import React, { useEffect, useState, useMemo, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Plus,
  FolderOpen,
  Users,
  Calendar,
  MoreVertical,
  Clock,
  CheckCircle2,
  ChevronDown,
  Folder,
  SlidersHorizontal,
  Save,
} from "lucide-react";
import { useProject } from "../contexts/ProjectContext";
import { useUser } from "../contexts/UserContext";
import CreateProjectModal from "./CreateProjectModal";
import Avatar from "./Avatar";
import { isEmptyHtml, getCleanTextPreview } from "../utils/htmlUtils";
import {
  getProjectStatusColors,
  getProjectTypeColors,
  getStatusBadgeClasses,
} from "../utils/statusColors";
import { cardAPI } from "../utils/api";

const ProjectList = () => {
  const { projects, loading, fetchProjects } = useProject();
  const { user } = useUser();
  const navigate = useNavigate();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [cardsDueToday, setCardsDueToday] = useState([]);
  const [cardsBackDate, setCardsBackDate] = useState([]);
  const [cardsUpcoming, setCardsUpcoming] = useState([]);
  const [loadingCards, setLoadingCards] = useState(true);
  const [loadingBackDateCards, setLoadingBackDateCards] = useState(true);
  const [loadingUpcomingCards, setLoadingUpcomingCards] = useState(true);
  const [expandedCategories, setExpandedCategories] = useState({});
  const [sortOrder, setSortOrder] = useState("recent"); // "recent" or "oldest"

  // Get date from project for sorting
  const getProjectDate = (project) => {
    if (project.createdAt) return new Date(project.createdAt);
    if (project.startDate) return new Date(project.startDate);
    if (project.updatedAt) return new Date(project.updatedAt);
    return new Date(0); // fallback to epoch if no date
  };

  // Sort projects by date
  const sortProjectsByDate = (projectsToSort, order) => {
    return [...projectsToSort].sort((a, b) => {
      const dateA = getProjectDate(a);
      const dateB = getProjectDate(b);
      return order === "recent" ? dateB - dateA : dateA - dateB;
    });
  };

  // Get most recent/oldest date from a list of projects
  const getCategoryDate = (projectsList, order) => {
    if (!projectsList || projectsList.length === 0) return new Date(0);
    const dates = projectsList.map((p) => getProjectDate(p));
    return order === "recent" ? Math.max(...dates) : Math.min(...dates);
  };

  // Group projects by category
  const groupedProjects = useMemo(() => {
    if (!projects || projects.length === 0)
      return { allSections: [] };

    const categoryMap = new Map();
    const uncategorized = [];

    projects.forEach((project) => {
      if (project.category && project.category._id) {
        const catId = project.category._id;
        if (!categoryMap.has(catId)) {
          categoryMap.set(catId, {
            ...project.category,
            projects: [],
            isUncategorized: false,
          });
        }
        categoryMap.get(catId).projects.push(project);
      } else {
        uncategorized.push(project);
      }
    });

    // Sort projects within each category by date
    const categories = Array.from(categoryMap.values());
    categories.forEach((cat) => {
      cat.projects = sortProjectsByDate(cat.projects, sortOrder);
    });

    // Sort uncategorized projects by date
    const sortedUncategorized = sortProjectsByDate(uncategorized, sortOrder);

    // Create allSections array that includes both categories and uncategorized
    const allSections = [...categories];

    // Add uncategorized as a section if it has projects
    if (sortedUncategorized.length > 0) {
      allSections.push({
        _id: "uncategorized",
        name: "Uncategorized",
        color: "#9ca3af", // gray-400
        projects: sortedUncategorized,
        isUncategorized: true,
      });
    }

    // Sort all sections by the most recent/oldest project date
    allSections.sort((a, b) => {
      const dateA = getCategoryDate(a.projects, sortOrder);
      const dateB = getCategoryDate(b.projects, sortOrder);
      return sortOrder === "recent" ? dateB - dateA : dateA - dateB;
    });

    return { allSections };
  }, [projects, sortOrder]);

  // Initialize all categories as expanded
  useEffect(() => {
    if (groupedProjects.allSections.length > 0) {
      setExpandedCategories((prev) => {
        const initialExpanded = { ...prev };
        let hasChanges = false;
        groupedProjects.allSections.forEach((section) => {
          if (initialExpanded[section._id] === undefined) {
            initialExpanded[section._id] = true;
            hasChanges = true;
          }
        });
        return hasChanges ? initialExpanded : prev;
      });
    }
  }, [groupedProjects.allSections]);

  // Toggle category expansion
  const toggleCategory = (categoryId) => {
    setExpandedCategories((prev) => ({
      ...prev,
      [categoryId]: !prev[categoryId],
    }));
  };

  // Fetch cards due today
  useEffect(() => {
    const fetchCardsDueToday = async () => {
      try {
        setLoadingCards(true);
        console.log("📅 Fetching cards due today...");
        const response = await cardAPI.getCardsDueToday();
        console.log("📅 Cards due today response:", response.data);
        setCardsDueToday(response.data.cards || []);
      } catch (error) {
        console.error("❌ Error fetching cards due today:", error);
        setCardsDueToday([]);
      } finally {
        setLoadingCards(false);
      }
    };

    if (user) {
      fetchCardsDueToday();
    }
  }, [user]);

  // Fetch cards back date
  useEffect(() => {
    const fetchCardsBackDate = async () => {
      try {
        setLoadingBackDateCards(true);
        console.log("📅 Fetching cards back date...");
        const response = await cardAPI.getCardsBackDate();
        console.log("📅 Cards back date response:", response.data);
        setCardsBackDate(response.data.cards || []);
      } catch (error) {
        console.error("❌ Error fetching cards back date:", error);
        setCardsBackDate([]);
      } finally {
        setLoadingBackDateCards(false);
      }
    };

    if (user) {
      fetchCardsBackDate();
    }
  }, [user]);

  // Fetch upcoming cards
  useEffect(() => {
    const fetchCardsUpcoming = async () => {
      try {
        setLoadingUpcomingCards(true);
        console.log("📅 Fetching upcoming cards...");
        const response = await cardAPI.getCardsUpcoming();
        console.log("📅 Upcoming cards response:", response.data);
        setCardsUpcoming(response.data.cards || []);
      } catch (error) {
        console.error("❌ Error fetching upcoming cards:", error);
        setCardsUpcoming([]);
      } finally {
        setLoadingUpcomingCards(false);
      }
    };

    if (user) {
      fetchCardsUpcoming();
    }
  }, [user]);

  const handleModalClose = () => {
    setShowCreateModal(false);
  };

  const handleProjectCreated = () => {
    setShowCreateModal(false);
    // Only refresh projects after successful creation
    console.log("🔄 ProjectList: Refreshing projects after project creation");
    fetchProjects();
  };

  const handleCardClick = (card) => {
    // Navigate to the project board with the card open
    const projectId = card.project?._id || card.project;
    navigate(`/project/${projectId}/card/${card._id}`);
  };

  const formatDueDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-lg  text-white">
        <div>
          <div className="py-4 px-6">
            <h1 className="text-xl font-bold mb-1">Your Projects</h1>
            <p className="text-primary-100 text-md">
              Manage your projects and collaborate with your team
            </p>
          </div>

          {/* Cards Due Today */}
          {cardsDueToday.length > 0 && (
            <div className="bg-white border border-gray-200 p-4">
              <div className="flex items-center space-x-2 mb-4">
                <Clock className="w-5 h-5 text-blue-600" />
                <h2 className="text-lg font-semibold text-gray-900">
                  Due Today
                </h2>
                {cardsDueToday.length > 0 && (
                  <span className="bg-blue-100 text-blue-700 text-xs font-medium px-2 py-1 rounded-full">
                    {cardsDueToday.length}
                  </span>
                )}
              </div>

              {loadingCards ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                </div>
              ) : cardsDueToday.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                  {cardsDueToday.map((card) => (
                    <div
                      key={card._id}
                      onClick={() => handleCardClick(card)}
                      className="bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-3 cursor-pointer hover:shadow-md hover:border-blue-300 transition-all duration-200"
                    >
                      <div className="flex items-start justify-between mb-2">
                        <h3 className="font-medium text-gray-900 text-sm line-clamp-2 flex-1">
                          {card.title}
                        </h3>
                        <span className="bg-blue-200 text-blue-800 text-xs px-2 py-0.5 rounded ml-2 flex-shrink-0">
                          #{card.cardNumber || card._id?.slice(-4)}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-xs text-gray-600">
                        <div className="flex items-center space-x-1">
                          <FolderOpen className="w-3 h-3" />
                          <span className="truncate">{card.project?.name}</span>
                        </div>
                        <div className="flex items-center space-x-1 text-blue-600">
                          <Calendar className="w-3 h-3" />
                          <span>Today</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <Clock className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-500 text-sm">
                    No cards due today. You're all caught up! 🎉
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Cards Back Date */}
          {cardsBackDate.length > 0 && (
            <div className="bg-white border border-gray-200 p-4">
              <div className="flex items-center space-x-2 mb-4">
                <Clock className="w-5 h-5 text-red-600" />
                <h2 className="text-lg font-semibold text-gray-900">Pending</h2>
                {cardsBackDate.length > 0 && (
                  <span className="bg-red-100 text-red-700 text-xs font-medium px-2 py-1 rounded-full">
                    {cardsBackDate.length}
                  </span>
                )}
              </div>

              {loadingBackDateCards ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600"></div>
                </div>
              ) : cardsBackDate.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                  {cardsBackDate.map((card) => (
                    <div
                      key={card._id}
                      onClick={() => handleCardClick(card)}
                      className="bg-gradient-to-br from-red-50 to-orange-50 border border-red-200 rounded-lg p-3 cursor-pointer hover:shadow-md hover:border-red-300 transition-all duration-200"
                    >
                      <div className="flex items-start justify-between mb-2">
                        <h3 className="font-medium text-gray-900 text-sm line-clamp-2 flex-1">
                          {card.title}
                        </h3>
                        <span className="bg-red-200 text-red-800 text-xs px-2 py-0.5 rounded ml-2 flex-shrink-0">
                          #{card.cardNumber || card._id?.slice(-4)}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-xs text-gray-600">
                        <div className="flex items-center space-x-1">
                          <FolderOpen className="w-3 h-3" />
                          <span className="truncate">{card.project?.name}</span>
                        </div>
                        <div className="flex items-center space-x-1 text-red-600">
                          <Calendar className="w-3 h-3" />
                          <span>{formatDueDate(card.dueDate)}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <Clock className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-500 text-sm">
                    No past due cards. Great job!
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Upcoming Cards */}
          {cardsUpcoming.length > 0 && (
            <div className="bg-white border border-gray-200 p-4 rounded-b-lg">
              <div className="flex items-center space-x-2 mb-4">
                <Calendar className="w-5 h-5 text-green-600" />
                <h2 className="text-lg font-semibold text-gray-900">
                  Upcoming
                </h2>
                {cardsUpcoming.length > 0 && (
                  <span className="bg-green-100 text-green-700 text-xs font-medium px-2 py-1 rounded-full">
                    {cardsUpcoming.length}
                  </span>
                )}
              </div>

              {loadingUpcomingCards ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
                </div>
              ) : cardsUpcoming.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                  {cardsUpcoming.map((card) => (
                    <div
                      key={card._id}
                      onClick={() => handleCardClick(card)}
                      className="bg-gradient-to-br from-green-50 to-emerald-50 border border-green-200 rounded-lg p-3 cursor-pointer hover:shadow-md hover:border-green-300 transition-all duration-200"
                    >
                      <div className="flex items-start justify-between mb-2">
                        <h3 className="font-medium text-gray-900 text-sm line-clamp-2 flex-1">
                          {card.title}
                        </h3>
                        <span className="bg-green-200 text-green-800 text-xs px-2 py-0.5 rounded ml-2 flex-shrink-0">
                          #{card.cardNumber || card._id?.slice(-4)}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-xs text-gray-600">
                        <div className="flex items-center space-x-1">
                          <FolderOpen className="w-3 h-3" />
                          <span className="truncate">{card.project?.name}</span>
                        </div>
                        <div className="flex items-center space-x-1 text-green-600">
                          <Calendar className="w-3 h-3" />
                          <span>{formatDueDate(card.dueDate)}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <Calendar className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-500 text-sm">
                    No upcoming cards scheduled.
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Filter Bar */}
      {projects.length > 0 && (
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">All Projects</h2>
          <div className="flex items-center gap-2">
            <SlidersHorizontal className="w-4 h-4 text-gray-500" />
            <select
              value={sortOrder}
              onChange={(e) => setSortOrder(e.target.value)}
              className="text-sm border border-gray-300 rounded-lg px-3 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent cursor-pointer"
            >
              <option value="recent">Recent First</option>
              <option value="oldest">Oldest First</option>
            </select>
          </div>
        </div>
      )}

      {/* Projects Grid - Grouped by Category */}
      {projects.length === 0 ? (
        <div className="text-center py-12">
          <FolderOpen className="w-16 h-16 text-secondary-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-secondary-900 mb-2">
            No projects yet
          </h3>
          <p className="text-secondary-600 mb-6">
            {user?.role === "admin"
              ? "Create your first project to get started"
              : "You haven't been added to any projects yet"}
          </p>
          {user?.role === "admin" && (
            <button
              onClick={() => setShowCreateModal(true)}
              className="btn-primary"
            >
              Create Project
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-6">
          {/* All Sections (Categories + Uncategorized) - Sorted by date */}
          {groupedProjects.allSections.map((section) => (
            <div
              key={section._id}
              className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden"
            >
              {/* Section Header */}
              <button
                onClick={() => toggleCategory(section._id)}
                className="w-full flex items-center justify-between px-5 py-4 bg-gray-50 hover:bg-gray-100 transition-colors"
              >
                <div className="flex items-center space-x-3">
                  <div
                    className="w-8 h-8 rounded-lg flex items-center justify-center"
                    style={{ backgroundColor: section.color || "#6366f1" }}
                  >
                    <Folder className="w-4 h-4 text-white" />
                  </div>
                  <h2 className="text-lg font-semibold text-gray-900">
                    {section.name}
                  </h2>
                  <span className="text-sm text-gray-500">
                    ({section.projects.length})
                  </span>
                </div>
                <ChevronDown
                  className={`w-5 h-5 text-gray-400 transition-transform duration-200 ${expandedCategories[section._id] ? "rotate-180" : ""
                    }`}
                />
              </button>

              {/* Section Projects */}
              <div
                className={`overflow-hidden transition-all duration-300 ${expandedCategories[section._id]
                  ? "max-h-[2000px] opacity-100"
                  : "max-h-0 opacity-0"
                  }`}
              >
                <div className="p-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {section.projects.map((project) => (
                    <ProjectCard key={project._id} project={project} />
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Project Modal */}
      {showCreateModal && (
        <CreateProjectModal
          onClose={handleModalClose}
          onSuccess={handleProjectCreated}
        />
      )}
    </div>
  );
};

const ProjectCard = ({ project }) => {
  const navigate = useNavigate();
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef(null);

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  // Handle click outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowDropdown(false);
      }
    };

    if (showDropdown) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => {
        document.removeEventListener("mousedown", handleClickOutside);
      };
    }
  }, [showDropdown]);

  const handleEditProject = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setShowDropdown(false);
    navigate(`/project/${project._id}/edit`);
  };

  const handleDropdownToggle = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setShowDropdown(!showDropdown);
  };

  return (
    <Link
      to={`/project/${project._id}`}
      className="group block bg-white rounded-xl shadow-sm hover:shadow-xl transition-all duration-300 border border-secondary-200 hover:border-primary-200 overflow-hidden"
    >
      {/* Card Header with Gradient */}
      <div className="p-4 text-white bg-gradient-to-r from-blue-600 to-blue-700">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <h3 className="text-lg font-semibold group-hover:text-primary-100 transition-colors duration-200">
              {project.name}
            </h3>
            {/* {project.description && !isEmptyHtml(project.description) && (
              <p className="text-primary-100 text-sm mt-1 line-clamp-2">
                {getCleanTextPreview(project.description, 150)}
              </p>
            )} */}
          </div>
          <div className="relative" ref={dropdownRef}>
            <button
              onClick={handleDropdownToggle}
              className="p-1 rounded-lg hover:bg-white hover:bg-opacity-20 transition-colors duration-200"
            >
              <MoreVertical className="w-4 h-4" />
            </button>

            {/* Dropdown Menu */}
            {showDropdown && (
              <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-50">
                <button
                  onClick={handleEditProject}
                  className="w-full flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
                >
                  <Save className="w-4 h-4" />
                  <span>Project Details</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Card Body */}
      <div className="py-4 px-6">
        {/* Status Badges */}
        {/* <div className="flex items-center space-x-2 mb-4">
          <span
            className={getStatusBadgeClasses(
              "projectStatus",
              project.projectStatus
            )}
          >
            {getProjectStatusColors(project.projectStatus).label}
          </span>
          <span
            className={getStatusBadgeClasses(
              "projectType",
              project.projectType
            )}
          >
            {getProjectTypeColors(project.projectType).label}
          </span>
        </div> */}

        <div className="flex items-center justify-between text-sm text-secondary-500 mb-4">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-1">
              <Users className="w-4 h-4" />
              <span className="font-medium">
                {project.members?.length || 0} members
              </span>
            </div>
            <div className="flex -space-x-2">
              {project.members?.slice(0, 4).map((member, index) => (
                <div
                  key={member.user?._id || member.user || index}
                  className="border-2 border-white shadow-sm rounded-full"
                >
                  <Avatar user={member.user} size="sm" showTooltip={true} />
                </div>
              ))}
              {project.members && project.members.length > 4 && (
                <div className="w-8 h-8 bg-secondary-300 rounded-full border-2 border-white flex items-center justify-center text-xs text-secondary-600 font-medium shadow-sm">
                  +{project.members.length - 4}
                </div>
              )}
            </div>
          </div>
          <span
            className={getStatusBadgeClasses(
              "projectStatus",
              project.projectStatus
            )}
          >
            {getProjectStatusColors(project.projectStatus).label}
          </span>
        </div>

        {/* Team Members */}
        <div className="flex items-center justify-between">
          <div className="text-left">
            <div className="text-xs text-secondary-500">Start Date</div>
            <div className="text-sm font-medium text-secondary-900">
              {formatDate(project.startDate)}
            </div>
          </div>

          {project.endDate ? (
            <div className="text-left">
              <div className="text-xs text-secondary-500">End Date</div>
              <div className="text-sm font-medium text-secondary-900">
                {formatDate(project.endDate)}
              </div>
            </div>
          ) : null}
        </div>
      </div>

      {/* Card Footer */}
      <div className="px-6 py-3 bg-secondary-50 border-t border-secondary-100">
        <div className="flex items-center justify-between text-xs text-secondary-500">
          <span className="font-medium">
            {project.clientName || "No client"}
          </span>
          <span className="text-primary-600 font-medium group-hover:text-primary-700">
            View Project
          </span>
        </div>
      </div>
    </Link>
  );
};

export default ProjectList;
