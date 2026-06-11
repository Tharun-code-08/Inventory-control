import { toDataURL } from 'bwip-js/react-native';

/**
 * Generate a base64 PNG image for a barcode or QR code.
 * @param text The data to encode.
 * @param format Either 'code128' or 'qrcode'.
 * @returns A data URL string (e.g., "data:image/png;base64,...")
 */
export const generateBarcode = async (
  text: string,
  format: 'code128' | 'qrcode' = 'code128'
): Promise<string> => {
  const result = await toDataURL({
    bcid: format,
    text,
    scale: 3,
    height: format === 'code128' ? 10 : undefined,
    includetext: true,
    textxalign: 'center',
  });
  return result.uri;
};
