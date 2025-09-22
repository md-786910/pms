import axios from "axios";

// Create axios instance with base configuration
const api = axios.create({
  baseURL: "http://localhost:5000/api", // Force backend URL
  timeout: 10000,
  headers: {
    "Content-Type": "application/json",
  },
  withCredentials: true, // Include cookies in requests
});

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    // Get token from localStorage
    const token = localStorage.getItem("authToken");

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    // Add request timestamp for debugging
    config.metadata = { startTime: new Date() };

    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor for error handling and token refresh
api.interceptors.response.use(
  (response) => {
    // Calculate request duration
    if (response.config.metadata) {
      const duration = new Date() - response.config.metadata.startTime;
      console.log(`API Request to ${response.config.url} took ${duration}ms`);
    }

    return response;
  },
  async (error) => {
    const originalRequest = error.config;

    // Handle 401 errors (unauthorized)
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      // Clear stored token and redirect to login
      localStorage.removeItem("authToken");
      localStorage.removeItem("user");

      // Only redirect if not already on login page
      if (window.location.pathname !== "/login") {
        window.location.href = "/login";
      }
    }

    // Handle network errors
    if (!error.response) {
      console.error("Network Error:", error.message);
      error.message = "Network error. Please check your connection.";
    }

    // Handle server errors
    if (error.response?.status >= 500) {
      console.error("Server Error:", error.response.data);
      error.message = "Server error. Please try again later.";
    }

    return Promise.reject(error);
  }
);

// API methods
export const authAPI = {
  login: (credentials) => api.post("/auth/login", credentials),
  register: (userData) => api.post("/auth/register", userData),
  forgotPassword: (email) => api.post("/auth/forgot-password", { email }),
  resetPassword: (token, newPassword) =>
    api.post("/auth/reset-password", { token, newPassword }),
  verifyToken: (token) => api.post("/auth/verify-token", { token }),
  refreshToken: () => api.post("/auth/refresh-token"),
  logout: () => api.post("/auth/logout"),
};

export const userAPI = {
  getUsers: () => api.get("/users"),
  getUser: (id) => api.get(`/users/${id}`),
  createUser: (userData) => api.post("/users", userData),
  updateUser: (id, userData) => api.put(`/users/${id}`, userData),
  deleteUser: (id) => api.delete(`/users/${id}`),
  resetUserPassword: (id, newPassword) =>
    api.post(`/users/${id}/reset-password`, { newPassword }),
  updateProfile: (userData) => api.put("/users/profile", userData),
};

export const projectAPI = {
  getProjects: () => api.get("/projects"),
  getProject: (id) => api.get(`/projects/${id}`),
  createProject: (projectData) => api.post("/projects", projectData),
  updateProject: (id, projectData) => api.put(`/projects/${id}`, projectData),
  deleteProject: (id) => api.delete(`/projects/${id}`),
  addMember: (id, memberData) =>
    api.post(`/projects/${id}/members`, memberData),
  removeMember: (id, userId) => api.delete(`/projects/${id}/members/${userId}`),
};

export const cardAPI = {
  getCards: (projectId) => api.get(`/projects/${projectId}/cards`),
  getCard: (id) => api.get(`/cards/${id}`),
  createCard: (cardData) => api.post("/cards", cardData),
  updateCard: (id, cardData) => api.put(`/cards/${id}`, cardData),
  deleteCard: (id) => api.delete(`/cards/${id}`),
  updateStatus: (id, status) => api.put(`/cards/${id}/status`, { status }),
  assignUser: (id, userId) => api.post(`/cards/${id}/assign`, { userId }),
  unassignUser: (id, userId) => api.delete(`/cards/${id}/assign/${userId}`),
  addComment: (id, comment) => api.post(`/cards/${id}/comments`, { comment }),
  deleteComment: (id, commentId) =>
    api.delete(`/cards/${id}/comments/${commentId}`),
  addAttachment: (id, formData) =>
    api.post(`/cards/${id}/attachments`, formData, {
      headers: { "Content-Type": "multipart/form-data" },
    }),
  deleteAttachment: (id, attachmentId) =>
    api.delete(`/cards/${id}/attachments/${attachmentId}`),
};

export const cardItemAPI = {
  getCardItems: (cardId) => api.get(`/card-items/cards/${cardId}/items`),
  createCardItem: (cardId, itemData) =>
    api.post(`/card-items/cards/${cardId}/items`, itemData),
  updateCardItem: (cardId, itemId, itemData) =>
    api.put(`/card-items/cards/${cardId}/items/${itemId}`, itemData),
  deleteCardItem: (cardId, itemId) =>
    api.delete(`/card-items/cards/${cardId}/items/${itemId}`),
  reorderCardItems: (cardId, items) =>
    api.put(`/card-items/cards/${cardId}/items/reorder`, { items }),
};

export const columnAPI = {
  getColumns: (projectId) => api.get(`/columns/projects/${projectId}/columns`),
  createColumn: (projectId, columnData) =>
    api.post(`/columns/projects/${projectId}/columns`, columnData),
  updateColumn: (projectId, columnId, columnData) =>
    api.put(`/columns/projects/${projectId}/columns/${columnId}`, columnData),
  deleteColumn: (projectId, columnId) =>
    api.delete(`/columns/projects/${projectId}/columns/${columnId}`),
  reorderColumns: (projectId, columns) =>
    api.put(`/columns/projects/${projectId}/columns/reorder`, { columns }),
};

export const notificationAPI = {
  getNotifications: () => api.get("/notifications"),
  markAsRead: (id) => api.put(`/notifications/${id}/read`),
  markAllAsRead: () => api.put("/notifications/mark-all-read"),
  deleteNotification: (id) => api.delete(`/notifications/${id}`),
  createNotification: (notificationData) =>
    api.post("/notifications", notificationData),
};

export default api;
