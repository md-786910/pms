import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import {
  ArrowLeft,
  Plus,
  Edit,
  Archive,
  Users,
  Calendar,
  Settings,
  UserPlus,
  Search,
  X,
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
import {
  getProjectStatusColors,
  getProjectTypeColors,
  getStatusBadgeClasses,
} from "../utils/statusColors";

const AdminPanel = () => {
  const { projects, loading, deleteProject, fetchProjects } = useProject();
  const { users } = useUser();
  const { showToast } = useNotification();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [showArchiveConfirm, setShowArchiveConfirm] = useState(false);
  const [selectedProject, setSelectedProject] = useState(null);
  const [projectToArchive, setProjectToArchive] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [isArchiving, setIsArchiving] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    // ensure projects list is loaded
    if (!projects || projects.length === 0) {
      fetchProjects();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleArchiveProject = (project) => {
    setProjectToArchive(project);
    setShowArchiveConfirm(true);
  };

  const confirmArchiveProject = async () => {
    if (!projectToArchive) return;

    try {
      setIsArchiving(true);
      await deleteProject(projectToArchive._id);
      showToast("Project archived successfully. You can restore it from the Archived Projects section.", "success");
      setShowArchiveConfirm(false);
      setProjectToArchive(null);
      await fetchProjects();
    } catch (error) {
      showToast("Failed to archive project", "error");
    } finally {
      setIsArchiving(false);
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

  // Filter projects by search query (name, client, description, id, members)
  const filteredProjects = (projects || []).filter((project) => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return true;
    const parts = [
      project.name || "",
      project.clientName || "",
      stripHtmlTags(project.description) || "",
      project._id || "",
    ];
    // include member names/emails if available
    if (Array.isArray(project.members)) {
      project.members.forEach((m) => {
        if (m && m.user) {
          parts.push(m.user.name || m.user.email || "");
        }
      });
    }
    const hay = parts.join(" ").toLowerCase();
    return hay.includes(q);
  });

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
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-lg px-6 py-4 text-white">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Link
              to="/"
              className="p-2 rounded-lg hover:bg-blue-500 text-white hover:text-white transition-colors duration-200"
            >
              <ArrowLeft className="w-4 h-4" />
            </Link>

            <div>
              <h1 className="text-xl font-bold mb-1">Admin Panel</h1>
              <p className="text-primary-100 text-md">
                Manage projects and team members
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <div className="text-center">
              <div className="text-xl font-bold">{projects?.length || 0}</div>
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
              <p className="text-sm font-medium text-gray-600">Total Projects</p>
              <p className="text-2xl font-bold text-gray-900">{projects?.length || 0}</p>
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
              <p className="text-sm font-medium text-gray-600">Active Projects</p>
              <p className="text-2xl font-bold text-gray-900">{projects?.filter((p) => p?.status === "active").length || 0}</p>
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
              <p className="text-gray-600">Manage your projects and team assignments</p>
            </div>
            <div className="flex items-center space-x-2">
              <a href="/admin/time-tracking" className="bg-gray-100 text-gray-800 hover:bg-gray-200 font-medium py-2 px-3 rounded-lg transition-colors duration-200 text-sm">Time Tracking</a>
              <button
                onClick={() => setShowCreateModal(true)}
                className="bg-blue-600 text-white hover:bg-blue-700 font-medium py-2 px-4 rounded-lg transition-colors duration-200 flex items-center space-x-2"
              >
                <Plus className="w-4 h-4" />
                <span>Create Project</span>
              </button>
            </div>
          </div>

          <div className="mt-4 flex items-center justify-between">
            <div className="relative w-80">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search projects by name, client, description..."
                className="w-full pl-9 pr-8 py-2 text-sm bg-gray-50 border border-gray-400 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            <div className="text-sm text-gray-500">{filteredProjects.length} results</div>
          </div>
        </div>

        <div className="p-6">
          {!projects || projects.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gray-100 flex items-center justify-center">
                <Settings className="w-8 h-8 text-gray-400" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">No projects yet</h3>
              <p className="text-gray-500 mb-6">Create your first project to get started</p>
              <button onClick={() => setShowCreateModal(true)} className="bg-blue-600 text-white hover:bg-blue-700 font-medium py-2 px-4 rounded-lg transition-colors duration-200 flex items-center space-x-2 mx-auto">
                <Plus className="w-4 h-4" />
                <span>Create Project</span>
              </button>
            </div>
          ) : (
            <div className="space-y-4" key={refreshKey}>
              {filteredProjects.length === 0 ? (
                <div className="text-center py-8">
                  <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gray-100 flex items-center justify-center">
                    <Settings className="w-8 h-8 text-gray-400" />
                  </div>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No projects found</h3>
                  <p className="text-gray-500 mb-6">{searchQuery ? "Try a different search term" : "No projects yet"}</p>
                </div>
              ) : (
                filteredProjects.map((project) => {
                  // Safety check for project object
                  if (!project || !project._id) return null;
                  return (
                    <div key={project._id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors duration-200">
                      <div className="flex items-center space-x-4">
                        <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                          <Settings className="w-5 h-5 text-blue-600" />
                        </div>
                        <div>
                          <div className="flex items-center space-x-3 mb-1">
                            <h3 className="font-medium text-gray-900">{project.name || "Unnamed Project"}</h3>
                            <div className="flex items-center space-x-2">
                              <span className={getStatusBadgeClasses("projectStatus", project.projectStatus)}>
                                {getProjectStatusColors(project.projectStatus).label}
                              </span>
                              <span className={getStatusBadgeClasses("projectType", project.projectType)}>
                                {getProjectTypeColors(project.projectType).label}
                              </span>
                            </div>
                          </div>
                          <p className="text-sm text-gray-600">
                            {stripHtmlTags(project.description)?.length > 150
                              ? stripHtmlTags(project.description).substring(0, 150) + "..."
                              : stripHtmlTags(project.description) || "No description"}
                          </p>
                          <div className="flex items-center space-x-4 mt-1">
                            <div className="flex items-center space-x-2">
                              <div className="flex -space-x-1">
                                {project.members?.filter((member) => member && member.user)?.slice(0, 3).map((member, index) => (
                                  <div key={member.user?._id || member.user || index} className="border-2 text-white border-white  shadow-sm rounded-full">
                                    <Avatar user={member.user} size="xs" showTooltip={true} />
                                  </div>
                                ))}
                                {project.members?.filter((member) => member && member.user)?.length > 3 && (
                                  <div className="w-6 h-6  rounded-full border-2 border-white flex items-center justify-center text-xs text-white font-medium shadow-sm">+{project.members.filter((member) => member && member.user).length - 3}</div>
                                )}
                              </div>
                              <span className="text-xs text-gray-500">{project.members?.filter((member) => member && member.user)?.length || 0} members</span>
                            </div>
                            <span className="text-xs text-gray-500">Created {new Date(project.createdAt).toLocaleDateString()}</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center space-x-2">
                        <Link to={`/project/${project._id}`} className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors duration-200" title="View Project">
                          <Calendar className="w-4 h-4" />
                        </Link>
                        <button onClick={() => handleEditProject(project)} className="p-2 text-gray-400 hover:text-orange-600 hover:bg-orange-50 rounded-lg transition-colors duration-200" title="Edit Project">
                          <Edit className="w-4 h-4" />
                        </button>
                        <button onClick={() => handleInviteUsers(project)} className="p-2 text-gray-400 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-colors duration-200" title="Invite Users">
                          <UserPlus className="w-4 h-4" />
                        </button>
                        <button onClick={() => handleAssignUsers(project)} className="p-2 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors duration-200" title="Manage Members">
                          <Users className="w-4 h-4" />
                        </button>
                        <button onClick={() => handleArchiveProject(project)} className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors duration-200" title="Archive Project">
                          <Archive className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}
        </div>
      </div>
      {/* Modals */}
      {showCreateModal && (
        <CreateProjectModal
          onClose={() => setShowCreateModal(false)}
          onSuccess={() => {
            setShowCreateModal(false);
            // Only refresh projects after successful creation
            console.log("🔄 AdminPanel: Refreshing projects after project creation");
            fetchProjects();
          }}
        />
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

      {/* Archive Project Confirmation Modal */}
      <ConfirmationModal
        isOpen={showArchiveConfirm}
        onClose={() => {
          setShowArchiveConfirm(false);
          setProjectToArchive(null);
        }}
        onConfirm={confirmArchiveProject}
        title="Archive Project"
        message={
          projectToArchive
            ? `Are you sure you want to archive "${projectToArchive.name}"? The project will be moved to the Archived Projects section where you can restore it or permanently delete it later.`
            : "Are you sure you want to archive this project?"
        }
        confirmText="Archive Project"
        cancelText="Cancel"
        type="warning"
        isLoading={isArchiving}
      />
    </div>
  );
};

export default AdminPanel;
