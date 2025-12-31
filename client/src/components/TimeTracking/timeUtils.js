// Format seconds to display string (e.g., "5h 23m" or "45m 30s")
export const formatDuration = (seconds) => {
  if (!seconds || seconds <= 0) return "-";

  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;

  if (h > 0) {
    return m > 0 ? `${h}h ${m}m` : `${h}h`;
  }
  if (m > 0) {
    return s > 0 ? `${m}m ${s}s` : `${m}m`;
  }
  return `${s}s`;
};

// Format seconds to timer display (e.g., "00:45:23")
export const formatTimer = (seconds) => {
  if (!seconds || seconds < 0) seconds = 0;

  const h = String(Math.floor(seconds / 3600)).padStart(2, "0");
  const m = String(Math.floor((seconds % 3600) / 60)).padStart(2, "0");
  const s = String(Math.floor(seconds % 60)).padStart(2, "0");

  return `${h}:${m}:${s}`;
};

// Format seconds to short display (e.g., "5h" or "45m")
export const formatDurationShort = (seconds) => {
  if (!seconds || seconds <= 0) return "-";

  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);

  if (h > 0) {
    return `${h}h`;
  }
  if (m > 0) {
    return `${m}m`;
  }
  return "<1m";
};

// Parse duration inputs (hours, minutes, seconds) to total seconds
export const parseDurationInput = (hours, minutes, seconds = 0) => {
  return (
    (parseInt(hours) || 0) * 3600 +
    (parseInt(minutes) || 0) * 60 +
    (parseInt(seconds) || 0)
  );
};

// Format date for display (e.g., "Today", "Yesterday", "Dec 28")
export const formatWorkDate = (dateString) => {
  const date = new Date(dateString);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  // Reset time for comparison
  const dateOnly = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const todayOnly = new Date(
    today.getFullYear(),
    today.getMonth(),
    today.getDate()
  );
  const yesterdayOnly = new Date(
    yesterday.getFullYear(),
    yesterday.getMonth(),
    yesterday.getDate()
  );

  if (dateOnly.getTime() === todayOnly.getTime()) {
    return "Today";
  }
  if (dateOnly.getTime() === yesterdayOnly.getTime()) {
    return "Yesterday";
  }

  // Format as "Dec 28"
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
};

// Calculate percentage for progress bar
export const calculateProgress = (actual, estimated) => {
  if (!estimated || estimated <= 0) return 0;
  const percentage = (actual / estimated) * 100;
  return Math.min(percentage, 100); // Cap at 100% for display
};

// Get progress bar color based on percentage
export const getProgressColor = (actual, estimated) => {
  if (!estimated || estimated <= 0) return "bg-gray-300";

  const percentage = (actual / estimated) * 100;

  if (percentage >= 100) {
    return "bg-red-500"; // Over estimate
  }
  if (percentage >= 80) {
    return "bg-yellow-500"; // Near estimate
  }
  return "bg-green-500"; // Under estimate
};

// Get progress text color based on percentage
export const getProgressTextColor = (actual, estimated) => {
  if (!estimated || estimated <= 0) return "text-gray-500";

  const percentage = (actual / estimated) * 100;

  if (percentage >= 100) {
    return "text-red-600";
  }
  if (percentage >= 80) {
    return "text-yellow-600";
  }
  return "text-green-600";
};
