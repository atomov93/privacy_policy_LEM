/** Shared input / payload size limits for DoS and UI safety. */

export const MAX_KEY_NAME_LENGTH = 64;
export const MAX_SECRET_LENGTH = 512;
export const MAX_PLAINTEXT_LENGTH = 100_000;
export const MAX_CIPHERTEXT_LENGTH = 200_000;
export const MAX_QR_PAYLOAD_LENGTH = 4_096;
export const QR_TRANSFER_TTL_MS = 5 * 60 * 1000;
export const CLIPBOARD_CLEAR_MS = 45_000;
export const QR_SCAN_DEBOUNCE_MS = 2_000;
export const MAX_DERIVATION_CACHE_ENTRIES = 8;

/** Encrypted .lme key-transfer files. */
export const LME_FILE_EXTENSION = 'lme';
export const LME_MIME_TYPE = 'application/vnd.letsmessageencrypt.lme';
export const LME_MAGIC = 'LME1';
export const LME_KDF_ITERATIONS = 200_000;
export const LME_MIN_PASSPHRASE_LENGTH = 10;
export const LME_MAX_FILE_BYTES = 64_000;
/** Default remote-transfer expiry (7 days). */
export const LME_DEFAULT_TTL_MS = 7 * 24 * 60 * 60 * 1000;
