import React, { useState, useEffect, useRef } from "react";
import { Clock, Play, Square, X, ChevronDown, Pencil } from "lucide-react";
import { timeEntryAPI } from "../../utils/api";
import { useNotification } from "../../contexts/NotificationContext";
import { useUser } from "../../contexts/UserContext";
import Avatar from "../Avatar";
import { formatDuration, formatTimer, parseDurationInput } from "./timeUtils";

const TimeTrackerWidget = ({
  card,
  onCardUpdated,
  isArchived = false,
  socket,
}) => {
  const { showToast } = useNotification();
  const { user } = useUser();

  // Timer state
  const [isRunning, setIsRunning] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [activeTimerCardId, setActiveTimerCardId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);

  // Time entries state
  const [entries, setEntries] = useState([]);

  // Dropdown states
  const [showEstimateDropdown, setShowEstimateDropdown] = useState(false);
  const [showAddTimeDropdown, setShowAddTimeDropdown] = useState(false);
  const [estimateInput, setEstimateInput] = useState("");
  const [addTimeHours, setAddTimeHours] = useState("");
  const [addTimeMinutes, setAddTimeMinutes] = useState("");
  const [addTimeDescription, setAddTimeDescription] = useState("");

  // Refs for click outside
  const estimateDropdownRef = useRef(null);
  const addTimeDropdownRef = useRef(null);
  const estimateBtnRef = useRef(null);
  const addTimeBtnRef = useRef(null);

  // Timer interval ref
  const timerIntervalRef = useRef(null);

  // Card time data
  const totalTimeSpent = card.totalTimeSpent || 0;
  const estimatedTime = card.estimatedTime || 0;

  // Click outside handler
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        showEstimateDropdown &&
        estimateDropdownRef.current &&
        !estimateDropdownRef.current.contains(event.target) &&
        !estimateBtnRef.current?.contains(event.target)
      ) {
        setShowEstimateDropdown(false);
      }
      if (
        showAddTimeDropdown &&
        addTimeDropdownRef.current &&
        !addTimeDropdownRef.current.contains(event.target) &&
        !addTimeBtnRef.current?.contains(event.target)
      ) {
        setShowAddTimeDropdown(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showEstimateDropdown, showAddTimeDropdown]);

  // Check for active timer on mount
  useEffect(() => {
    const checkActiveTimer = async () => {
      try {
        const response = await timeEntryAPI.getActiveTimer();
        if (response.data.success && response.data.activeTimer) {
          const timer = response.data.activeTimer;
          setActiveTimerCardId(timer.card._id || timer.card);
          if ((timer.card._id || timer.card) === card._id) {
            setIsRunning(true);
            setElapsedSeconds(timer.elapsedSeconds || 0);
          }
        }
      } catch (error) {
        console.error("Error checking active timer:", error);
      } finally {
        setInitialLoading(false);
      }
    };

    checkActiveTimer();
  }, [card._id]);

  // Fetch time entries
  useEffect(() => {
    const fetchEntries = async () => {
      try {
        const response = await timeEntryAPI.getCardEntries(card._id);
        if (response.data.success) {
          setEntries(response.data.entries);
        }
      } catch (error) {
        console.error("Error fetching time entries:", error);
      }
    };

    fetchEntries();
  }, [card._id]);

  // Timer interval effect
  useEffect(() => {
    if (isRunning && activeTimerCardId === card._id) {
      timerIntervalRef.current = setInterval(() => {
        setElapsedSeconds((prev) => prev + 1);
      }, 1000);
    } else {
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
        timerIntervalRef.current = null;
      }
    }

    return () => {
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
      }
    };
  }, [isRunning, activeTimerCardId, card._id]);

  // Socket listeners
  useEffect(() => {
    if (!socket) return;

    const handleTimerStopped = (data) => {
      if (data.cardId === card._id && data.userId !== user?._id) {
        // Only add entry from socket if it's another user (current user already added from API response)
        if (data.entry) {
          setEntries((prev) => {
            // Prevent duplicates by checking if entry already exists
            if (prev.some((e) => e._id === data.entry._id)) return prev;
            return [data.entry, ...prev];
          });
        }
        if (data.cardTotalTime !== undefined && onCardUpdated) {
          onCardUpdated({
            ...card,
            totalTimeSpent: data.cardTotalTime,
          });
        }
      }
    };

    const handleTimeEntryAdded = (data) => {
      if (data.cardId === card._id && data.userId !== user?._id) {
        if (data.entry) {
          setEntries((prev) => {
            // Prevent duplicates by checking if entry already exists
            if (prev.some((e) => e._id === data.entry._id)) return prev;
            return [data.entry, ...prev];
          });
        }
        if (data.cardTotalTime !== undefined && onCardUpdated) {
          onCardUpdated({
            ...card,
            totalTimeSpent: data.cardTotalTime,
          });
        }
      }
    };

    const handleTimeEntryDeleted = (data) => {
      if (data.cardId === card._id) {
        setEntries((prev) => prev.filter((e) => e._id !== data.entryId));
        if (data.cardTotalTime !== undefined && onCardUpdated) {
          onCardUpdated({
            ...card,
            totalTimeSpent: data.cardTotalTime,
          });
        }
      }
    };

    const handleEstimatedTimeChanged = (data) => {
      if (data.cardId === card._id && onCardUpdated) {
        onCardUpdated({
          ...card,
          estimatedTime: data.estimatedTime,
        });
      }
    };

    socket.on("timer-stopped", handleTimerStopped);
    socket.on("time-entry-added", handleTimeEntryAdded);
    socket.on("time-entry-deleted", handleTimeEntryDeleted);
    socket.on("estimated-time-changed", handleEstimatedTimeChanged);

    return () => {
      socket.off("timer-stopped", handleTimerStopped);
      socket.off("time-entry-added", handleTimeEntryAdded);
      socket.off("time-entry-deleted", handleTimeEntryDeleted);
      socket.off("estimated-time-changed", handleEstimatedTimeChanged);
    };
  }, [socket, card, user, onCardUpdated]);

  // Start timer
  const handleStartTimer = async () => {
    if (isArchived) {
      showToast("Cannot track time on archived cards", "error");
      return;
    }

    try {
      setLoading(true);
      const response = await timeEntryAPI.startTimer(card._id);
      if (response.data.success) {
        setIsRunning(true);
        setElapsedSeconds(0);
        setActiveTimerCardId(card._id);
        showToast("Timer started", "success");
      }
    } catch (error) {
      console.error("Error starting timer:", error);
      showToast(
        error.response?.data?.message || "Failed to start timer",
        "error"
      );
    } finally {
      setLoading(false);
    }
  };

  // Stop timer
  const handleStopTimer = async () => {
    try {
      setLoading(true);
      const response = await timeEntryAPI.stopTimer();
      if (response.data.success) {
        setIsRunning(false);
        setElapsedSeconds(0);
        setActiveTimerCardId(null);

        if (response.data.entry) {
          setEntries((prev) => {
            // Prevent duplicates
            if (prev.some((e) => e._id === response.data.entry._id)) return prev;
            return [response.data.entry, ...prev];
          });
        }

        if (response.data.cardTotalTime !== undefined && onCardUpdated) {
          onCardUpdated({
            ...card,
            totalTimeSpent: response.data.cardTotalTime,
          });
        }

        showToast(
          `Timer stopped - ${formatDuration(response.data.entry?.duration || 0)} logged`,
          "success"
        );
      }
    } catch (error) {
      console.error("Error stopping timer:", error);
      showToast(
        error.response?.data?.message || "Failed to stop timer",
        "error"
      );
    } finally {
      setLoading(false);
    }
  };

  // Parse estimate input (supports formats like "2h", "2h 30m", "30m", "2.5h")
  const parseEstimateInput = (input) => {
    if (!input) return 0;

    const trimmed = input.trim().toLowerCase();
    let totalSeconds = 0;

    // Match hours (e.g., "2h", "2.5h")
    const hoursMatch = trimmed.match(/(\d+\.?\d*)\s*h/);
    if (hoursMatch) {
      totalSeconds += parseFloat(hoursMatch[1]) * 3600;
    }

    // Match minutes (e.g., "30m")
    const minutesMatch = trimmed.match(/(\d+)\s*m/);
    if (minutesMatch) {
      totalSeconds += parseInt(minutesMatch[1]) * 60;
    }

    // If just a number, treat as hours
    if (!hoursMatch && !minutesMatch) {
      const numMatch = trimmed.match(/^(\d+\.?\d*)$/);
      if (numMatch) {
        totalSeconds = parseFloat(numMatch[1]) * 3600;
      }
    }

    return Math.round(totalSeconds);
  };

  // Save estimate
  const handleSaveEstimate = async () => {
    const estimatedSeconds = parseEstimateInput(estimateInput);

    try {
      setLoading(true);
      const response = await timeEntryAPI.setEstimatedTime(card._id, estimatedSeconds);
      if (response.data.success && onCardUpdated) {
        onCardUpdated({
          ...card,
          estimatedTime: estimatedSeconds,
        });
        setShowEstimateDropdown(false);
        setEstimateInput("");
        showToast("Estimate saved", "success");
      }
    } catch (error) {
      console.error("Error setting estimate:", error);
      showToast(
        error.response?.data?.message || "Failed to save estimate",
        "error"
      );
    } finally {
      setLoading(false);
    }
  };

  // Add manual time entry
  const handleAddTime = async () => {
    const duration = parseDurationInput(addTimeHours, addTimeMinutes);

    if (duration <= 0) {
      showToast("Please enter a valid time", "error");
      return;
    }

    try {
      setLoading(true);
      const response = await timeEntryAPI.addEntry({
        cardId: card._id,
        duration,
        description: addTimeDescription.trim(),
        workDate: new Date(),
      });

      if (response.data.success) {
        setEntries((prev) => {
          // Prevent duplicates
          if (prev.some((e) => e._id === response.data.entry._id)) return prev;
          return [response.data.entry, ...prev];
        });
        setShowAddTimeDropdown(false);
        setAddTimeHours("");
        setAddTimeMinutes("");
        setAddTimeDescription("");

        if (response.data.cardTotalTime !== undefined && onCardUpdated) {
          onCardUpdated({
            ...card,
            totalTimeSpent: response.data.cardTotalTime,
          });
        }

        showToast("Time added", "success");
      }
    } catch (error) {
      console.error("Error adding time:", error);
      showToast(
        error.response?.data?.message || "Failed to add time",
        "error"
      );
    } finally {
      setLoading(false);
    }
  };

  // Open estimate dropdown
  const openEstimateDropdown = () => {
    const h = Math.floor(estimatedTime / 3600);
    const m = Math.floor((estimatedTime % 3600) / 60);
    if (h > 0 && m > 0) {
      setEstimateInput(`${h}h ${m}m`);
    } else if (h > 0) {
      setEstimateInput(`${h}h`);
    } else if (m > 0) {
      setEstimateInput(`${m}m`);
    } else {
      setEstimateInput("");
    }
    setShowEstimateDropdown(true);
    setShowAddTimeDropdown(false);
  };

  // Check if timer is running on a different card
  const timerOnDifferentCard =
    activeTimerCardId && activeTimerCardId !== card._id;
  const isTimerRunningOnThisCard = isRunning && activeTimerCardId === card._id;

  // Format time display
  const displayTime = isTimerRunningOnThisCard
    ? totalTimeSpent + elapsedSeconds
    : totalTimeSpent;

  // Calculate time status for color coding
  const hasEstimate = estimatedTime > 0;
  const timePercentage = hasEstimate ? (displayTime / estimatedTime) * 100 : 0;
  const isOverTime = hasEstimate && displayTime > estimatedTime;
  const isNearLimit = hasEstimate && timePercentage >= 80 && timePercentage < 100;
  const overTimeAmount = isOverTime ? displayTime - estimatedTime : 0;

  // Get time display color based on status
  const getTimeColor = () => {
    if (!hasEstimate) return "text-blue-600";
    if (isOverTime) return "text-red-600";
    if (isNearLimit) return "text-yellow-600";
    return "text-green-600";
  };

  // Get progress bar color
  const getProgressColor = () => {
    if (isOverTime) return "bg-red-500";
    if (isNearLimit) return "bg-yellow-500";
    return "bg-green-500";
  };

  if (initialLoading) {
    return (
      <div className="mb-6">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-1/3 mb-3"></div>
          <div className="h-12 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="mb-6">
      {/* Header - Trello Style */}
      <div className="flex items-center gap-2 mb-2">
        <Clock className="w-5 h-5 text-gray-500" />
        <h3 className="text-sm font-semibold text-gray-700">Time Tracking</h3>
      </div>

      {/* Time Info Row - Clickable */}
      <div className="flex items-center gap-4 mb-3 text-sm">
        <span className="text-gray-500">Time:</span>
        <span className={`font-medium ${getTimeColor()}`}>
          {displayTime > 0 ? formatDuration(displayTime) : "-"}
          {isOverTime && (
            <span className="ml-1 text-red-500 text-xs font-normal">
              (+{formatDuration(overTimeAmount)})
            </span>
          )}
        </span>
        {isTimerRunningOnThisCard && (
          <span className={`text-xs font-medium animate-pulse ${isOverTime ? 'text-red-500' : 'text-green-600'}`}>
            ({formatTimer(elapsedSeconds)})
          </span>
        )}

        <span className="text-gray-500 ml-1">Estimate:</span>
        {/* Estimate button with dropdown */}
        <div className="relative inline-block">
          <button
            ref={estimateBtnRef}
            onClick={openEstimateDropdown}
            className="font-medium text-blue-700 hover:text-blue-700 cursor-pointer flex items-center"
            disabled={isArchived}
            title="Click to edit"
          >
            {estimatedTime > 0 ? (
              <>
                {formatDuration(estimatedTime)}
                <Pencil className="w-3 h-3 ml-1 text-blue-700 hover:text-blue-700" />
              </>
            ) : (
              <ChevronDown className="w-4 h-4 text-blue-700 hover:text-blue-700 mt-1" />
            )}
          </button>

          {/* Estimate Dropdown - positioned below the button */}
          {showEstimateDropdown && (
            <div
              ref={estimateDropdownRef}
              className="absolute top-full left-0 mt-2 w-64 bg-white rounded-lg shadow-lg border border-gray-200 z-50"
              style={{
                animation: 'fadeInDown 0.15s ease-out'
              }}
            >
              <div className="p-3">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-sm font-semibold text-gray-700">Add estimate</h4>
                  <button
                    onClick={() => setShowEstimateDropdown(false)}
                    className="p-1 hover:bg-gray-100 rounded-full transition-colors"
                  >
                    <X className="w-4 h-4 text-gray-400" />
                  </button>
                </div>

                <input
                  type="text"
                  value={estimateInput}
                  onChange={(e) => setEstimateInput(e.target.value)}
                  placeholder="0h"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm mb-3"
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleSaveEstimate();
                    if (e.key === "Escape") setShowEstimateDropdown(false);
                  }}
                />

                <button
                  onClick={handleSaveEstimate}
                  disabled={loading}
                  className="w-full py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50"
                >
                  {loading ? "Saving..." : "Save"}
                </button>

                <div className="mt-3 px-2.5 py-2 bg-blue-50 border border-blue-100 rounded-md">
                  <p className="text-xs text-blue-700 leading-relaxed">
                    <span className="font-medium">Tip:</span> Use formats like "2h", "30m", or "2h 30m"
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Progress Bar - Only show when estimate exists */}
      {hasEstimate && (
        <div className="mb-3">
          <div className="flex justify-between items-center mb-1">
            <span className={`text-xs font-medium ${isOverTime ? 'text-red-600' : isNearLimit ? 'text-yellow-600' : 'text-green-600'}`}>
              {Math.round(Math.min(timePercentage, 100))}%
            </span>
            {isOverTime && (
              <span className="text-xs text-red-500 font-medium flex items-center gap-1">
                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
                Over by {formatDuration(overTimeAmount)}
              </span>
            )}
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
            <div
              className={`h-2 rounded-full transition-all duration-300 ${getProgressColor()}`}
              style={{ width: `${Math.min(timePercentage, 100)}%` }}
            />
          </div>
        </div>
      )}

      {/* User Row with Buttons - Trello Style */}
      <div className="flex items-center justify-between bg-gray-50 rounded-lg p-3">
        {/* User Info */}
        <div className="flex items-center gap-2.5">
          <Avatar user={user} size="sm" />
          <span className="text-sm font-medium text-gray-700">
            {user?.name || "Unknown"}
          </span>
        </div>

        {/* Action Buttons */}
        {!isArchived && (
          <div className="flex items-center gap-2">
            {/* Start/Stop Timer Button */}
            <button
              onClick={
                isTimerRunningOnThisCard ? handleStopTimer : handleStartTimer
              }
              disabled={loading || timerOnDifferentCard}
              className={`px-3 py-1.5 text-sm font-medium rounded border transition-all ${
                isTimerRunningOnThisCard
                  ? "bg-red-50 text-red-600 border-red-200 hover:bg-red-100"
                  : timerOnDifferentCard
                  ? "bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed"
                  : "bg-white text-gray-600 border-gray-300 hover:bg-gray-100"
              }`}
              title={
                timerOnDifferentCard
                  ? "Timer running on another card"
                  : isTimerRunningOnThisCard
                  ? "Stop timer"
                  : "Start timer"
              }
            >
              {loading ? (
                <svg
                  className="animate-spin h-4 w-4"
                  viewBox="0 0 24 24"
                  fill="none"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  />
                </svg>
              ) : isTimerRunningOnThisCard ? (
                "Stop timer"
              ) : (
                "Start timer"
              )}
            </button>

            {/* Add Time Button with dropdown */}
            <div className="relative">
              <button
                ref={addTimeBtnRef}
                onClick={() => {
                  setShowAddTimeDropdown(true);
                  setShowEstimateDropdown(false);
                }}
                className="px-3 py-1.5 text-sm font-medium text-gray-600 bg-white border border-gray-300 rounded hover:bg-gray-100 transition-all"
              >
                Add time
              </button>

              {/* Add Time Dropdown - positioned below the button */}
              {showAddTimeDropdown && (
                <div
                  ref={addTimeDropdownRef}
                  className="absolute top-full right-0 mt-2 w-72 bg-white rounded-lg shadow-lg border border-gray-200 z-50"
                  style={{
                    animation: 'fadeInDown 0.15s ease-out'
                  }}
                >
                  <div className="p-3">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="text-sm font-semibold text-gray-700">Add time</h4>
                      <button
                        onClick={() => setShowAddTimeDropdown(false)}
                        className="p-1 hover:bg-gray-100 rounded-full transition-colors"
                      >
                        <X className="w-4 h-4 text-gray-400" />
                      </button>
                    </div>

                    {/* Duration inputs */}
                    <div className="flex items-center gap-2 mb-3">
                      <div className="flex-1">
                        <input
                          type="number"
                          min="0"
                          max="99"
                          value={addTimeHours}
                          onChange={(e) => setAddTimeHours(e.target.value)}
                          placeholder="0"
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm text-center"
                          autoFocus
                        />
                        <span className="block text-xs text-gray-400 text-center mt-1">hours</span>
                      </div>
                      <span className="text-gray-400 text-lg pb-5">:</span>
                      <div className="flex-1">
                        <input
                          type="number"
                          min="0"
                          max="59"
                          value={addTimeMinutes}
                          onChange={(e) => setAddTimeMinutes(e.target.value)}
                          placeholder="0"
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm text-center"
                        />
                        <span className="block text-xs text-gray-400 text-center mt-1">minutes</span>
                      </div>
                    </div>

                    {/* Description */}
                    <input
                      type="text"
                      value={addTimeDescription}
                      onChange={(e) => setAddTimeDescription(e.target.value)}
                      placeholder="What did you work on? (optional)"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm mb-3"
                      onKeyDown={(e) => {
                        if (e.key === "Enter") handleAddTime();
                        if (e.key === "Escape") setShowAddTimeDropdown(false);
                      }}
                    />

                    <button
                      onClick={handleAddTime}
                      disabled={loading}
                      className="w-full py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50"
                    >
                      {loading ? "Adding..." : "Add"}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* CSS for animation */}
      <style>{`
        @keyframes fadeInDown {
          from {
            opacity: 0;
            transform: translateY(-8px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  );
};

export default TimeTrackerWidget;
