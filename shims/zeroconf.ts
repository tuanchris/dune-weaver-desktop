// react-native-zeroconf stand-in: the mDNS browse runs in the preload
// (bonjour-service on Node sockets), which hands back services in the shape the
// native module emits. Only the members src/lib/discovery.ts uses.
import { dw } from './bridge'

type Listener = (arg: unknown) => void

export default class Zeroconf {
  private listeners: Record<string, Listener[]> = {}
  private stopBrowse: (() => void) | null = null

  on(event: string, fn: Listener): void {
    ;(this.listeners[event] ??= []).push(fn)
  }

  scan(type = 'http', protocol = 'tcp'): void {
    this.stop()
    const emit = (event: string) => (arg: unknown) => this.listeners[event]?.forEach((fn) => fn(arg))
    this.stopBrowse = dw.mdnsBrowse(type, protocol, emit('resolved'), emit('remove'))
  }

  stop(): void {
    this.stopBrowse?.()
    this.stopBrowse = null
  }

  removeDeviceListeners(): void {
    this.listeners = {}
  }
}
