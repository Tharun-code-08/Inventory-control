// src/api/stockCount.ts
import axiosInstance from '@/lib/axios'; // Assuming existing axios instance alias

export interface CountSession {
  id: string;
  createdAt: string;
  status: 'open' | 'review' | 'posted';
}

export interface CountLineItem {
  barcode: string;
  productId: string;
  productName: string;
  expectedQty: number;
  countedQty: number;
}

export interface VarianceResult {
  productId: string;
  productName: string;
  expectedQty: number;
  countedQty: number;
  variance: number; // counted - expected
}

/**
 * Create a new stock‑count session on the backend.
 */
export const createSession = async (): Promise<CountSession> => {
  const response = await axiosInstance.post<CountSession>('/stock-count/sessions');
  return response.data;
};

/**
 * Add or update a scanned line item for a given session.
 */
export const addScannedItem = async (
  sessionId: string,
  barcode: string,
  qty: number = 1
): Promise<CountLineItem> => {
  const response = await axiosInstance.post<CountLineItem>(
    `/stock-count/sessions/${sessionId}/items`,
    { barcode, qty }
  );
  return response.data;
};

/**
 * Request the backend to calculate variance for the session.
 */
export const calculateVariance = async (
  sessionId: string
): Promise<VarianceResult[]> => {
  const response = await axiosInstance.get<VarianceResult[]>(
    `/stock-count/sessions/${sessionId}/variance`
  );
  return response.data;
};

/**
 * Post the final adjustment after the user approves the variance.
 */
export const postAdjustment = async (sessionId: string): Promise<void> => {
  await axiosInstance.post(`/stock-count/sessions/${sessionId}/post`);
};

/**
 * Fetch a list of existing sessions (for the home screen).
 */
export const listSessions = async (): Promise<CountSession[]> => {
  const response = await axiosInstance.get<CountSession[]>('/stock-count/sessions');
  return response.data;
};

/**
 * Get details of a single session, including scanned items.
 */
export const getSessionDetails = async (
  sessionId: string
): Promise<CountLineItem[]> => {
  const response = await axiosInstance.get<CountLineItem[]>(
    `/stock-count/sessions/${sessionId}/items`
  );
  return response.data;
};
