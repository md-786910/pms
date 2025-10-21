import React, { createContext, useContext, useState, useEffect } from "react";
import { projectAPI } from "../utils/api";
import { useUser } from "./UserContext";

const ProjectContext = createContext();

export const useProject = () => {
  const context = useContext(ProjectContext);
  if (!context) {
    throw new Error("useProject must be used within a ProjectProvider");
  }
  return context;
};

export const ProjectProvider = ({ children }) => {
  const [allProjects, setAllProjects] = useState([]);
  const [currentProject, setCurrentProject] = useState(null);
  const [loading, setLoading] = useState(true);
  const { user } = useUser();

  useEffect(() => {
    if (user) {
      fetchProjects();
    }
  }, [user]);

  const fetchProjects = async () => {
    try {
      setLoading(true);
      // Don't pass userId as the API will determine access based on the JWT token
      const response = await projectAPI.getProjects();
      const projects = response.data.projects || [];
      // Ensure each project has a status property
      const projectsWithStatus = projects.map((project) => ({
        ...project,
        status: project.status || "active",
      }));
      setAllProjects(projectsWithStatus);
    } catch (error) {
      console.error("Error fetching projects:", error);
      setAllProjects([]);
    } finally {
      setLoading(false);
    }
  };

  // Projects are already filtered by the API based on user access
  const projects = allProjects;

  const fetchProject = async (id) => {
    try {
      console.log("Fetching project:", id);
      const response = await projectAPI.getProject(id);
      console.log("Project response:", response);
      setCurrentProject(response.data.project);
      return response.data.project;
    } catch (error) {
      console.error("Error fetching project:", error);
      console.error("Error details:", error.response?.data);
      return null;
    }
  };

  const createProject = async (projectData) => {
    try {
      console.log("🔄 ProjectContext: Creating project with data:", projectData);
      const response = await projectAPI.createProject(projectData);
      console.log("✅ ProjectContext: Project created successfully:", response.data.project);
      
      const newProject = response.data.project;
      console.log("📝 ProjectContext: Adding project to state. Current projects count:", allProjects.length);
      
      setAllProjects((prev) => {
        const updated = [...prev, newProject];
        console.log("📝 ProjectContext: Updated projects count:", updated.length);
        return updated;
      });
      
      console.log("✅ ProjectContext: Project added to state successfully");
      return newProject;
    } catch (error) {
      console.error("❌ ProjectContext: Error creating project:", error);
      throw error;
    }
  };

  const updateProject = async (id, projectData) => {
    try {
      const response = await projectAPI.updateProject(id, projectData);
      setAllProjects((prev) =>
        prev.map((p) => (p._id === id ? response.data.project : p))
      );
      if (currentProject && currentProject._id === id) {
        setCurrentProject(response.data.project);
      }
      return response.data.project;
    } catch (error) {
      console.error("Error updating project:", error);
      throw error;
    }
  };

  const deleteProject = async (id) => {
    try {
      await projectAPI.deleteProject(id);
      setAllProjects((prev) => prev.filter((p) => p._id !== id));
      if (currentProject && currentProject._id === id) {
        setCurrentProject(null);
      }
    } catch (error) {
      console.error("Error deleting project:", error);
      throw error;
    }
  };

  const addProjectMember = async (projectId, email, role = "member") => {
    try {
      const response = await projectAPI.addMember(projectId, { email, role });

      // Update project data if available
      if (response.data.project) {
        setAllProjects((prev) =>
          prev.map((p) => (p._id === projectId ? response.data.project : p))
        );
        if (currentProject && currentProject._id === projectId) {
          setCurrentProject(response.data.project);
        }
      }

      // Return the full response data so we can access message and other properties
      return response.data;
    } catch (error) {
      console.error("Error adding project member:", error);
      throw error;
    }
  };

  const removeProjectMember = async (projectId, userId) => {
    try {
      const response = await projectAPI.removeMember(projectId, userId);

      // Update project data if available
      if (response.data.project) {
        setAllProjects((prev) =>
          prev.map((p) => (p._id === projectId ? response.data.project : p))
        );
        if (currentProject && currentProject._id === projectId) {
          setCurrentProject(response.data.project);
        }
      }

      // Return the full response data so we can access message and other properties
      return response.data;
    } catch (error) {
      console.error("Error removing project member:", error);
      throw error;
    }
  };

  const value = {
    projects,
    currentProject,
    loading,
    fetchProjects,
    fetchProject,
    createProject,
    updateProject,
    deleteProject,
    addProjectMember,
    removeProjectMember,
    setCurrentProject,
  };

  return (
    <ProjectContext.Provider value={value}>{children}</ProjectContext.Provider>
  );
};
