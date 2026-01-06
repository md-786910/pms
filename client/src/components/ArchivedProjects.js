import React, { useState, useEffect } from "react";
import { Link, Navigate } from "react-router-dom";
import {
  ArrowLeft,
  Archive,
  RotateCcw,
  Trash2,
  Users,
  Calendar,
  AlertTriangle,
} from "lucide-react";
import { useProject } from "../contexts/ProjectContext";
import { useUser } from "../contexts/UserContext";
import { useNotification } from "../contexts/NotificationContext";
import Avatar from "./Avatar";
import { stripHtmlTags } from "../utils/htmlUtils";
import ConfirmationModal from "./ConfirmationModal";
import {
  getProjectStatusColors,
  getProjectTypeColors,
  getStatusBadgeClasses,
} from "../utils/statusColors";

const ArchivedProjects = () => {
  const { user } = useUser();
  const {
    archivedProjects,
    archiveLoading,
    fetchArchivedProjects,
    restoreProject,
    permanentDeleteProject,
  } = useProject();
  const { showToast } = useNotification();
  const [showRestoreConfirm, setShowRestoreConfirm] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [selectedProject, setSelectedProject] = useState(null);
  const [isRestoring, setIsRestoring] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    if (user?.role === "admin") {
      fetchArchivedProjects();
    }
  }, [user]);

  // Only admin can access this page
  if (user?.role !== "admin") {
    return <Navigate to="/" replace />;
  }

  const handleRestoreProject = (project) => {
    setSelectedProject(project);
    setShowRestoreConfirm(true);
  };

  const handlePermanentDelete = (project) => {
    setSelectedProject(project);
    setShowDeleteConfirm(true);
  };

  const confirmRestore = async () => {
    if (!selectedProject) return;

    try {
      setIsRestoring(true);
      await restoreProject(selectedProject._id);
      showToast("Project restored successfully", "success");
      setShowRestoreConfirm(false);
      setSelectedProject(null);
    } catch (error) {
      showToast("Failed to restore project", "error");
    } finally {
      setIsRestoring(false);
    }
  };

  const confirmPermanentDelete = async () => {
    if (!selectedProject) return;

    try {
      setIsDeleting(true);
      await permanentDeleteProject(selectedProject._id);
      showToast("Project permanently deleted", "success");
      setShowDeleteConfirm(false);
      setSelectedProject(null);
    } catch (error) {
      showToast("Failed to delete project", "error");
    } finally {
      setIsDeleting(false);
    }
  };

  if (archiveLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className=" bg-white  border border-gray-200  rounded-lg px-5 py-4   mb-4 flex-shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Link
              to="/admin"
              className="p-2 rounded-lg bg-primary-500 text-white hover:text-white transition-colors duration-200"
            >
              <ArrowLeft className="w-4 h-4" />
            </Link>

            <div>
              <h1 className="text-base font-semibold  mb-1">Archived Projects</h1>
              <p className="  text-md">
                Restore or permanently delete archived projects
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <div className="text-center">
              <div className="text-base font-semibold w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center mb-1 text-blue-700">
                {archivedProjects?.length || 0}
              </div>
              <div className="  text-sm">Archived</div>
            </div>
          </div>
        </div>
      </div>

      {/* Info Banner */}
      <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
        <div className="flex items-start space-x-3">
          <AlertTriangle className="w-5 h-5 text-amber-500 mt-0.5" />
          <div>
            <h3 className="text-base font-semibold  mb-1 text-amber-800">
              About Archived Projects
            </h3>
            <p className="text-sm text-amber-700 mt-1">
              Archived projects are hidden from the main project list but can be
              restored at any time. Permanent deletion will remove all project
              data including cards, columns, and attachments.
            </p>
          </div>
        </div>
      </div>

      {/* Archived Projects List */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <Archive className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h2 className="text-base font-semibold  mb-1">
                Archived Projects
              </h2>
              <p className="">
                Projects that have been archived
              </p>
            </div>
          </div>
        </div>

        <div className="p-6">
          {!archivedProjects || archivedProjects.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gray-100 flex items-center justify-center">
                <Archive className="w-8 h-8 text-gray-400" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                No archived projects
              </h3>
              <p className=" mb-6">
                When you archive a project, it will appear here
              </p>
              <Link
                to="/admin"
                className="bg-blue-600 text-white hover:bg-blue-700 font-medium py-2 px-4 rounded-lg transition-colors duration-200 inline-flex items-center space-x-2"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Back to Admin Panel</span>
              </Link>
            </div>
          ) : (
            <div className="space-y-4">
              {archivedProjects.map((project) => {
                if (!project || !project._id) {
                  return null;
                }
                return (
                  <div
                    key={project._id}
                    className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors duration-200 border border-gray-200"
                  >
                    <div className="flex items-center space-x-4">
                      <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                        <Archive className="w-5 h-5 text-blue-600" />
                      </div>
                      <div>
                        <div className="flex items-center space-x-3 mb-1">
                          <h3 className="font-medium text-gray-900">
                            {project.name || "Unnamed Project"}
                          </h3>
                          {/* Status Badges */}
                          <div className="flex items-center space-x-2">
                            <span
                              className={getStatusBadgeClasses(
                                "projectStatus",
                                project.projectStatus
                              )}
                            >
                              {
                                getProjectStatusColors(project.projectStatus)
                                  .label
                              }
                            </span>
                            <span
                              className={getStatusBadgeClasses(
                                "projectType",
                                project.projectType
                              )}
                            >
                              {getProjectTypeColors(project.projectType).label}
                            </span>
                          </div>
                        </div>
                        <p className="text-sm text-gray-600">
                          {stripHtmlTags(project.description)?.length > 150
                            ? stripHtmlTags(project.description).substring(
                                0,
                                150
                              ) + "..."
                            : stripHtmlTags(project.description) ||
                              "No description"}
                        </p>
                        <div className="flex items-center space-x-4 mt-2">
                          <div className="flex items-center space-x-2">
                            <div className="flex -space-x-1">
                              {project.members
                                ?.filter((member) => member && member.user)
                                ?.slice(0, 3)
                                .map((member, index) => (
                                  <div
                                    key={
                                      member.user?._id || member.user || index
                                    }
                                    className="border-2 text-white border-white shadow-sm rounded-full"
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
                                <div className="w-6 h-6 rounded-full border-2 border-white flex items-center justify-center text-xs text-gray-600 font-medium shadow-sm bg-gray-200">
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
                          <span className="text-xs text-gray-500 flex items-center">
                            <Calendar className="w-3 h-3 mr-1" />
                            Archived{" "}
                            {project.archivedAt
                              ? new Date(project.archivedAt).toLocaleDateString()
                              : "Unknown"}
                          </span>
                          {project.archivedBy && (
                            <span className="text-xs text-gray-500 flex items-center">
                              <Users className="w-3 h-3 mr-1" />
                              by {project.archivedBy.name || "Unknown"}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center space-x-2">
                      <Link
                        to={`/project/${project._id}`}
                        className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors duration-200 flex items-center space-x-1"
                        title="View Project"
                      >
                        <Calendar className="w-4 h-4" />
                        <span className="text-sm hidden sm:inline">View</span>
                      </Link>
                      <button
                        onClick={() => handleRestoreProject(project)}
                        className="p-2 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors duration-200 flex items-center space-x-1"
                        title="Restore Project"
                      >
                        <RotateCcw className="w-4 h-4" />
                        <span className="text-sm hidden sm:inline">Restore</span>
                      </button>
                      <button
                        onClick={() => handlePermanentDelete(project)}
                        className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors duration-200 flex items-center space-x-1"
                        title="Permanently Delete"
                      >
                        <Trash2 className="w-4 h-4" />
                        <span className="text-sm hidden sm:inline">Delete</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Restore Confirmation Modal */}
      <ConfirmationModal
        isOpen={showRestoreConfirm}
        onClose={() => {
          setShowRestoreConfirm(false);
          setSelectedProject(null);
        }}
        onConfirm={confirmRestore}
        title="Restore Project"
        message={
          selectedProject
            ? `Are you sure you want to restore "${selectedProject.name}"? The project will be moved back to your active projects list.`
            : "Are you sure you want to restore this project?"
        }
        confirmText="Restore Project"
        cancelText="Cancel"
        type="info"
        isLoading={isRestoring}
      />

      {/* Permanent Delete Confirmation Modal */}
      <ConfirmationModal
        isOpen={showDeleteConfirm}
        onClose={() => {
          setShowDeleteConfirm(false);
          setSelectedProject(null);
        }}
        onConfirm={confirmPermanentDelete}
        title="Permanently Delete Project"
        message={
          selectedProject
            ? `Are you sure you want to permanently delete "${selectedProject.name}"? This action will remove ALL project data including cards, columns, attachments, and cannot be undone.`
            : "Are you sure you want to permanently delete this project?"
        }
        confirmText="Delete Forever"
        cancelText="Cancel"
        type="danger"
        isLoading={isDeleting}
      />
    </div>
  );
};

export default ArchivedProjects;
