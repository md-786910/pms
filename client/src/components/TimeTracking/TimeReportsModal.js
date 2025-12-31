import React, { useState, useEffect, useCallback } from "react";
import {
  X,
  Clock,
  Calendar,
  Filter,
  Download,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Play,
  PenLine,
  Trash2,
  BarChart3,
  TrendingUp,
  Users,
  FileText,
  Search,
  ArrowUpDown,
  AlertTriangle,
  CheckCircle,
  Timer,
} from "lucide-react";
import { timeEntryAPI } from "../../utils/api";
import { useNotification } from "../../contexts/NotificationContext";
import { useUser } from "../../contexts/UserContext";
import Avatar from "../Avatar";
import { formatDuration, formatWorkDate } from "./timeUtils";

const TimeReportsModal = ({ isOpen, onClose, projectId, projectName }) => {
  const { showToast } = useNotification();
  const { user } = useUser();

  // View mode state
  const [viewMode, setViewMode] = useState("cards"); // "cards" | "entries"

  // Data state
  const [entries, setEntries] = useState([]);
  const [stats, setStats] = useState(null);
  const [filterOptions, setFilterOptions] = useState({ users: [], cards: [] });
  const [pagination, setPagination] = useState({ total: 0, page: 1, pages: 1 });
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState(null);

  // Filter state
  const [filters, setFilters] = useState({
    startDate: "",
    endDate: "",
    userId: "",
    cardId: "",
    entryType: "",
  });
  const [showFilters, setShowFilters] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  // Edit state
  const [editingEntry, setEditingEntry] = useState(null);
  const [editDuration, setEditDuration] = useState({ hours: "", minutes: "" });
  const [editDescription, setEditDescription] = useState("");

  // Sort state for cards view
  const [cardSortBy, setCardSortBy] = useState("timeSpent"); // "timeSpent" | "cardNumber" | "status"
  const [cardSortOrder, setCardSortOrder] = useState("desc");

  // Fetch entries data
  const fetchEntries = useCallback(async (page = 1) => {
    if (!projectId) return;

    try {
      setLoading(true);
      const response = await timeEntryAPI.getProjectEntries(projectId, {
        ...filters,
        page,
        limit: 25
      });

      if (response.data.success) {
        setEntries(response.data.entries);
        setStats(response.data.stats);
        setFilterOptions(response.data.filterOptions);
        setPagination(response.data.pagination);
      }
    } catch (error) {
      console.error("Error fetching time entries:", error);
      showToast("Failed to load time entries", "error");
    } finally {
      setLoading(false);
    }
  }, [projectId, filters, showToast]);

  // Fetch summary data
  const fetchSummary = useCallback(async () => {
    if (!projectId) return;

    try {
      const response = await timeEntryAPI.getProjectSummary(projectId);
      if (response.data.success) {
        setSummary(response.data.summary);
      }
    } catch (error) {
      console.error("Error fetching summary:", error);
    }
  }, [projectId]);

  useEffect(() => {
    if (isOpen && projectId) {
      fetchSummary();
      fetchEntries(1);
    }
  }, [isOpen, projectId, fetchSummary, fetchEntries]);

  // Apply filters
  const handleApplyFilters = () => {
    fetchEntries(1);
    setShowFilters(false);
  };

  // Clear filters
  const handleClearFilters = () => {
    setFilters({
      startDate: "",
      endDate: "",
      userId: "",
      cardId: "",
      entryType: "",
    });
    setSearchQuery("");
    setTimeout(() => fetchEntries(1), 0);
  };

  // Pagination
  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= pagination.pages) {
      fetchEntries(newPage);
    }
  };

  // Edit entry
  const handleStartEdit = (entry) => {
    const hours = Math.floor(entry.duration / 3600);
    const minutes = Math.floor((entry.duration % 3600) / 60);
    setEditDuration({ hours: hours.toString(), minutes: minutes.toString() });
    setEditDescription(entry.description || "");
    setEditingEntry(entry._id);
  };

  const handleSaveEdit = async (entryId) => {
    const duration =
      (parseInt(editDuration.hours) || 0) * 3600 +
      (parseInt(editDuration.minutes) || 0) * 60;

    if (duration <= 0) {
      showToast("Duration must be greater than 0", "error");
      return;
    }

    try {
      await timeEntryAPI.updateEntry(entryId, {
        duration,
        description: editDescription,
      });
      showToast("Time entry updated", "success");
      setEditingEntry(null);
      fetchEntries(pagination.page);
      fetchSummary();
    } catch (error) {
      showToast(error.response?.data?.message || "Failed to update entry", "error");
    }
  };

  // Delete entry
  const handleDelete = async (entryId) => {
    if (!window.confirm("Are you sure you want to delete this time entry?")) {
      return;
    }

    try {
      await timeEntryAPI.deleteEntry(entryId);
      showToast("Time entry deleted", "success");
      fetchEntries(pagination.page);
      fetchSummary();
    } catch (error) {
      showToast(error.response?.data?.message || "Failed to delete entry", "error");
    }
  };

  // Export to CSV
  const handleExport = async () => {
    try {
      const allEntriesRes = await timeEntryAPI.getProjectEntries(projectId, {
        ...filters,
        limit: 10000,
      });

      if (!allEntriesRes.data.success) {
        throw new Error("Failed to fetch entries");
      }

      const allEntries = allEntriesRes.data.entries;

      const headers = ["Date", "User", "Card #", "Card Title", "Duration (hours)", "Type", "Description"];
      const rows = allEntries.map((entry) => [
        new Date(entry.workDate).toLocaleDateString(),
        entry.user?.name || "Unknown",
        entry.card?.cardNumber || "",
        `"${(entry.card?.title || "").replace(/"/g, '""')}"`,
        (entry.duration / 3600).toFixed(2),
        entry.entryType,
        `"${(entry.description || "").replace(/"/g, '""')}"`,
      ]);

      const csvContent = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");

      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `time-report-${projectName || "project"}-${new Date().toISOString().split("T")[0]}.csv`;
      link.click();
      URL.revokeObjectURL(url);

      showToast("Report exported successfully", "success");
    } catch (error) {
      showToast("Failed to export report", "error");
    }
  };

  // Get sorted cards for cards view
  const getSortedCards = () => {
    if (!summary?.byCard) return [];

    let cards = [...summary.byCard];

    // Apply search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      cards = cards.filter(
        (item) =>
          item.card?.title?.toLowerCase().includes(query) ||
          item.card?.cardNumber?.toString().includes(query)
      );
    }

    // Sort
    cards.sort((a, b) => {
      let aVal, bVal;
      switch (cardSortBy) {
        case "cardNumber":
          aVal = a.card?.cardNumber || 0;
          bVal = b.card?.cardNumber || 0;
          break;
        case "estimated":
          aVal = a.card?.estimatedTime || 0;
          bVal = b.card?.estimatedTime || 0;
          break;
        default:
          aVal = a.timeSpent || 0;
          bVal = b.timeSpent || 0;
      }
      return cardSortOrder === "asc" ? aVal - bVal : bVal - aVal;
    });

    return cards;
  };

  // Check if any filters are active
  const hasActiveFilters = Object.values(filters).some((v) => v !== "") || searchQuery;

  if (!isOpen) return null;

  const sortedCards = getSortedCards();

  return (
    <div className="fixed inset-0 bg-gray-900/80 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-white w-full h-full flex flex-col overflow-hidden">
        {/* Header */}
        <div className="bg-white border-b shadow-sm">
          <div className="px-6 py-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <button
                  onClick={onClose}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <ChevronLeft className="w-5 h-5 text-gray-600" />
                </button>
                <div>
                  <div className="flex items-center gap-2">
                    <BarChart3 className="w-6 h-6 text-blue-600" />
                    <h1 className="text-xl font-bold text-gray-900">Time Reports</h1>
                  </div>
                  <p className="text-sm text-gray-500 mt-0.5">{projectName}</p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                {/* View Mode Toggle */}
                <div className="flex items-center bg-gray-100 rounded-lg p-1">
                  <button
                    onClick={() => setViewMode("cards")}
                    className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                      viewMode === "cards"
                        ? "bg-white text-gray-900 shadow-sm"
                        : "text-gray-600 hover:text-gray-900"
                    }`}
                  >
                    Cards View
                  </button>
                  <button
                    onClick={() => setViewMode("entries")}
                    className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                      viewMode === "entries"
                        ? "bg-white text-gray-900 shadow-sm"
                        : "text-gray-600 hover:text-gray-900"
                    }`}
                  >
                    All Entries
                  </button>
                </div>

                {/* Export Button */}
                <button
                  onClick={handleExport}
                  className="flex items-center gap-2 px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors"
                >
                  <Download className="w-4 h-4" />
                  <span className="text-sm font-medium">Export CSV</span>
                </button>

                <button
                  onClick={onClose}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5 text-gray-500" />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Summary Stats - Compact */}
        {summary && (
          <div className="bg-white border-b">
            <div className="px-6 py-2">
              <div className="flex items-center justify-between gap-8">
                {/* Stats Row */}
                <div className="flex items-center gap-8">
                  {/* Total Time */}
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                      <Clock className="w-4 h-4 text-blue-600" />
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Logged</p>
                      <p className="text-base font-bold text-gray-900">{formatDuration(summary.totalTimeSpent)}</p>
                    </div>
                  </div>

                  {/* Estimated Time */}
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
                      <TrendingUp className="w-4 h-4 text-purple-600" />
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Estimated</p>
                      <p className="text-base font-bold text-gray-900">{formatDuration(summary.totalEstimatedTime)}</p>
                    </div>
                  </div>

                  {/* Progress */}
                  <div className="flex items-center gap-2">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                      summary.percentComplete > 100 ? "bg-red-100" : summary.percentComplete > 80 ? "bg-yellow-100" : "bg-green-100"
                    }`}>
                      {summary.percentComplete > 100 ? (
                        <AlertTriangle className="w-4 h-4 text-red-600" />
                      ) : (
                        <CheckCircle className={`w-4 h-4 ${summary.percentComplete > 80 ? "text-yellow-600" : "text-green-600"}`} />
                      )}
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Progress</p>
                      <p className={`text-base font-bold ${
                        summary.percentComplete > 100 ? "text-red-600" : summary.percentComplete > 80 ? "text-yellow-600" : "text-green-600"
                      }`}>{summary.percentComplete}%</p>
                    </div>
                  </div>

                  {/* Contributors */}
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-orange-100 rounded-lg flex items-center justify-center">
                      <Users className="w-4 h-4 text-orange-600" />
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Team</p>
                      <div className="flex items-center gap-1.5">
                        <p className="text-base font-bold text-gray-900">{summary.byUser?.length || 0}</p>
                        {summary.byUser?.length > 0 && (
                          <div className="flex -space-x-1.5">
                            {summary.byUser.slice(0, 3).map((item) => (
                              <Avatar key={item.user._id} user={item.user} size="xs" />
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Progress Bar - Inline */}
                {summary.totalEstimatedTime > 0 && (
                  <div className="flex-1 max-w-xs">
                    <div className="w-full bg-gray-200 rounded-full h-1.5">
                      <div
                        className={`h-1.5 rounded-full transition-all ${
                          summary.percentComplete > 100 ? "bg-red-500" : summary.percentComplete > 80 ? "bg-yellow-500" : "bg-green-500"
                        }`}
                        style={{ width: `${Math.min(summary.percentComplete, 100)}%` }}
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Main Content */}
        <div className="flex-1 overflow-hidden">
          <div className="px-6 py-3 h-full flex flex-col">
            {/* Toolbar */}
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-3">
                {/* Search */}
                <div className="relative">
                  <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Search cards..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 w-64"
                  />
                </div>

                {/* Filters Button */}
                {viewMode === "entries" && (
                  <button
                    onClick={() => setShowFilters(!showFilters)}
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg border transition-colors ${
                      hasActiveFilters
                        ? "bg-blue-50 border-blue-200 text-blue-700"
                        : "border-gray-200 text-gray-600 hover:bg-gray-50"
                    }`}
                  >
                    <Filter className="w-4 h-4" />
                    <span className="text-sm font-medium">Filters</span>
                    {hasActiveFilters && (
                      <span className="bg-blue-600 text-white text-xs px-1.5 py-0.5 rounded-full">
                        {Object.values(filters).filter((v) => v !== "").length}
                      </span>
                    )}
                  </button>
                )}

                {hasActiveFilters && (
                  <button
                    onClick={handleClearFilters}
                    className="text-sm text-gray-500 hover:text-gray-700"
                  >
                    Clear filters
                  </button>
                )}
              </div>

              {/* Sort Controls for Cards View */}
              {viewMode === "cards" && (
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-500">Sort by:</span>
                  <select
                    value={cardSortBy}
                    onChange={(e) => setCardSortBy(e.target.value)}
                    className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="timeSpent">Time Spent</option>
                    <option value="cardNumber">Card Number</option>
                    <option value="estimated">Estimated Time</option>
                  </select>
                  <button
                    onClick={() => setCardSortOrder(cardSortOrder === "asc" ? "desc" : "asc")}
                    className="p-2 border border-gray-200 rounded-lg hover:bg-gray-50"
                  >
                    <ArrowUpDown className="w-4 h-4 text-gray-600" />
                  </button>
                </div>
              )}
            </div>

            {/* Filters Panel for Entries View */}
            {showFilters && viewMode === "entries" && (
              <div className="mb-2 p-2.5 bg-white rounded-lg border border-gray-200">
                <div className="grid grid-cols-2 md:grid-cols-6 gap-3 items-end">
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">Start Date</label>
                    <input
                      type="date"
                      value={filters.startDate}
                      onChange={(e) => setFilters({ ...filters, startDate: e.target.value })}
                      className="w-full px-2 py-1.5 border border-gray-200 rounded text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">End Date</label>
                    <input
                      type="date"
                      value={filters.endDate}
                      onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
                      className="w-full px-2 py-1.5 border border-gray-200 rounded text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">Member</label>
                    <select
                      value={filters.userId}
                      onChange={(e) => setFilters({ ...filters, userId: e.target.value })}
                      className="w-full px-2 py-1.5 border border-gray-200 rounded text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                    >
                      <option value="">All</option>
                      {filterOptions.users.map((u) => (
                        <option key={u._id} value={u._id}>{u.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">Card</label>
                    <select
                      value={filters.cardId}
                      onChange={(e) => setFilters({ ...filters, cardId: e.target.value })}
                      className="w-full px-2 py-1.5 border border-gray-200 rounded text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                    >
                      <option value="">All</option>
                      {filterOptions.cards.map((c) => (
                        <option key={c._id} value={c._id}>#{c.cardNumber} {c.title?.substring(0, 20)}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">Type</label>
                    <select
                      value={filters.entryType}
                      onChange={(e) => setFilters({ ...filters, entryType: e.target.value })}
                      className="w-full px-2 py-1.5 border border-gray-200 rounded text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                    >
                      <option value="">All</option>
                      <option value="timer">Timer</option>
                      <option value="manual">Manual</option>
                    </select>
                  </div>
                  <button
                    onClick={handleApplyFilters}
                    className="px-3 py-1.5 bg-blue-600 text-white text-sm font-medium rounded hover:bg-blue-700 transition-colors"
                  >
                    Apply
                  </button>
                </div>
              </div>
            )}

            {/* Content Area */}
            <div className="flex-1 overflow-y-auto bg-gray-50 rounded-lg border border-gray-200">
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                </div>
              ) : viewMode === "cards" ? (
                /* Cards View */
                <div>
                  {/* Table Header */}
                  <div className="grid grid-cols-12 gap-3 px-4 py-2 bg-gray-50 border-b text-xs font-semibold text-gray-500 uppercase tracking-wider sticky top-0">
                    <div className="col-span-1">#</div>
                    <div className="col-span-5">Card</div>
                    <div className="col-span-2 text-right">Spent</div>
                    <div className="col-span-2 text-right">Est.</div>
                    <div className="col-span-2 text-right">Progress</div>
                  </div>

                  {/* Cards List */}
                  {sortedCards.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-12 text-gray-500 bg-white">
                      <FileText className="w-10 h-10 mb-3 text-gray-300" />
                      <p className="text-sm font-medium">No cards with time tracked</p>
                      <p className="text-xs">Start tracking time on cards to see them here</p>
                    </div>
                  ) : (
                    <div>
                      {sortedCards.map((item, index) => {
                        const progress = item.card?.estimatedTime > 0
                          ? Math.round((item.timeSpent / item.card.estimatedTime) * 100)
                          : 0;
                        const isOverTime = progress > 100;
                        const isNearLimit = progress >= 80 && progress < 100;

                        return (
                          <div
                            key={item.card?._id}
                            className={`grid grid-cols-12 gap-3 px-4 py-2.5 hover:bg-blue-50 transition-colors items-center ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}
                          >
                            <div className="col-span-1">
                              <span className="text-xs font-mono text-gray-400">
                                {item.card?.cardNumber}
                              </span>
                            </div>
                            <div className="col-span-5">
                              <p className="text-sm text-gray-900 truncate">{item.card?.title}</p>
                              <p className="text-xs text-gray-400">{item.entryCount} entries</p>
                            </div>
                            <div className="col-span-2 text-right">
                              <span className={`text-sm font-medium ${isOverTime ? "text-red-600" : "text-gray-900"}`}>
                                {formatDuration(item.timeSpent)}
                              </span>
                            </div>
                            <div className="col-span-2 text-right">
                              <span className="text-sm text-gray-500">
                                {item.card?.estimatedTime > 0 ? formatDuration(item.card.estimatedTime) : "-"}
                              </span>
                            </div>
                            <div className="col-span-2">
                              {item.card?.estimatedTime > 0 ? (
                                <div className="flex items-center gap-1.5">
                                  <div className="flex-1 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                                    <div
                                      className={`h-1.5 rounded-full ${isOverTime ? "bg-red-500" : isNearLimit ? "bg-yellow-500" : "bg-green-500"}`}
                                      style={{ width: `${Math.min(progress, 100)}%` }}
                                    />
                                  </div>
                                  <span className={`text-xs font-medium w-10 text-right ${isOverTime ? "text-red-600" : isNearLimit ? "text-yellow-600" : "text-green-600"}`}>
                                    {progress}%
                                  </span>
                                </div>
                              ) : (
                                <span className="text-xs text-gray-400">-</span>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              ) : (
                /* Entries View */
                <div>
                  {/* Table Header */}
                  <div className="grid grid-cols-12 gap-3 px-4 py-2 bg-gray-50 border-b text-xs font-semibold text-gray-500 uppercase tracking-wider sticky top-0">
                    <div className="col-span-2">Date</div>
                    <div className="col-span-2">Member</div>
                    <div className="col-span-4">Card</div>
                    <div className="col-span-2 text-right">Duration</div>
                    <div className="col-span-1">Type</div>
                    <div className="col-span-1"></div>
                  </div>

                  {/* Entries List */}
                  {entries.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-12 text-gray-500 bg-white">
                      <Clock className="w-10 h-10 mb-3 text-gray-300" />
                      <p className="text-sm font-medium">No time entries found</p>
                      <p className="text-xs">Adjust your filters or start tracking time</p>
                    </div>
                  ) : (
                    <div>
                      {entries.map((entry, index) => (
                        <div
                          key={entry._id}
                          className={`grid grid-cols-12 gap-3 px-4 py-2 hover:bg-blue-50 transition-colors items-center ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}
                        >
                          {editingEntry === entry._id ? (
                            // Edit Mode
                            <div className="col-span-12 flex items-center gap-3 py-1">
                              <div className="flex items-center gap-1">
                                <input
                                  type="number"
                                  min="0"
                                  value={editDuration.hours}
                                  onChange={(e) => setEditDuration({ ...editDuration, hours: e.target.value })}
                                  className="w-14 px-2 py-1 border rounded text-center text-sm"
                                  placeholder="h"
                                />
                                <span className="text-gray-400 text-sm">h</span>
                                <input
                                  type="number"
                                  min="0"
                                  max="59"
                                  value={editDuration.minutes}
                                  onChange={(e) => setEditDuration({ ...editDuration, minutes: e.target.value })}
                                  className="w-14 px-2 py-1 border rounded text-center text-sm"
                                  placeholder="m"
                                />
                                <span className="text-gray-400 text-sm">m</span>
                              </div>
                              <input
                                type="text"
                                value={editDescription}
                                onChange={(e) => setEditDescription(e.target.value)}
                                placeholder="Description"
                                className="flex-1 px-2 py-1 border rounded text-sm"
                              />
                              <button
                                onClick={() => handleSaveEdit(entry._id)}
                                className="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700"
                              >
                                Save
                              </button>
                              <button
                                onClick={() => setEditingEntry(null)}
                                className="px-3 py-1 text-gray-500 text-sm hover:bg-gray-100 rounded"
                              >
                                Cancel
                              </button>
                            </div>
                          ) : (
                            <>
                              <div className="col-span-2">
                                <span className="text-sm text-gray-600">{formatWorkDate(entry.workDate)}</span>
                              </div>
                              <div className="col-span-2">
                                <div className="flex items-center gap-1.5">
                                  <Avatar user={entry.user} size="xs" />
                                  <span className="text-sm text-gray-900 truncate">{entry.user?.name || "Unknown"}</span>
                                </div>
                              </div>
                              <div className="col-span-4">
                                <p className="text-sm text-gray-900 truncate">
                                  <span className="text-gray-400 font-mono text-xs mr-1">#{entry.card?.cardNumber}</span>
                                  {entry.card?.title}
                                </p>
                                {entry.description && (
                                  <p className="text-xs text-gray-400 truncate italic">"{entry.description}"</p>
                                )}
                              </div>
                              <div className="col-span-2 text-right">
                                <span className="text-sm font-medium text-gray-900">{formatDuration(entry.duration)}</span>
                              </div>
                              <div className="col-span-1">
                                <span className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 text-xs font-medium rounded ${
                                  entry.entryType === "timer" ? "bg-green-100 text-green-700" : "bg-blue-100 text-blue-700"
                                }`}>
                                  {entry.entryType === "timer" ? <Play className="w-2.5 h-2.5" /> : <PenLine className="w-2.5 h-2.5" />}
                                  {entry.entryType === "timer" ? "Timer" : "Manual"}
                                </span>
                              </div>
                              <div className="col-span-1 flex justify-end">
                                {entry.user?._id === user?._id && (
                                  <div className="flex items-center">
                                    <button
                                      onClick={() => handleStartEdit(entry)}
                                      className="p-1 text-gray-400 hover:text-blue-600 rounded transition-colors"
                                      title="Edit"
                                    >
                                      <PenLine className="w-3.5 h-3.5" />
                                    </button>
                                    <button
                                      onClick={() => handleDelete(entry._id)}
                                      className="p-1 text-gray-400 hover:text-red-600 rounded transition-colors"
                                      title="Delete"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  </div>
                                )}
                              </div>
                            </>
                          )}
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Pagination */}
                  {pagination.pages > 1 && (
                    <div className="px-4 py-2 border-t bg-gray-50 flex items-center justify-between">
                      <span className="text-xs text-gray-500">
                        {entries.length} of {pagination.total} entries
                      </span>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handlePageChange(pagination.page - 1)}
                          disabled={pagination.page === 1}
                          className="p-1.5 rounded border border-gray-200 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100"
                        >
                          <ChevronLeft className="w-3.5 h-3.5" />
                        </button>
                        <span className="text-xs text-gray-600 px-2">{pagination.page}/{pagination.pages}</span>
                        <button
                          onClick={() => handlePageChange(pagination.page + 1)}
                          disabled={pagination.page === pagination.pages}
                          className="p-1.5 rounded border border-gray-200 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100"
                        >
                          <ChevronRight className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Bottom Stats Bar */}
            {viewMode === "cards" && summary && (
              <div className="mt-2 flex items-center justify-between text-sm text-gray-500">
                <span>
                  {sortedCards.length} cards with time tracked • {summary.cardsWithTime} total
                </span>
                <span>
                  Total: <span className="font-semibold text-gray-900">{formatDuration(summary.totalTimeSpent)}</span>
                </span>
              </div>
            )}

            {viewMode === "entries" && stats && (
              <div className="mt-2 flex items-center justify-between text-sm text-gray-500">
                <span>
                  {stats.totalEntries} entries • {stats.timerEntries} timer • {stats.manualEntries} manual
                </span>
                <span>
                  Total: <span className="font-semibold text-gray-900">{formatDuration(stats.totalDuration)}</span>
                </span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default TimeReportsModal;
