require("dotenv").config();

module.exports = {
  // Server Configuration
  PORT: process.env.PORT || 5000,
  NODE_ENV: process.env.NODE_ENV || "development",

  // Database
  MONGODB_URI: process.env.MONGODB_URI || "mongodb://localhost:27017/pms",

  // JWT Configuration
  JWT_SECRET:
    process.env.JWT_SECRET ||
    "your-super-secret-jwt-key-change-this-in-production",
  JWT_EXPIRE: process.env.JWT_EXPIRE || "7d",
  JWT_REFRESH_EXPIRE: process.env.JWT_REFRESH_EXPIRE || "30d",

  // Email Configuration
  EMAIL_FROM: process.env.EMAIL_FROM || "mdashifreza7869101@gmail.com",
  EMAIL_PASSWORD: process.env.EMAIL_PASSWORD || "737uydyus@1",

  // Client URL
  CLIENT_URL: process.env.CLIENT_URL || "http://localhost:3000",

  // File Upload
  MAX_FILE_SIZE: parseInt(process.env.MAX_FILE_SIZE) || 26214400, // 25MB
  UPLOAD_PATH: process.env.UPLOAD_PATH || "./uploads",
};
