import React, { useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowLeft,
  Plus,
  Edit,
  Trash2,
  Users,
  Calendar,
  Settings,
  UserPlus,
} from "lucide-react";
import { useProject } from "../contexts/ProjectContext";
import { useUser } from "../contexts/UserContext";
import { useNotification } from "../contexts/NotificationContext";
import CreateProjectModal from "./CreateProjectModal";
import EditProjectModal from "./EditProjectModal";
import AssignUserModal from "./AssignUserModal";
import InviteUserModal from "./InviteUserModal";
import Avatar from "./Avatar";
import { stripHtmlTags } from "../utils/htmlUtils";
import ConfirmationModal from "./ConfirmationModal";

const AdminPanel = () => {
  const { projects, loading, deleteProject, fetchProjects } = useProject();
  const { users } = useUser();
  const { showToast } = useNotification();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [selectedProject, setSelectedProject] = useState(null);
  const [projectToDelete, setProjectToDelete] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const handleDeleteProject = (project) => {
    setProjectToDelete(project);
    setShowDeleteConfirm(true);
  };

  const confirmDeleteProject = async () => {
    if (!projectToDelete) return;

    try {
      await deleteProject(projectToDelete._id);
      showToast("Project deleted successfully", "success");
      setShowDeleteConfirm(false);
      setProjectToDelete(null);
    } catch (error) {
      showToast("Failed to delete project", "error");
    }
  };

  const handleAssignUsers = (project) => {
    setSelectedProject(project);
    setShowAssignModal(true);
  };

  const handleEditProject = (project) => {
    setSelectedProject(project);
    setShowEditModal(true);
  };

  const handleInviteUsers = (project) => {
    setSelectedProject(project);
    setShowInviteModal(true);
  };

  const handleProjectUpdated = async () => {
    // Refresh projects when users are added/removed
    console.log("🔄 Refreshing projects after user change...");
    await fetchProjects();
    setRefreshKey((prev) => prev + 1); // Force re-render
    console.log("✅ Projects refreshed");
  };

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
          <div className="flex items-center space-x-4">
            <Link
              to="/"
              className="p-2 rounded-lg hover:bg-blue-500 text-white hover:text-white transition-colors duration-200"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>

            <div>
              <h1 className="text-2xl font-bold mb-2">Admin Panel</h1>
              <p className="text-primary-100 text-lg">
                Manage projects and team members
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <div className="bg-white bg-opacity-20 rounded-xl p-3">
              <Settings className="w-6 h-6" />
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold">{projects?.length || 0}</div>
              <div className="text-primary-100 text-sm">Projects</div>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">
                Total Projects
              </p>
              <p className="text-2xl font-bold text-gray-900">
                {projects?.length || 0}
              </p>
            </div>
            <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
              <Settings className="w-6 h-6 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Team Members</p>
              <p className="text-2xl font-bold text-gray-900">{users.length}</p>
            </div>
            <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
              <Users className="w-6 h-6 text-green-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">
                Active Projects
              </p>
              <p className="text-2xl font-bold text-gray-900">
                {projects?.filter((p) => p?.status === "active").length || 0}
              </p>
            </div>
            <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center">
              <Calendar className="w-6 h-6 text-purple-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Projects Management */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold text-gray-900">Projects</h2>
              <p className="text-gray-600">
                Manage your projects and team assignments
              </p>
            </div>
            <button
              onClick={() => setShowCreateModal(true)}
              className="bg-blue-600 text-white hover:bg-blue-700 font-medium py-2 px-4 rounded-lg transition-colors duration-200 flex items-center space-x-2"
            >
              <Plus className="w-4 h-4" />
              <span>Create Project</span>
            </button>
          </div>
        </div>

        <div className="p-6">
          {!projects || projects.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gray-100 flex items-center justify-center">
                <Settings className="w-8 h-8 text-gray-400" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                No projects yet
              </h3>
              <p className="text-gray-500 mb-6">
                Create your first project to get started
              </p>
              <button
                onClick={() => setShowCreateModal(true)}
                className="bg-blue-600 text-white hover:bg-blue-700 font-medium py-2 px-4 rounded-lg transition-colors duration-200 flex items-center space-x-2 mx-auto"
              >
                <Plus className="w-4 h-4" />
                <span>Create Project</span>
              </button>
            </div>
          ) : (
            <div className="space-y-4" key={refreshKey}>
              {projects &&
                Array.isArray(projects) &&
                projects.map((project) => {
                  // Safety check for project object
                  if (!project || !project._id) {
                    return null;
                  }
                  return (
                    <div
                      key={project._id}
                      className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors duration-200"
                    >
                      <div className="flex items-center space-x-4">
                        <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                          <Settings className="w-5 h-5 text-blue-600" />
                        </div>
                        <div>
                          <h3 className="font-medium text-gray-900">
                            {project.name || "Unnamed Project"}
                          </h3>
                          <p className="text-sm text-gray-600">
                            {stripHtmlTags(project.description) ||
                              "No description"}
                          </p>
                          <div className="flex items-center space-x-4 mt-1">
                            <div className="flex items-center space-x-2">
                              <div className="flex -space-x-1">
                                {project.members
                                  ?.filter((member) => member && member.user) // Filter out invalid members
                                  ?.slice(0, 3)
                                  .map((member, index) => (
                                    <div
                                      key={
                                        member.user?._id || member.user || index
                                      }
                                      className="border-2 border-white shadow-sm rounded-full"
                                    >
                                      <Avatar
                                        user={member.user}
                                        size="xs"
                                        showTooltip={true}
                                      />
                                    </div>
                                  ))}
                                {project.members?.filter(
                                  (member) => member && member.user
                                )?.length > 3 && (
                                  <div className="w-6 h-6 bg-gray-300 rounded-full border-2 border-white flex items-center justify-center text-xs text-gray-600 font-medium shadow-sm">
                                    +
                                    {project.members.filter(
                                      (member) => member && member.user
                                    ).length - 3}
                                  </div>
                                )}
                              </div>
                              <span className="text-xs text-gray-500">
                                {project.members?.filter(
                                  (member) => member && member.user
                                )?.length || 0}{" "}
                                members
                              </span>
                            </div>
                            <span className="text-xs text-gray-500">
                              Created{" "}
                              {new Date(project.createdAt).toLocaleDateString()}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center space-x-2">
                        <Link
                          to={`/project/${project._id}`}
                          className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors duration-200"
                          title="View Project"
                        >
                          <Calendar className="w-4 h-4" />
                        </Link>
                        <button
                          onClick={() => handleEditProject(project)}
                          className="p-2 text-gray-400 hover:text-orange-600 hover:bg-orange-50 rounded-lg transition-colors duration-200"
                          title="Edit Project"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleInviteUsers(project)}
                          className="p-2 text-gray-400 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-colors duration-200"
                          title="Invite Users"
                        >
                          <UserPlus className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleAssignUsers(project)}
                          className="p-2 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors duration-200"
                          title="Manage Members"
                        >
                          <Users className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteProject(project)}
                          className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors duration-200"
                          title="Delete Project"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  );
                })}
            </div>
          )}
        </div>
      </div>

      {/* Modals */}
      {showCreateModal && (
        <CreateProjectModal onClose={() => setShowCreateModal(false)} />
      )}

      {showEditModal && selectedProject && (
        <EditProjectModal
          project={selectedProject}
          onClose={() => {
            setShowEditModal(false);
            setSelectedProject(null);
          }}
        />
      )}

      {showAssignModal && selectedProject && (
        <AssignUserModal
          project={selectedProject}
          onClose={() => {
            setShowAssignModal(false);
            setSelectedProject(null);
          }}
          onUserAssigned={() => {
            showToast("User assigned successfully!", "success");
          }}
          onProjectUpdated={handleProjectUpdated}
        />
      )}

      {showInviteModal && selectedProject && (
        <InviteUserModal
          project={selectedProject}
          onClose={() => {
            setShowInviteModal(false);
            setSelectedProject(null);
          }}
          onUserInvited={async () => {
            await handleProjectUpdated(); // Refresh projects list
            showToast("User invited successfully!", "success");
          }}
        />
      )}

      {/* Delete Project Confirmation Modal */}
      <ConfirmationModal
        isOpen={showDeleteConfirm}
        onClose={() => {
          setShowDeleteConfirm(false);
          setProjectToDelete(null);
        }}
        onConfirm={confirmDeleteProject}
        title="Delete Project"
        message={
          projectToDelete
            ? `Are you sure you want to delete "${projectToDelete.name}"? This action will permanently remove the project and all its data (cards, columns, notifications, etc.) and cannot be undone.`
            : "Are you sure you want to delete this project?"
        }
        confirmText="Delete Project"
        cancelText="Cancel"
        type="danger"
        isLoading={false}
      />
    </div>
  );
};

export default AdminPanel;
