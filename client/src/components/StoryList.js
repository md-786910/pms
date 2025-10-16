import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  Plus,
  BookOpen,
  Users,
  Calendar,
  Clock,
  ChevronRight,
  Tag,
  AlertCircle,
} from "lucide-react";
import { useProject } from "../contexts/ProjectContext";
import { useUser } from "../contexts/UserContext";
import { useNotification } from "../contexts/NotificationContext";
import { storyAPI } from "../utils/api";
import Avatar from "./Avatar";
import CreateStoryModal from "./CreateStoryModal";
import StoryModal from "./StoryModal";

const StoryList = () => {
  const { id: projectId } = useParams();
  const navigate = useNavigate();
  const { currentProject, setCurrentProject, projects } = useProject();
  const { user } = useUser();
  const { showToast } = useNotification();
  const [stories, setStories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedStory, setSelectedStory] = useState(null);
  const [showStoryModal, setShowStoryModal] = useState(false);
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterType, setFilterType] = useState("all");

  useEffect(() => {
    if (projectId) {
      const project = projects.find((p) => p._id === projectId);
      if (project) {
        setCurrentProject(project);
      }
      fetchStories();
    }
  }, [projectId]);

  const fetchStories = async () => {
    try {
      setLoading(true);
      const response = await storyAPI.getStories(projectId);
      if (response.data.success) {
        setStories(response.data.stories || []);
      }
    } catch (error) {
      console.error("Error fetching stories:", error);
      showToast("Failed to fetch stories", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleStoryClick = (story) => {
    setSelectedStory(story);
    setShowStoryModal(true);
  };

  const handleStoryUpdated = (updatedStory) => {
    setStories((prev) =>
      prev.map((story) =>
        story._id === updatedStory._id ? updatedStory : story
      )
    );
    setSelectedStory(updatedStory);
  };

  const handleStoryDeleted = (storyId) => {
    setStories((prev) => prev.filter((story) => story._id !== storyId));
    setShowStoryModal(false);
    setSelectedStory(null);
    showToast("Story deleted successfully!", "success");
  };

  const handleStoryCreated = (newStory) => {
    setStories((prev) => [newStory, ...prev]);
    setShowCreateModal(false);
    showToast("Story created successfully!", "success");
  };

  const getStatusColor = (status) => {
    const colors = {
      todo: "bg-gray-100 text-gray-700 border-gray-300",
      in_progress: "bg-blue-100 text-blue-700 border-blue-300",
      review: "bg-yellow-100 text-yellow-700 border-yellow-300",
      done: "bg-green-100 text-green-700 border-green-300",
    };
    return colors[status] || colors.todo;
  };

  const getPriorityColor = (priority) => {
    const colors = {
      low: "text-green-600",
      medium: "text-yellow-600",
      high: "text-orange-600",
      urgent: "text-red-600",
    };
    return colors[priority] || colors.medium;
  };

  const getTypeIcon = (type) => {
    const icons = {
      story: "📖",
      task: "✓",
      bug: "🐛",
      epic: "🎯",
    };
    return icons[type] || icons.story;
  };

  const filteredStories = stories.filter((story) => {
    // Only show parent stories (not sub-stories)
    if (story.parentStory) return false;

    if (filterStatus !== "all" && story.status !== filterStatus) return false;
    if (filterType !== "all" && story.storyType !== filterType) return false;
    return true;
  });

  if (!currentProject) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-lg p-6 text-white">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold mb-2">
              {currentProject.name} - Stories
            </h1>
            <p className="text-blue-100 text-lg">
              Manage stories and track progress for your project
            </p>
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="bg-white text-blue-600 hover:bg-blue-50 font-medium py-3 px-6 rounded-xl transition-all duration-200 flex items-center space-x-2 shadow-lg hover:shadow-xl"
          >
            <Plus className="w-5 h-5" />
            <span>Create Story</span>
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-200">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center space-x-2">
            <label className="text-sm font-medium text-gray-700">Status:</label>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All</option>
              <option value="todo">To Do</option>
              <option value="in_progress">In Progress</option>
              <option value="review">Review</option>
              <option value="done">Done</option>
            </select>
          </div>
          <div className="flex items-center space-x-2">
            <label className="text-sm font-medium text-gray-700">Type:</label>
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All</option>
              <option value="story">Story</option>
              <option value="task">Task</option>
              <option value="bug">Bug</option>
              <option value="epic">Epic</option>
            </select>
          </div>
          <div className="ml-auto text-sm text-gray-600">
            {filteredStories.length}{" "}
            {filteredStories.length === 1 ? "story" : "stories"}
          </div>
        </div>
      </div>

      {/* Stories List */}
      {filteredStories.length === 0 ? (
        <div className="text-center py-12">
          <BookOpen className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            No stories yet
          </h3>
          <p className="text-gray-600 mb-6">
            Create your first story to get started with your project
          </p>
          <button
            onClick={() => setShowCreateModal(true)}
            className="bg-blue-600 text-white hover:bg-blue-700 font-medium py-2 px-6 rounded-lg transition-colors duration-200"
          >
            Create Story
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredStories.map((story) => (
            <StoryCard
              key={story._id}
              story={story}
              onClick={() => handleStoryClick(story)}
              getStatusColor={getStatusColor}
              getPriorityColor={getPriorityColor}
              getTypeIcon={getTypeIcon}
            />
          ))}
        </div>
      )}

      {/* Create Story Modal */}
      {showCreateModal && (
        <CreateStoryModal
          projectId={projectId}
          onClose={() => setShowCreateModal(false)}
          onStoryCreated={handleStoryCreated}
        />
      )}

      {/* Story Modal */}
      {showStoryModal && selectedStory && (
        <StoryModal
          story={selectedStory}
          onClose={() => {
            setShowStoryModal(false);
            setSelectedStory(null);
          }}
          onStoryUpdated={handleStoryUpdated}
          onStoryDeleted={handleStoryDeleted}
        />
      )}
    </div>
  );
};

