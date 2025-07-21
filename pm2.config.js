module.exports = {
  apps: [{
    name: 'discord-voice-bot-24-7',
    script: 'index.js',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '512M',
    restart_delay: 1000,
    max_restarts: 50, // Unlimited restarts essentially
    min_uptime: '5s',
    env: {
      NODE_ENV: 'production'
    },
    error_file: './logs/err.log',
    out_file: './logs/out.log',
    log_file: './logs/combined.log',
    time: true,
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    merge_logs: true,
    // Enhanced restart strategies
    exp_backoff_restart_delay: 100, // Exponential backoff
    // Aggressive restart policy for maximum uptime
    kill_timeout: 3000,
    wait_ready: false,
    listen_timeout: 3000,
    // Auto-restart every 6 hours to prevent memory leaks
    cron_restart: '0 */6 * * *'
  }]
};