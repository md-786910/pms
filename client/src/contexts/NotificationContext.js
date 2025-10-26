import React, { createContext, useContext, useState, useEffect } from "react";
import { notificationAPI } from "../utils/api";

const NotificationContext = createContext();

export const useNotification = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error(
      "useNotification must be used within a NotificationProvider"
    );
  }
  return context;
};

export const NotificationProvider = ({ children }) => {
  const [notifications, setNotifications] = useState([]);
  const [toasts, setToasts] = useState([]);

  useEffect(() => {
    fetchNotifications();
  }, []);

  const fetchNotifications = async () => {
    try {
      console.log("🔔 Fetching notifications...");
      const response = await notificationAPI.getNotifications();
      console.log("📊 Notifications response:", response.data);
      setNotifications(response.data.notifications || []);
    } catch (error) {
      console.error("❌ Error fetching notifications:", error);
      console.error("Error details:", error.response?.data || error.message);
    }
  };

  const markAsRead = async (notificationId) => {
    try {
      await notificationAPI.markAsRead(notificationId);
      setNotifications((prev) =>
        prev.map((n) => (n._id === notificationId ? { ...n, read: true } : n))
      );
    } catch (error) {
      console.error("Error marking notification as read:", error);
    }
  };

  const markAllAsRead = async () => {
    try {
      await notificationAPI.markAllAsRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    } catch (error) {
      console.error("Error marking all notifications as read:", error);
    }
  };

  const deleteNotification = async (notificationId) => {
    try {
      await notificationAPI.deleteNotification(notificationId);
      setNotifications((prev) => prev.filter((n) => n._id !== notificationId));
    } catch (error) {
      console.error("Error deleting notification:", error);
    }
  };

  const addNotification = async (type, message, userId = "1") => {
    try {
      const response = await notificationAPI.createNotification({
        type,
        message,
        userId,
      });
      setNotifications((prev) => [response.data, ...prev]);
    } catch (error) {
      console.error("Error adding notification:", error);
    }
  };

  const showToast = (message, type = "info") => {
    const id = Date.now().toString();
    const toast = { id, message, type };
    setToasts((prev) => [...prev, toast]);

    // Auto remove after 5 seconds
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 5000);
  };

  const removeToast = (id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  const value = {
    notifications,
    toasts,
    fetchNotifications,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    addNotification,
    showToast,
    removeToast,
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </NotificationContext.Provider>
  );
};

const ToastContainer = ({ toasts, onRemove }) => {
  return (
    <div className="fixed top-4 right-4 z-50 space-y-2">
      {toasts.map((toast) => (
        <div key={toast.id} className="notification-toast animate-slide-up">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-slate-900">
              {toast.message}
            </p>
            <button
              onClick={() => onRemove(toast.id)}
              className="ml-4 text-slate-400 hover:text-slate-600"
            >
              ×
            </button>
          </div>
        </div>
      ))}
    </div>
  );
};
