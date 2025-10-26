import React from "react";
import { Link, useLocation } from "react-router-dom";
import {
  Menu,
  Home,
  Settings,
  Users,
  FolderOpen,
  X,
  UserPlus,
  Bell,
  Shield,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { useUser } from "../contexts/UserContext";
import { useNotification } from "../contexts/NotificationContext";
import Avatar from "./Avatar";
import { useState } from "react";

const Sidebar = ({
  isOpen,
  onClose,
  onToggleCollapse,
  onMenuClick,
  sidebarOpen,
}) => {
  const location = useLocation();
  const { user } = useUser();
  const { notifications } = useNotification();

  const unreadNotifications = notifications.filter((n) => !n.read).length;
  const [isCollapsed, setIsCollapsed] = useState(false);

  const menuItems = [
    {
      name: "Dashboard",
      href: "/",
      icon: Home,
      show: true,
    },
    {
      name: "Admin Panel",
      href: "/admin",
      icon: Shield,
      show: user?.role === "admin",
    },
    {
      name: "User Management",
      href: "/users",
      icon: Users,
      show: user?.role === "admin",
    },
    {
      name: "Settings",
      href: "/settings",
      icon: Settings,
      show: true,
    },
    {
      name: "Notifications",
      href: "/notifications",
      icon: Bell,
      show: true,
      badge: unreadNotifications > 0 ? unreadNotifications : null,
    },
  ];

  const onToggleSidebar = () => {
    setIsCollapsed((prev) => !prev);
  };

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
        className={`fixed inset-y-0 left-0 z-50 bg-gradient-to-b from-white via-indigo-50/30 to-white backdrop-blur-xl border-r border-slate-200/50 shadow-2xl transform transition-all duration-300 ease-in-out lg:translate-x-0 lg:static lg:inset-0 flex flex-col h-screen ${
          isCollapsed ? "w-16" : "w-72"
        } ${isOpen ? "translate-x-0" : "-translate-x-full"}`}
      >
        <div className="flex items-center justify-between px-4 py-6 border-b border-slate-200/50 bg-gradient-to-r from-indigo-50/50 to-white">
          {!isCollapsed && (
            <h2 className="text-lg font-bold text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-purple-600">
              Menu
            </h2>
          )}
          <button
            onClick={onToggleSidebar}
            className="hidden lg:flex p-2 rounded-xl hover:bg-slate-100 transition-all duration-300 text-slate-600 hover:text-indigo-600"
            title={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {isCollapsed ? (
              <ChevronRight className="w-5 h-5" />
            ) : (
              <ChevronLeft className="w-5 h-5" />
            )}
          </button>
          <button
            onClick={onClose}
            className="p-2 rounded-xl hover:bg-slate-100 transition-all duration-300 lg:hidden text-slate-600"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <nav className="flex-1 p-4 space-y-2">
          {menuItems.map((item) => {
            if (!item.show) return null;

            const Icon = item.icon;
            const isActive =
              location.pathname === item.href ||
              (location.pathname.includes("project") &&
                item.name === "Dashboard");

            return (
              <Link
                key={item.name}
                to={item.href}
                onClick={onClose}
                className={`flex items-center ${
                  isCollapsed
                    ? "justify-center px-2 py-3"
                    : "justify-between px-3 py-3"
                } rounded-xl transition-all duration-300 ease-in-out ${
                  isActive
                    ? "bg-gradient-to-r from-indigo-500 to-purple-500 text-white shadow-lg shadow-indigo-500/30"
                    : "text-slate-600 hover:bg-gradient-to-r hover:from-indigo-50 hover:to-purple-50 hover:text-indigo-700"
                }`}
                title={isCollapsed ? item.name : ""}
              >
                <div className="flex items-center space-x-3">
                  <Icon className="w-5 h-5" />
                  {!isCollapsed && (
                    <span className="font-medium">{item.name}</span>
                  )}
                </div>
                {!isCollapsed && item.badge && (
                  <span className="bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                    {item.badge}
                  </span>
                )}
                {isCollapsed && item.badge && (
                  <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center">
                    {item.badge}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        {/* User info */}
        <div className="p-4 border-t border-slate-200/50 mt-auto bg-gradient-to-r from-white to-indigo-50/20">
          <div
            className={`flex items-center ${
              isCollapsed ? "justify-center" : "space-x-3"
            }`}
          >
            <Avatar user={user} size="sm" />
            {!isCollapsed && (
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-slate-900 truncate">
                  {user?.name}
                </p>
                <p className="text-xs text-slate-500 capitalize">
                  {user?.role}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
};

export default Sidebar;
