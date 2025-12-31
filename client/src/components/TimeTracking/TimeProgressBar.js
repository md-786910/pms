import React from "react";
import {
  formatDuration,
  calculateProgress,
  getProgressColor,
  getProgressTextColor,
} from "./timeUtils";

const TimeProgressBar = ({ actual, estimated, showLabels = true }) => {
  const progress = calculateProgress(actual, estimated);
  const progressColor = getProgressColor(actual, estimated);
  const textColor = getProgressTextColor(actual, estimated);
  const actualPercentage = estimated > 0 ? Math.round((actual / estimated) * 100) : 0;
  const isOverEstimate = actual > estimated && estimated > 0;

  if (!estimated || estimated <= 0) {
    return null;
  }

  return (
    <div className="w-full">
      {showLabels && (
        <div className="flex justify-between text-xs mb-1">
          <span className="text-gray-600">
            <span className="font-medium">{formatDuration(actual)}</span>
            <span className="text-gray-400"> / {formatDuration(estimated)}</span>
          </span>
          <span className={`font-medium ${textColor}`}>
            {actualPercentage}%
            {isOverEstimate && (
              <span className="ml-1 text-red-500">!</span>
            )}
          </span>
        </div>
      )}
      <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
        <div
          className={`h-2 rounded-full transition-all duration-300 ${progressColor}`}
          style={{ width: `${progress}%` }}
        />
      </div>
      {isOverEstimate && (
        <p className="text-xs text-red-500 mt-1">
          Over estimate by {formatDuration(actual - estimated)}
        </p>
      )}
    </div>
  );
};

export default TimeProgressBar;
