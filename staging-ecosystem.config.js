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
        DATABASE_URL: 'postgresql://retail:retail@127.0.0.1:5433/staging_retail_ims',
        REDIS_HOST: '127.0.0.1',
        REDIS_PORT: '6380',
        JWT_SECRET: 'staging-secret-32-chars-long-123456789012',
        REFRESH_SECRET: 'staging-refresh-32-chars-abcdefghijklmnop',
        COOKIE_SECRET: 'staging-cookie-32-chars-wxyzabcdefghijkl',
      },
      watch: false,
      autorestart: true,
    },
  ],
};
