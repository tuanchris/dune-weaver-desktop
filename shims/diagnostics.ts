// Keeps Settings → Diagnostics accurate on desktop.
import { Platform } from 'react-native'
import { dw } from './bridge'

// react-native-web reports '0.0.0', so the report's "on web …" line couldn't
// say which OS a desktop user is on.
Object.defineProperty(Platform, 'Version', { get: () => dw.os })

// On the web, uncaught errors fire window 'error' and never reach ErrorUtils,
// so the app's crash log (useAppLog's global handler) would miss them. Forward
// them as non-fatal. The base handler only rethrows fatal errors (Metro's
// module-init guard), since rethrowing here would re-fire 'error' forever.
ErrorUtils.setGlobalHandler((error, isFatal) => {
  if (isFatal) throw error
})
window.addEventListener('error', (e) => ErrorUtils.getGlobalHandler()(e.error ?? new Error(e.message), false))
