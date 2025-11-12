import { useState, useEffect, useRef } from "react";
import { Bell, Check, LogOut } from "lucide-react";
import { useUser } from "../contexts/UserContext";
import { useNotification } from "../contexts/NotificationContext";
import AdvancedSearch from "./AdvancedSearch";
import Avatar from "./Avatar";

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

          {/* Notifications */}
          <div className="relative" ref={bellRef}>
            {/* Bell Icon */}
            <button
              onClick={() => setOpen(!open)}
              className="p-2 rounded-lg hover:bg-gray-100 relative"
            >
              <Bell className="w-5 h-5 text-gray-600" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                  {unreadCount}
                </span>
              )}
            </button>

            {/* Dropdown */}
            {open && (
              <div className="absolute right-0 mt-2 w-96 bg-white shadow-2xl border border-gray-200 rounded-xl p-3 z-[100]">
                {/* Header */}
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-base font-semibold text-gray-700">
                    Notifications
                  </h3>

                  <div className="flex items-center space-x-2">
                    <label className="flex items-center text-xs text-gray-600 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={showUnreadOnly}
                        onChange={() => setShowUnreadOnly(!showUnreadOnly)}
                        className="mr-1 accent-blue-600"
                      />
                      Only unread
                    </label>

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
                    <div className="max-h-80 overflow-y-auto space-y-3">
                      {displayNotifications.map((n) => (
                        <div
                          key={n._id}
                          onClick={(e) => {
                            e.stopPropagation();
                            markAsRead(n._id);
                            window.location.href = `/project/${n.relatedProject?._id}/card/${n.relatedCard?._id}`;
                          }}
                          className={`relative border border-gray-200 rounded-xl p-4 shadow-sm hover:shadow-md transition-all duration-200 cursor-pointer ${
                            !n.read ? "bg-blue-50" : "bg-white"
                          }`}
                        >
                          {/* Header: Notification Title */}
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex gap-5 items-start">
                              <div className="flex items-center space-x-2">
                                <div
                                  className="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-medium shadow-sm"
                                  style={{
                                    backgroundColor:
                                      n.sender?.color || "#6b7280",
                                  }}
                                >
                                  {n.sender?.avatar || "U"}
                                </div>
                                <div>
                                  <p className="text-sm font-semibold text-gray-900">
                                    {n.sender?.name || "Unknown User"}
                                  </p>
                                  <p className="text-xs text-gray-500">
                                    {timeAgo(n.createdAt)}
                                  </p>
                                </div>
                              </div>
                              <div className="">
                                {n.relatedProject && (
                                  <p className="text-xs font-medium text-gray-500">
                                    {n.relatedProject?.name}
                                  </p>
                                )}
                              </div>
                            </div>

                            {/* Blue dot for unread */}
                            {!n.read && (
                              <span className="w-2.5 h-2.5 rounded-full bg-blue-600"></span>
                            )}
                          </div>

                          {/* Title */}
                          <div className="text-sm font-bold rounded-lg py-1.5 shadow-sm">
                            {n?.title}
                          </div>

                          {/* Message + Project Info */}
                          <div className="pl-1">
                            <p className="text-sm text-gray-700 leading-snug">
                              {n?.message}
                            </p>
                          </div>
                        </div>
                      ))}
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
