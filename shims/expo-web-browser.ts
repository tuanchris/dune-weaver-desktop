// Desktop stand-in for expo-web-browser. The sign-in page opens in the system
// browser (main.js sends window.open there), and its redirect comes back as a
// duneweaver://oauth link the OS hands to the app (shims/linking.ts), which the
// mobile app's useHubAuthLinks finishes. So this reports 'cancel' at once: in
// hubAuth.signIn a cancel keeps the pending sign-in for that link.
export async function openAuthSessionAsync(url: string, _redirectUrl?: string | null): Promise<{ type: 'cancel' }> {
  window.open(url, '_blank')
  return { type: 'cancel' }
}

export function dismissAuthSession(): void {}
