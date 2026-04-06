module.exports = {
  apps: [{
    name: "classroom-backend",
    script: "server/server.js",
    instances: 1,
    exec_mode: "fork",
    max_memory_restart: "500M",
    restart_delay: 5000
  }]
};