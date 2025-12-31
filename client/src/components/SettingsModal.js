import React from "react";
import { X, Settings, Shield, Users, Zap, Sliders, Archive, FolderCog } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { useUser } from "../contexts/UserContext";

const SettingsModal = ({ isOpen, onClose }) => {
  const { user } = useUser();
  const location = useLocation();

  const settingMenu = [
    {
      name: "Admin Panel",
      href: "/admin",
      icon: Shield,
      show: user?.role === "admin",
      key: "admin",
      title: "Admin Panel",
    },
    {
      name: "User Management",
      href: "/users",
      icon: Users,
      show: user?.role === "admin",
      key: "users",
      title: "User Management",
    },
    {
      name: "Archived Projects",
      href: "/archived-projects",
      icon: Archive,
      show: user?.role === "admin",
      key: "archived",
      title: "Archived Projects",
    },
    {
      name: "Manage Projects",
      href: "/manage-projects",
      icon: FolderCog,
      show: user?.role === "admin",
      key: "manage-projects",
      title: "Manage project categories",
    },
    {
      name: "Preferences",
      href: "/settings",
      icon: Sliders,
      show: true,
      key: "settings",
      title: "Preferences",
    },
  ];

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-40" onClick={onClose} />

      {/* Dropdown Menu - positioned relative to settings box */}
      <div className="absolute bottom-16 left-0 right-0 mx-auto w-[94%] z-50 pointer-events-auto">
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-200 dark:border-gray-700 overflow-hidden animate-in fade-in slide-in-from-bottom-2 duration-200">
          {/* Header */}
          <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-4 py-3 flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="p-1 rounded-lg bg-white bg-opacity-20">
                <Zap className="w-5 h-5 text-white" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white">Quick Access</h3>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg bg-white bg-opacity-20 hover:bg-opacity-30 transition-all duration-200"
            >
              <X className="w-4 h-4 text-white" />
            </button>
          </div>

          {/* Content */}
          <div className="py-2 max-h-[400px]">
            {settingMenu.map((item) => {
              if (!item.show) return null;

              const Icon = item.icon;
              const isActive = location.pathname === item.href;

              return (
                <Link
                  key={item.key}
                  to={item.href}
                  title={item.title}
                  className={`flex items-center space-x-3 px-1 py-1 mx-2 rounded-lg transition-all duration-200 ${
                    isActive
                      ? "bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-700"
                      : "text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
                  }`}
                >
                  <div
                    className={`p-2 rounded-lg ${
                      isActive
                        ? "bg-blue-600 text-white"
                        : "bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400"
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                  </div>
                  <span className="font-medium text-sm">{item.name}</span>
                  {isActive && (
                    <div className="ml-auto w-2 h-2 bg-blue-600 dark:bg-blue-400 rounded-full" />
                  )}
                </Link>
              );
            })}
          </div>
        </div>
      </div>
    </>
  );
};

export default SettingsModal;
