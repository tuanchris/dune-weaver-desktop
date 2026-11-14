// Desktop stand-in for expo-secure-store, which has no web backend. Nothing is
// kept, so the desktop app always reads as signed out of duneweaver.com (the
// Pattern Hub is hidden there). Only the members src/lib/hubAuth.ts uses.
export const AFTER_FIRST_UNLOCK = 0

export async function getItemAsync(_key: string, _options?: unknown): Promise<string | null> {
  return null
}

export async function setItemAsync(_key: string, _value: string, _options?: unknown): Promise<void> {}

export async function deleteItemAsync(_key: string, _options?: unknown): Promise<void> {}
