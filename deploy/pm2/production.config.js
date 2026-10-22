// PM2 process definition for the PRODUCTION Retail IMS API.
//
// Single API instance bound to :3001. nginx routes app/api.softdigitconsulting.com
// (and the apex) to this port. Runtime env (DB retail_ims, secrets, REDIS_PORT=6379,
// WEB_ORIGIN, NODE_ENV) is loaded by the app itself from apps/api/.env;
// PORT/NODE_ENV are pinned here as belt-and-suspenders.
module.exports = {
  apps: [
    {
      name: 'retail-ims-prod',
      cwd: '/opt/Inventory-control-prod',
      script: 'apps/api/dist/main.js',
      exec_mode: 'fork',
      instances: 1,
      autorestart: true,
      max_memory_restart: '600M',
      time: true,
      env: {
        NODE_ENV: 'production',
        PORT: '3001',
      },
    },
  ],
};
