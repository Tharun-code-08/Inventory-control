import axiosInstance from '@/api/client'; // adjust path if needed

/**
 * Interfaces for Stock Count workflow
 */
export interface CountSession {
  id: string;
  createdAt: string;
  userId: string;
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

/** Create a new stock‑count session */
export const createSession = async (): Promise<CountSession> => {
  const { data } = await axiosInstance.post('/stock-count/sessions');
  return data;
};

/** Add a scanned item to a session */
export const addScannedItem = async (
  sessionId: string,
  barcode: string,
  qty: number = 1
): Promise<CountLineItem> => {
  const { data } = await axiosInstance.post(`/stock-count/sessions/${sessionId}/items`, {
    barcode,
    qty,
  });
  return data;
};

/** Calculate variance for a session */
export const calculateVariance = async (sessionId: string): Promise<VarianceResult[]> => {
  const { data } = await axiosInstance.get(`/stock-count/sessions/${sessionId}/variance`);
  return data;
};

/** Post the final adjustment */
export const postAdjustment = async (sessionId: string): Promise<any> => {
  const { data } = await axiosInstance.post(`/stock-count/sessions/${sessionId}/adjust`);
  return data;
};
