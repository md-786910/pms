import React, { useState, useEffect, useRef } from "react";
import { Search, X, Filter, Calendar, User, Tag, Hash } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useProject } from "../contexts/ProjectContext";
import { useUser } from "../contexts/UserContext";
import { cardAPI } from "../utils/api";

const AdvancedSearch = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [activeFilter, setActiveFilter] = useState("all");
  const [showFilters, setShowFilters] = useState(false);
  const searchRef = useRef(null);
  const navigate = useNavigate();
  const { projects } = useProject();
  const { user } = useUser();

  const filterOptions = [
    { id: "all", label: "All", icon: Search },
    { id: "projects", label: "Projects", icon: Calendar },
    { id: "cards", label: "Cards", icon: Tag },
    { id: "users", label: "Users", icon: User },
  ];

  // Close search when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (searchRef.current && !searchRef.current.contains(event.target)) {
        setIsOpen(false);
        setSearchQuery("");
        setSearchResults([]);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Search function
  const performSearch = async (query, filter = "all") => {
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }

    setLoading(true);
    const results = [];

    try {
      // Search projects
      if (filter === "all" || filter === "projects") {
        const projectResults =
          projects
            ?.filter(
              (project) =>
                project.name?.toLowerCase().includes(query.toLowerCase()) ||
                project.description?.toLowerCase().includes(query.toLowerCase())
            )
            .map((project) => ({
              id: project._id,
              type: "project",
              title: project.name,
              subtitle: project.description || "No description",
              status: project.status,
              icon: Calendar,
              url: `/project/${project._id}`,
              metadata: {
                members: project.members?.length || 0,
                createdAt: project.createdAt,
              },
            })) || [];

        results.push(...projectResults);
      }

      // Search cards across all projects
      if (filter === "all" || filter === "cards") {
        for (const project of projects || []) {
          try {
            const response = await cardAPI.getCards(project._id);
            if (response.data.success) {
              // Get columns to map status IDs to readable names
              const columnsResponse = await import("../utils/api").then((api) =>
                api.columnAPI.getColumns(project._id)
              );
              const columns = columnsResponse.data.columns || [];

              const cardResults =
                response.data.cards
                  ?.filter(
                    (card) =>
                      card.title?.toLowerCase().includes(query.toLowerCase()) ||
                      card.description
                        ?.toLowerCase()
                        .replace(/<[^>]*>/g, "") // Strip HTML tags for search
                        .includes(query.toLowerCase()) ||
                      card.status?.toLowerCase().includes(query.toLowerCase())
                  )
                  .map((card) => {
                    // Find readable column name for status
                    const column = columns.find(
                      (col) => col.status === card.status
                    );
                    const readableStatus = column ? column.name : card.status;

                    // Strip HTML tags from description for display
                    const cleanDescription = card.description
                      ? card.description.replace(/<[^>]*>/g, "").trim()
                      : "No description";

                    return {
                      id: card._id,
                      type: "card",
                      title: card.title,
                      subtitle: cleanDescription,
                      status: readableStatus,
                      icon: Tag,
                      url: `/project/${project._id}/card/${card._id}`, // Direct card link
                      metadata: {
                        project: project.name,
                        assignees: card.assignees?.length || 0,
                        priority: card.priority,
                        dueDate: card.dueDate,
                      },
                    };
                  }) || [];

              results.push(...cardResults);
            }
          } catch (error) {
            console.error(
              `Error searching cards in project ${project._id}:`,
              error
            );
          }
        }
      }

      // Search users (if admin)
      if ((filter === "all" || filter === "users") && user?.role === "admin") {
        // This would require a users API endpoint
        // For now, we'll skip this or implement a basic search
      }

      setSearchResults(results);
    } catch (error) {
      console.error("Search error:", error);
    } finally {
      setLoading(false);
    }
  };

  // Debounced search
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (searchQuery.trim()) {
        performSearch(searchQuery, activeFilter);
      } else {
        setSearchResults([]);
      }
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [searchQuery, activeFilter, projects]);

  const handleResultClick = (result) => {
    // Navigate to the result using React Router
    navigate(result.url);
    setIsOpen(false);
    setSearchQuery("");
    setSearchResults([]);
  };

  const getStatusColor = (status, type) => {
    if (type === "project") {
      return "bg-blue-100 text-blue-800";
    }

    switch (status?.toLowerCase()) {
      case "todo":
        return "bg-gray-100 text-gray-800";
      case "doing":
        return "bg-yellow-100 text-yellow-800";
      case "review":
        return "bg-purple-100 text-purple-800";
      case "done":
        return "bg-green-100 text-green-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return "";
    return new Date(dateString).toLocaleDateString();
  };

  return (
    <div className="relative" ref={searchRef}>
      {/* Search Input */}
      <div className="relative">
        <div className="flex items-center space-x-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Search projects, cards, and more..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onFocus={() => setIsOpen(true)}
              className="w-64 md:w-80 pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            {searchQuery && (
              <button
                onClick={() => {
                  setSearchQuery("");
                  setSearchResults([]);
                }}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Filter Toggle */}
          {/* <button
            onClick={() => setShowFilters(!showFilters)}
            className={`p-2 rounded-lg transition-colors duration-200 ${
              showFilters
                ? "bg-blue-100 text-blue-600"
                : "text-gray-400 hover:bg-gray-100"
            }`}
            title="Filter results"
          >
            <Filter className="w-4 h-4" />
          </button> */}
        </div>

        {/* Filter Options */}
        {showFilters && (
          <div className="absolute top-full left-0 mt-2 bg-white rounded-lg shadow-lg border border-gray-200 py-2 z-50 min-w-48">
            {filterOptions.map((option) => {
              const Icon = option.icon;
              return (
                <button
                  key={option.id}
                  onClick={() => {
                    setActiveFilter(option.id);
                    setShowFilters(false);
                  }}
                  className={`w-full flex items-center space-x-3 px-4 py-2 text-left hover:bg-gray-50 ${
                    activeFilter === option.id
                      ? "bg-blue-50 text-blue-600"
                      : "text-gray-700"
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span className="text-sm font-medium">{option.label}</span>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Search Results */}
      {isOpen && (searchQuery || searchResults.length > 0) && (
        <div className="absolute top-full left-0 mt-2 w-80 md:w-96 bg-white rounded-lg shadow-xl border border-gray-200 z-50 max-h-96 overflow-y-auto">
          {loading ? (
            <div className="p-4 text-center">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto"></div>
              <p className="text-sm text-gray-500 mt-2">Searching...</p>
            </div>
          ) : searchResults.length > 0 ? (
            <div className="py-2">
              <div className="px-4 py-2 border-b border-gray-100">
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                  {searchResults.length} result
                  {searchResults.length !== 1 ? "s" : ""} found
                </p>
              </div>
              {searchResults.map((result) => {
                const Icon = result.icon;
                return (
                  <button
                    key={`${result.type}-${result.id}`}
                    onClick={() => handleResultClick(result)}
                    className="w-full flex items-start space-x-3 px-4 py-3 hover:bg-gray-50 text-left"
                  >
                    <div className="flex-shrink-0 mt-1">
                      <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                        <Icon className="w-4 h-4 text-blue-600" />
                      </div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-2">
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {result.title}
                        </p>
                        <span
                          className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(
                            result.status,
                            result.type
                          )}`}
                        >
                          {result.status}
                        </span>
                      </div>
                      <p className="text-sm text-gray-500 truncate">
                        {result.subtitle}
                      </p>
                      {result.metadata && (
                        <div className="flex items-center space-x-4 mt-1">
                          {result.metadata.project && (
                            <span className="text-xs text-gray-400">
                              Project: {result.metadata.project}
                            </span>
                          )}
                          {result.metadata.members !== undefined && (
                            <span className="text-xs text-gray-400">
                              {result.metadata.members} members
                            </span>
                          )}
                          {result.metadata.assignees !== undefined && (
                            <span className="text-xs text-gray-400">
                              {result.metadata.assignees} assignees
                            </span>
                          )}
                          {result.metadata.dueDate && (
                            <span className="text-xs text-gray-400">
                              Due: {formatDate(result.metadata.dueDate)}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          ) : searchQuery ? (
            <div className="p-4 text-center">
              <Search className="w-8 h-8 text-gray-300 mx-auto mb-2" />
              <p className="text-sm text-gray-500">No results found</p>
              <p className="text-xs text-gray-400 mt-1">
                Try different keywords or check your spelling
              </p>
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
};

export default AdvancedSearch;
