const { formidable } = require("formidable");
const path = require("path");
const fs = require("fs");

// Ensure uploads directories exist
const cardsUploadDir = path.join(__dirname, "../uploads/cards");
const projectsUploadDir = path.join(__dirname, "../uploads/projects");

if (!fs.existsSync(cardsUploadDir)) {
  fs.mkdirSync(cardsUploadDir, { recursive: true });
}

if (!fs.existsSync(projectsUploadDir)) {
  fs.mkdirSync(projectsUploadDir, { recursive: true });
}

// Configure formidable options for cards
const formidableOptions = {
  uploadDir: cardsUploadDir,
  keepExtensions: true,
  maxFileSize: 10 * 1024 * 1024, // 10MB limit
  maxFields: 10,
  maxFieldsSize: 20 * 1024 * 1024, // 20MB total
  maxFiles: 5, // Maximum 5 files per upload
  filter: function ({ name, originalFilename, mimetype }) {
    // Allow images and documents
    const allowedMimeTypes = [
      // Image types
      "image/jpeg",
      "image/jpg",
      "image/png",
      "image/gif",
      "image/webp",
      "image/svg+xml",
      "image/bmp",
      "image/tiff",
      "image/tif",
      "image/ico",
      "image/x-icon",
      // Document types
      "application/pdf",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "application/vnd.ms-excel",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "application/vnd.ms-powerpoint",
      "application/vnd.openxmlformats-officedocument.presentationml.presentation",
      "text/plain",
      "text/csv",
      "application/rtf",
      "application/zip",
      "application/x-rar-compressed",
      "application/x-7z-compressed",
      "application/json",
      "application/xml",
      "text/xml",
      "application/vnd.oasis.opendocument.text",
      "application/vnd.oasis.opendocument.spreadsheet",
      "application/vnd.oasis.opendocument.presentation",
    ];

    if (!allowedMimeTypes.includes(mimetype)) {
      throw new Error(
        `File type ${mimetype} is not allowed. Only images and documents are permitted.`
      );
    }

    return true;
  },
};

// Configure formidable options for projects
const projectFormidableOptions = {
  uploadDir: projectsUploadDir,
  keepExtensions: true,
  maxFileSize: 8 * 1024 * 1024, // 8MB limit per file
  maxFields: 20,
  maxFieldsSize: 64 * 1024 * 1024, // 64MB total
  maxFiles: 8, // Maximum 8 files per upload
  filter: function ({ name, originalFilename, mimetype }) {
    // Allow images and documents
    const allowedMimeTypes = [
      // Image types
      "image/jpeg",
      "image/jpg",
      "image/png",
      "image/gif",
      "image/webp",
      "image/svg+xml",
      "image/bmp",
      "image/tiff",
      "image/tif",
      "image/ico",
      "image/x-icon",
      // Document types
      "application/pdf",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "application/vnd.ms-excel",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "application/vnd.ms-powerpoint",
      "application/vnd.openxmlformats-officedocument.presentationml.presentation",
      "text/plain",
      "text/csv",
      "application/rtf",
      "application/zip",
      "application/x-rar-compressed",
      "application/x-7z-compressed",
      "application/json",
      "application/xml",
      "text/xml",
      "application/vnd.oasis.opendocument.text",
      "application/vnd.oasis.opendocument.spreadsheet",
      "application/vnd.oasis.opendocument.presentation",
    ];

    if (!allowedMimeTypes.includes(mimetype)) {
      throw new Error(
        `File type ${mimetype} is not allowed. Only images and documents are permitted.`
      );
    }

    return true;
  },
};

// Middleware to handle file uploads
const uploadMiddleware = (req, res, next) => {
  const form = formidable(formidableOptions);

  form.parse(req, (err, fields, files) => {
    if (err) {
      console.error("Formidable parse error:", err);
      return res.status(400).json({
        success: false,
        message: err.message || "File upload failed",
      });
    }

    // Handle multiple files
    const uploadedFiles = [];
    const fileKeys = Object.keys(files);

    // Count total files
    let totalFiles = 0;
    for (const key of fileKeys) {
      const file = files[key];
      const fileArray = Array.isArray(file) ? file : [file];
      totalFiles += fileArray.filter((f) => f && f.filepath).length;
    }

    // Check file count limit
    if (totalFiles > 5) {
      return res.status(400).json({
        success: false,
        message: "Maximum 5 files can be uploaded at once",
      });
    }

    for (const key of fileKeys) {
      const file = files[key];

      // Handle single file or array of files
      const fileArray = Array.isArray(file) ? file : [file];

      for (const singleFile of fileArray) {
        if (singleFile && singleFile.filepath) {
          const fileInfo = {
            filename: path.basename(singleFile.filepath),
            originalName: singleFile.originalFilename,
            mimeType: singleFile.mimetype,
            size: singleFile.size,
            filepath: singleFile.filepath,
            url: `/uploads/cards/${path.basename(singleFile.filepath)}`,
          };
          uploadedFiles.push(fileInfo);
        }
      }
    }

    // Attach files and fields to request
    req.files = uploadedFiles;
    req.body = fields;

    next();
  });
};

