require('dotenv').config();

const API = process.env.API_BASE || 'http://localhost:3000/api/v1';

async function main() {
  const loginRes = await fetch(`${API}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: process.env.TEST_ADMIN_EMAIL || 'admin@retailims.com',
      password: process.env.TEST_ADMIN_PASSWORD || 'Admin@123',
    }),
  });
  const loginBody = await loginRes.json();
  if (!loginRes.ok) {
    console.log('login failed', loginRes.status, JSON.stringify(loginBody));
    return;
  }
  const token = loginBody.data?.accessToken ?? loginBody.accessToken;

  const patchRes = await fetch(`${API}/auth/profile`, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ name: 'Testing (Admin)' }),
  });
  const patchBody = await patchRes.text();
  console.log('PATCH profile', patchRes.status, patchBody);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
