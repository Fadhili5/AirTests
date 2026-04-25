module.exports = {
  apps: [
    {
      name: "cryptovault-api",
      script: "apps/api/dist/index.js",
      cwd: "/home/elon/Desktop/bot",
      env: {
        NODE_ENV: "production"
      }
    },
    {
      name: "cryptovault-worker",
      script: "apps/api/dist/worker-process.js",
      cwd: "/home/elon/Desktop/bot",
      env: {
        NODE_ENV: "production"
      }
    }
  ]
};
