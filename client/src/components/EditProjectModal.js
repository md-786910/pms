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
  Key,
  UserPlus,
  UserMinus,
  Info,
  FileText,
  Shield,
  Globe,
  Server,
  Database,
  FileCode,
  HardDrive,
  ChevronDown,
  ChevronUp,
  Copy,
  Check,
  EyeOff,
  Plus,
  ExternalLink,
  Folder,
} from "lucide-react";
import { getFileIcon, getFileIconColor } from "../utils/fileIcons";
import { useProject } from "../contexts/ProjectContext";
import { useNotification } from "../contexts/NotificationContext";
import { useUser } from "../contexts/UserContext";
import { useSocket } from "../contexts/SocketContext";
import { projectAPI, activityAPI, categoryAPI } from "../utils/api";
import SimpleQuillEditor from "./SimpleQuillEditor";
import Avatar from "./Avatar";
import ConfirmationModal from "./ConfirmationModal";

const EditProjectModal = ({ project, onClose }) => {
  const { updateProject } = useProject();
  const { showToast } = useNotification();
  const { user } = useUser();
  const { socket, joinProject, leaveProject } = useSocket();
  const isAdmin = user?.role === "admin";
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

  // Tab state
  const [activeTab, setActiveTab] = useState("info"); // "info" or "credentials"

  // Credentials state
  const [credentials, setCredentials] = useState([]);
  const [credentialAccess, setCredentialAccess] = useState([]);
  const [newCredential, setNewCredential] = useState({ label: "", value: "" });
  const [credentialLoading, setCredentialLoading] = useState(false);
  const [savingCredentialKey, setSavingCredentialKey] = useState(null); // Track which specific credential is being saved
  const [expandedCategories, setExpandedCategories] = useState({});
  const [copiedField, setCopiedField] = useState(null);
  const [visiblePasswords, setVisiblePasswords] = useState({});
  const [localValues, setLocalValues] = useState({}); // Local state for input values to prevent reset on save/delete
  const [newCmsField, setNewCmsField] = useState({ label: "", value: "" }); // CMS custom field state
  const [showCmsCustomField, setShowCmsCustomField] = useState(false); // Toggle CMS custom field form

  // Description notes state
  const [descriptions, setDescriptions] = useState([]);
  const [newDescription, setNewDescription] = useState("");
  const [editingDescriptionId, setEditingDescriptionId] = useState(null);
  const [editingDescriptionContent, setEditingDescriptionContent] =
    useState("");
  const [descriptionLoading, setDescriptionLoading] = useState(false);

  // Categories state
  const [categories, setCategories] = useState([]);

  // Credential categories and templates
  const credentialCategories = {
    domain: {
      name: "Domain & Project",
      icon: Globe,
      color: "blue",
      fields: [
        { label: "Project URL", key: "project_url" },
        { label: "Domain", key: "domain" },
        { label: "Domain Username", key: "domain_username" },
        { label: "Domain Password", key: "domain_password", isPassword: true },
      ],
    },
    hosting: {
      name: "Hosting",
      icon: Server,
      color: "green",
      fields: [
        { label: "Hosting Provider", key: "hosting" },
        { label: "Hosting Username", key: "hosting_username" },
        {
          label: "Hosting Password",
          key: "hosting_password",
          isPassword: true,
        },
      ],
    },
    cms: {
      name: "CMS",
      icon: FileCode,
      color: "purple",
      fields: [
        { label: "CMS URL", key: "cms_url" },
        { label: "CMS Username", key: "cms_username" },
        { label: "CMS Password", key: "cms_password", isPassword: true },
      ],
    },
    database: {
      name: "Database",
      icon: Database,
      color: "orange",
      fields: [
        { label: "Database URL", key: "database_url" },
        { label: "Database Name", key: "database_name" },
        {
          label: "Database Password",
          key: "database_password",
          isPassword: true,
        },
      ],
    },
    ftp: {
      name: "FTP",
      icon: HardDrive,
      color: "cyan",
      fields: [
        { label: "FTP Hostname", key: "ftp_hostname" },
        { label: "FTP Username", key: "ftp_username" },
        { label: "FTP Password", key: "ftp_password", isPassword: true },
      ],
    },
    ssl: {
      name: "SSL",
      icon: Shield,
      color: "emerald",
      fields: [{ label: "SSL Certificate", key: "ssl" }],
    },
    other: {
      name: "Other Credentials",
      icon: Key,
      color: "gray",
      fields: [],
    },
  };

  // Categorize credentials
  const categorizeCredentials = () => {
    const categorized = {};

    Object.keys(credentialCategories).forEach((key) => {
      categorized[key] = [];
    });

    credentials.forEach((cred) => {
      const labelLower = cred.label.toLowerCase();
      let matched = false;

      for (const [catKey, cat] of Object.entries(credentialCategories)) {
        if (catKey === "other") continue;

        // Check if label starts with category name (e.g., "CMS Custom Field" -> cms category)
        if (
          labelLower.startsWith(catKey + " ") ||
          labelLower.startsWith(cat.name.toLowerCase() + " ")
        ) {
          categorized[catKey].push(cred);
          matched = true;
          break;
        }

        for (const field of cat.fields) {
          if (
            labelLower.includes(field.key.replace(/_/g, " ")) ||
            labelLower.includes(field.label.toLowerCase()) ||
            field.label.toLowerCase().includes(labelLower)
          ) {
            categorized[catKey].push(cred);
            matched = true;
            break;
          }
        }
        if (matched) break;
      }

      if (!matched) {
        categorized.other.push(cred);
      }
    });

    return categorized;
  };

  // Copy to clipboard
  const handleCopy = async (text, fieldId) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedField(fieldId);
      setTimeout(() => setCopiedField(null), 2000);
    } catch (err) {
      showToast("Failed to copy", "error");
    }
  };

  // Toggle password visibility
  const togglePasswordVisibility = (fieldId) => {
    setVisiblePasswords((prev) => ({
      ...prev,
      [fieldId]: !prev[fieldId],
    }));
  };

  // Toggle category expansion
  const toggleCategory = (catKey) => {
    setExpandedCategories((prev) => ({
      ...prev,
      [catKey]: !prev[catKey],
    }));
  };

  // Get color classes - distinct professional colors for each category
  const getColorClasses = (color) => {
    const colors = {
      blue: {
        bg: "bg-blue-100",
        icon: "bg-gradient-to-br from-blue-500 to-blue-600",
        text: "text-blue-700",
        border: "border-blue-200",
      },
      green: {
        bg: "bg-emerald-100",
        icon: "bg-gradient-to-br from-emerald-500 to-emerald-600",
        text: "text-emerald-700",
        border: "border-emerald-200",
      },
      purple: {
        bg: "bg-violet-100",
        icon: "bg-gradient-to-br from-violet-500 to-violet-600",
        text: "text-violet-700",
        border: "border-violet-200",
      },
      orange: {
        bg: "bg-amber-100",
        icon: "bg-gradient-to-br from-amber-500 to-orange-500",
        text: "text-amber-700",
        border: "border-amber-200",
      },
      cyan: {
        bg: "bg-cyan-100",
        icon: "bg-gradient-to-br from-cyan-500 to-teal-500",
        text: "text-cyan-700",
        border: "border-cyan-200",
      },
      emerald: {
        bg: "bg-teal-100",
        icon: "bg-gradient-to-br from-teal-500 to-green-500",
        text: "text-teal-700",
        border: "border-teal-200",
      },
      gray: {
        bg: "bg-slate-100",
        icon: "bg-gradient-to-br from-slate-500 to-slate-600",
        text: "text-slate-700",
        border: "border-slate-200",
      },
    };
    return colors[color] || colors.gray;
  };

  // Confirmation modal state
  const [confirmModal, setConfirmModal] = useState({
    isOpen: false,
    type: "danger",
    title: "",
    message: "",
    onConfirm: null,
    confirmText: "Confirm",
  });

  const [formData, setFormData] = useState({
    name: "",
    description: "",
    clientName: "",
    projectStatus: "new",
    projectType: "",
    category: "",
    startDate: "",
    endDate: "",
    liveSiteUrl: "",
    demoSiteUrls: [""],
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

  // Fetch categories
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const response = await categoryAPI.getCategories();
        setCategories(response.data || []);
      } catch (error) {
        console.error("Error fetching categories:", error);
      }
    };
    fetchCategories();
  }, []);

  useEffect(() => {
    if (project) {
      // Handle backward compatibility: convert old single demoSiteUrl to array
      let demoSiteUrls = [""];
      if (project.demoSiteUrls && Array.isArray(project.demoSiteUrls)) {
        // If array exists but is empty, use one empty string; otherwise use the array
        demoSiteUrls =
          project.demoSiteUrls.length > 0 ? project.demoSiteUrls : [""];
      } else if (project.demoSiteUrl) {
        // Backward compatibility: convert old single URL to array
        demoSiteUrls = [project.demoSiteUrl];
      }

      setFormData({
        name: project.name || "",
        description: project.description || "",
        clientName: project.clientName || "",
        projectStatus: project.projectStatus || "new",
        projectType: project.projectType || "maintenance",
        category: project.category?._id || project.category || "",
        startDate: formatDate(project.startDate),
        endDate: formatDate(project.endDate),
        liveSiteUrl: project.liveSiteUrl || "",
        demoSiteUrls: demoSiteUrls,
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

      // Set credentials from project
      if (project.credentials) {
        setCredentials(project.credentials);
        // Initialize local values from credentials
        const initialValues = {};
        project.credentials.forEach((cred) => {
          initialValues[cred.label.toLowerCase()] = cred.value || "";
        });
        setLocalValues(initialValues);
      }
      // Set credential access list
      if (project.credentialAccess) {
        setCredentialAccess(project.credentialAccess);
      }
      // Set descriptions from project
      if (project.descriptions) {
        setDescriptions(project.descriptions);
      }
    }
  }, [project]);

  // Join project room for real-time updates
  useEffect(() => {
    if (project?._id) {
      joinProject(project._id);
    }

    // Leave project room on unmount or project change
    return () => {
      if (project?._id) {
        leaveProject(project._id);
      }
    };
  }, [project?._id, joinProject, leaveProject]);

  // Handle click outside to close modal
  useEffect(() => {
    const handleClickOutside = (event) => {
      // Don't close if confirmation modal is open
      if (confirmModal.isOpen) {
        return;
      }
      if (modalRef.current && !modalRef.current.contains(event.target)) {
        onClose();
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [onClose, confirmModal.isOpen]);

  // Fetch activities when component mounts
  useEffect(() => {
    fetchActivities();
  }, [project]);

  // Listen for real-time credential access events
  useEffect(() => {
    if (!socket || !project?._id) return;

    // Handle credential access granted (for the specific user)
    const handleCredentialAccessGranted = (data) => {
      if (data.projectId === project._id) {
        // Update credentials and access list
        if (data.project?.credentials) {
          setCredentials(data.project.credentials);
        }
        if (data.project?.credentialAccess) {
          setCredentialAccess(data.project.credentialAccess);
        }
        showToast("You have been granted credential access", "success");
      }
    };

    // Handle credential access revoked (for the specific user)
    const handleCredentialAccessRevoked = (data) => {
      if (data.projectId === project._id) {
        // Clear credentials and switch to info tab
        setCredentials([]);
        setCredentialAccess([]);
        setActiveTab("info");
        showToast("Your credential access has been revoked", "warning");
      }
    };

    // Handle project-wide credential access updates (for all viewers)
    const handleProjectCredentialAccessUpdated = (data) => {
      if (data.projectId === project._id) {
        // Update credential access list for all viewers
        if (data.credentialAccess) {
          setCredentialAccess(data.credentialAccess);
        }

        // Show toast notification to admins and other viewers
        const actionText =
          data.action === "granted" ? "granted to" : "revoked from";
        showToast(
          `Credential access ${actionText} ${data.memberName}`,
          data.action === "granted" ? "info" : "warning"
        );
      }
    };

    socket.on("credential-access-granted", handleCredentialAccessGranted);
    socket.on("credential-access-revoked", handleCredentialAccessRevoked);
    socket.on(
      "project-credential-access-updated",
      handleProjectCredentialAccessUpdated
    );

    return () => {
      socket.off("credential-access-granted", handleCredentialAccessGranted);
      socket.off("credential-access-revoked", handleCredentialAccessRevoked);
      socket.off(
        "project-credential-access-updated",
        handleProjectCredentialAccessUpdated
      );
    };
  }, [socket, project?._id, showToast]);

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
        // Filter out empty demo site URLs before sending
        demoSiteUrls: formData.demoSiteUrls.filter((url) => url.trim() !== ""),
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

  // Handlers for demo site URLs array
  const addDemoSiteUrl = () => {
    setFormData((prev) => ({
      ...prev,
      demoSiteUrls: [...prev.demoSiteUrls, ""],
    }));
  };

  const removeDemoSiteUrl = (index) => {
    setFormData((prev) => ({
      ...prev,
      demoSiteUrls: prev.demoSiteUrls.filter((_, i) => i !== index),
    }));
  };

  const handleDemoSiteUrlChange = (index, value) => {
    setFormData((prev) => ({
      ...prev,
      demoSiteUrls: prev.demoSiteUrls.map((url, i) =>
        i === index ? value : url
      ),
    }));
  };

  // File upload handlers (same as CreateProjectModal)
  const handleFileUpload = async (files) => {
    const fileArray = Array.from(files);
    const validFiles = fileArray.filter((file) => {
      const maxSize = 25 * 1024 * 1024; // 25MB
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
          `File ${file.name} is too large. Maximum size is 25MB.`,
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

  // Credentials Handlers
  const handleAddCredential = async (credentialData = null) => {
    const dataToAdd = credentialData || newCredential;

    if (!dataToAdd.label?.trim()) {
      showToast("Label is required", "error");
      return;
    }

    const credKey = dataToAdd.label.toLowerCase();
    setSavingCredentialKey(credKey);
    try {
      const response = await projectAPI.addCredential(project._id, dataToAdd);
      if (response.data.success) {
        setCredentials(response.data.project.credentials);
        setCredentialAccess(response.data.project.credentialAccess || []);
        // Update localValues with the new credential
        setLocalValues((prev) => ({
          ...prev,
          [credKey]: dataToAdd.value || "",
        }));
        setNewCredential({ label: "", value: "" });
        showToast("Credential added successfully", "success");
      }
    } catch (error) {
      console.error("Add credential error:", error);
      showToast(
        error.response?.data?.message || "Failed to add credential",
        "error"
      );
    } finally {
      setSavingCredentialKey(null);
    }
  };

  const handleUpdateCredential = async (credentialId, updates) => {
    const credKey = updates.label?.toLowerCase();
    setSavingCredentialKey(credKey);
    try {
      const response = await projectAPI.updateCredential(
        project._id,
        credentialId,
        updates
      );
      if (response.data.success) {
        setCredentials(response.data.project.credentials);
        showToast("Credential updated successfully", "success");
      }
    } catch (error) {
      console.error("Update credential error:", error);
      showToast(
        error.response?.data?.message || "Failed to update credential",
        "error"
      );
    } finally {
      setSavingCredentialKey(null);
    }
  };

  const handleDeleteCredential = (credentialId) => {
    const credential = credentials.find((c) => c._id === credentialId);
    setConfirmModal({
      isOpen: true,
      type: "danger",
      title: "Delete Credential",
      message: `Are you sure you want to delete the credential "${
        credential?.label || "this credential"
      }"? This action cannot be undone.`,
      confirmText: "Delete",
      onConfirm: async () => {
        setCredentialLoading(true);
        try {
          const response = await projectAPI.deleteCredential(
            project._id,
            credentialId
          );
          if (response.data.success) {
            setCredentials(response.data.project.credentials);
            // Remove deleted credential from localValues
            if (credential?.label) {
              setLocalValues((prev) => {
                const newValues = { ...prev };
                delete newValues[credential.label.toLowerCase()];
                return newValues;
              });
            }
            showToast("Credential deleted successfully", "success");
          }
        } catch (error) {
          console.error("Delete credential error:", error);
          showToast(
            error.response?.data?.message || "Failed to delete credential",
            "error"
          );
        } finally {
          setCredentialLoading(false);
          setConfirmModal((prev) => ({ ...prev, isOpen: false }));
        }
      },
    });
  };

  // Credential Access Handlers
  const handleGrantAccess = async (memberId) => {
    setCredentialLoading(true);
    try {
      const response = await projectAPI.grantCredentialAccess(
        project._id,
        memberId
      );
      if (response.data.success) {
        setCredentialAccess(response.data.project.credentialAccess);
        showToast(response.data.message, "success");
      }
    } catch (error) {
      console.error("Grant access error:", error);
      showToast(
        error.response?.data?.message || "Failed to grant access",
        "error"
      );
    } finally {
      setCredentialLoading(false);
    }
  };

  const handleRevokeAccess = (memberId) => {
    // Find user details for the confirmation message
    const userDetails = getCredentialAccessUserDetails(
      credentialAccess.find((ca) => (ca.user?._id || ca.user) === memberId)
    );

    setConfirmModal({
      isOpen: true,
      type: "danger",
      title: "Revoke Credential Access",
      message: `Are you sure you want to revoke credential access for "${
        userDetails?.name || "this member"
      }"? They will no longer be able to view project credentials.`,
      confirmText: "Revoke Access",
      onConfirm: async () => {
        setCredentialLoading(true);
        try {
          const response = await projectAPI.revokeCredentialAccess(
            project._id,
            memberId
          );
          if (response.data.success) {
            setCredentialAccess(response.data.project.credentialAccess);
            showToast(response.data.message, "success");
          }
        } catch (error) {
          console.error("Revoke access error:", error);
          showToast(
            error.response?.data?.message || "Failed to revoke access",
            "error"
          );
        } finally {
          setCredentialLoading(false);
          setConfirmModal((prev) => ({ ...prev, isOpen: false }));
        }
      },
    });
  };

  // Helper to close confirmation modal
  const closeConfirmModal = () => {
    if (!credentialLoading) {
      setConfirmModal((prev) => ({ ...prev, isOpen: false }));
    }
  };

  // Description Handlers
  const handleAddDescription = async () => {
    if (!newDescription.trim()) {
      showToast("Description content is required", "error");
      return;
    }

    setDescriptionLoading(true);
    try {
      const response = await projectAPI.addDescription(project._id, {
        content: newDescription,
      });
      if (response.data.success) {
        setDescriptions(response.data.project.descriptions);
        setNewDescription("");
        showToast("Description added successfully", "success");
      }
    } catch (error) {
      console.error("Add description error:", error);
      showToast(
        error.response?.data?.message || "Failed to add description",
        "error"
      );
    } finally {
      setDescriptionLoading(false);
    }
  };

  const handleUpdateDescription = async (descriptionId) => {
    if (!editingDescriptionContent.trim()) {
      showToast("Description content is required", "error");
      return;
    }

    setDescriptionLoading(true);
    try {
      const response = await projectAPI.updateDescription(
        project._id,
        descriptionId,
        { content: editingDescriptionContent }
      );
      if (response.data.success) {
        setDescriptions(response.data.project.descriptions);
        setEditingDescriptionId(null);
        setEditingDescriptionContent("");
        showToast("Description updated successfully", "success");
      }
    } catch (error) {
      console.error("Update description error:", error);
      showToast(
        error.response?.data?.message || "Failed to update description",
        "error"
      );
    } finally {
      setDescriptionLoading(false);
    }
  };

  const handleDeleteDescription = (descriptionId) => {
    setConfirmModal({
      isOpen: true,
      type: "danger",
      title: "Delete Description",
      message:
        "Are you sure you want to delete this description? This action cannot be undone.",
      confirmText: "Delete",
      onConfirm: async () => {
        setDescriptionLoading(true);
        try {
          const response = await projectAPI.deleteDescription(
            project._id,
            descriptionId
          );
          if (response.data.success) {
            setDescriptions(response.data.project.descriptions);
            showToast("Description deleted successfully", "success");
          }
        } catch (error) {
          console.error("Delete description error:", error);
          showToast(
            error.response?.data?.message || "Failed to delete description",
            "error"
          );
        } finally {
          setDescriptionLoading(false);
          setConfirmModal((prev) => ({ ...prev, isOpen: false }));
        }
      },
    });
  };

  const startEditingDescription = (desc) => {
    setEditingDescriptionId(desc._id);
    setEditingDescriptionContent(desc.content);
  };

  const cancelEditingDescription = () => {
    setEditingDescriptionId(null);
    setEditingDescriptionContent("");
  };

  // Helper function to get user details from credentialAccess
  // The user might be populated (object) or just an ID (string)
  const getCredentialAccessUserDetails = (access) => {
    if (!access) return { name: "Unknown User", email: "", color: "#6B7280" };

    // If user is already populated with details
    if (access.user && typeof access.user === "object" && access.user.name) {
      return access.user;
    }

    // Get user ID (could be object with _id or just string)
    const userId = access.user?._id || access.user;
    const userIdStr = userId?.toString ? userId.toString() : userId;

    // Look up user from project members
    const member = project?.members?.find((m) => {
      if (!m.user) return false;
      const memberId = m.user._id?.toString
        ? m.user._id.toString()
        : m.user._id;
      return memberId === userIdStr;
    });

    if (member?.user) {
      return member.user;
    }

    return { _id: userId, name: "Unknown User", email: "", color: "#6B7280" };
  };

  // Check if current user has credential access
  const hasCredentialAccess =
    isAdmin ||
    credentialAccess.some(
      (ca) => ca.user && (ca.user._id === user?._id || ca.user === user?._id)
    );

  // Get members without credential access (for granting)
  const membersWithoutAccess =
    project?.members?.filter(
      (member) =>
        member.user &&
        member.user.role !== "admin" &&
        !credentialAccess.some((ca) => {
          const caUserId = ca.user?._id || ca.user;
          return (
            caUserId &&
            (caUserId === member.user._id ||
              caUserId?.toString() === member.user._id?.toString())
          );
        })
    ) || [];

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
          {isAdmin && activeTab === "info" && (
            <button
              className="absolute top-6 right-20 z-10 px-4 py-2 bg-primary-500 hover:bg-primary-400 text-white font-semibold text-base transition-colors duration-200 rounded-md flex items-center justify-center gap-2"
              title="Edit mode"
              onClick={() => setEditMode(!editMode)}
            >
              <>
                {editMode ? (
                  <>
                    <Pencil className="w-4 h-4" />
                    <span>Edit mode</span>
                  </>
                ) : (
                  "Cancel edit"
                )}
              </>
            </button>
          )}
        </div>

        {/* Modal Header */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white p-4 flex-shrink-0">
          <div className="flex items-center space-x-4">
            <div className="p-3 bg-white/20 rounded-xl">
              <Save className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-xl font-bold">Project Details</h2>
              <p className="text-primary-100 text-md">
                Manage project information and credentials
              </p>
            </div>
          </div>
        </div>

        {/* Tabs Navigation */}
        <div className="flex border-b border-gray-200 bg-white flex-shrink-0">
          <button
            type="button"
            onClick={() => setActiveTab("info")}
            className={`flex items-center gap-2 px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === "info"
                ? "border-blue-600 text-blue-600"
                : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
            }`}
          >
            <Info className="w-4 h-4" />
            Project Information
          </button>
          {(isAdmin || hasCredentialAccess) && (
            <button
              type="button"
              onClick={() => setActiveTab("credentials")}
              className={`flex items-center gap-2 px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === "credentials"
                  ? "border-blue-600 text-blue-600"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              }`}
            >
              <Key className="w-4 h-4" />
              Credentials
              {isAdmin && (
                <span className="ml-1 px-1.5 py-0.5 text-xs bg-blue-100 text-blue-700 rounded">
                  {credentials.length}
                </span>
              )}
            </button>
          )}
          <button
            type="button"
            onClick={() => setActiveTab("descriptions")}
            className={`flex items-center gap-2 px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === "descriptions"
                ? "border-blue-600 text-blue-600"
                : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
            }`}
          >
            <FileText className="w-4 h-4" />
            Notes
            <span className="ml-1 px-1.5 py-0.5 text-xs bg-purple-100 text-purple-700 rounded">
              {descriptions.length}
            </span>
          </button>
        </div>

        {/* Modal Content - Scrollable */}
        <div className="flex-1 overflow-y-auto">
          <div className="p-4">
            {/* PROJECT INFORMATION TAB */}
            {activeTab === "info" && (
              <>
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
                            Project Status{" "}
                            <span className="text-red-500">*</span>
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
                            // onClick={() => {
                            //   if (!editMode && startDateInputRef.current) {
                            //     // Try to show the native date picker
                            //     if (startDateInputRef.current.showPicker) {
                            //       try {
                            //         startDateInputRef.current.showPicker();
                            //       } catch (error) {
                            //         // Fallback: just focus the input
                            //         startDateInputRef.current.focus();
                            //       }
                            //     } else {
                            //       // Fallback: focus the input which should open the picker
                            //       startDateInputRef.current.focus();
                            //     }
                            //   }
                            // }}
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
                            // onClick={() => {
                            //   if (!editMode && endDateInputRef.current) {
                            //     // Try to show the native date picker
                            //     if (endDateInputRef.current.showPicker) {
                            //       try {
                            //         endDateInputRef.current.showPicker();
                            //       } catch (error) {
                            //         // Fallback: just focus the input
                            //         endDateInputRef.current.focus();
                            //       }
                            //     } else {
                            //       // Fallback: focus the input which should open the picker
                            //       endDateInputRef.current.focus();
                            //     }
                            //   }
                            // }}
                            className="w-full h-12 px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 cursor-pointer"
                            disabled={editMode}
                          />
                        </div>
                      </div>

                      {/* Category */}
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                          Category
                        </label>
                        <div className="relative">
                          <Folder className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                          <select
                            name="category"
                            value={formData.category}
                            onChange={handleChange}
                            className="w-full h-12 pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 appearance-none bg-white"
                            disabled={editMode}
                          >
                            <option value="">No Category</option>
                            {categories.map((cat) => (
                              <option key={cat._id} value={cat._id}>
                                {cat.name}
                              </option>
                            ))}
                          </select>
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
                      <div className="relative">
                        <div className="flex items-center justify-between mb-2">
                          <label className="block text-sm font-semibold text-gray-700">
                            Demo Site URL
                          </label>
                        </div>
                        <div className="space-y-2">
                          {formData.demoSiteUrls.map((url, index) => (
                            <div
                              key={index}
                              className="flex items-center gap-2"
                            >
                              <input
                                type="url"
                                value={url}
                                onChange={(e) =>
                                  handleDemoSiteUrlChange(index, e.target.value)
                                }
                                className="flex-1 h-12 px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                                placeholder="https://demo.example.com"
                                disabled={editMode}
                              />
                              {!editMode &&
                                formData.demoSiteUrls.length > 1 && (
                                  <button
                                    type="button"
                                    onClick={() => removeDemoSiteUrl(index)}
                                    className="p-3 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg transition-all duration-200"
                                    title="Remove this URL"
                                  >
                                    <Trash2 className="w-5 h-5" />
                                  </button>
                                )}
                            </div>
                          ))}
                        </div>
                        <div className="absolute right-3 top-[38px]">
                          {!editMode && (
                            <button
                              type="button"
                              onClick={addDemoSiteUrl}
                              className="p-1.5 bg-green-500 hover:bg-green-600 text-white rounded-lg transition-all duration-200 hover:scale-105"
                              title="Add demo site URL"
                            >
                              <Plus className="w-4 h-4" />
                            </button>
                          )}
                        </div>
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
                      cursor: editMode && isAdmin ? "not-allowed" : "default",
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
                    {isAdmin && (
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
                          Supports images, PDFs, documents (max 25MB each)
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
                    )}

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
              </>
            )}

            {/* CREDENTIALS TAB */}
            {activeTab === "credentials" &&
              (isAdmin || hasCredentialAccess) && (
                <div className="space-y-5">
                  {/* Access Notice for Members */}
                  {!isAdmin && (
                    <div className="flex items-center gap-2 px-3 py-2 bg-slate-50 rounded-lg">
                      <Shield className="w-4 h-4 text-slate-500" />
                      <p className="text-xs text-slate-600">
                        You have view access to credentials
                      </p>
                    </div>
                  )}

                  {/* Admin: Credentials Form */}
                  {isAdmin && (
                    <div className="space-y-8">
                      {Object.entries(credentialCategories)
                        .filter(([key]) => key !== "other")
                        .map(([catKey, category]) => {
                          const IconComponent = category.icon;
                          const colors = getColorClasses(category.color);

                          return (
                            <div key={catKey}>
                              {/* Section Header */}
                              <div className="flex items-center gap-2 mb-4">
                                <div
                                  className={`w-8 h-8 ${colors.icon} rounded-lg flex items-center justify-center`}
                                >
                                  <IconComponent className="w-4 h-4 text-white" />
                                </div>
                                <h4 className="text-base font-semibold text-slate-800">
                                  {category.name}
                                </h4>
                              </div>

                              {/* Fields Grid */}
                              <div className="space-y-3">
                                {category.fields.map((field) => {
                                  const existingCred = credentials.find(
                                    (c) =>
                                      c.label.toLowerCase() ===
                                      field.label.toLowerCase()
                                  );
                                  const inputId = `cred-${field.key}`;

                                  return (
                                    <div
                                      key={field.key}
                                      className="grid grid-cols-[160px_1fr] gap-3 items-center group"
                                    >
                                      <label
                                        htmlFor={inputId}
                                        className="text-sm font-medium text-slate-600"
                                      >
                                        {field.label}
                                      </label>
                                      <div className="flex items-center gap-2">
                                        {(() => {
                                          const fieldKey =
                                            field.label.toLowerCase();
                                          const isSaving =
                                            savingCredentialKey === fieldKey;
                                          const isPasswordVisible =
                                            visiblePasswords[fieldKey];
                                          return (
                                            <>
                                              <div className="relative flex-1">
                                                <input
                                                  type={
                                                    field.isPassword &&
                                                    !isPasswordVisible
                                                      ? "password"
                                                      : "text"
                                                  }
                                                  id={inputId}
                                                  value={
                                                    localValues[fieldKey] ?? ""
                                                  }
                                                  onChange={(e) =>
                                                    setLocalValues((prev) => ({
                                                      ...prev,
                                                      [fieldKey]:
                                                        e.target.value,
                                                    }))
                                                  }
                                                  placeholder="Enter value..."
                                                  className={`w-full h-10 px-3 ${
                                                    field.isPassword
                                                      ? "pr-10"
                                                      : ""
                                                  } text-sm font-semibold bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent placeholder:text-slate-400`}
                                                  disabled={isSaving}
                                                />
                                                {field.isPassword && (
                                                  <button
                                                    type="button"
                                                    onClick={() =>
                                                      togglePasswordVisibility(
                                                        fieldKey
                                                      )
                                                    }
                                                    className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600 transition-colors"
                                                    title={
                                                      isPasswordVisible
                                                        ? "Hide"
                                                        : "Show"
                                                    }
                                                  >
                                                    {isPasswordVisible ? (
                                                      <EyeOff className="w-4 h-4" />
                                                    ) : (
                                                      <Eye className="w-4 h-4" />
                                                    )}
                                                  </button>
                                                )}
                                              </div>
                                              <div className="flex items-center">
                                                <button
                                                  type="button"
                                                  onClick={() => {
                                                    const value =
                                                      localValues[fieldKey] ??
                                                      "";
                                                    if (existingCred) {
                                                      handleUpdateCredential(
                                                        existingCred._id,
                                                        {
                                                          label: field.label,
                                                          value,
                                                        }
                                                      );
                                                    } else if (value.trim()) {
                                                      handleAddCredential({
                                                        label: field.label,
                                                        value,
                                                      });
                                                    }
                                                  }}
                                                  disabled={isSaving}
                                                  className="h-10 px-4 text-sm font-medium bg-slate-100 text-slate-600 hover:bg-blue-600 hover:text-white rounded-lg transition-all duration-200 disabled:opacity-50 whitespace-nowrap"
                                                >
                                                  {isSaving ? "..." : "Save"}
                                                </button>
                                                {existingCred && (
                                                  <button
                                                    type="button"
                                                    onClick={() =>
                                                      handleDeleteCredential(
                                                        existingCred._id
                                                      )
                                                    }
                                                    disabled={credentialLoading}
                                                    className="h-10 flex items-center justify-center text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all duration-200 w-0 opacity-0 group-hover:w-10 group-hover:opacity-100 group-hover:ml-2 overflow-hidden"
                                                    title="Delete"
                                                  >
                                                    <Trash2 className="w-4 h-4 flex-shrink-0" />
                                                  </button>
                                                )}
                                              </div>
                                            </>
                                          );
                                        })()}
                                      </div>
                                    </div>
                                  );
                                })}

                                {/* CMS Only: Display Custom CMS Fields */}
                                {catKey === "cms" &&
                                  (() => {
                                    const customCmsCredentials =
                                      categorizeCredentials().cms?.filter(
                                        (cred) =>
                                          !category.fields.some(
                                            (f) =>
                                              f.label.toLowerCase() ===
                                              cred.label.toLowerCase()
                                          )
                                      ) || [];

                                    return customCmsCredentials.map((cred) => {
                                      const credKey = cred.label.toLowerCase();
                                      const isSaving =
                                        savingCredentialKey === credKey;
                                      return (
                                        <div
                                          key={cred._id}
                                          className="grid grid-cols-[160px_1fr] gap-3 items-center group"
                                        >
                                          <label className="text-sm font-medium text-slate-600">
                                            {cred.label}
                                          </label>
                                          <div className="flex items-center gap-2">
                                            <input
                                              type="text"
                                              value={localValues[credKey] ?? ""}
                                              onChange={(e) =>
                                                setLocalValues((prev) => ({
                                                  ...prev,
                                                  [credKey]: e.target.value,
                                                }))
                                              }
                                              placeholder="Enter value..."
                                              className="flex-1 h-10 px-3 text-sm font-semibold bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent placeholder:text-slate-400"
                                              disabled={isSaving}
                                            />
                                            <div className="flex items-center">
                                              <button
                                                type="button"
                                                onClick={() => {
                                                  const value =
                                                    localValues[credKey] ?? "";
                                                  handleUpdateCredential(
                                                    cred._id,
                                                    {
                                                      label: cred.label,
                                                      value,
                                                    }
                                                  );
                                                }}
                                                disabled={isSaving}
                                                className="h-10 px-4 text-sm font-medium bg-slate-100 text-slate-600 hover:bg-blue-600 hover:text-white rounded-lg transition-all duration-200 disabled:opacity-50 whitespace-nowrap"
                                              >
                                                {isSaving ? "..." : "Save"}
                                              </button>
                                              <button
                                                type="button"
                                                onClick={() =>
                                                  handleDeleteCredential(
                                                    cred._id
                                                  )
                                                }
                                                disabled={credentialLoading}
                                                className="h-10 flex items-center justify-center text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all duration-200 w-0 opacity-0 group-hover:w-10 group-hover:opacity-100 group-hover:ml-2 overflow-hidden"
                                                title="Delete"
                                              >
                                                <Trash2 className="w-4 h-4 flex-shrink-0" />
                                              </button>
                                            </div>
                                          </div>
                                        </div>
                                      );
                                    });
                                  })()}
                              </div>

                              {/* CMS Only: Add Custom Field */}
                              {catKey === "cms" && (
                                <div className="mt-4 pt-4 border-t border-slate-100">
                                  {!showCmsCustomField ? (
                                    <button
                                      type="button"
                                      onClick={() =>
                                        setShowCmsCustomField(true)
                                      }
                                      className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-purple-600 hover:text-purple-700 hover:bg-purple-50 rounded-lg transition-colors"
                                    >
                                      <Plus className="w-4 h-4" />
                                      Add Custom CMS Field
                                    </button>
                                  ) : (
                                    <div className="space-y-3">
                                      <div className="grid grid-cols-[160px_1fr] gap-3 items-center">
                                        <input
                                          type="text"
                                          value={newCmsField.label}
                                          onChange={(e) =>
                                            setNewCmsField((prev) => ({
                                              ...prev,
                                              label: e.target.value,
                                            }))
                                          }
                                          placeholder="Field label..."
                                          className="h-10 px-3 text-sm bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent placeholder:text-slate-400"
                                        />
                                        <input
                                          type="text"
                                          value={newCmsField.value}
                                          onChange={(e) =>
                                            setNewCmsField((prev) => ({
                                              ...prev,
                                              value: e.target.value,
                                            }))
                                          }
                                          placeholder="Field value..."
                                          className="h-10 px-3 text-sm font-semibold bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent placeholder:text-slate-400"
                                        />
                                      </div>
                                      <div className="flex items-center gap-2">
                                        <button
                                          type="button"
                                          onClick={() => {
                                            if (
                                              newCmsField.label.trim() &&
                                              newCmsField.value.trim()
                                            ) {
                                              handleAddCredential({
                                                label: `CMS ${newCmsField.label}`,
                                                value: newCmsField.value,
                                              });
                                              setNewCmsField({
                                                label: "",
                                                value: "",
                                              });
                                              setShowCmsCustomField(false);
                                            }
                                          }}
                                          disabled={
                                            !newCmsField.label.trim() ||
                                            !newCmsField.value.trim()
                                          }
                                          className="px-4 py-2 text-sm font-medium bg-purple-600 text-white hover:bg-purple-700 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                        >
                                          Add Field
                                        </button>
                                        <button
                                          type="button"
                                          onClick={() => {
                                            setNewCmsField({
                                              label: "",
                                              value: "",
                                            });
                                            setShowCmsCustomField(false);
                                          }}
                                          className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                                        >
                                          Cancel
                                        </button>
                                      </div>
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          );
                        })}

                      {/* Other / Custom Credentials */}
                      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                        {/* Card Header */}
                        <div className="flex items-center gap-3 px-4 py-3 bg-slate-50 border-b border-slate-200">
                          <div className="w-8 h-8 bg-gradient-to-br from-slate-500 to-slate-600 rounded-lg flex items-center justify-center shadow-sm">
                            <Key className="w-4 h-4 text-white" />
                          </div>
                          <h4 className="text-sm font-semibold text-slate-700">
                            Other Credentials
                          </h4>
                          <span className="ml-auto text-xs text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
                            {categorizeCredentials().other?.length || 0}
                          </span>
                        </div>

                        {/* Card Body */}
                        <div className="p-4 space-y-3">
                          {/* Saved Other Credentials */}
                          {categorizeCredentials().other?.map((cred) => {
                            const credKey = cred.label.toLowerCase();
                            const isSaving = savingCredentialKey === credKey;
                            return (
                              <div
                                key={cred._id}
                                className="grid grid-cols-[160px_1fr] gap-3 items-center group"
                              >
                                <span className="text-sm font-medium text-slate-600">
                                  {cred.label}
                                </span>
                                <div className="flex items-center gap-2">
                                  <input
                                    type="text"
                                    id={`cred-other-${cred._id}`}
                                    value={localValues[credKey] ?? ""}
                                    onChange={(e) =>
                                      setLocalValues((prev) => ({
                                        ...prev,
                                        [credKey]: e.target.value,
                                      }))
                                    }
                                    placeholder="Enter value..."
                                    className="flex-1 h-10 px-3 text-sm font-semibold bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent placeholder:text-slate-400"
                                    disabled={isSaving}
                                  />
                                  <div className="flex items-center">
                                    <button
                                      type="button"
                                      onClick={() => {
                                        const value =
                                          localValues[credKey] ?? "";
                                        handleUpdateCredential(cred._id, {
                                          label: cred.label,
                                          value,
                                        });
                                      }}
                                      disabled={isSaving}
                                      className="h-10 px-4 text-sm font-medium bg-slate-100 text-slate-600 hover:bg-blue-600 hover:text-white rounded-lg transition-all duration-200 disabled:opacity-50 whitespace-nowrap"
                                    >
                                      {isSaving ? "..." : "Save"}
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() =>
                                        handleDeleteCredential(cred._id)
                                      }
                                      disabled={credentialLoading}
                                      className="h-10 flex items-center justify-center text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all duration-200 w-0 opacity-0 group-hover:w-10 group-hover:opacity-100 group-hover:ml-2 overflow-hidden"
                                      title="Delete"
                                    >
                                      <Trash2 className="w-4 h-4 flex-shrink-0" />
                                    </button>
                                  </div>
                                </div>
                              </div>
                            );
                          })}

                          {/* Add New Custom Credential */}
                          {(() => {
                            const isAddingSaving =
                              savingCredentialKey ===
                              newCredential.label?.toLowerCase();
                            return (
                              <div
                                className={`grid grid-cols-[160px_1fr] gap-3 items-center ${
                                  categorizeCredentials().other?.length > 0
                                    ? "pt-3 border-t border-slate-100"
                                    : ""
                                }`}
                              >
                                <input
                                  type="text"
                                  placeholder="Label"
                                  value={newCredential.label}
                                  onChange={(e) =>
                                    setNewCredential((prev) => ({
                                      ...prev,
                                      label: e.target.value,
                                    }))
                                  }
                                  className="h-10 px-3 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent placeholder:text-slate-400"
                                  disabled={isAddingSaving}
                                />
                                <div className="flex items-center gap-2">
                                  <input
                                    type="text"
                                    placeholder="Value"
                                    value={newCredential.value}
                                    onChange={(e) =>
                                      setNewCredential((prev) => ({
                                        ...prev,
                                        value: e.target.value,
                                      }))
                                    }
                                    className="flex-1 h-10 px-3 text-sm font-semibold bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent placeholder:text-slate-400"
                                    disabled={isAddingSaving}
                                  />
                                  <button
                                    type="button"
                                    onClick={() => handleAddCredential()}
                                    disabled={
                                      isAddingSaving ||
                                      !newCredential.label.trim()
                                    }
                                    className="h-10 px-4 text-sm font-medium bg-slate-600 text-white hover:bg-slate-700 rounded-lg transition-colors disabled:opacity-40 whitespace-nowrap"
                                  >
                                    {isAddingSaving ? "..." : "+ Add"}
                                  </button>
                                </div>
                              </div>
                            );
                          })()}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Credentials Display - For Members (Read-only view) */}
                  {!isAdmin && credentials.length > 0 && (
                    <div className="space-y-4">
                      {Object.entries(categorizeCredentials()).map(
                        ([catKey, catCredentials]) => {
                          if (catCredentials.length === 0) return null;
                          const category = credentialCategories[catKey];
                          const IconComponent = category.icon;
                          const colors = getColorClasses(category.color);
                          const isExpanded =
                            expandedCategories[catKey] !== false;

                          return (
                            <div
                              key={catKey}
                              className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm"
                            >
                              {/* Category Header */}
                              <button
                                type="button"
                                onClick={() => toggleCategory(catKey)}
                                className="w-full flex items-center justify-between px-4 py-3 bg-slate-50 hover:bg-slate-100 transition-colors"
                              >
                                <div className="flex items-center gap-3">
                                  <div
                                    className={`w-8 h-8 ${colors.icon} rounded-lg flex items-center justify-center shadow-sm`}
                                  >
                                    <IconComponent className="w-4 h-4 text-white" />
                                  </div>
                                  <span className="text-sm font-semibold text-slate-700">
                                    {category.name}
                                  </span>
                                  <span
                                    className={`text-xs ${colors.text} ${colors.bg} px-2 py-0.5 rounded-full font-medium`}
                                  >
                                    {catCredentials.length}
                                  </span>
                                </div>
                                {isExpanded ? (
                                  <ChevronUp className="w-5 h-5 text-slate-400" />
                                ) : (
                                  <ChevronDown className="w-5 h-5 text-slate-400" />
                                )}
                              </button>

                              {/* Credentials Table */}
                              {isExpanded && (
                                <div className="divide-y divide-slate-100">
                                  {catCredentials.map((credential) => {
                                    const isPassword = credential.label
                                      .toLowerCase()
                                      .includes("password");
                                    const isVisible =
                                      visiblePasswords[credential._id];
                                    const isCopied =
                                      copiedField === credential._id;

                                    return (
                                      // View Mode for Members
                                      <div
                                        key={credential._id}
                                        className="flex items-center px-4 py-3 hover:bg-slate-50 transition-colors group"
                                      >
                                        <div className="w-40 flex-shrink-0">
                                          <span className="text-sm font-medium text-slate-600">
                                            {credential.label}
                                          </span>
                                        </div>
                                        <div className="flex-1 min-w-0">
                                          <span className="text-sm font-semibold text-slate-800">
                                            {credential.value ? (
                                              isPassword && !isVisible ? (
                                                <span className="text-slate-400">
                                                  ••••••••••••
                                                </span>
                                              ) : (
                                                credential.value
                                              )
                                            ) : (
                                              <span className="text-slate-300 italic">
                                                Not set
                                              </span>
                                            )}
                                          </span>
                                        </div>
                                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                          {isPassword && credential.value && (
                                            <button
                                              type="button"
                                              onClick={() =>
                                                togglePasswordVisibility(
                                                  credential._id
                                                )
                                              }
                                              className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                                              title={
                                                isVisible ? "Hide" : "Show"
                                              }
                                            >
                                              {isVisible ? (
                                                <EyeOff className="w-4 h-4" />
                                              ) : (
                                                <Eye className="w-4 h-4" />
                                              )}
                                            </button>
                                          )}
                                          {credential.value && (
                                            <button
                                              type="button"
                                              onClick={() =>
                                                handleCopy(
                                                  credential.value,
                                                  credential._id
                                                )
                                              }
                                              className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                                              title="Copy"
                                            >
                                              {isCopied ? (
                                                <Check className="w-4 h-4 text-green-500" />
                                              ) : (
                                                <Copy className="w-4 h-4" />
                                              )}
                                            </button>
                                          )}
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              )}
                            </div>
                          );
                        }
                      )}
                    </div>
                  )}

                  {/* Empty State for Members */}
                  {!isAdmin && credentials.length === 0 && (
                    <div className="flex flex-col items-center justify-center py-12 text-slate-400">
                      <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center mb-4">
                        <Key className="w-8 h-8 text-slate-300" />
                      </div>
                      <p className="text-sm font-medium text-slate-500">
                        No credentials available
                      </p>
                    </div>
                  )}

                  {/* Admin: Access Control */}
                  {isAdmin && (
                    <div className="bg-slate-50 rounded-xl p-5">
                      <div className="flex items-center justify-between mb-5">
                        <h3 className="text-sm font-semibold text-slate-700">
                          Access Control
                        </h3>
                        <span className="text-xs text-slate-500">
                          {credentialAccess.length} of{" "}
                          {credentialAccess.length +
                            membersWithoutAccess.length}{" "}
                          members
                        </span>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Members with Access */}
                        <div className="bg-white rounded-lg border border-slate-200 p-4">
                          <div className="flex items-center gap-2 mb-3 pb-3 border-b border-slate-100">
                            <div className="w-6 h-6 bg-emerald-100 rounded-full flex items-center justify-center">
                              <Check className="w-3.5 h-3.5 text-emerald-600" />
                            </div>
                            <h4 className="text-xs font-semibold text-slate-600">
                              Has Access
                            </h4>
                            <span className="ml-auto text-xs font-medium text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
                              {credentialAccess.length}
                            </span>
                          </div>
                          {credentialAccess.length > 0 ? (
                            <div className="space-y-2 max-h-48 overflow-y-auto">
                              {credentialAccess.map((access) => {
                                const userDetails =
                                  getCredentialAccessUserDetails(access);
                                const userId = access.user?._id || access.user;
                                return (
                                  <div
                                    key={userId}
                                    className="flex items-center justify-between p-2 rounded-lg group hover:bg-slate-50 transition-colors"
                                  >
                                    <div className="flex items-center gap-3 min-w-0">
                                      <Avatar user={userDetails} size="sm" />
                                      <span className="text-sm text-slate-700 truncate">
                                        {userDetails.name}
                                      </span>
                                    </div>
                                    <button
                                      type="button"
                                      onClick={() => handleRevokeAccess(userId)}
                                      disabled={credentialLoading}
                                      className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-md opacity-0 group-hover:opacity-100 transition-all"
                                      title="Revoke access"
                                    >
                                      <UserMinus className="w-4 h-4" />
                                    </button>
                                  </div>
                                );
                              })}
                            </div>
                          ) : (
                            <div className="flex flex-col items-center justify-center py-6 text-slate-400">
                              <User className="w-8 h-8 text-slate-200 mb-2" />
                              <p className="text-xs">No members have access</p>
                            </div>
                          )}
                        </div>

                        {/* Grant Access */}
                        <div className="bg-white rounded-lg border border-slate-200 p-4">
                          <div className="flex items-center gap-2 mb-3 pb-3 border-b border-slate-100">
                            <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center">
                              <UserPlus className="w-3.5 h-3.5 text-blue-600" />
                            </div>
                            <h4 className="text-xs font-semibold text-slate-600">
                              Available Members
                            </h4>
                            <span className="ml-auto text-xs font-medium text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">
                              {membersWithoutAccess.length}
                            </span>
                          </div>
                          {membersWithoutAccess.length > 0 ? (
                            <div className="space-y-2 max-h-48 overflow-y-auto">
                              {membersWithoutAccess.map((member) => (
                                <div
                                  key={member.user._id}
                                  className="flex items-center justify-between p-2 rounded-lg group hover:bg-slate-50 transition-colors"
                                >
                                  <div className="flex items-center gap-3 min-w-0">
                                    <Avatar user={member.user} size="sm" />
                                    <span className="text-sm text-slate-700 truncate">
                                      {member.user.name}
                                    </span>
                                  </div>
                                  <button
                                    type="button"
                                    onClick={() =>
                                      handleGrantAccess(member.user._id)
                                    }
                                    disabled={credentialLoading}
                                    className="p-1.5 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-md opacity-0 group-hover:opacity-100 transition-all"
                                    title="Grant access"
                                  >
                                    <UserPlus className="w-4 h-4" />
                                  </button>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <div className="flex flex-col items-center justify-center py-6 text-slate-400">
                              <Check className="w-8 h-8 text-emerald-200 mb-2" />
                              <p className="text-xs">All members have access</p>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

            {/* DESCRIPTIONS TAB */}
            {activeTab === "descriptions" && (
              <div className="space-y-6">
                {/* Add New Description - Admin Only */}
                {isAdmin && (
                  <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
                    <div className="flex items-center gap-3 px-4 py-3 bg-gradient-to-r from-purple-50 to-indigo-50 border-b border-slate-200">
                      <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-lg flex items-center justify-center shadow-sm">
                        <FileText className="w-4 h-4 text-white" />
                      </div>
                      <h4 className="text-sm font-semibold text-slate-700">
                        Add New Note
                      </h4>
                    </div>
                    <div className="p-4">
                      <div className="border border-slate-200 rounded-lg overflow-hidden bg-white shadow-sm">
                        <SimpleQuillEditor
                          value={newDescription}
                          onChange={(content) => setNewDescription(content)}
                          placeholder="Write your note here..."
                          height="200px"
                          readOnly={descriptionLoading}
                        />
                      </div>
                      <div className="flex justify-end mt-4">
                        <button
                          type="button"
                          onClick={handleAddDescription}
                          disabled={
                            descriptionLoading ||
                            !newDescription.trim() ||
                            newDescription === "<p><br></p>"
                          }
                          className="px-5 py-2.5 text-sm font-medium bg-gradient-to-r from-purple-600 to-indigo-600 text-white hover:from-purple-700 hover:to-indigo-700 rounded-lg transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed shadow-sm hover:shadow-md flex items-center gap-2"
                        >
                          {descriptionLoading ? (
                            <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                          ) : (
                            <Save className="w-4 h-4" />
                          )}
                          Save Note
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Saved Descriptions List */}
                {descriptions.length > 0 ? (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-semibold text-slate-600">
                        Saved Notes
                        <span className="ml-2 px-2 py-0.5 text-xs bg-purple-100 text-purple-700 rounded-full">
                          {descriptions.length}
                        </span>
                      </h3>
                    </div>
                    {[...descriptions]
                      .sort(
                        (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
                      )
                      .map((desc, index) => (
                        <div
                          key={desc._id}
                          className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm hover:shadow-md transition-shadow group"
                        >
                          {/* Card Header */}
                          <div className="flex items-center justify-between px-4 py-3 bg-slate-50 border-b border-slate-100">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-lg flex items-center justify-center text-white text-xs font-bold shadow-sm">
                                {descriptions.length - index}
                              </div>
                              <div>
                                <p className="text-xs text-slate-500">
                                  {desc.createdBy?.name || "Unknown"} •{" "}
                                  {desc.createdAt
                                    ? new Date(
                                        desc.createdAt
                                      ).toLocaleDateString("en-US", {
                                        month: "short",
                                        day: "numeric",
                                        year: "numeric",
                                        hour: "2-digit",
                                        minute: "2-digit",
                                      })
                                    : "No date"}
                                </p>
                              </div>
                            </div>
                            {isAdmin && editingDescriptionId !== desc._id && (
                              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button
                                  type="button"
                                  onClick={() => startEditingDescription(desc)}
                                  className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                  title="Edit"
                                >
                                  <Pencil className="w-4 h-4" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() =>
                                    handleDeleteDescription(desc._id)
                                  }
                                  disabled={descriptionLoading}
                                  className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                  title="Delete"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            )}
                          </div>

                          {/* Card Body */}
                          <div className="p-4">
                            {editingDescriptionId === desc._id ? (
                              /* Edit Mode */
                              <div className="space-y-3">
                                <div className="border border-slate-200 rounded-lg overflow-hidden bg-white">
                                  <SimpleQuillEditor
                                    value={editingDescriptionContent}
                                    onChange={(content) =>
                                      setEditingDescriptionContent(content)
                                    }
                                    placeholder="Edit your note..."
                                    height="200px"
                                    readOnly={descriptionLoading}
                                  />
                                </div>
                                <div className="flex justify-end gap-2">
                                  <button
                                    type="button"
                                    onClick={cancelEditingDescription}
                                    disabled={descriptionLoading}
                                    className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors"
                                  >
                                    Cancel
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() =>
                                      handleUpdateDescription(desc._id)
                                    }
                                    disabled={
                                      descriptionLoading ||
                                      !editingDescriptionContent.trim() ||
                                      editingDescriptionContent ===
                                        "<p><br></p>"
                                    }
                                    className="px-4 py-2 text-sm font-medium bg-purple-600 text-white hover:bg-purple-700 rounded-lg transition-colors disabled:opacity-40 flex items-center gap-2"
                                  >
                                    {descriptionLoading ? (
                                      <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                                    ) : (
                                      <Check className="w-4 h-4" />
                                    )}
                                    Update
                                  </button>
                                </div>
                              </div>
                            ) : (
                              /* View Mode */
                              <div
                                className="prose prose-sm prose-slate max-w-none text-slate-700 leading-relaxed [&>p]:my-2 [&>ul]:my-2 [&>ol]:my-2 [&>h1]:text-xl [&>h2]:text-lg [&>h3]:text-base [&>h4]:text-sm [&>h5]:text-xs"
                                dangerouslySetInnerHTML={{
                                  __html: desc.content,
                                }}
                              />
                            )}
                          </div>

                          {/* Card Footer - Updated info */}
                          {desc.updatedAt &&
                            desc.updatedAt !== desc.createdAt && (
                              <div className="px-4 py-2 bg-slate-50 border-t border-slate-100">
                                <p className="text-xs text-slate-400 italic">
                                  Last updated:{" "}
                                  {new Date(desc.updatedAt).toLocaleDateString(
                                    "en-US",
                                    {
                                      month: "short",
                                      day: "numeric",
                                      year: "numeric",
                                      hour: "2-digit",
                                      minute: "2-digit",
                                    }
                                  )}
                                </p>
                              </div>
                            )}
                        </div>
                      ))}
                  </div>
                ) : (
                  /* Empty State */
                  <div className="flex flex-col items-center justify-center py-16 text-slate-400">
                    <div className="w-20 h-20 bg-gradient-to-br from-purple-100 to-indigo-100 rounded-2xl flex items-center justify-center mb-4">
                      <FileText className="w-10 h-10 text-purple-300" />
                    </div>
                    <p className="text-base font-medium text-slate-500 mb-1">
                      No notes yet
                    </p>
                    <p className="text-sm text-slate-400">
                      {isAdmin
                        ? "Add your first note above"
                        : "No notes have been added to this project"}
                    </p>
                  </div>
                )}
              </div>
            )}
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
              {activeTab === "info" && isAdmin ? "Cancel" : "Close"}
            </button>
            {activeTab === "info" && isAdmin && (
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
            )}
          </div>
        </div>
      </div>

      {/* Confirmation Modal */}
      <ConfirmationModal
        isOpen={confirmModal.isOpen}
        onClose={closeConfirmModal}
        onConfirm={confirmModal.onConfirm}
        title={confirmModal.title}
        message={confirmModal.message}
        confirmText={confirmModal.confirmText}
        type={confirmModal.type}
        isLoading={credentialLoading}
      />
    </div>
  );
};

export default EditProjectModal;
