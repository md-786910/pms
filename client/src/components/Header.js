import { useState, useEffect, useRef } from "react";
import { Bell, Check, LogOut, Plus } from "lucide-react";
import { useUser } from "../contexts/UserContext";
import { useNotification } from "../contexts/NotificationContext";
import AdvancedSearch from "./AdvancedSearch";
import { useProject } from "../contexts/ProjectContext";
import Avatar from "./Avatar";
import { useNavigate } from "react-router-dom";
import CreateProjectModal from "./CreateProjectModal";

const timeAgo = (dateString) => {
  const now = new Date();
  const past = new Date(dateString);
  const diff = (now - past) / 1000; // seconds

  if (diff < 60) return "Just now";
  if (diff < 3600) return `${Math.floor(diff / 60)} min ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} hr ago`;
  if (diff < 604800) return `${Math.floor(diff / 86400)} day ago`;
  return past.toLocaleDateString("en-US", { month: "short", day: "numeric" });
};

const Header = ({ onMenuClick, onToggleSidebar, sidebarCollapsed }) => {
  const { user, logout } = useUser();
  const bellRef = useRef(null);
  const [showUnreadOnly, setShowUnreadOnly] = useState(false);
  const [showAll, setShowAll] = useState(false);
  const { notifications, markAsRead, markAllAsRead } = useNotification();
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [open, setOpen] = useState(false);
  const unreadCount = notifications.filter((n) => !n.read).length;
  const [showCreateModal, setShowCreateModal] = useState(false);
  const { projects, loading, fetchProjects } = useProject();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    setShowUserMenu(false);
  };
  const sortedNotifications = [...notifications].sort(
    (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
  );

  const filteredNotifications = showUnreadOnly
    ? sortedNotifications.filter((n) => !n.read)
    : sortedNotifications;

  const displayNotifications = showAll
    ? filteredNotifications
    : filteredNotifications.slice(0, 4);

  // Close on outside click
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (bellRef.current && !bellRef.current.contains(event.target)) {
        setOpen(false);
        setShowAll(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);
  const handleModalClose = () => {
    setShowCreateModal(false);
    // Force refresh projects after modal closes
    console.log("🔄 ProjectList: Refreshing projects after modal close");
    fetchProjects();
  };

  return (
    <header className="bg-white border-b border-gray-200 px-6 py-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          {/* Mobile Search */}
          <div className="md:hidden">
            <AdvancedSearch />
          </div>

          <div className="flex items-center space-x-2">
            <div className="w-7 h-7 bg-blue-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">P</span>
            </div>
            <h1 className="text-xl font-bold text-gray-900">
              Project Management
            </h1>
          </div>
        </div>

        <div className="flex items-center space-x-4">
          {/* Advanced Search */}
          <div className="hidden md:block">
            <AdvancedSearch />
          </div>
          <div>
            {user?.role === "admin" && (
              <button
                onClick={() => setShowCreateModal(true)}
                className="
        hover:bg-gray-100 font-medium text-[#4338CA]
        py-2 px-4 rounded-lg border border-[#4338CA] hover:border-transparent
        transition-all duration-200 flex items-center space-x-2
      "
              >
                <Plus className="w-4 h-4" />
                <span>Create Project</span>
              </button>
            )}

            {/* Create Project Modal */}
            {showCreateModal && (
              <CreateProjectModal onClose={handleModalClose} />
            )}
          </div>

          {/* Notifications */}
          <div className="relative" ref={bellRef}>
            {/* Bell Icon */}
            <button
              onClick={() => setOpen(!open)}
              className="p-2 rounded-lg hover:bg-gray-100 relative"
            >
              <Bell className="w-5 h-5 text-[#4338CA]" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                  {unreadCount}
                </span>
              )}
            </button>

            {/* Dropdown */}
            {open && (
              <div className="absolute -right-12 top-12 mt-2 w-[26vw] bg-white shadow-2xl border border-gray-200 rounded-xl p-3 z-[100] opacity-0 translate-y-[-10px] animate-slideDownFade">
                {/* Header */}
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-base font-semibold text-gray-700">
                    Notifications
                  </h3>

                  <div className="flex items-center space-x-2">
                    {/* Toggle unread */}
                    <label className="flex items-center text-xs text-gray-600 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={showUnreadOnly}
                        onChange={() => setShowUnreadOnly(!showUnreadOnly)}
                        className="mr-1 accent-blue-600"
                      />
                      Only show unread
                    </label>

                    {/* Mark all as read */}
                    {unreadCount > 0 && (
                      <button
                        onClick={markAllAsRead}
                        className="flex items-center text-xs text-blue-600 hover:text-blue-700 font-medium space-x-1"
                      >
                        <Check className="w-3 h-3" />
                        <span>Mark all as read</span>
                      </button>
                    )}
                  </div>
                </div>

                {/* Notifications */}
                {notifications.length === 0 ? (
                  <p className="text-sm text-gray-500 text-center py-4">
                    No notifications yet
                  </p>
                ) : (
                  <>
                    <div className="relative group max-h-[65vh] overflow-y-auto space-y-3 pr-2">
                      {displayNotifications.map((n) => {
                        const redirectUri =
                          n.type === "project_activity"
                            ? `/project/${n.relatedProject?._id}/edit`
                            : `/project/${n.relatedProject?._id}/card/${n.relatedCard?._id}`;

                        return (
                          <div
                            key={n._id}
                            onClick={(e) => {
                              e.stopPropagation();
                              markAsRead(n._id);
                              setOpen(false);
                              navigate(redirectUri);
                            }}
                            className={`relative rounded-xl border border-gray-200 p-4 cursor-pointer transition-all duration-300 hover:shadow-md hover:-translate-y-[2px] ${
                              !n.read
                                ? "bg-gradient-to-r from-blue-50 via-indigo-50 to-transparent"
                                : "bg-white"
                            }`}
                          >
                            {/* Project name (Top Priority) */}
                            {n.relatedProject && (
                              <div className="flex items-center justify-between mb-2">
                                <div className="flex items-center space-x-2">
                                  <span className="text-[15px] font-semibold text-gray-900">
                                    {n.relatedProject?.name}
                                  </span>
                                  <span className="text-[12px] text-gray-500 bg-gray-100 px-2 py-0.5 rounded-md">
                                    Project
                                  </span>
                                </div>

                                {/* Optional unread dot */}
                                {!n.read && (
                                  <span className="w-2 h-2 rounded-full bg-blue-500 shadow-sm"></span>
                                )}
                              </div>
                            )}
                            {/* Card title and message */}
                            <div className="ml-1 mb-3">
                              <p className="text-[14px] text-gray-800 font-medium">
                                🗂️ {n.title || "Card Update"}
                              </p>
                              <p className="text-[13px] text-gray-600 mt-1 leading-snug">
                                {n.message ||
                                  "You have a new update on this card."}
                              </p>
                            </div>
                            {/* Divider */}
                            <div className="border-t border-gray-200 my-2"></div>
                            {/* Sender Info */}
                            <div className="flex items-center justify-between">
                              <div className="flex items-center space-x-3">
                                <div
                                  className="w-9 h-9 rounded-full flex items-center justify-center text-white text-sm font-semibold shadow-sm"
                                  style={{
                                    backgroundColor:
                                      n.sender?.color || "#6366f1",
                                  }}
                                >
                                  {n.sender?.avatar || "U"}
                                </div>
                                <div>
                                  <p className="text-[13px] font-semibold text-gray-900">
                                    {n.sender?.name || "Unknown User"}
                                  </p>
                                  <p className="text-[12px] text-gray-500">
                                    {timeAgo(n.createdAt)}
                                  </p>
                                </div>
                              </div>

                              {/* Quick action */}
                              {n.relatedProject?._id && (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    markAsRead(n._id);
                                    setOpen(false);
                                    navigate(redirectUri);
                                  }}
                                  className="text-xs text-blue-600 hover:underline font-medium"
                                >
                                  View Card →
                                </button>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* View All / Less */}
                    {filteredNotifications.length > 4 && (
                      <div className="mt-3 text-center border-t border-gray-200 pt-2">
                        <button
                          onClick={() => setShowAll(!showAll)}
                          className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                        >
                          {showAll ? "View less ↑" : "View all ↓"}
                        </button>
                      </div>
                    )}
                  </>
                )}
              </div>
            )}
          </div>

          {/* User Profile */}
          <div className="relative">
            <button
              onClick={() => setShowUserMenu(!showUserMenu)}
              className="flex items-center space-x-3 hover:bg-gray-50 rounded-lg p-2 transition-colors duration-200"
            >
              <Avatar user={user} size="sm" />
              <div className="hidden sm:block">
                <p className="text-sm font-medium text-gray-900">
                  {user?.name}
                </p>
                <p className="text-xs text-gray-500 capitalize">{user?.role}</p>
              </div>
            </button>

            {/* User Dropdown Menu */}
            {showUserMenu && (
              <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-2 z-50">
                <div className="px-4 py-2 border-b border-gray-100">
                  <p className="text-sm font-medium text-gray-900">
                    {user?.name}
                  </p>
                  <p className="text-xs text-gray-500">{user?.email}</p>
                </div>
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center space-x-2 px-4 py-2 text-sm text-red-600 hover:bg-red-50"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Sign Out</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