const StoryCard = ({
  story,
  onClick,
  getStatusColor,
  getPriorityColor,
  getTypeIcon,
}) => {
  const formatDate = (dateString) => {
    if (!dateString) return "No due date";
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const isOverdue =
    story.dueDate &&
    new Date(story.dueDate) < new Date() &&
    story.status !== "done";

  return (
    <div
      onClick={onClick}
      className="group bg-white rounded-lg shadow-sm hover:shadow-md transition-all duration-200 border border-gray-200 hover:border-blue-300 overflow-hidden cursor-pointer"
    >
      <div className="p-4">
        <div className="flex items-start justify-between gap-4">
          {/* Left Section */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xl">{getTypeIcon(story.storyType)}</span>
              <span
                className={`px-2 py-0.5 rounded-full text-xs font-medium border ${getStatusColor(
                  story.status
                )}`}
              >
                {story.status.replace("_", " ").toUpperCase()}
              </span>
              <span
                className={`text-xs font-medium ${getPriorityColor(
                  story.priority
                )}`}
              >
                {story.priority.toUpperCase()}
              </span>
            </div>

            <h3 className="text-lg font-semibold text-gray-900 group-hover:text-blue-600 transition-colors duration-200 mb-2">
              {story.title}
            </h3>

            {story.description && (
              <div
                className="text-sm text-gray-600 line-clamp-2 mb-3"
                dangerouslySetInnerHTML={{
                  __html:
                    story.description
                      .replace(/<[^>]*>/g, "")
                      .trim()
                      .slice(0, 150) + "...",
                }}
              />
            )}

            <div className="flex flex-wrap items-center gap-4 text-xs text-gray-500">
              {story.assignees && story.assignees.length > 0 && (
                <div className="flex items-center space-x-1">
                  <Users className="w-3.5 h-3.5" />
                  <span>{story.assignees.length} assigned</span>
                  <div className="flex -space-x-1 ml-1">
                    {story.assignees.slice(0, 3).map((assignee, index) => (
                      <Avatar key={index} user={assignee} size="xs" />
                    ))}
                  </div>
                </div>
              )}

              {story.subStoriesCount > 0 && (
                <div className="flex items-center space-x-1">
                  <BookOpen className="w-3.5 h-3.5" />
                  <span>{story.subStoriesCount} sub-stories</span>
                </div>
              )}

              {story.comments && story.comments.length > 0 && (
                <div className="flex items-center space-x-1">
                  <span>💬</span>
                  <span>{story.comments.length} comments</span>
                </div>
              )}

              {story.labels && story.labels.length > 0 && (
                <div className="flex items-center space-x-1">
                  <Tag className="w-3.5 h-3.5" />
                  <span>{story.labels.length} labels</span>
                </div>
              )}

              {story.estimatedHours > 0 && (
                <div className="flex items-center space-x-1">
                  <Clock className="w-3.5 h-3.5" />
                  <span>{story.estimatedHours}h estimated</span>
                </div>
              )}
            </div>
          </div>

          {/* Right Section */}
          <div className="flex flex-col items-end space-y-2">
            {story.dueDate && (
              <div
                className={`flex items-center space-x-1 text-xs ${
                  isOverdue ? "text-red-600 font-medium" : "text-gray-500"
                }`}
              >
                {isOverdue && <AlertCircle className="w-3.5 h-3.5" />}
                <Calendar className="w-3.5 h-3.5" />
                <span>{formatDate(story.dueDate)}</span>
              </div>
            )}
            <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-blue-600 transition-colors duration-200" />
          </div>
        </div>
      </div>
    </div>
  );
};

export default StoryList;
