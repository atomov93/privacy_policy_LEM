/** Minimal Web Crypto surface used by getSecureRandomBytes. */
interface CryptoGetRandomValues {
  getRandomValues<T extends ArrayBufferView>(array: T): T;
}

declare var crypto: CryptoGetRandomValues | undefined;

interface GlobalThis {
  crypto?: CryptoGetRandomValues;
}
