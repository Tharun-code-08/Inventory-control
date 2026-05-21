const baseUrl = process.env.RUNTIME_HEALTH_BASE_URL ?? 'http://127.0.0.1:3000/api/v1';

async function check(path) {
  const res = await fetch(`${baseUrl}${path}`);
  if (!res.ok) {
    throw new Error(`Health check failed for ${path}: ${res.status}`);
  }
  const body = await res.json();
  if (!body?.ok) {
    throw new Error(`Health check returned non-ok payload for ${path}`);
  }
}

await check('/health');
await check('/health/ready');
console.log(`Runtime health checks passed: ${baseUrl}`);
