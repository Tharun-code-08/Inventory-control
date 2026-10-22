// Secrets are never committed: export STAGING_DATABASE_URL, STAGING_JWT_SECRET,
// STAGING_REFRESH_SECRET and STAGING_COOKIE_SECRET before `pm2 start`.
module.exports = {
  apps: [
    {
      name: 'staging-api',
      script: './apps/api/dist/main.js',
      cwd: '/opt/Inventory-control',
      instances: 1,
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'production',
        PORT: '3001',
        DATABASE_URL: process.env.STAGING_DATABASE_URL,
        REDIS_HOST: '127.0.0.1',
        REDIS_PORT: '6380',
        JWT_SECRET: process.env.STAGING_JWT_SECRET,
        REFRESH_SECRET: process.env.STAGING_REFRESH_SECRET,
        COOKIE_SECRET: process.env.STAGING_COOKIE_SECRET,
      },
      watch: false,
      autorestart: true,
    },
  ],
};
