import React, { useState } from "react";
import { Link } from "react-router-dom";
import { Plus, FolderOpen, Users, Calendar, MoreVertical } from "lucide-react";
import { useProject } from "../contexts/ProjectContext";
import { useUser } from "../contexts/UserContext";
import CreateProjectModal from "./CreateProjectModal";
import Avatar from "./Avatar";
import { isEmptyHtml, getCleanTextPreview } from "../utils/htmlUtils";

const ProjectList = () => {
  const { projects, loading } = useProject();
  const { user } = useUser();
  const [showCreateModal, setShowCreateModal] = useState(false);

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
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-lg p-6 text-white">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold mb-2">Your Projects</h1>
            <p className="text-primary-100 text-lg">
              Manage your projects and collaborate with your team
            </p>
          </div>
          {user?.role === "admin" && (
            <button
              onClick={() => setShowCreateModal(true)}
              className="bg-white text-primary-600 hover:bg-primary-50 font-medium py-3 px-6 rounded-xl transition-all duration-200 flex items-center space-x-2 shadow-lg hover:shadow-xl"
            >
              <Plus className="w-5 h-5" />
              <span>Create Project</span>
            </button>
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
          {projects.map((project) => (
            <ProjectCard key={project._id} project={project} />
          ))}
        </div>
      )}

      {/* Create Project Modal */}
      {showCreateModal && (
        <CreateProjectModal onClose={() => setShowCreateModal(false)} />
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
      <div className="bg-gradient-to-r from-primary-500 to-primary-600 p-4 text-white">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <h3 className="text-lg font-semibold group-hover:text-primary-100 transition-colors duration-200">
              {project.name}
            </h3>
            {project.description && !isEmptyHtml(project.description) && (
              <p className="text-primary-100 text-sm mt-1 line-clamp-2">
                {getCleanTextPreview(project.description, 60)}
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
        <div className="flex items-center justify-between text-sm text-secondary-500 mb-4">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-1">
              <Users className="w-4 h-4" />
              <span className="font-medium">
                {project.members?.length || 0} members
              </span>
            </div>
            <div className="flex items-center space-x-1">
              <Calendar className="w-4 h-4" />
              <span>{formatDate(project.createdAt)}</span>
            </div>
          </div>
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
              <div className="w-8 h-8 bg-secondary-300 rounded-full border-2 border-white flex items-center justify-center text-xs text-secondary-600 font-medium shadow-sm">
                +{project.members.length - 4}
              </div>
            )}
          </div>

          <div className="text-right">
            <div className="text-xs text-secondary-500">Created</div>
            <div className="text-sm font-medium text-secondary-900">
              {formatDate(project.createdAt)}
            </div>
          </div>
        </div>
      </div>

      {/* Card Footer */}
      <div className="px-6 py-3 bg-secondary-50 border-t border-secondary-100">
        <div className="flex items-center justify-between text-xs text-secondary-500">
          <span className="font-medium">{project.projectType}</span>
          <span className="text-primary-600 font-medium group-hover:text-primary-700">
            {project.clientName}
          </span>
        </div>
      </div>
    </Link>
  );
};

export default ProjectList;
