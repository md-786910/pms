import React from "react";

const Avatar = ({
  user,
  size = "md",
  className = "",
  showTooltip = false,
  fallback = "U",
}) => {
  // Size classes
  const sizeClasses = {
    xs: "w-6 h-6 text-xs",
    sm: "w-8 h-8 text-sm",
    md: "w-10 h-10 text-sm",
    lg: "w-12 h-12 text-base",
    xl: "w-16 h-16 text-lg",
  };

  // Get user data
  const name = user?.name || "";
  const avatar = user?.avatar || "";
  const color = user?.color || "bg-gray-400";

  // Always generate 2-letter initials from name (ignore stored avatar)
  const initials = (() => {
    if (!name) return fallback;
    const nameParts = name.trim().split(" ");
    if (nameParts.length >= 2) {
      // First letter of first name + first letter of last name
      return (
        nameParts[0][0] + nameParts[nameParts.length - 1][0]
      ).toUpperCase();
    } else if (nameParts.length === 1) {
      // If only one name, use first two letters
      return nameParts[0].substring(0, 2).toUpperCase();
    }
    return fallback;
  })();

  // Clean color class (remove bg- prefix if it exists)
  const avatarElement = (
    <div
      className={`${sizeClasses[size]} rounded-full flex items-center justify-center text-white font-medium ${className}`}
      title={showTooltip ? name : undefined}
      style={{
        color: "white",
        background: color,
      }}
    >
      {initials}
    </div>
  );

  return avatarElement;
};

export default Avatar;
