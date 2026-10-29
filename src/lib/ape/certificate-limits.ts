/** What a medical certificate file may be. Shared by the upload field and the server check. */
export const CERTIFICATE_MAX_MB = 20;
export const CERTIFICATE_MAX_BYTES = CERTIFICATE_MAX_MB * 1024 * 1024;

export const CERTIFICATE_TYPES: Record<string, { ext: string; magic: number[] }> = {
  "application/pdf": { ext: "pdf", magic: [0x25, 0x50, 0x44, 0x46] }, // %PDF
  "image/jpeg": { ext: "jpg", magic: [0xff, 0xd8, 0xff] },
  "image/png": { ext: "png", magic: [0x89, 0x50, 0x4e, 0x47] },
};
