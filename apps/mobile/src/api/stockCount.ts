import { api } from '@/api/client';
import { unwrapData } from '@/lib/envelope';

/**
 * Interfaces for Stock Count workflow
 */
export interface CountSession {
  id: string;
  createdAt: string;
  userId: string;
  status: string;
}

export interface CountLineItem {
  productId: string;
  barcode: string;
  countedQty: number;
}

export interface VarianceResult {
  productId: string;
  expectedQty: number;
  countedQty: number;
  variance: number;
}

/** List existing stock‑count sessions */
export const fetchSessions = async (): Promise<CountSession[]> => {
  const { data } = await api.get('/stock-count/sessions');
  return unwrapData<CountSession[]>(data) ?? [];
};

/** Create a new stock‑count session */
export const createSession = async (): Promise<CountSession> => {
  const { data } = await api.post('/stock-count/sessions');
  return unwrapData<CountSession>(data);
};

/** Fetch the scanned line items of a session */
export const getSessionDetails = async (sessionId: string): Promise<CountLineItem[]> => {
  const { data } = await api.get(`/stock-count/sessions/${sessionId}/items`);
  return unwrapData<CountLineItem[]>(data) ?? [];
};

/** Add a scanned item to a session */
export const addScannedItem = async (
  sessionId: string,
  barcode: string,
  qty: number = 1
): Promise<CountLineItem> => {
  const { data } = await api.post(`/stock-count/sessions/${sessionId}/items`, {
    barcode,
    qty,
  });
  return unwrapData<CountLineItem>(data);
};

/** Calculate variance for a session */
export const calculateVariance = async (sessionId: string): Promise<VarianceResult[]> => {
  const { data } = await api.get(`/stock-count/sessions/${sessionId}/variance`);
  return unwrapData<VarianceResult[]>(data) ?? [];
};

/** Post the final adjustment */
export const postAdjustment = async (sessionId: string): Promise<unknown> => {
  const { data } = await api.post(`/stock-count/sessions/${sessionId}/adjust`);
  return unwrapData(data);
};
