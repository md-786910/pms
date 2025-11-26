const { formidable } = require("formidable");
const path = require("path");
const fs = require("fs");

// Ensure uploads directory exists
const uploadDir = path.join(__dirname, "../uploads/projects");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Configure formidable options
const formidableOptions = {
  uploadDir: uploadDir,
  keepExtensions: true,
  maxFileSize: 25 * 1024 * 1024, // 25MB limit
  maxFields: 10,
  maxFieldsSize: 25 * 1024 * 1024, // 25MB total
  maxFiles: 5, // Maximum 5 files per upload
  filter: function ({ name, originalFilename, mimetype }) {
    // Allow images, documents, certificates, and other common file types
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
      // Certificate and key files
      "application/x-x509-ca-cert",
      "application/x-x509-user-cert",
      "application/x-x509-server-cert",
      "application/pkix-cert",
      "application/x-pem-file",
      "application/x-pkcs12",
      "application/pkcs10",
      "application/pkcs7-mime",
      "application/x-pkcs7-certificates",
      "application/x-pkcs8",
      "application/x-private-key",
      // Text and code files
      "text/html",
      "text/css",
      "text/javascript",
      "text/x-markdown",
      "text/markdown",
      "application/javascript",
      "application/x-javascript",
      "text/x-java",
      "text/x-python",
      "text/x-shellscript",
      "application/x-sh",
      "application/x-bash",
      // Data and database files
      "application/x-sqlite3",
      "application/sql",
      "application/x-latex",
      "application/x-tex",
      // Additional archive formats
      "application/x-tar",
      "application/gzip",
      "application/x-gzip",
      "application/x-compress",
      "application/x-compressed",
      // Video files
      "video/mp4",
      "video/x-msvideo",
      "video/x-ms-wmv",
      "video/quicktime",
      "video/x-matroska",
      "video/webm",
      // Audio files
      "audio/mpeg",
      "audio/mp3",
      "audio/wav",
      "audio/x-wav",
      "audio/ogg",
      "audio/webm",
      "audio/flac",
      "audio/aac",
      // Other common types
      "application/octet-stream",
      "application/x-msdownload",
      "application/x-executable",
      "application/x-binary",
    ];

    if (!allowedMimeTypes.includes(mimetype)) {
      throw new Error(
        `File type ${mimetype} is not allowed. Supported types include images, documents, certificates, videos, audio, archives, and code files.`
      );
    }

    return true;
  },
};

// Helper function to extract meaningful error message
const getUploadErrorMessage = (err) => {
  let errorMessage = "File upload failed";

  if (err.message) {
    errorMessage = err.message;
  }

  // Handle specific formidable error codes
  if (err.code === "LIMIT_FILE_SIZE" || err.message?.includes("maxFileSize")) {
    errorMessage = "File size exceeds the maximum limit of 25MB";
  } else if (err.code === "LIMIT_FILE_COUNT" || err.message?.includes("maxFiles")) {
    errorMessage = "Maximum 5 files can be uploaded at once";
  } else if (err.message?.includes("not allowed") || err.message?.includes("File type")) {
    errorMessage = err.message;
  }

  return errorMessage;
};

// Middleware to handle file uploads
const uploadMiddleware = (req, res, next) => {
  const form = formidable(formidableOptions);

  form.parse(req, (err, fields, files) => {
    if (err) {
      console.error("Formidable parse error:", err);
      return res.status(400).json({
        success: false,
        message: getUploadErrorMessage(err),
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

// Middleware to handle single file upload
const uploadSingleMiddleware = (req, res, next) => {
  const form = formidable(formidableOptions);

  form.parse(req, (err, fields, files) => {
    if (err) {
      console.error("Formidable parse error:", err);
      return res.status(400).json({
        success: false,
        message: getUploadErrorMessage(err),
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
          url: `/uploads/projects/${path.basename(singleFile.filepath)}`,
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

// Utility function to get file path from URL
const getFilePathFromUrl = (url) => {
  const filename = path.basename(url);
  return path.join(uploadDir, filename);
};

module.exports = {
  uploadMiddleware,
  uploadSingleMiddleware,
  deleteFile,
  getFilePathFromUrl,
};
