import type { INestApplication } from '@nestjs/common';
import request = require('supertest');

export type Envelope<T> = { success: boolean; data: T; meta?: unknown; message?: string };

export function unwrap<T>(body: Envelope<T> | T): T {
  if (body && typeof body === 'object' && 'data' in (body as object)) {
    return (body as Envelope<T>).data;
  }
  return body as T;
}

export type AuthSession = {
  accessToken: string;
  user: { id: string; email: string; role: string; shopId?: string | null };
};

export async function login(
  app: INestApplication,
  email = process.env.SEED_ADMIN_EMAIL ?? 'admin@retailims.com',
  password = process.env.SEED_ADMIN_PASSWORD ?? 'Admin@123',
): Promise<AuthSession> {
  const res = await request(app.getHttpServer())
    .post('/api/v1/auth/login')
    .send({ email, password })
    .expect(201);
  const data = unwrap<{ accessToken: string; user: AuthSession['user'] }>(res.body);
  return { accessToken: data.accessToken, user: data.user };
}

/** Supertest agent with Bearer token applied to every request in the chain. */
export function authed(app: INestApplication, token: string) {
  return request.agent(app.getHttpServer()).set('Authorization', `Bearer ${token}`);
}

export function uniqueCode(prefix: string) {
  const stamp = Date.now().toString(36).toUpperCase();
  return `${prefix}-${stamp}`.replace(/[^A-Z0-9_-]/g, '').slice(0, 40);
}

export function todayDateString() {
  return new Date().toISOString().slice(0, 10);
}

export function tomorrowDateString() {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return d.toISOString().slice(0, 10);
}

/** Future expiry date (GR post requires expiry on every line). */
export function futureExpiryDateString(yearsAhead = 1) {
  const d = new Date();
  d.setFullYear(d.getFullYear() + yearsAhead);
  return d.toISOString().slice(0, 10);
}

/** Goods receipt line — storageLocationId and expiryDate are required before post. */
export function grLineItem(args: {
  productId: string;
  storageLocationId: string;
  quantity: number;
  purchaseRate: number;
  uom?: string;
  expiryDate?: string;
}) {
  return {
    productId: args.productId,
    storageLocationId: args.storageLocationId,
    quantity: args.quantity,
    purchaseRate: args.purchaseRate,
    uom: args.uom ?? 'PCS',
    expiryDate: args.expiryDate ?? futureExpiryDateString(),
  };
}
