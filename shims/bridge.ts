/** What electron/preload.js exposes as `window.dw`. */
export interface DesktopBridge {
  /** e.g. "macOS 26.0", "Windows 10.0.26100". */
  os: string
  toPath(uri: string): string | null
  pathForFile(file: File): string
  stat(path: string): { dir: boolean; size: number } | null
  read(path: string): Uint8Array
  readText(path: string): string
  write(path: string, data: string | Uint8Array, encoding?: 'utf8' | 'base64'): void
  mkdir(path: string, recursive: boolean): void
  rm(path: string): void
  copy(from: string, to: string): void
  list(path: string): { name: string; dir: boolean }[]
  alert(opts: { title: string; message?: string; buttons: string[]; cancelId: number }): Promise<number>
  /** Save dialog, then write `text`. False if the user cancelled. */
  save(opts: { name: string; text: string }): Promise<boolean>
  /** Run `fn` on the View → Refresh menu command. */
  onRefresh(fn: () => void): void
  /** Browse mDNS until the returned stop() is called. */
  mdnsBrowse(type: string, protocol: string, onUp: (service: unknown) => void, onDown: (name: string) => void): () => void
}

export const dw = (globalThis as unknown as { dw: DesktopBridge }).dw
