import {
  FileText,
  Image,
  File,
  FileSpreadsheet,
  Video,
  Music,
  Archive,
  Code,
} from "lucide-react";

/**
 * Get the appropriate icon component for a file based on its MIME type or extension
 * @param {string} mimeType - The MIME type of the file
 * @param {string} fileName - The name of the file (for extension fallback)
 * @returns {React.Component} - The appropriate icon component
 */
export const getFileIcon = (mimeType, fileName = "") => {
  const extension = fileName.split(".").pop()?.toLowerCase();

  // Image files
  if (
    mimeType?.startsWith("image/") ||
    ["jpg", "jpeg", "png", "gif", "bmp", "webp", "svg"].includes(extension)
  ) {
    return Image;
  }

  // PDF files
  if (mimeType === "application/pdf" || extension === "pdf") {
    return FileText;
  }

  // Video files
  if (
    mimeType?.startsWith("video/") ||
    ["mp4", "avi", "mov", "wmv", "flv", "webm", "mkv"].includes(extension)
  ) {
    return Video;
  }

  // Audio files
  if (
    mimeType?.startsWith("audio/") ||
    ["mp3", "wav", "flac", "aac", "ogg", "m4a"].includes(extension)
  ) {
    return Music;
  }

  // Spreadsheet files
  if (
    mimeType?.includes("spreadsheet") ||
    ["xls", "xlsx", "csv"].includes(extension)
  ) {
    return FileSpreadsheet;
  }

  // Archive files
  if (
    mimeType?.includes("zip") ||
    mimeType?.includes("rar") ||
    ["zip", "rar", "7z", "tar", "gz"].includes(extension)
  ) {
    return Archive;
  }

  // Code files
  if (
    [
      "js",
      "ts",
      "jsx",
      "tsx",
      "html",
      "css",
      "scss",
      "sass",
      "php",
      "py",
      "java",
      "cpp",
      "c",
      "json",
      "xml",
    ].includes(extension)
  ) {
    return Code;
  }

  // Text files
  if (
    mimeType?.startsWith("text/") ||
    ["txt", "md", "rtf"].includes(extension)
  ) {
    return FileText;
  }

  // Default file icon
  return File;
};

/**
 * Get the color class for the file icon based on file type
 * @param {string} mimeType - The MIME type of the file
 * @param {string} fileName - The name of the file
 * @returns {string} - Tailwind CSS color class
 */
export const getFileIconColor = (mimeType, fileName = "") => {
  const extension = fileName.split(".").pop()?.toLowerCase();

  // Image files - blue
  if (
    mimeType?.startsWith("image/") ||
    ["jpg", "jpeg", "png", "gif", "bmp", "webp", "svg"].includes(extension)
  ) {
    return "text-blue-600";
  }

  // PDF files - red
  if (mimeType === "application/pdf" || extension === "pdf") {
    return "text-red-600";
  }

  // Video files - purple
  if (
    mimeType?.startsWith("video/") ||
    ["mp4", "avi", "mov", "wmv", "flv", "webm", "mkv"].includes(extension)
  ) {
    return "text-purple-600";
  }

  // Audio files - green
  if (
    mimeType?.startsWith("audio/") ||
    ["mp3", "wav", "flac", "aac", "ogg", "m4a"].includes(extension)
  ) {
    return "text-green-600";
  }

  // Spreadsheet files - emerald
  if (
    mimeType?.includes("spreadsheet") ||
    ["xls", "xlsx", "csv"].includes(extension)
  ) {
    return "text-emerald-600";
  }

  // Archive files - orange
  if (
    mimeType?.includes("zip") ||
    mimeType?.includes("rar") ||
    ["zip", "rar", "7z", "tar", "gz"].includes(extension)
  ) {
    return "text-orange-600";
  }

  // Code files - indigo
  if (
    [
      "js",
      "ts",
      "jsx",
      "tsx",
      "html",
      "css",
      "scss",
      "sass",
      "php",
      "py",
      "java",
      "cpp",
      "c",
      "json",
      "xml",
    ].includes(extension)
  ) {
    return "text-indigo-600";
  }

  // Text files - gray
  if (
    mimeType?.startsWith("text/") ||
    ["txt", "md", "rtf"].includes(extension)
  ) {
    return "text-gray-600";
  }

  // Default - gray
  return "text-gray-500";
};
