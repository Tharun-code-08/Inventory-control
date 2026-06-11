// src/lib/barcodeGenerator.ts
import bwipjs from 'bwip-js';

/**
 * Generate a base64 PNG image for a barcode or QR code.
 * @param text The data to encode.
 * @param format Either 'code128' or 'qrcode'.
 * @returns A data URL string (e.g., "data:image/png;base64,...")
 */
export const generateBarcode = async (
  text: string,
  format: 'code128' | 'qrcode'
): Promise<string> => {
  return new Promise((resolve, reject) => {
    bwipjs.toBuffer(
      {
        bcid: format, // Barcode identifier
        text,
        scale: 3,
        height: format === 'code128' ? 10 : undefined,
        includetext: true,
        textxalign: 'center',
      },
      (err, png) => {
        if (err) {
          reject(err);
        } else {
          resolve(`data:image/png;base64,${png.toString('base64')}`);
        }
      }
    );
  });
};
