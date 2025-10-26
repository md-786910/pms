import React, { useState } from "react";
import {
  Menu,
  Bell,
  User,
  LogOut,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { useUser } from "../contexts/UserContext";
import { useNotification } from "../contexts/NotificationContext";
import AdvancedSearch from "./AdvancedSearch";
import Avatar from "./Avatar";

const Header = ({ onMenuClick, onToggleSidebar, sidebarCollapsed }) => {
  const { user, logout } = useUser();
  const { notifications } = useNotification();
  const [showUserMenu, setShowUserMenu] = useState(false);

  const unreadCount = notifications.filter((n) => !n.read).length;

  const handleLogout = () => {
    logout();
    setShowUserMenu(false);
  };

  return (
    <header className="bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-700 backdrop-blur-xl border-b border-indigo-500/20 px-6 py-4 shadow-lg shadow-indigo-500/10 relative z-[10000]">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          {/* Mobile Search */}
          <div className="md:hidden">
            <AdvancedSearch />
          </div>

          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-gradient-to-br from-white/20 to-white/10 backdrop-blur-sm rounded-xl flex items-center justify-center shadow-lg border border-white/20">
              <span className="text-white font-bold text-lg">P</span>
            </div>
            <div>
              <h1 className="text-xl font-bold text-white tracking-tight">
                Project Management
              </h1>
              <p className="text-xs text-indigo-100">
                Stay organized, stay ahead
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          {/* Advanced Search */}
          <div className="hidden md:block">
            <AdvancedSearch />
          </div>

          {/* Notifications */}
          <div className="relative">
            <button className="p-2.5 rounded-xl hover:bg-white/20 transition-all duration-300 backdrop-blur-sm">
              <Bell className="w-5 h-5 text-white" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-gradient-to-r from-red-500 to-pink-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center shadow-lg border-2 border-white">
                  {unreadCount}
                </span>
              )}
            </button>
          </div>

          {/* User Profile */}
          <div className="relative">
            <button
              onClick={() => setShowUserMenu(!showUserMenu)}
              className="flex items-center space-x-3 hover:bg-white/20 rounded-xl p-2 transition-all duration-300 backdrop-blur-sm"
            >
              <Avatar user={user} size="sm" />
              <div className="hidden sm:block">
                <p className="text-sm font-semibold text-white">{user?.name}</p>
                <p className="text-xs text-indigo-100 capitalize">
                  {user?.role}
                </p>
              </div>
            </button>

            {/* User Dropdown Menu */}
            {showUserMenu && (
              <div className="absolute right-0 mt-2 w-56 bg-white/95 backdrop-blur-xl rounded-2xl shadow-2xl border border-slate-200/50 py-2 z-50 animate-fade-in">
                <div className="px-4 py-3 border-b border-slate-200/50">
                  <p className="text-sm font-semibold text-slate-900">
                    {user?.name}
                  </p>
                  <p className="text-xs text-slate-600">{user?.email}</p>
                </div>
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center space-x-2 px-4 py-2.5 text-sm text-red-600 hover:bg-gradient-to-r hover:from-red-50 hover:to-pink-50 transition-all duration-300"
                >
                  <LogOut className="w-4 h-4" />
                  <span className="font-medium">Sign Out</span>
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
