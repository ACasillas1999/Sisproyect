module.exports = {
  apps: [{
    name: 'sisproyect-api',
    script: './index.js',
    cwd: '/home/ubuntu/Sisproyect/server',
    instances: 2,
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    },
    error_file: '/home/ubuntu/logs/api-error.log',
    out_file: '/home/ubuntu/logs/api-out.log',
    time: true,
    max_memory_restart: '500M',
    autorestart: true,
    watch: false
  }]
};
