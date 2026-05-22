require('dotenv').config();
const { PrismaClient } = require('@prisma/client');

const API = process.env.API_BASE || 'http://localhost:3000/api/v1';
const RFQ_ID = process.env.RFQ_ID || '8387ffdf-8938-484b-b847-d0593f57b987';

async function main() {
  const p = new PrismaClient();
  const admin = await p.user.findFirst({
    where: { role: { name: 'ADMIN' }, isActive: true },
    select: { email: true },
  });
  if (!admin?.email) {
    console.log('No ADMIN user in DB');
    return;
  }

  const loginRes = await fetch(`${API}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: admin.email, password: process.env.TEST_ADMIN_PASSWORD || 'Admin@123' }),
  });
  const loginBody = await loginRes.json();
  if (!loginRes.ok) {
    console.log('login failed', loginRes.status, loginBody);
    return;
  }
  const token = loginBody.data?.accessToken ?? loginBody.accessToken;
  if (!token) {
    console.log('no token', loginBody);
    return;
  }

  const delRes = await fetch(`${API}/rfqs/${RFQ_ID}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  });
  const delBody = await delRes.text();
  console.log('DELETE', delRes.status, delBody);
  await p.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
