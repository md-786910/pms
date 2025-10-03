import React, { useState } from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Header from "./components/Header";
import Sidebar from "./components/Sidebar";
import ProjectList from "./components/ProjectList";
import ProjectBoard from "./components/ProjectBoard";
import AdminPanel from "./components/AdminPanel";
import Notifications from "./components/Notifications";
import Settings from "./components/Settings";
import AuthPage from "./components/AuthPage";
import UserManagement from "./components/UserManagement";
import InvitationPage from "./components/InvitationPage";
import { NotificationProvider } from "./contexts/NotificationContext";
import { UserProvider } from "./contexts/UserContext";
import { ProjectProvider } from "./contexts/ProjectContext";
import { useUser } from "./contexts/UserContext";

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
          <Route path="*" element={<AuthPage />} />
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

                  <main className="flex-1 p-6 overflow-auto transition-all duration-300">
                    <Routes>
                      <Route path="/" element={<ProjectList />} />
                      <Route path="/admin" element={<AdminPanel />} />
                      <Route path="/users" element={<UserManagement />} />
                      <Route
                        path="/notifications"
                        element={<Notifications />}
                      />
                      <Route path="/settings" element={<Settings />} />
                      <Route path="/project/:id" element={<ProjectBoard />} />
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
              <ProjectProvider>
                <NotificationProvider>
                  <AppContent />
                </NotificationProvider>
              </ProjectProvider>
            </UserProvider>
          }
        />
      </Routes>
    </Router>
  );
}

export default App;
