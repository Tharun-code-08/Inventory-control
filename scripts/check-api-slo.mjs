const baseUrl = process.env.RUNTIME_HEALTH_BASE_URL ?? 'http://127.0.0.1:3000/api/v1';
const iterations = Number(process.env.SLO_SAMPLE_SIZE ?? '5');
const maxP95Ms = Number(process.env.SLO_MAX_P95_MS ?? '500');

const samples = [];
for (let i = 0; i < iterations; i += 1) {
  const started = Date.now();
  const res = await fetch(`${baseUrl}/health/ready`);
  const latency = Date.now() - started;
  if (!res.ok) {
    throw new Error(`Health endpoint returned ${res.status}`);
  }
  samples.push(latency);
}

samples.sort((a, b) => a - b);
const idx = Math.min(samples.length - 1, Math.floor(samples.length * 0.95));
const p95 = samples[idx];
if (p95 > maxP95Ms) {
  throw new Error(`API p95 latency ${p95}ms exceeds threshold ${maxP95Ms}ms`);
}

console.log(`API SLO check passed. p95=${p95}ms, samples=${samples.join(',')}`);
