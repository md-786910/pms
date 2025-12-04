import React, { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import {
  Home,
  Settings,
  X,
  ChevronLeft,
  ChevronRight,
  FolderOpen,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { useUser } from "../contexts/UserContext";
import { useProject } from "../contexts/ProjectContext";
import SettingsModal from "./SettingsModal";

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
  const [showProjectsSubmenu, setShowProjectsSubmenu] = useState(true);

  const onToggleSidebar = () => {
    setIsCollapsed((prev) => !prev);
  };

  useEffect(() => {
    if (isCollapsed) {
      setShowSettingsModal(false);
      setShowProjectsSubmenu(false);
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
            <h2 className="text-lg font-semibold text-gray-900">Menu</h2>
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

        <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
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

          {/* Projects - Expandable */}
          {["admin", "member"].includes(user?.role) && (
            <div>
              <button
                onClick={() => {
                  if (!isCollapsed)
                    setShowProjectsSubmenu(!showProjectsSubmenu);
                }}
                className={`w-full flex items-center ${isCollapsed
                    ? "justify-center px-2 py-3"
                    : "justify-between px-3 py-3"
                  } rounded-lg transition-colors duration-200 ${isOnProjectPage
                    ? "bg-blue-100 text-blue-700 border border-blue-200"
                    : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
                  }`}
                title={isCollapsed ? "Projects" : ""}
              >
                <div className="flex items-center space-x-3">
                  <FolderOpen className="w-5 h-5" />
                  {!isCollapsed && (
                    <span className="font-medium">Projects</span>
                  )}
                </div>
                {!isCollapsed &&
                  (showProjectsSubmenu ? (
                    <ChevronUp className="w-4 h-4 text-gray-500" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-gray-500" />
                  ))}
              </button>

              {/* Projects Submenu */}
              {!isCollapsed &&
                showProjectsSubmenu &&
                projects &&
                projects.length > 0 && (
                  <div className="mt-2 ml-2 pl-3 border-l-2 border-gray-200 space-y-1">
                    {[...projects]
                      .sort((a, b) => a.name.localeCompare(b.name))
                      .map((project) => {
                        const isProjectActive =
                          location.pathname === `/project/${project._id}`;
                        return (
                          <Link
                            key={project._id}
                            to={`/project/${project._id}`}
                            onClick={onClose}
                            className={`block px-3 py-2.5 rounded-lg transition-all duration-200 ${isProjectActive
                                ? "bg-blue-600 text-white font-semibold shadow-sm"
                                : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
                              }`}
                          >
                            <span className="text-sm truncate block">
                              {project.name}
                            </span>
                          </Link>
                        );
                      })}
                  </div>
                )}
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
