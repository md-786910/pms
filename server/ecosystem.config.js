module.exports = {
  apps: [
    {
      name: "pms-api",
      script: "./dist/server.js", // or ./src/server.js if not building
      cwd: "/home/ubuntu/pms/server",
      instances: "max", // or a number like 2
      exec_mode: "cluster",
      watch: false,
      env: {
        NODE_ENV: "production",
        PORT: "5000",
        UPLOAD_DIR: "/home/ubuntu/pms/server/uploads",
      },
    },
  ],
};