// Middleware to handle single file upload
const uploadSingleMiddleware = (req, res, next) => {
  const form = formidable(formidableOptions);

  form.parse(req, (err, fields, files) => {
    if (err) {
      console.error("Formidable parse error:", err);
      return res.status(400).json({
        success: false,
        message: err.message || "File upload failed",
      });
    }

    // Get the first file
    const fileKeys = Object.keys(files);
    let uploadedFile = null;

    if (fileKeys.length > 0) {
      const file = files[fileKeys[0]];
      const singleFile = Array.isArray(file) ? file[0] : file;

      if (singleFile && singleFile.filepath) {
        uploadedFile = {
          filename: path.basename(singleFile.filepath),
          originalName: singleFile.originalFilename,
          mimeType: singleFile.mimetype,
          size: singleFile.size,
          filepath: singleFile.filepath,
          url: `/uploads/cards/${path.basename(singleFile.filepath)}`,
        };
      }
    }

    // Attach file and fields to request
    req.file = uploadedFile;
    req.body = fields;

    next();
  });
};

// Utility function to delete file
const deleteFile = (filepath) => {
  try {
    if (fs.existsSync(filepath)) {
      fs.unlinkSync(filepath);
      return true;
    }
    return false;
  } catch (error) {
    console.error("Error deleting file:", error);
    return false;
  }
};

// Middleware to handle project file uploads
const projectUploadMiddleware = (req, res, next) => {
  const form = formidable(projectFormidableOptions);

  form.parse(req, (err, fields, files) => {
    if (err) {
      console.error("Project formidable parse error:", err);
      return res.status(400).json({
        success: false,
        message: err.message || "File upload failed",
      });
    }

    // Handle multiple files
    const uploadedFiles = [];
    const fileKeys = Object.keys(files);

    // Count total files
    let totalFiles = 0;
    for (const key of fileKeys) {
      const file = files[key];
      const fileArray = Array.isArray(file) ? file : [file];
      totalFiles += fileArray.filter((f) => f && f.filepath).length;
    }

    // Check file count limit
    if (totalFiles > 8) {
      return res.status(400).json({
        success: false,
        message: "Maximum 8 files can be uploaded at once",
      });
    }

    for (const key of fileKeys) {
      const file = files[key];

      // Handle single file or array of files
      const fileArray = Array.isArray(file) ? file : [file];

      for (const singleFile of fileArray) {
        if (singleFile && singleFile.filepath) {
          const fileInfo = {
            filename: path.basename(singleFile.filepath),
            originalName: singleFile.originalFilename,
            mimeType: singleFile.mimetype,
            size: singleFile.size,
            filepath: singleFile.filepath,
            url: `/uploads/projects/${path.basename(singleFile.filepath)}`,
          };
          uploadedFiles.push(fileInfo);
        }
      }
    }

    // Attach files and fields to request
    req.files = uploadedFiles;
    req.body = fields;

    next();
  });
};

// Utility function to get file path from URL
const getFilePathFromUrl = (url) => {
  const filename = path.basename(url);
  if (url.includes("/uploads/projects/")) {
    return path.join(projectsUploadDir, filename);
  }
  return path.join(cardsUploadDir, filename);
};

// Utility function to get project file path from URL
const getProjectFilePathFromUrl = (url) => {
  const filename = path.basename(url);
  return path.join(projectsUploadDir, filename);
};

module.exports = {
  uploadMiddleware,
  uploadSingleMiddleware,
  projectUploadMiddleware,
  deleteFile,
  getFilePathFromUrl,
  getProjectFilePathFromUrl,
};
