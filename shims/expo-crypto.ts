// Desktop stand-in for expo-crypto, on Web Crypto. Only the members
// src/lib/hubAuth.ts uses (the Pattern Hub sign-in, hidden on desktop).
export enum CryptoDigestAlgorithm {
  SHA256 = 'SHA-256',
}

export enum CryptoEncoding {
  HEX = 'hex',
  BASE64 = 'base64',
}

export async function digestStringAsync(
  algorithm: CryptoDigestAlgorithm,
  data: string,
  options: { encoding?: CryptoEncoding } = {},
): Promise<string> {
  const bytes = new Uint8Array(await crypto.subtle.digest(algorithm, new TextEncoder().encode(data)))
  return options.encoding === CryptoEncoding.BASE64
    ? btoa(String.fromCharCode(...bytes))
    : Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('')
}

export function getRandomBytes(byteCount: number): Uint8Array {
  return crypto.getRandomValues(new Uint8Array(byteCount))
}

export function randomUUID(): string {
  return crypto.randomUUID()
}
