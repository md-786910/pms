import React, { useState, useEffect, useRef } from "react";
import {
  X,
  Save,
  Upload,
  Eye,
  Trash2,
  Link,
  Clock,
  User,
  MessageSquare,
  Pencil,
} from "lucide-react";
import { getFileIcon, getFileIconColor } from "../utils/fileIcons";
import { useProject } from "../contexts/ProjectContext";
import { useNotification } from "../contexts/NotificationContext";
import { projectAPI, activityAPI } from "../utils/api";
import SimpleQuillEditor from "./SimpleQuillEditor";
import Avatar from "./Avatar";

const EditProjectModal = ({ project, onClose }) => {
  const { updateProject } = useProject();
  const { showToast } = useNotification();
  const [loading, setLoading] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState([]);
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef(null);
  const modalRef = useRef(null);
  const startDateInputRef = useRef(null);
  const endDateInputRef = useRef(null);
  const [activities, setActivities] = useState([]);
  const [loadingActivities, setLoadingActivities] = useState(false);
  const [showActivities, setShowActivities] = useState(false);
  const [editMode, setEditMode] = useState(true);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    clientName: "",
    projectStatus: "new",
    projectType: "",
    startDate: "",
    endDate: "",
    liveSiteUrl: "",
    demoSiteUrl: "",
    markupUrl: "",
  });

  // Helper to format date as YYYY-MM-DD for input[type="date"]
  function formatDate(date) {
    if (!date) return "";
    const d = new Date(date);
    if (isNaN(d)) return "";
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }

  // Fetch project activities
  const fetchActivities = async () => {
    if (!project?._id) return;

    try {
      setLoadingActivities(true);
      const response = await activityAPI.getProjectActivities(
        project._id,
        1,
        50
      );
      setActivities(response.data.activities || []);
    } catch (error) {
      console.error("Error fetching activities:", error);
      showToast("Failed to load project activities", "error");
    } finally {
      setLoadingActivities(false);
    }
  };

  // Format activity timestamp
  const formatActivityTime = (timestamp) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffInHours = (now - date) / (1000 * 60 * 60);

    if (diffInHours < 1) {
      const diffInMinutes = Math.floor((now - date) / (1000 * 60));
      return `${diffInMinutes}m ago`;
    } else if (diffInHours < 24) {
      return `${Math.floor(diffInHours)}h ago`;
    } else {
      return date.toLocaleDateString();
    }
  };

  useEffect(() => {
    if (project) {
      setFormData({
        name: project.name || "",
        description: project.description || "",
        clientName: project.clientName || "",
        projectStatus: project.projectStatus || "new",
        projectType: project.projectType || "maintenance",
        startDate: formatDate(project.startDate),
        endDate: formatDate(project.endDate),
        liveSiteUrl: project.liveSiteUrl || "",
        demoSiteUrl: project.demoSiteUrl || "",
        markupUrl: project.markupUrl || "",
      });

      // Set uploaded files from project attachments
      if (project.attachments && project.attachments.length > 0) {
        setUploadedFiles(
          project.attachments.map((attachment) => ({
            id: attachment._id || Date.now() + Math.random(),
            name: attachment.originalName,
            size: attachment.size,
            type: attachment.mimeType,
            url: attachment.url,
            attachment: attachment,
          }))
        );
      }
    }
  }, [project]);

  // Handle click outside to close modal
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (modalRef.current && !modalRef.current.contains(event.target)) {
        onClose();
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [onClose]);

  // Fetch activities when component mounts
  useEffect(() => {
    fetchActivities();
  }, [project]);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.name.trim()) {
      showToast("Project name is required", "error");
      return;
    }

    if (!formData.projectType) {
      showToast("Project type is required", "error");
      return;
    }

    if (!formData.startDate) {
      showToast("Start date is required", "error");
      return;
    }

    setLoading(true);
    try {
      // First update the project without new attachments
      const existingAttachments = uploadedFiles
        .filter((file) => file.attachment) // Keep existing attachments
        .map((file) => file.attachment);

      const updateData = {
        ...formData,
        attachments: existingAttachments,
      };
      await updateProject(project._id, updateData);

      // Upload new files if any
      const newFiles = uploadedFiles.filter(
        (file) => file.file && !file.attachment
      );
      if (newFiles.length > 0) {
        const uploadFormData = new FormData();
        newFiles.forEach((fileObj, index) => {
          if (fileObj.file) {
            uploadFormData.append(`file${index}`, fileObj.file);
          }
        });

        try {
          console.log("Uploading files to project:", project._id);
          const response = await projectAPI.uploadFiles(
            project._id,
            uploadFormData
          );

          console.log("File upload successful:", response.data);

          // Update the uploadedFiles state to show the uploaded files
          const uploadedFileObjects = uploadedFiles.map((fileObj, index) => ({
            id: `uploaded-${Date.now()}-${index}`,
            name: fileObj.name,
            size: fileObj.size,
            type: fileObj.type,
            url: response.data.attachments[index]?.url || fileObj.url,
            uploaded: true,
          }));

          setUploadedFiles(uploadedFileObjects);

          showToast(
            `${uploadedFiles.length} file(s) uploaded successfully!`,
            "success"
          );
        } catch (uploadError) {
          console.error("File upload error:", uploadError);
          showToast(
            "Project updated but some files failed to upload",
            "warning"
          );
        }
      }

      showToast("Project updated successfully!", "success");

      // Refresh activities after successful update
      await fetchActivities();

      // Don't auto-close the modal - let user close it manually
      // onClose();
    } catch (error) {
      showToast("Failed to update project", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => {
      // If projectType changes and is not "ongoing", clear endDate
      if (name === "projectType" && value !== "ongoing") {
        return {
          ...prev,
          [name]: value,
          endDate: "",
        };
      }
      return {
        ...prev,
        [name]: value,
      };
    });
  };

  // File upload handlers (same as CreateProjectModal)
  const handleFileUpload = async (files) => {
    const fileArray = Array.from(files);
    const validFiles = fileArray.filter((file) => {
      const maxSize = 10 * 1024 * 1024; // 10MB
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
        "application/json",
      ];

      if (file.size > maxSize) {
        showToast(
          `File ${file.name} is too large. Maximum size is 10MB.`,
          "error"
        );
        return false;
      }

      if (!allowedTypes.includes(file.type)) {
        showToast(`File type ${file.type} is not supported.`, "error");
        return false;
      }

      return true;
    });

    if (validFiles.length === 0) return;

    // Create temporary file objects for preview
    const newFiles = validFiles.map((file) => ({
      id: Date.now() + Math.random(),
      name: file.name,
      size: file.size,
      type: file.type,
      url: URL.createObjectURL(file), // Temporary URL for preview
      file: file, // Store actual file for upload
      uploading: false,
      uploaded: false,
    }));

    setUploadedFiles((prev) => [...prev, ...newFiles]);
    showToast(`${validFiles.length} file(s) added successfully`, "success");
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
    const files = e.dataTransfer.files;
    handleFileUpload(files);
  };

  const handleFileInputChange = (e) => {
    const files = e.target.files;
    handleFileUpload(files);
    e.target.value = ""; // Reset input
  };

  const removeFile = async (fileId) => {
    const fileToRemove = uploadedFiles.find((file) => file.id === fileId);

    // If it's an existing attachment, delete it from server
    if (fileToRemove && fileToRemove.attachment) {
      try {
        await projectAPI.deleteAttachment(
          project._id,
          fileToRemove.attachment._id
        );
      } catch (error) {
        console.error("Delete attachment error:", error);
        showToast("Failed to delete attachment", "error");
        return;
      }
    }

    setUploadedFiles((prev) => prev.filter((file) => file.id !== fileId));
  };

  const openFilePreview = (file) => {
    window.open(file.url, "_blank");
  };

  if (!project) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div
        ref={modalRef}
        className="bg-white rounded-3xl shadow-2xl max-w-7xl w-full mx-4 max-h-[90vh] overflow-hidden relative flex flex-col"
      >
        {/* Sticky Close Button */}
        <div className="flex items-center">
          <button
            onClick={onClose}
            className="absolute top-6 right-4 z-10 p-3 bg-white/90 hover:bg-white rounded-full shadow-lg transition-all duration-200 hover:scale-105"
            title="Close modal"
          >
            <X className="w-4 h-4 text-gray-600" />
          </button>
          <button
            className="absolute top-6 right-20 z-10 px-4 py-2 bg-primary-500 hover:bg-primary-400 text-white font-semibold text-base transition-colors duration-200 rounded-md flex items-center justify-center gap-2"
            title="Edit mode"
            onClick={() => setEditMode(!editMode)}
          >
            {editMode ? (
              <>
                <Pencil className="w-4 h-4" />
                <span>Edit mode</span>
              </>
            ) : (
              "Cancel edit"
            )}
          </button>
        </div>

        {/* Modal Header */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white p-4 flex-shrink-0">
          <div className="flex items-center space-x-4">
            <div className="p-3 bg-white/20 rounded-xl">
              <Save className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-xl font-bold">Edit Project</h2>
              <p className="text-primary-100 text-md">
                Update project details and manage attachments
              </p>
            </div>
          </div>
        </div>

        {/* Modal Content - Scrollable */}
        <div className="flex-1 overflow-y-auto">
          <div className="p-4">
            <form
              id="edit-project-form"
              onSubmit={handleSubmit}
              className="space-y-8"
            >
              {/* Section 1: Project Information */}
              <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
                <div className="flex items-center mb-4">
                  <div className="w-8 h-8 bg-primary-500 rounded-lg flex items-center justify-center mr-3">
                    <Save className="w-5 h-5 text-white" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-800">
                    Project Information
                  </h3>
                </div>

                <div className="space-y-4">
                  {/* First Row: Project Name, Client Name, Project Status */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {/* Project Name */}
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Project Name <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        name="name"
                        value={formData.name}
                        onChange={handleChange}
                        className="w-full h-12 px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                        placeholder="Enter project name"
                        required
                        disabled={editMode}
                      />
                    </div>
                    {/* Client Name */}
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Client Name
                      </label>
                      <input
                        type="text"
                        name="clientName"
                        value={formData.clientName}
                        onChange={handleChange}
                        className="w-full h-12 px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                        placeholder="Enter client name"
                        disabled={editMode}
                      />
                    </div>
                    {/* Project Status */}
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Project Status <span className="text-red-500">*</span>
                      </label>
                      <select
                        name="projectStatus"
                        value={formData.projectStatus}
                        onChange={handleChange}
                        className="w-full h-12 px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                        required
                        disabled={editMode}
                      >
                        <option value="new">New</option>
                        <option value="ongoing">Ongoing</option>
                        <option value="completed">Completed</option>
                        <option value="cancelled">Cancelled</option>
                      </select>
                    </div>
                  </div>

                  {/* Second Row: Project Type, Start Date, End Date */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {/* Project Type */}
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Project Type <span className="text-red-500">*</span>
                      </label>
                      <select
                        name="projectType"
                        value={formData.projectType}
                        onChange={handleChange}
                        className="w-full h-12 px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                        required
                        disabled={editMode}
                      >
                        <option value="">Select Project Type</option>
                        <option value="maintenance">Maintenance</option>
                        <option value="ongoing">Ongoing</option>
                        <option value="one-time">One Time</option>
                      </select>
                    </div>
                    {/* Start Date */}
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Start Date <span className="text-red-500">*</span>
                      </label>
                      <input
                        ref={startDateInputRef}
                        type="date"
                        name="startDate"
                        value={formData.startDate}
                        onChange={handleChange}
                        onClick={(e) => {
                          if (!editMode && startDateInputRef.current) {
                            // Try to show the native date picker
                            if (startDateInputRef.current.showPicker) {
                              try {
                                startDateInputRef.current.showPicker();
                              } catch (error) {
                                // Fallback: just focus the input
                                startDateInputRef.current.focus();
                              }
                            } else {
                              // Fallback: focus the input which should open the picker
                              startDateInputRef.current.focus();
                            }
                          }
                        }}
                        className="w-full h-12 px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 cursor-pointer"
                        required
                        disabled={editMode}
                      />
                    </div>
                    {/* End Date */}
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        End Date
                      </label>
                      <input
                        ref={endDateInputRef}
                        type="date"
                        name="endDate"
                        value={formData.endDate}
                        onChange={handleChange}
                        onClick={(e) => {
                          if (!editMode && endDateInputRef.current) {
                            // Try to show the native date picker
                            if (endDateInputRef.current.showPicker) {
                              try {
                                endDateInputRef.current.showPicker();
                              } catch (error) {
                                // Fallback: just focus the input
                                endDateInputRef.current.focus();
                              }
                            } else {
                              // Fallback: focus the input which should open the picker
                              endDateInputRef.current.focus();
                            }
                          }
                        }}
                        className="w-full h-12 px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 cursor-pointer"
                        disabled={editMode}
                      />
                    </div>
                  </div>

                  {/* Description */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Description
                    </label>
                    <div className="border border-gray-300 rounded-lg overflow-hidden">
                      {!editMode ? (
                        <SimpleQuillEditor
                          value={formData.description}
                          onChange={(content) =>
                            setFormData((prev) => ({
                              ...prev,
                              description: content,
                            }))
                          }
                          placeholder="Enter project description"
                          height="300px"
                          readOnly={editMode}
                        />
                      ) : (
                        <div>
                          <p
                            className="letter-spacing-0.5 p-2"
                            style={{
                              lineHeight: 1.65,
                            }}
                            dangerouslySetInnerHTML={{
                              __html: formData.description,
                            }}
                          />
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Section 2: Site URLs */}
              <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
                <div className="flex items-center mb-4">
                  <div className="w-8 h-8 bg-green-500 rounded-lg flex items-center justify-center mr-3">
                    <Link className="w-5 h-5 text-white" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-800">
                    Site URLs
                  </h3>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* Live Site URL */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Live Site URL
                    </label>
                    <input
                      type="url"
                      name="liveSiteUrl"
                      value={formData.liveSiteUrl}
                      onChange={handleChange}
                      className="w-full h-12 px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                      placeholder="https://example.com"
                      disabled={editMode}
                    />
                  </div>
                  {/* Demo Site URL */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Demo Site URL
                    </label>
                    <input
                      type="url"
                      name="demoSiteUrl"
                      value={formData.demoSiteUrl}
                      onChange={handleChange}
                      className="w-full h-12 px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                      placeholder="https://demo.example.com"
                      disabled={editMode}
                    />
                  </div>
                  {/* Markup URL */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Markup URL
                    </label>
                    <input
                      type="url"
                      name="markupUrl"
                      value={formData.markupUrl}
                      onChange={handleChange}
                      className="w-full h-12 px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                      placeholder="https://markup.example.com"
                      disabled={editMode}
                    />
                  </div>
                </div>
              </div>

              {/* Section 3: Files and Documents */}
              <div
                className="bg-gray-50 rounded-xl p-4 border border-gray-200"
                style={{
                  // editMode ? {pointerEvents: "none"} : {pointerEvents: "auto"}
                  cursor: editMode ? "not-allowed" : "pointer",
                }}
              >
                <div className="flex items-center mb-4">
                  <div className="w-8 h-8 bg-purple-500 rounded-lg flex items-center justify-center mr-3">
                    <Upload className="w-5 h-5 text-white" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-800">
                    Files and Documents
                  </h3>
                </div>

                {/* Drag and Drop Area */}
                <div
                  className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors duration-200 ${
                    isDragOver
                      ? "border-blue-500 bg-blue-50"
                      : "border-gray-300 hover:border-gray-400"
                  }`}
                  onClick={() => fileInputRef.current?.click()}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                >
                  <Upload className="w-8 h-8 mx-auto text-gray-400 mb-2" />
                  <p className="text-gray-600 mb-2">
                    Drag and drop files here, or{" "}
                    <button
                      type="button"
                      className="text-blue-600 hover:text-blue-700 font-medium"
                    >
                      browse files
                    </button>
                  </p>
                  <p className="text-sm text-gray-500">
                    Supports images, PDFs, documents (max 10MB each)
                  </p>
                  <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    onChange={handleFileInputChange}
                    className="hidden"
                    accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.txt,.json"
                    disabled={editMode}
                  />
                </div>

                {/* Uploaded Files List */}
                {uploadedFiles.length > 0 && (
                  <div className="mt-4">
                    <h4 className="text-sm font-semibold text-gray-700 mb-2">
                      Uploaded Files ({uploadedFiles.length})
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {uploadedFiles.map((file) => (
                        <div
                          key={file.id}
                          className={`flex items-center justify-between p-3 rounded-lg border ${
                            file.uploaded
                              ? "bg-green-50 border-green-200"
                              : "bg-gray-50 border-gray-200"
                          }`}
                        >
                          <div className="flex items-center space-x-3 flex-1 min-w-0">
                            <div className="flex-shrink-0">
                              <div className="w-8 h-8 bg-gray-100 rounded flex items-center justify-center">
                                {React.createElement(
                                  getFileIcon(file.type, file.name),
                                  {
                                    className: `w-5 h-5 ${getFileIconColor(
                                      file.type,
                                      file.name
                                    )}`,
                                  }
                                )}
                              </div>
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-gray-900 truncate">
                                {file.name}
                              </p>
                              <p className="text-xs text-gray-500">
                                {(file.size / 1024 / 1024).toFixed(2)} MB
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center space-x-2">
                            {file.uploaded && (
                              <div
                                className="p-1 text-green-600"
                                title="Successfully uploaded"
                              >
                                <svg
                                  className="w-4 h-4"
                                  fill="currentColor"
                                  viewBox="0 0 20 20"
                                >
                                  <path
                                    fillRule="evenodd"
                                    d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                                    clipRule="evenodd"
                                  />
                                </svg>
                              </div>
                            )}
                            <button
                              type="button"
                              onClick={() => openFilePreview(file)}
                              className="p-1 text-gray-400 hover:text-blue-600 transition-colors"
                              title="View file"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => removeFile(file.id)}
                              className="p-1 text-gray-400 hover:text-red-600 transition-colors"
                              title="Remove file"
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
            </form>

            {/* Activity Log Section */}
            <div className="mt-8 bg-gray-50 rounded-xl p-4 border border-gray-200">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center">
                  <div className="w-8 h-8 bg-green-500 rounded-lg flex items-center justify-center mr-3">
                    <Clock className="w-5 h-5 text-white" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-800">
                    Project Activity
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setShowActivities(!showActivities)}
                  className="text-blue-600 hover:text-blue-800 font-medium text-sm flex items-center space-x-1"
                >
                  <span>{showActivities ? "Hide" : "Show"} Activity</span>
                  <MessageSquare className="w-4 h-4" />
                </button>
              </div>

              {showActivities && (
                <div className="bg-white rounded-lg border border-gray-200 max-h-64 overflow-y-auto">
                  {loadingActivities ? (
                    <div className="flex items-center justify-center p-8">
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                      <span className="ml-2 text-gray-600">
                        Loading activities...
                      </span>
                    </div>
                  ) : activities.length === 0 ? (
                    <div className="text-center p-8 text-gray-500">
                      <Clock className="w-8 h-8 mx-auto mb-2 text-gray-400" />
                      <p>No activities yet</p>
                    </div>
                  ) : (
                    <div className="divide-y divide-gray-200">
                      {activities.map((activity) => (
                        <div
                          key={activity._id}
                          className="p-4 hover:bg-gray-50"
                        >
                          <div className="flex items-start space-x-3">
                            <Avatar
                              user={activity.user}
                              size="sm"
                              className="flex-shrink-0"
                            />
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center space-x-2">
                                <p className="text-sm font-medium text-gray-900">
                                  {activity.user?.name || "Unknown User"}
                                </p>
                                <span className="text-xs text-gray-500">
                                  {formatActivityTime(activity.createdAt)}
                                </span>
                              </div>
                              <div className="text-sm text-gray-600 mt-1">
                                {activity.details?.htmlMessage ? (
                                  <div
                                    dangerouslySetInnerHTML={{
                                      __html: activity.details.htmlMessage,
                                    }}
                                    className="activity-message"
                                    style={{
                                      lineHeight: "1.6",
                                      fontSize: "14px",
                                    }}
                                  />
                                ) : (
                                  <p>{activity.message}</p>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Sticky Footer */}
        <div className="flex-shrink-0 bg-white border-t border-gray-200 p-6">
          <div className="flex justify-end space-x-4">
            <button
              type="button"
              onClick={onClose}
              className="px-8 py-3 text-gray-600 hover:text-gray-800 font-semibold transition-all duration-200 rounded-xl hover:bg-gray-100 border border-gray-300"
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              form="edit-project-form"
              className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white hover:from-blue-700 hover:to-indigo-700 font-semibold py-3 px-6 rounded-xl transition-all duration-200 flex items-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl transform hover:scale-105"
              disabled={loading || editMode}
            >
              {loading ? (
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  <span>Save Changes</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EditProjectModal;
