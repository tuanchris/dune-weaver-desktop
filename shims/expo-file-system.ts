// Desktop stand-in for expo-file-system's File / Directory / Paths: the real
// module has no web backend (every call just warns). Backed by Node fs through
// the preload bridge. Uris look like app://data/… (documents), app://cache/…,
// or app://bundle/… (the web export, where expo-asset puts the bundled .thr
// patterns). Only the members the mobile app uses are implemented.
import { dw } from './bridge'

// expo-document-picker / expo-image-picker hand back blob: urls on web.
// Remember the File behind each so sync calls (copy, exists, size) can reach
// it on disk.
const picked = new Map<string, File>()
const DomFile = globalThis.File
const createObjectURL = URL.createObjectURL.bind(URL)
URL.createObjectURL = (obj: Blob | MediaSource): string => {
  const url = createObjectURL(obj)
  if (obj instanceof DomFile) picked.set(url, obj)
  return url
}

type UriPart = string | FsFile | FsDirectory

function joinUri(parts: UriPart[]): string {
  const [base, ...rest] = parts.map((p) => (typeof p === 'string' ? p : p.uri))
  const segments = rest.flatMap((r) => r.split('/')).filter(Boolean).map(encodeURIComponent)
  return [base.replace(/\/+$/, ''), ...segments].join('/')
}

function tryPath(uri: string): string | null {
  const file = picked.get(uri)
  return file ? dw.pathForFile(file) || null : dw.toPath(uri)
}

function pathOf(uri: string): string {
  const p = tryPath(uri)
  if (!p) throw new Error(`No local file for ${uri}`)
  return p
}

class FsFile {
  readonly uri: string

  constructor(...parts: UriPart[]) {
    this.uri = joinUri(parts)
  }

  get name(): string {
    return decodeURIComponent(this.uri.split('/').pop() ?? '')
  }

  get exists(): boolean {
    const s = dw.stat(pathOf(this.uri))
    return !!s && !s.dir
  }

  get size(): number {
    return dw.stat(pathOf(this.uri))?.size ?? 0
  }

  // Async reads fall back to fetch for anything not on disk (data: urls).
  async text(): Promise<string> {
    const p = tryPath(this.uri)
    return p ? dw.readText(p) : (await fetch(this.uri)).text()
  }

  async bytes(): Promise<Uint8Array> {
    const p = tryPath(this.uri)
    return p ? dw.read(p) : new Uint8Array(await (await fetch(this.uri)).arrayBuffer())
  }

  write(data: string | Uint8Array, options?: { encoding?: 'utf8' | 'base64' }): void {
    dw.write(pathOf(this.uri), data, options?.encoding)
  }

  delete(): void {
    dw.rm(pathOf(this.uri))
  }

  copy(dest: FsFile | FsDirectory): void {
    const target = dest instanceof FsDirectory ? new FsFile(dest, this.name) : dest
    dw.copy(pathOf(this.uri), pathOf(target.uri))
  }
}

class FsDirectory {
  readonly uri: string

  constructor(...parts: UriPart[]) {
    this.uri = `${joinUri(parts)}/`
  }

  get exists(): boolean {
    return !!dw.stat(pathOf(this.uri))?.dir
  }

  create(options?: { intermediates?: boolean }): void {
    dw.mkdir(pathOf(this.uri), !!options?.intermediates)
  }

  delete(): void {
    dw.rm(pathOf(this.uri))
  }

  list(): (FsFile | FsDirectory)[] {
    return dw.list(pathOf(this.uri)).map((e) => (e.dir ? new FsDirectory(this, e.name) : new FsFile(this, e.name)))
  }
}

export const Paths = {
  document: new FsDirectory('app://data/'),
  cache: new FsDirectory('app://cache/'),
}

export { FsFile as File, FsDirectory as Directory }
