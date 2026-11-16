// Desktop stand-in for expo-secure-store (no web backend): Electron's
// safeStorage through the preload bridge (electron/main.js). Only the members
// src/lib/hubAuth.ts uses.
import { dw } from './bridge'

export const AFTER_FIRST_UNLOCK = 0
export type SecureStoreOptions = { keychainAccessible?: number }

export function getItemAsync(key: string, _options?: SecureStoreOptions): Promise<string | null> {
  return dw.secureGet(key)
}

export function setItemAsync(key: string, value: string, _options?: SecureStoreOptions): Promise<void> {
  return dw.secureSet(key, value)
}

export function deleteItemAsync(key: string, _options?: SecureStoreOptions): Promise<void> {
  return dw.secureDelete(key)
}
