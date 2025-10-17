import React, { useState, useRef } from "react";
import { X, Plus, Upload, Trash2, Eye } from "lucide-react";
import { useNotification } from "../contexts/NotificationContext";
import { useProject } from "../contexts/ProjectContext";
import { projectAPI } from "../utils/api";
import SimpleQuillEditor from "./SimpleQuillEditor";

const CreateProjectModal = ({ onClose }) => {
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    clientName: "",
    projectType: "",
    startDate: new Date().toISOString().split("T")[0], // Format as YYYY-MM-DD
    endDate: "",
    projectStatus: "active",
    liveSiteUrl: "",
    demoSiteUrl: "",
    markupUrl: "",
  });
  const [loading, setLoading] = useState(false);
  const [attachedFiles, setAttachedFiles] = useState([]);
  const [isDragOver, setIsDragOver] = useState(false);
  const [errors, setErrors] = useState({});
  const fileInputRef = useRef(null);
  const { showToast } = useNotification();
  const { fetchProjects } = useProject();

  // No need to set formData.endDate here; it's managed by React state.

  const validateForm = () => {
    const newErrors = {};

    if (!formData.name.trim()) {
      newErrors.name = "Project name is required";
    }

    if (!formData.projectType) {
      newErrors.projectType = "Project type is required";
    }

    if (!formData.startDate) {
      newErrors.startDate = "Start date is required";
    }

    // Validate date logic
    if (formData.startDate && formData.endDate) {
      const startDate = new Date(formData.startDate);
      const endDate = new Date(formData.endDate);
      if (endDate < startDate) {
        newErrors.endDate = "End date cannot be before start date";
      }
    }

    // Validate URLs if provided
    const urlRegex = /^https?:\/\/.+/;
    if (formData.liveSiteUrl && !urlRegex.test(formData.liveSiteUrl)) {
      newErrors.liveSiteUrl =
        "Must be a valid URL starting with http:// or https://";
    }
    if (formData.demoSiteUrl && !urlRegex.test(formData.demoSiteUrl)) {
      newErrors.demoSiteUrl =
        "Must be a valid URL starting with http:// or https://";
    }
    if (formData.markupUrl && !urlRegex.test(formData.markupUrl)) {
      newErrors.markupUrl =
        "Must be a valid URL starting with http:// or https://";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const isValid = validateForm();
    if (!isValid) {
      const firstError = Object.values(errors)[0];
      showToast(firstError, "error");
      return;
    }

    setLoading(true);
    try {
      // Prepare files for upload
      const filesToUpload = attachedFiles.map((fileObj) => fileObj.file);

      // Clean up form data - remove empty strings and trim values
      const cleanedFormData = {
        ...formData,
        name: formData.name.trim(),
        clientName: formData.clientName.trim(),
        description: formData.description.trim(),
        liveSiteUrl: formData.liveSiteUrl.trim() || "",
        demoSiteUrl: formData.demoSiteUrl.trim() || "",
        markupUrl: formData.markupUrl.trim() || "",
        endDate: formData.endDate || null,
      };

      console.log("Sending form data:", cleanedFormData);
      console.log("Files to upload:", filesToUpload);

      // Create project with files
      const response = await projectAPI.createProject(
        cleanedFormData,
        filesToUpload
      );

      if (response.data.success) {
        showToast("Project created successfully!", "success");
        // onClose();
        // Refresh the project list using the context
        await fetchProjects();
      } else {
        showToast(response.data.message || "Failed to create project", "error");
      }
    } catch (error) {
      console.error("Create project error:", error);
      let errorMessage = "Failed to create project";

      if (
        error.response?.data?.errors &&
        Array.isArray(error.response.data.errors)
      ) {
        // Handle validation errors
        const firstError = error.response.data.errors[0];
        errorMessage = firstError.msg || firstError.message || errorMessage;
      } else if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      }

      showToast(errorMessage, "error");
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;

    // Clear error for this field when user starts typing
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: undefined }));
    }

    setFormData((prev) => {
      const newData = {
        ...prev,
        [name]: value,
      };

      // If projectType changes and is not "On Going", clear endDate
      if (name === "projectType" && value !== "On Going") {
        newData.endDate = "";
      }

      // If startDate changes and endDate is before it, clear endDate
      if (name === "startDate" && prev.endDate) {
        const startDate = new Date(value);
        const endDate = new Date(prev.endDate);
        if (endDate < startDate) {
          newData.endDate = "";
        }
      }

      return newData;
    });
  };

  // File handling functions
  const validateFile = (file) => {
    const maxSize = 8 * 1024 * 1024; // 8MB
    const allowedTypes = [
      "image/jpeg",
      "image/jpg",
      "image/png",
      "image/gif",
      "image/webp",
      "application/pdf",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "application/vnd.ms-excel",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "text/plain",
      "application/zip",
      "application/json",
    ];

    if (file.size > maxSize) {
      showToast(
        `File ${file.name} is too large. Maximum size is 8MB.`,
        "error"
      );
      return false;
    }

    if (!allowedTypes.includes(file.type)) {
      showToast(`File type ${file.type} is not allowed.`, "error");
      return false;
    }

    return true;
  };

  const handleFileSelect = (files) => {
    const fileArray = Array.from(files);

    if (attachedFiles.length + fileArray.length > 8) {
      showToast("Maximum 8 files can be uploaded.", "error");
      return;
    }

    const validFiles = fileArray.filter(validateFile);

    const newFiles = validFiles.map((file) => ({
      id: Date.now() + Math.random(),
      file,
      name: file.name,
      size: file.size,
      type: file.type,
      preview: file.type.startsWith("image/")
        ? URL.createObjectURL(file)
        : null,
    }));

    setAttachedFiles((prev) => [...prev, ...newFiles]);
  };

  const handleFileInputChange = (e) => {
    if (e.target.files) {
      handleFileSelect(e.target.files);
    }
  };

  const removeFile = (fileId) => {
    setAttachedFiles((prev) => {
      const fileToRemove = prev.find((f) => f.id === fileId);
      if (fileToRemove && fileToRemove.preview) {
        URL.revokeObjectURL(fileToRemove.preview);
      }
      return prev.filter((f) => f.id !== fileId);
    });
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragOver(false);

    if (e.dataTransfer.files) {
      handleFileSelect(e.dataTransfer.files);
    }
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  const getFileIcon = (type) => {
    if (type.startsWith("image/")) return "🖼️";
    if (type === "application/pdf") return "📄";
    if (type.includes("word")) return "📝";
    if (type.includes("excel") || type.includes("spreadsheet")) return "📊";
    if (type.includes("powerpoint") || type.includes("presentation"))
      return "📈";
    if (type === "text/plain") return "📃";
    if (type === "application/zip") return "🗜️";
    if (type === "application/json") return "⚙️";
    if (
      type.includes("document") ||
      type.includes("msword") ||
      type.includes("officedocument")
    )
      return "📄";
    return "📎";
  };

  const handleFilePreview = (file) => {
    if (file.type.startsWith("image/")) {
      // For images, open in new tab
      window.open(file.preview, "_blank");
    } else if (file.type === "application/pdf") {
      // For PDFs, create a blob URL and open in new tab
      const blob = new Blob([file.file], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);
      window.open(url, "_blank");
      // Clean up the URL after a delay
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } else if (file.type === "text/plain") {
      // For text files, read and show content
      const reader = new FileReader();
      reader.onload = (e) => {
        const content = e.target.result;
        const newWindow = window.open("", "_blank");
        newWindow.document.write(`
          <html>
            <head><title>${file.name}</title></head>
            <body style="font-family: monospace; padding: 20px; white-space: pre-wrap;">
              ${content}
            </body>
          </html>
        `);
        newWindow.document.close();
      };
      reader.readAsText(file.file);
    } else {
      // For other files, try to download or show info
      const blob = new Blob([file.file], { type: file.type });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = file.name;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      showToast(`Downloaded ${file.name}`, "success");
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-5xl w-full max-h-[90vh] overflow-hidden">
        {/* Modal Header */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white p-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold">Create New Project</h2>
              <p className="text-blue-100 text-sm mt-1">
                Set up a new project for your team
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-lg hover:bg-blue-500 text-white hover:text-white transition-colors duration-200"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Content */}
        <form
          onSubmit={handleSubmit}
          className="p-6 overflow-y-auto max-h-[calc(90vh-120px)] space-y-6"
        >
          {/* Project Information Box */}
          <div className="bg-white border border-gray-200 rounded-lg p-6 border-l-4 border-l-blue-500">
            <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
              <div className="w-2 h-2 bg-blue-500 rounded-full mr-3"></div>
              Project Information
            </h3>

            {/* Row 1: Three Columns - Project Name, Client Name, Project Status */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Project Name */}
              <div className="space-y-2">
                <label className="block text-sm font-semibold text-gray-700">
                  Project Name *
                </label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  className={`w-full p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 ${
                    errors.name ? "border-red-500" : "border-gray-300"
                  }`}
                  placeholder="Enter project name"
                  required
                />
                {errors.name && (
                  <p className="text-red-500 text-xs mt-1">{errors.name}</p>
                )}
              </div>
              {/* Client Name */}
              <div className="space-y-2">
                <label className="block text-sm font-semibold text-gray-700">
                  Client Name
                </label>
                <input
                  type="text"
                  name="clientName"
                  value={formData.clientName}
                  onChange={handleChange}
                  className={`w-full p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 ${
                    errors.clientName ? "border-red-500" : "border-gray-300"
                  }`}
                  placeholder="Enter client name (optional)"
                />
                {errors.clientName && (
                  <p className="text-red-500 text-xs mt-1">
                    {errors.clientName}
                  </p>
                )}
              </div>
              {/* Project Status */}
              <div className="space-y-2">
                <label className="block text-sm font-semibold text-gray-700">
                  Project Status *
                </label>
                <select
                  name="projectStatus"
                  value={formData.projectStatus}
                  onChange={handleChange}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                  required
                >
                  <option value="active">Active</option>
                  <option value="planning">Planning</option>
                  <option value="on-hold">On Hold</option>
                  <option value="completed">Completed</option>
                </select>
              </div>
            </div>

            {/* Row 2: Three Columns - Project Type, Start Date, End Date */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Project Type Dropdown */}
              <div className="space-y-2">
                <label className="block text-sm font-semibold text-gray-700">
                  Project Type *
                </label>
                <select
                  name="projectType"
                  value={formData.projectType}
                  onChange={handleChange}
                  className={`w-full p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 ${
                    errors.projectType ? "border-red-500" : "border-gray-300"
                  }`}
                  required
                >
                  <option>Select Project Type</option>
                  <option value="Maintenance">Maintenance</option>
                  <option value="One Time">One Time</option>
                  <option value="On Going">On Going</option>
                </select>
                {errors.projectType && (
                  <p className="text-red-500 text-xs mt-1">
                    {errors.projectType}
                  </p>
                )}
              </div>

              {/* Start Date */}
              <div className="space-y-2">
                <label className="block text-sm font-semibold text-gray-700">
                  Start Date *
                </label>
                <input
                  type="date"
                  name="startDate"
                  value={formData.startDate}
                  onChange={handleChange}
                  className={`w-full p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 ${
                    errors.startDate ? "border-red-500" : "border-gray-300"
                  }`}
                  required
                />
                {errors.startDate && (
                  <p className="text-red-500 text-xs mt-1">
                    {errors.startDate}
                  </p>
                )}
              </div>

              {/* End Date */}
              <div className="space-y-2">
                <label className="block text-sm font-semibold text-gray-700">
                  End Date
                </label>
                <input
                  type="date"
                  name="endDate"
                  value={formData.endDate}
                  onChange={handleChange}
                  className={`w-full p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 ${
                    errors.endDate ? "border-red-500" : "border-gray-300"
                  }`}
                />
                {errors.endDate && (
                  <p className="text-red-500 text-xs mt-1">{errors.endDate}</p>
                )}
              </div>
            </div>

            {/* Description - Full Width with Rich Text Editor */}
            <div className="space-y-2">
              <label className="block text-sm font-semibold text-gray-700">
                Description
              </label>
              <div className="border border-gray-300 rounded-lg overflow-hidden focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-transparent transition-all duration-200">
                <style jsx>{`
                  .simple-quill-editor .ql-editor {
                    min-height: 120px;
                    font-size: 14px;
                    line-height: 1.5;
                  }
                  .simple-quill-editor .ql-toolbar {
                    border-top: none;
                    border-left: none;
                    border-right: none;
                    border-bottom: 1px solid #e5e7eb;
                  }
                  .simple-quill-editor .ql-container {
                    border: none;
                  }
                `}</style>
                <SimpleQuillEditor
                  value={formData.description}
                  onChange={(content) =>
                    setFormData((prev) => ({ ...prev, description: content }))
                  }
                  placeholder="Enter project description (use @ to mention someone, # for tags)"
                />
              </div>
            </div>
          </div>

          {/* Site URLs Box */}
          <div className="bg-white border border-gray-200 rounded-lg p-6 border-l-4 border-l-green-500">
            <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
              <div className="w-2 h-2 bg-green-500 rounded-full mr-3"></div>
              Site URLs
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <label className="block text-sm font-semibold text-gray-700">
                  Live site url
                </label>
                <input
                  type="url"
                  value={formData.liveSiteUrl}
                  onChange={(e) => {
                    if (errors.liveSiteUrl) {
                      setErrors((prev) => ({
                        ...prev,
                        liveSiteUrl: undefined,
                      }));
                    }
                    setFormData((prev) => ({
                      ...prev,
                      liveSiteUrl: e.target.value,
                    }));
                  }}
                  placeholder="https://example.com"
                  className={`w-full p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all duration-200 ${
                    errors.liveSiteUrl ? "border-red-500" : "border-gray-300"
                  }`}
                />
                {errors.liveSiteUrl && (
                  <p className="text-red-500 text-xs mt-1">
                    {errors.liveSiteUrl}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-semibold text-gray-700">
                  Demo site url
                </label>
                <input
                  type="url"
                  value={formData.demoSiteUrl}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      demoSiteUrl: e.target.value,
                    }))
                  }
                  placeholder="https://demo.example.com"
                  className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all duration-200"
                />
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-semibold text-gray-700">
                  Markup url
                </label>
                <input
                  type="url"
                  value={formData.markupUrl}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      markupUrl: e.target.value,
                    }))
                  }
                  placeholder="https://markup.example.com"
                  className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all duration-200"
                />
              </div>
            </div>
          </div>

          {/* File and Attachment Box */}
          <div className="bg-white border border-gray-200 rounded-lg p-6 border-l-4 border-l-purple-500">
            <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
              <div className="w-2 h-2 bg-purple-500 rounded-full mr-3"></div>
              File and Attachment
            </h3>

            {/* File Upload Area */}
            <div
              className={`border-2 border-dashed rounded-lg p-6 text-center transition-all duration-200 cursor-pointer group ${
                isDragOver
                  ? "border-blue-500 bg-blue-50"
                  : "border-gray-300 hover:border-gray-400 hover:bg-gray-50"
              }`}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
            >
              <div className="flex flex-col items-center">
                <div className="p-3 rounded-full bg-gray-100 mb-3 group-hover:bg-blue-100 transition-colors duration-200">
                  <Upload className="w-6 h-6 text-gray-400 group-hover:text-blue-500 transition-colors duration-200" />
                </div>
                <h4 className="text-sm font-semibold text-gray-700 mb-1">
                  Drop files here or click to browse
                </h4>
                <p className="text-xs text-gray-500 mb-3">
                  Support for images, documents, and archives
                </p>
                <div className="flex flex-wrap justify-center gap-1 text-xs">
                  <span className="px-2 py-1 bg-gray-100 text-gray-600 rounded">
                    JPG, PNG, GIF
                  </span>
                  <span className="px-2 py-1 bg-gray-100 text-gray-600 rounded">
                    PDF, DOC, XLS
                  </span>
                  <span className="px-2 py-1 bg-gray-100 text-gray-600 rounded">
                    ZIP, JSON
                  </span>
                </div>
                <p className="text-xs text-gray-400 mt-2">
                  Up to 8 files, 8MB each
                </p>
              </div>

              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.txt,.zip,.json"
                onChange={handleFileInputChange}
                className="hidden"
              />
            </div>

            {/* Attached Files Display */}
            {attachedFiles.length > 0 && (
              <div className="mt-6">
                <div className="flex items-center justify-between mb-4">
                  <h4 className="text-sm font-semibold text-gray-800">
                    Attached Files
                  </h4>
                  <div className="flex items-center space-x-2">
                    <span className="text-xs text-gray-500">
                      {attachedFiles.length} of 8 files
                    </span>
                    <div className="w-16 h-2 bg-gray-200 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-blue-500 rounded-full transition-all duration-300"
                        style={{
                          width: `${(attachedFiles.length / 8) * 100}%`,
                        }}
                      ></div>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {attachedFiles.map((file) => (
                    <div
                      key={file.id}
                      className="flex items-center space-x-3 p-3 bg-white border border-gray-200 rounded-lg hover:border-gray-300 transition-colors duration-200"
                    >
                      {/* File Icon */}
                      <div className="flex-shrink-0 w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
                        <span className="text-lg">
                          {getFileIcon(file.type)}
                        </span>
                      </div>

                      {/* File Info */}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {file.name}
                        </p>
                        <p className="text-xs text-gray-500">
                          {formatFileSize(file.size)}
                        </p>
                      </div>

                      {/* File Type Badge */}
                      <div className="flex-shrink-0">
                        <span className="px-2 py-1 bg-gray-100 text-gray-600 rounded text-xs font-medium">
                          {file.type.split("/")[1]?.toUpperCase() || "FILE"}
                        </span>
                      </div>

                      {/* File Preview */}
                      {file.preview && (
                        <div className="flex-shrink-0">
                          <div className="relative w-12 h-12 bg-gray-100 rounded-lg overflow-hidden">
                            <img
                              src={file.preview}
                              alt={file.name}
                              className="w-full h-full object-cover"
                            />
                            <button
                              type="button"
                              className="absolute inset-0 bg-black bg-opacity-0 hover:bg-opacity-20 transition-all duration-200 flex items-center justify-center"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleFilePreview(file);
                              }}
                            >
                              <Eye className="w-3 h-3 text-white opacity-0 hover:opacity-100 transition-opacity duration-200" />
                            </button>
                          </div>
                        </div>
                      )}

                      {/* View Button for Non-Image Files */}
                      {!file.preview && (
                        <div className="flex-shrink-0">
                          <button
                            type="button"
                            className="p-2 text-gray-400 hover:text-blue-500 hover:bg-blue-50 rounded-lg transition-all duration-200"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleFilePreview(file);
                            }}
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                        </div>
                      )}

                      {/* Delete Button */}
                      <div className="flex-shrink-0">
                        <button
                          type="button"
                          onClick={() => removeFile(file.id)}
                          className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all duration-200"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Modal Actions */}
          <div className="flex items-center justify-end space-x-3 mt-6 pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-600 hover:text-gray-800 font-medium transition-colors duration-200"
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="bg-blue-600 text-white hover:bg-blue-700 font-medium py-2 px-4 rounded-lg transition-colors duration-200 flex items-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={loading}
            >
              {loading ? (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              ) : (
                <>
                  <Plus className="w-4 h-4" />
                  <span>Create Project</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateProjectModal;
