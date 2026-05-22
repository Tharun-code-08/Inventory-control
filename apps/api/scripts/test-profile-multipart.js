require('dotenv').config();

const API = process.env.API_BASE || 'http://localhost:3000/api/v1';

async function login() {
  const loginRes = await fetch(`${API}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: process.env.TEST_ADMIN_EMAIL || 'admin@retailims.com',
      password: process.env.TEST_ADMIN_PASSWORD || 'Admin@123',
    }),
  });
  const loginBody = await loginRes.json();
  const token = loginBody.data?.accessToken ?? loginBody.accessToken;
  if (!token) throw new Error('login failed ' + loginRes.status);
  return token;
}

async function main() {
  const token = await login();
  const form = new FormData();
  form.append('name', 'Testing multipart');

  const bad = await fetch(`${API}/auth/profile`, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'multipart/form-data',
    },
    body: form,
  });
  console.log('bad Content-Type', bad.status, await bad.text());

  const form2 = new FormData();
  form2.append('name', 'Testing multipart ok');
  const good = await fetch(`${API}/auth/profile`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${token}` },
    body: form2,
  });
  console.log('auto boundary', good.status, await good.text());
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
