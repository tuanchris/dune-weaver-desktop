// Node-side half of the desktop shims: file access for shims/expo-file-system,
// native dialogs for shims/alert and shims/share, mDNS for shims/zeroconf,
// the Refresh menu command for shims/refresh-control.
// Paths come from app:// urls via resolveAppUrl, or from a picked file via
// webUtils.
const { contextBridge, ipcRenderer, webUtils } = require('electron')
const fs = require('node:fs')
const path = require('node:path')
const { Bonjour } = require('bonjour-service')
const { resolveAppUrl } = require('./paths')

const roots = JSON.parse(process.argv.find((a) => a.startsWith('--dw-roots=')).slice('--dw-roots='.length))

contextBridge.exposeInMainWorld('dw', {
  os: `${{ darwin: 'macOS', win32: 'Windows' }[process.platform] ?? process.platform} ${process.getSystemVersion()}`,
  toPath: (uri) => resolveAppUrl(roots, uri),
  pathForFile: (file) => webUtils.getPathForFile(file),
  stat: (p) => {
    const s = fs.statSync(p, { throwIfNoEntry: false })
    return s ? { dir: s.isDirectory(), size: s.size } : null
  },
  read: (p) => new Uint8Array(fs.readFileSync(p)),
  readText: (p) => fs.readFileSync(p, 'utf8'),
  write: (p, data, encoding) => {
    fs.mkdirSync(path.dirname(p), { recursive: true })
    fs.writeFileSync(p, encoding === 'base64' ? Buffer.from(data, 'base64') : data)
  },
  mkdir: (p, recursive) => fs.mkdirSync(p, { recursive }),
  rm: (p) => fs.rmSync(p, { recursive: true, force: true }),
  copy: (from, to) => fs.copyFileSync(from, to),
  list: (p) => fs.readdirSync(p, { withFileTypes: true }).map((d) => ({ name: d.name, dir: d.isDirectory() })),
  alert: (opts) => ipcRenderer.invoke('dw:alert', opts),
  save: (opts) => ipcRenderer.invoke('dw:save', opts),
  onRefresh: (fn) => {
    ipcRenderer.on('dw:refresh', () => fn())
  },
  // Services go out in react-native-zeroconf's 'resolved' shape. A socket error
  // (no network) just means nothing is found, so log it instead of throwing.
  // bonjour-service queries once; Wi-Fi drops multicast, so re-ask every 2 s
  // (already-seen services don't fire 'up' again).
  mdnsBrowse: (type, protocol, onUp, onDown) => {
    const bonjour = new Bonjour({}, (err) => console.warn('mDNS:', err.message))
    const browser = bonjour
      .find({ type, protocol })
      .on('up', (s) => onUp({ name: s.name, fullName: s.fqdn, host: s.host, port: s.port, addresses: s.addresses, txt: s.txt }))
      .on('down', (s) => onDown(s.name))
    const requery = setInterval(() => browser.update(), 2000)
    return () => {
      clearInterval(requery)
      bonjour.destroy()
    }
  },
})
