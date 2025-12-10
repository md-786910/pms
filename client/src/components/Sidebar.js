import React, { useEffect, useState, useMemo } from "react";
import { Link, useLocation } from "react-router-dom";
import {
  Home,
  Settings,
  X,
  ChevronLeft,
  ChevronRight,
  FolderOpen,
  ChevronDown,
} from "lucide-react";
import { useUser } from "../contexts/UserContext";
import { useProject } from "../contexts/ProjectContext";
import SettingsModal from "./SettingsModal";
import Logo from '../assets/logo.png';

const Sidebar = ({
  isOpen,
  onClose,
  onToggleCollapse,
  onMenuClick,
  sidebarOpen,
}) => {
  const location = useLocation();
  const { user } = useUser();
  const { projects } = useProject();

  const [isCollapsed, setIsCollapsed] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [expandedCategories, setExpandedCategories] = useState({});

  // Group projects by category (alphabetically sorted)
  const groupedProjects = useMemo(() => {
    if (!projects || projects.length === 0) return { categories: [], uncategorized: [] };

    const categoryMap = new Map();
    const workspace = { name: "Workspace", projects: [], color: "#6366f1" };

    projects.forEach((project) => {
      if (project.category && project.category._id) {
        const catId = project.category._id;
        // If category is Workspace, add to workspace group
        if (project.category.name === "Workspace") {
          workspace.projects.push(project);
          if (!workspace._id) workspace._id = catId;
          if (!workspace.color) workspace.color = project.category.color;
        } else {
          if (!categoryMap.has(catId)) {
            categoryMap.set(catId, {
              ...project.category,
              projects: [],
            });
          }
          categoryMap.get(catId).projects.push(project);
        }
      } else {
        workspace.projects.push(project);
      }
    });

    // Sort categories alphabetically by name
    const categories = Array.from(categoryMap.values()).sort((a, b) =>
      a.name.localeCompare(b.name)
    );

    // Add workspace at the beginning if it has projects
    if (workspace.projects.length > 0) {
      categories.unshift(workspace);
    }

    // Sort projects within each category alphabetically
    categories.forEach((cat) => {
      cat.projects.sort((a, b) => a.name.localeCompare(b.name));
    });

    return { categories, uncategorized: [] };
  }, [projects]);

  // Toggle category expansion
  const toggleCategory = (categoryId) => {
    setExpandedCategories((prev) => ({
      ...prev,
      [categoryId]: !prev[categoryId],
    }));
  };

  // Initialize all categories and projects menu as expanded
  useEffect(() => {
    const initialExpanded = { projects: true };
    groupedProjects.categories.forEach((cat) => {
      initialExpanded[cat._id] = true;
    });
    setExpandedCategories((prev) => ({ ...initialExpanded, ...prev }));
  }, [groupedProjects.categories.length]);

  const onToggleSidebar = () => {
    setIsCollapsed((prev) => !prev);
  };

  useEffect(() => {
    if (isCollapsed) {
      setShowSettingsModal(false);
    }
  }, [isCollapsed]);

  const isOnProjectPage = location.pathname.includes("/project/");

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <div
        className={`fixed inset-y-0 left-0 z-50 bg-white border-r border-gray-200 transform transition-all duration-300 ease-in-out lg:translate-x-0 lg:static lg:inset-0 flex flex-col h-screen ${isCollapsed ? "w-16" : "w-72"
          } ${isOpen ? "translate-x-0" : "-translate-x-full"}`}
      >
        <div className="flex items-center justify-between px-4 py-4 border-b border-gray-200">
          {!isCollapsed && (
            <div className="flex items-center gap-2">
              <img src={Logo} alt="Logo" className="w-6 h-6" />
              <h2 className="text-lg font-semibold text-gray-900">PMS</h2>
            </div>
          )}
          <button
            onClick={onToggleSidebar}
            className="hidden lg:flex p-2 rounded-lg hover:bg-gray-100 transition-colors duration-200"
            title={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {isCollapsed ? (
              <ChevronRight className="w-5 h-5 text-gray-600" />
            ) : (
              <ChevronLeft className="w-5 h-5 text-gray-600" />
            )}
          </button>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-gray-100 transition-colors duration-200 lg:hidden"
          >
            <X className="w-4 h-4 text-gray-600" />
          </button>
        </div>

        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          {/* Dashboard */}
          <Link
            to="/"
            onClick={onClose}
            className={`flex items-center ${isCollapsed
                ? "justify-center px-2 py-3"
                : "justify-between px-3 py-3"
              } rounded-lg transition-colors duration-200 ${!isOnProjectPage && location.pathname === "/"
                ? "bg-blue-100 text-blue-700 border border-blue-200"
                : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
              }`}
            title={isCollapsed ? "Dashboard" : ""}
          >
            <div className="flex items-center space-x-3">
              <Home className="w-5 h-5" />
              {!isCollapsed && <span className="font-medium">Dashboard</span>}
            </div>
          </Link>

          {/* Main Projects Menu */}
          {["admin", "member"].includes(user?.role) && !isCollapsed && (
            <div>
              {/* Projects Header */}
              <button
                onClick={() => toggleCategory("projects")}
                className={`w-full flex items-center justify-between px-3 py-3 rounded-lg transition-all duration-200 ${
                  isOnProjectPage
                    ? "bg-blue-100 text-blue-700 border border-blue-200"
                    : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
                }`}
              >
                <div className="flex items-center space-x-3 min-w-0">
                  <FolderOpen className="w-5 h-5" />
                  <span className="font-medium">Projects</span>
                </div>
                <ChevronDown
                  className={`w-5 h-5 text-gray-400 transition-transform duration-200 ${
                    expandedCategories["projects"] ? "rotate-180" : ""
                  }`}
                />
              </button>

              {/* Projects Content */}
              <div
                className={`overflow-hidden transition-all duration-200 ${
                  expandedCategories["projects"]
                    ? "max-h-[2000px] opacity-100"
                    : "max-h-0 opacity-0"
                }`}
              >
                <div className="mt-1 space-y-0.5 ml-4 pl-3 border-l-2 border-gray-200">
                  {/* Categories - each as expandable section */}
                  {groupedProjects.categories.map((category) => (
                    <div key={category._id}>
                      {/* Category Header */}
                      <button
                        onClick={() => toggleCategory(category._id)}
                        className={`w-full flex items-center justify-between px-2 py-2 rounded-md transition-all duration-200 ${
                          category.projects.some(
                            (p) => location.pathname === `/project/${p._id}`
                          )
                            ? "bg-blue-50 text-blue-600"
                            : "text-gray-500 hover:bg-gray-50 hover:text-gray-700"
                        }`}
                      >
                        <div className="flex items-center space-x-2 min-w-0">
                          <div
                            className="w-4 h-4 rounded flex-shrink-0 flex items-center justify-center"
                            style={{ backgroundColor: category.color || "#6366f1" }}
                          >
                            <FolderOpen className="w-2.5 h-2.5 text-white" />
                          </div>
                          <span className="text-sm font-medium truncate">
                            {category.name}
                          </span>
                        </div>
                        <ChevronDown
                          className={`w-4 h-4 text-gray-400 transition-transform duration-200 ${
                            expandedCategories[category._id] ? "rotate-180" : ""
                          }`}
                        />
                      </button>

                      {/* Category Projects */}
                      <div
                        className={`overflow-hidden transition-all duration-200 ${
                          expandedCategories[category._id]
                            ? "max-h-[500px] opacity-100"
                            : "max-h-0 opacity-0"
                        }`}
                      >
                        <div className="mt-0.5 space-y-0.5 ml-3 pl-2 border-l border-gray-200">
                          {category.projects.map((project) => {
                            const isProjectActive =
                              location.pathname === `/project/${project._id}`;
                            return (
                              <Link
                                key={project._id}
                                to={`/project/${project._id}`}
                                onClick={onClose}
                                className={`flex items-center gap-2 px-2 py-1.5 rounded-md transition-all duration-200 ${
                                  isProjectActive
                                    ? "bg-blue-50 text-blue-600 font-medium"
                                    : "text-gray-500 hover:bg-gray-50 hover:text-gray-700"
                                }`}
                              >
                                <span className="text-sm truncate">{project.name}</span>
                              </Link>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  ))}

                  {/* Uncategorized Projects - displayed directly inside Projects */}
                  {groupedProjects.uncategorized.map((project) => {
                    const isProjectActive =
                      location.pathname === `/project/${project._id}`;
                    return (
                      <Link
                        key={project._id}
                        to={`/project/${project._id}`}
                        onClick={onClose}
                        className={`flex items-center px-2 py-2 rounded-md transition-colors duration-200 ${
                          isProjectActive
                            ? "bg-blue-50 text-blue-600 font-medium"
                            : "text-gray-500 hover:bg-gray-50 hover:text-gray-700"
                        }`}
                      >
                        <div className="flex items-center space-x-2 min-w-0">
                          <div className="w-4 h-4 rounded flex-shrink-0 flex items-center justify-center bg-gray-400">
                            <FolderOpen className="w-2.5 h-2.5 text-white" />
                          </div>
                          <span className="text-sm truncate">{project.name}</span>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* Collapsed state - show Projects icon */}
          {["admin", "member"].includes(user?.role) && isCollapsed && (
            <div
              className={`flex items-center justify-center px-2 py-3 rounded-lg transition-colors duration-200 cursor-pointer ${
                isOnProjectPage
                  ? "bg-blue-100 text-blue-700 border border-blue-200"
                  : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
              }`}
              title="Projects"
              onClick={() => setIsCollapsed(false)}
            >
              <FolderOpen className="w-5 h-5" />
            </div>
          )}
        </nav>

        {/* User info */}
        <div className="relative border-t border-gray-200 mt-auto">
          <div
            className="p-4 cursor-pointer hover:bg-gray-50 transition-colors duration-200"
            onClick={() => setShowSettingsModal(true)}
          >
            <div
              className={`flex items-center ${isCollapsed ? "justify-center" : "space-x-3"
                }`}
            >
              <Settings className="w-5 h-5 text-gray-600" />
              {!isCollapsed && (
                <p className="text-sm font-medium text-gray-900">Settings</p>
              )}
            </div>
          </div>

          {/* Settings Modal */}
          <SettingsModal
            isOpen={showSettingsModal}
            onClose={() => setShowSettingsModal(false)}
          />
        </div>
      </div>
    </>
  );
};

export default Sidebar;
