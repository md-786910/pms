import React, { useState } from "react";
import { Link } from "react-router-dom";
import { Plus, FolderOpen, Users, Calendar, MoreVertical } from "lucide-react";
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

const ProjectList = () => {
  const { projects, loading, fetchProjects } = useProject();
  const { user } = useUser();
  const [showCreateModal, setShowCreateModal] = useState(false);

  // Debug logging

  const handleModalClose = () => {
    setShowCreateModal(false);
    // Force refresh projects after modal closes
    console.log("🔄 ProjectList: Refreshing projects after modal close");
    fetchProjects();
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
      {/* Modern Minimal Header */}
      <div className="bg-white rounded-2xl shadow-lg border border-slate-200/50 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg">
              <FolderOpen className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                Your Projects
              </h1>
              <p className="text-xs text-slate-500 mt-0.5">
                Manage and collaborate on projects
              </p>
            </div>
          </div>
          {user?.role === "admin" && (
            <button
              onClick={() => setShowCreateModal(true)}
              className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-semibold py-2 px-6 rounded-xl transition-all duration-300 flex items-center space-x-2 shadow-lg hover:shadow-xl hover:scale-105 whitespace-nowrap text-sm"
            >
              <Plus className="w-4 h-4" />
              <span>Create Project</span>
            </button>
          )}
        </div>
      </div>

      {/* Projects Grid */}
      {projects.length === 0 ? (
        <div className="text-center py-12">
          <FolderOpen className="w-16 h-16 text-slate-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-slate-900 mb-2">
            No projects yet
          </h3>
          <p className="text-slate-600 mb-6">
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
          {projects.map((project) => (
            <ProjectCard key={project._id} project={project} />
          ))}
        </div>
      )}

      {/* Create Project Modal */}
      {showCreateModal && <CreateProjectModal onClose={handleModalClose} />}
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
      className="group block bg-white/90 backdrop-blur-sm rounded-2xl shadow-soft hover:shadow-2xl transition-all duration-300 border border-slate-200/50 hover:border-indigo-300 overflow-hidden hover:-translate-y-1"
    >
      {/* Card Header with Gradient */}
      <div className="bg-gradient-to-r from-indigo-500 via-purple-500 to-indigo-600 p-5 text-white">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <h3 className="text-lg font-semibold group-hover:text-primary-100 transition-colors duration-200">
              {project.name}
            </h3>
            {project.description && !isEmptyHtml(project.description) && (
              <p className="text-primary-100 text-sm mt-1 line-clamp-2">
                {getCleanTextPreview(project.description, 150)}
              </p>
            )}
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
      <div className="p-6">
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

        <div className="flex items-center justify-between text-sm text-slate-600 mb-4">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-1.5">
              <Users className="w-4 h-4" />
              <span className="font-semibold">
                {project.members?.length || 0} members
              </span>
            </div>
            <div className="flex items-center space-x-1.5">
              <Calendar className="w-4 h-4" />
              <span>{formatDate(project.createdAt)}</span>
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
              <div className="w-8 h-8 bg-slate-200 rounded-full border-2 border-white flex items-center justify-center text-xs text-slate-600 font-semibold shadow-sm">
                +{project.members.length - 4}
              </div>
            )}
          </div>

          <div className="text-right">
            <div className="text-xs text-slate-500">Created</div>
            <div className="text-sm font-semibold text-slate-900">
              {formatDate(project.createdAt)}
            </div>
          </div>
        </div>
      </div>

      {/* Card Footer */}
      <div className="px-6 py-3 bg-gradient-to-r from-indigo-50/30 to-white border-t border-slate-200/50">
        <div className="flex items-center justify-between text-xs text-slate-600">
          <span className="font-semibold">
            {project.clientName || "No client"}
          </span>
          <span className="text-indigo-600 font-bold group-hover:text-indigo-700 transition-colors duration-300">
            View Project →
          </span>
        </div>
      </div>
    </Link>
  );
};

export default ProjectList;
