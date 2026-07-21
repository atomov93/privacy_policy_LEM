export interface SavedKey {
  id: string;
  name: string;
  secret: string;
  fingerprint: string;
  createdAt: number;
}

/** @deprecated Plaintext QR — rejected by decodeKeyQrPayload. */
export interface KeyQrPayload {
  v: 1;
  name: string;
  secret: string;
}

export interface KeyQrPayloadV2 {
  v: 2;
  salt: string;
  exp: number;
  data: string;
}
