export interface SavedKey {
  id: string;
  name: string;
  secret: string;
  fingerprint: string;
  createdAt: number;
}

export interface KeyQrPayload {
  v: 1;
  name: string;
  secret: string;
}
