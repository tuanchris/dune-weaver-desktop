// duneweaver:// links (the Pattern Hub sign-in's redirect) reach the page as
// react-native-web Linking events, which the mobile app's useHubAuthLinks reads:
// react-native-web's Linking only knows the page's own url and never fires
// 'url', so feed it from the main process (electron/main.js).
import { Linking } from 'react-native'
import { dw } from './bridge'

const linking = Linking as unknown as { getInitialURL(): Promise<string | null>; _dispatchEvent(event: string, data: unknown): void }
linking.getInitialURL = () => dw.initialUrl()
dw.onOpenUrl((url) => linking._dispatchEvent('url', { url }))
