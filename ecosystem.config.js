// PM2 Ecosystem Configuration for WhatsApp Introduction Validator Bot
module.exports = {
  apps: [{
    name: 'whatsapp-intro-bot',
    script: 'src/index.js',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    restart_delay: 5000,
    max_restarts: 10,
    min_uptime: '10s',
    env: {
      NODE_ENV: 'production',
      TZ: 'Asia/Kolkata',
      LOG_LEVEL: 'info'
    },
    env_development: {
      NODE_ENV: 'development',
      TZ: 'Asia/Kolkata',
      LOG_LEVEL: 'debug'
    },
    error_file: './logs/pm2-error.log',
    out_file: './logs/pm2-out.log',
    log_file: './logs/pm2-combined.log',
    time: true,
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    merge_logs: true,
    kill_timeout: 5000,
    listen_timeout: 10000,
    shutdown_with_message: true
  }]
};
