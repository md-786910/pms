import React, { useState, useRef, useEffect } from "react";
import { X, Plus, Save, Upload, Eye, Trash2, Link } from "lucide-react";
import { getFileIcon, getFileIconColor } from "../utils/fileIcons";
import { useProject } from "../contexts/ProjectContext";
import { useNotification } from "../contexts/NotificationContext";
import { projectAPI } from "../utils/api";
import SimpleQuillEditor from "./SimpleQuillEditor";

const CreateProjectModal = ({ onClose }) => {
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
  const [loading, setLoading] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState([]);
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef(null);
  const modalRef = useRef(null);
  const startDateInputRef = useRef(null);
  const endDateInputRef = useRef(null);
  const { createProject } = useProject();
  const { showToast } = useNotification();

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
      // Create the project first using ProjectContext to ensure state updates
      const projectData = {
        ...formData,
        attachments: [], // Will be uploaded separately
      };
      console.log(
        "🔄 CreateProjectModal: Calling createProject with data:",
        projectData
      );
      const createdProject = await createProject(projectData);
      console.log(
        "✅ CreateProjectModal: Project created successfully:",
        createdProject
      );

      // If there are files to upload, upload them after project creation
      if (uploadedFiles.length > 0) {
        console.log("Uploading files:", uploadedFiles);
        console.log("Project ID for upload:", createdProject._id);

        if (!createdProject._id) {
          console.error("No project ID available for file upload");
          showToast(
            "Project created but file upload failed - no project ID",
            "warning"
          );
          return;
        }
        const uploadFormData = new FormData();
        uploadedFiles.forEach((fileObj, index) => {
          if (fileObj.file) {
            console.log(`Adding file ${index}:`, fileObj.name, fileObj.file);
            uploadFormData.append(`file${index}`, fileObj.file);
          }
        });

        try {
          console.log("Uploading files to project:", createdProject._id);
          const response = await projectAPI.uploadFiles(
            createdProject._id,
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
            "Project created but some files failed to upload",
            "warning"
          );
        }
      }

      showToast(
        `Project created successfully${
          uploadedFiles.length > 0
            ? ` with ${uploadedFiles.length} file(s)`
            : ""
        }!`,
        "success"
      );

      console.log(
        "✅ CreateProjectModal: Project creation completed, closing modal"
      );

      // Close the modal immediately after successful creation
      onClose();
    } catch (error) {
      console.error("Create project error:", error);
      showToast(error?.response?.data?.message, "error");
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

  // File upload handlers
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

  const removeFile = (fileId) => {
    setUploadedFiles((prev) => prev.filter((file) => file.id !== fileId));
  };

  const openFilePreview = (file) => {
    window.open(file.url, "_blank");
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div
        ref={modalRef}
        className="bg-white rounded-3xl shadow-2xl max-w-7xl w-full mx-4 max-h-[90vh] overflow-hidden relative flex flex-col"
      >
        {/* Sticky Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-6 z-10 p-3 bg-white/90 hover:bg-white rounded-lg shadow-lg transition-all duration-200 hover:scale-105"
          title="Close modal"
        >
          <X className="w-4 h-4 text-gray-600" />
        </button>

        {/* Modal Header */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white px-6 py-4 flex-shrink-0">
          <div className="flex items-center space-x-4">
            <div className="p-3 bg-white/20 rounded-xl">
              <Plus className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-xl font-bold">Create New Project</h2>
              <p className="text-primary-100 text-md">
                Set up a comprehensive project with all necessary details
              </p>
            </div>
          </div>
        </div>

        {/* Modal Content - Scrollable */}
        <div className="flex-1 overflow-y-auto">
          <div className="p-4">
            <form
              id="create-project-form"
              onSubmit={handleSubmit}
              className="space-y-8"
            >
              {/* Section 1: Project Information */}
              <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
                <div className="flex items-center mb-4">
                  <div className="w-8 h-8 bg-primary-500 rounded-lg flex items-center justify-center mr-3">
                    <Plus className="w-5 h-5 text-white" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-800">
                    Project Information
                  </h3>
                </div>

                <div className="space-y-4">
                  {/* First Row: Project Name, Client Name, Project Status */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {/* Project Name */}
                    <div className="md:col-span-1">
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
                          if (startDateInputRef.current) {
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
                          if (endDateInputRef.current) {
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
                      />
                    </div>
                  </div>

                  {/* Description */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Description
                    </label>
                    <div className="border border-gray-300 rounded-lg overflow-hidden">
                      <SimpleQuillEditor
                        value={formData.description}
                        onChange={(content) =>
                          setFormData((prev) => ({
                            ...prev,
                            description: content,
                          }))
                        }
                        placeholder="Enter project description"
                        height="200px"
                      />
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
                    />
                  </div>
                </div>
              </div>

              {/* Section 3: Files and Documents */}
              <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
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
              form="create-project-form"
              className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white hover:from-blue-700 hover:to-indigo-700 font-semibold py-3 px-8 rounded-xl transition-all duration-200 flex items-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl transform hover:scale-105"
              disabled={loading}
            >
              {loading ? (
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
              ) : (
                <>
                  <Save className="w-5 h-5" />
                  <span>Create Project</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CreateProjectModal;
