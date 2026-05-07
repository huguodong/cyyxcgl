const path = require('path');

module.exports = {
  apps: [
    {
      name: process.env.PM2_APP_NAME || 'beichen',
      script: 'dist/server/index.js',
      cwd: __dirname,
      exec_mode: 'fork',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '512M',
      env: {
        NODE_ENV: 'production',
        PORT: process.env.PORT || '3002',
        DATABASE_PATH: process.env.DATABASE_PATH || path.join(__dirname, 'data', 'sampler-salary.sqlite'),
        SESSION_SECRET: process.env.SESSION_SECRET || 'change-this-session-secret',
        SESSION_COOKIE_SECURE: process.env.SESSION_COOKIE_SECURE || 'false',
        ADMIN_USERNAME: process.env.ADMIN_USERNAME || 'admin',
        ADMIN_PASSWORD: process.env.ADMIN_PASSWORD || 'admin123456',
        ADMIN_NAME: process.env.ADMIN_NAME || '系统管理员',
        APP_ID: process.env.APP_ID || 'internal-app',
        CORP_ID: process.env.CORP_ID || 'internal',
      },
    },
  ],
};
