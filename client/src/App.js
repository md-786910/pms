import React, { useState } from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Header from "./components/Header";
import Sidebar from "./components/Sidebar";
import ProjectList from "./components/ProjectList";
import ProjectBoard from "./components/ProjectBoard";
import AdminPanel from "./components/AdminPanel";
import AdminTimeTracking from "./components/AdminTimeTracking";
import ArchivedProjects from "./components/ArchivedProjects";
import ManageProjects from "./components/ManageProjects";
import Notifications from "./components/Notifications";
import Settings from "./components/Settings";
import AuthPage from "./components/AuthPage";
import UserManagement from "./components/UserManagement";
import InvitationPage from "./components/InvitationPage";
import { NotificationProvider } from "./contexts/NotificationContext";
import { UserProvider } from "./contexts/UserContext";
import { ProjectProvider } from "./contexts/ProjectContext";
import { SocketProvider } from "./contexts/SocketContext";
import { useUser } from "./contexts/UserContext";
import ResetPassword from "./components/ResetPassword";

function AppContent() {
  const { isAuthenticated, loading } = useUser();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }
  return (
    <div className="min-h-screen bg-gray-50">
      <Routes>
        {!isAuthenticated ? (
          <>
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="*" element={<AuthPage />} />
          </>
        ) : (
          <Route
            path="*"
            element={
              <div className="min-h-screen bg-gray-50 flex">
                <Sidebar
                  isOpen={sidebarOpen}
                  isCollapsed={sidebarCollapsed}
                  onClose={() => setSidebarOpen(false)}
                  onToggleCollapse={() =>
                    setSidebarCollapsed(!sidebarCollapsed)
                  }
                />

                <div className="flex-1 flex flex-col h-screen overflow-hidden">
                  <Header
                    onMenuClick={() => setSidebarOpen(!sidebarOpen)}
                    onToggleSidebar={() =>
                      setSidebarCollapsed(!sidebarCollapsed)
                    }
                    sidebarCollapsed={sidebarCollapsed}
                  />

                  <main className="flex-1 pt-6 px-6 overflow-auto transition-all duration-300 bg-slate-200">
                    <Routes>
                      <Route path="/" element={<ProjectList />} />
                      <Route path="/admin" element={<AdminPanel />} />
                      <Route path="/admin/time-tracking" element={<AdminTimeTracking />} />
                      <Route path="/archived-projects" element={<ArchivedProjects />} />
                      <Route path="/manage-projects" element={<ManageProjects />} />
                      <Route path="/users" element={<UserManagement />} />
                      <Route
                        path="/notifications"
                        element={<Notifications />}
                      />
                      <Route path="/settings" element={<Settings />} />
                      <Route path="/project/:id" element={<ProjectBoard />} />
                      <Route
                        path="/project/:id/edit"
                        element={<ProjectBoard />}
                      />
                      <Route
                        path="/project/:projectId/edit"
                        element={<ProjectBoard />}
                      />
                      <Route
                        path="/project/:projectId/card/:cardId"
                        element={<ProjectBoard />}
                      />
                    </Routes>
                  </main>
                </div>
              </div>
            }
          />
        )}
      </Routes>
    </div>
  );
}

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/invite/:token" element={<InvitationPage />} />
        <Route
          path="*"
          element={
            <UserProvider>
              <SocketProvider>
                <ProjectProvider>
                  <NotificationProvider>
                    <AppContent />
                  </NotificationProvider>
                </ProjectProvider>
              </SocketProvider>
            </UserProvider>
          }
        />
      </Routes>
    </Router>
  );
}

export default App;
