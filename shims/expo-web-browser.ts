// Desktop stand-in for expo-web-browser: there's no redirect handling on
// desktop, so a sign-in window always reads as cancelled (the Pattern Hub is
// hidden there). Only the members src/lib/hubAuth.ts uses.
export async function openAuthSessionAsync(_url: string, _redirectUrl?: string | null): Promise<{ type: 'cancel' }> {
  return { type: 'cancel' }
}

export function dismissAuthSession(): void {}
