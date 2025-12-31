import React, { useState, useRef, useEffect } from "react";
import { Sun, Moon, Monitor, Check } from "lucide-react";
import { useTheme } from "../contexts/ThemeContext";

const ThemeToggle = () => {
  const { theme, setTheme } = useTheme();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  // Close on outside click
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const themes = [
    {
      value: "light",
      label: "Light",
      icon: Sun,
      description: "Always use light mode",
    },
    {
      value: "dark",
      label: "Dark",
      icon: Moon,
      description: "Always use dark mode",
    },
    {
      value: "system",
      label: "System",
      icon: Monitor,
      description: "Match system setting",
    },
  ];

  const getCurrentIcon = () => {
    switch (theme) {
      case "dark":
        return Moon;
      case "light":
        return Sun;
      default:
        return Monitor;
    }
  };

  const CurrentIcon = getCurrentIcon();

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Toggle Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700
                   text-gray-600 dark:text-gray-300 transition-all duration-200
                   focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2
                   dark:focus:ring-offset-gray-800"
        title="Change theme"
        aria-label="Toggle theme"
        aria-expanded={isOpen}
        aria-haspopup="true"
      >
        <CurrentIcon className="w-5 h-5" />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div
          className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-800
                      rounded-xl shadow-lg border border-gray-200 dark:border-gray-700
                      py-2 z-50 animate-slideDownFade"
          role="menu"
          aria-orientation="vertical"
        >
          {/* Header */}
          <div className="px-4 py-2 border-b border-gray-100 dark:border-gray-700">
            <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
              Theme
            </p>
          </div>

          {/* Theme Options */}
          <div className="py-1">
            {themes.map(({ value, label, icon: Icon, description }) => (
              <button
                key={value}
                onClick={() => {
                  setTheme(value);
                  setIsOpen(false);
                }}
                className={`w-full flex items-center px-4 py-2.5 text-sm
                            transition-colors duration-200
                            ${
                              theme === value
                                ? "bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300"
                                : "text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/50"
                            }`}
                role="menuitem"
              >
                <Icon
                  className={`w-4 h-4 mr-3 ${
                    theme === value
                      ? "text-blue-600 dark:text-blue-400"
                      : "text-gray-500 dark:text-gray-400"
                  }`}
                />
                <div className="flex-1 text-left">
                  <p className="font-medium">{label}</p>
                  <p
                    className={`text-xs ${
                      theme === value
                        ? "text-blue-600/70 dark:text-blue-400/70"
                        : "text-gray-500 dark:text-gray-500"
                    }`}
                  >
                    {description}
                  </p>
                </div>
                {theme === value && (
                  <Check className="w-4 h-4 text-blue-600 dark:text-blue-400 ml-2" />
                )}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default ThemeToggle;
