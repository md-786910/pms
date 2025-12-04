import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Plus,
  FolderOpen,
  Users,
  Calendar,
  MoreVertical,
  Clock,
  CheckCircle2,
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

      {/* Projects Grid */}
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
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 lg:gap-6">
          {[...projects]
            .sort((a, b) => a.name.localeCompare(b.name))
            .map((project) => (
              <ProjectCard key={project._id} project={project} />
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
  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  return (
    <Link
      to={`/project/${project._id}`}
      className="group block bg-white rounded-2xl shadow-sm hover:shadow-xl transition-all duration-300 border border-secondary-200 hover:border-primary-200 overflow-hidden"
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
          <button
            onClick={(e) => e.preventDefault()}
            className="p-1 rounded-lg hover:bg-white hover:bg-opacity-20 transition-colors duration-200"
          >
            <MoreVertical className="w-4 h-4" />
          </button>
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
