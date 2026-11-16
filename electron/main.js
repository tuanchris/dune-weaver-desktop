const { app, BrowserWindow, dialog, ipcMain, Menu, net, protocol, safeStorage, shell } = require('electron')
const fs = require('node:fs/promises')
const path = require('node:path')
const { pathToFileURL } = require('node:url')
const { resolveAppUrl } = require('./paths')

// Launched as `electron electron/main.js` (package.json "main" belongs to Expo),
// so name the data dir explicitly instead of inheriting "Electron".
app.setPath('userData', path.join(app.getPath('appData'), 'Dune Weaver'))
// webSecurity:false below is deliberate; don't flood the console about it.
process.env.ELECTRON_DISABLE_SECURITY_WARNINGS = 'true'

// corsEnabled: app://bundle loading app://cache with crossOrigin (expo-image-
// manipulator does, for imported-pattern previews) is cross-origin, which
// Chromium refuses outright for schemes without it.
protocol.registerSchemesAsPrivileged([
  { scheme: 'app', privileges: { standard: true, secure: true, supportFetchAPI: true, stream: true, corsEnabled: true } },
])

ipcMain.handle('dw:alert', async (e, { title, message, buttons, cancelId }) => {
  const { response } = await dialog.showMessageBox(BrowserWindow.fromWebContents(e.sender), {
    message: title,
    detail: message,
    buttons,
    cancelId: cancelId >= 0 ? cancelId : undefined,
    defaultId: 0,
    noLink: true,
  })
  return response
})

ipcMain.handle('dw:save', async (e, { name, text }) => {
  const { canceled, filePath } = await dialog.showSaveDialog(BrowserWindow.fromWebContents(e.sender), {
    defaultPath: path.join(app.getPath('downloads'), name),
  })
  if (canceled || !filePath) return false
  await fs.writeFile(filePath, text)
  return true
})

// The Pattern Hub's sign-in comes back as a duneweaver://oauth link (from the
// browser, or an email link): the OS hands it to this app, which passes it to
// the page as a Linking 'url' event (shims/linking.ts), where the mobile app's
// useHubAuthLinks finishes the sign-in. macOS sends 'open-url' (also on a cold
// start, before 'ready'); Windows puts the link in argv, of this launch or of a
// second one. A link that arrives before the page asks for it waits here.
const SCHEME = 'duneweaver'
const linkIn = (argv) => argv.find((a) => a.startsWith(`${SCHEME}://`))
let pendingLink = linkIn(process.argv) ?? null
function openLink(url) {
  const [win] = BrowserWindow.getAllWindows()
  if (!win) return void (pendingLink = url)
  if (win.isMinimized()) win.restore()
  win.focus()
  win.webContents.send('dw:open-url', url)
}
app.on('open-url', (e, url) => {
  e.preventDefault()
  if (app.isReady()) openLink(url)
  else pendingLink = url
})
ipcMain.handle('dw:initial-url', () => {
  const url = pendingLink
  pendingLink = null
  return url
})
// Dev runs the stock Electron binary, which needs this script as its argument.
if (app.isPackaged) app.setAsDefaultProtocolClient(SCHEME)
else app.setAsDefaultProtocolClient(SCHEME, process.execPath, [path.resolve(process.argv[1])])

// expo-secure-store for the Pattern Hub's refresh token (shims/expo-secure-store.ts):
// Electron's safeStorage (the Keychain on macOS, DPAPI on Windows) encrypts each
// value into userData/secure.json. Without it nothing is kept: signed out.
const secureFile = () => path.join(app.getPath('userData'), 'secure.json')
async function secureRead() {
  try {
    return JSON.parse(await fs.readFile(secureFile(), 'utf8'))
  } catch {
    return {}
  }
}
ipcMain.handle('dw:secure-get', async (e, key) => {
  const v = (await secureRead())[key]
  if (!v || !safeStorage.isEncryptionAvailable()) return null
  try {
    return safeStorage.decryptString(Buffer.from(v, 'base64'))
  } catch {
    return null
  }
})
ipcMain.handle('dw:secure-set', async (e, key, value) => {
  if (!safeStorage.isEncryptionAvailable()) throw new Error('No secure storage on this computer')
  const all = await secureRead()
  all[key] = safeStorage.encryptString(value).toString('base64')
  await fs.writeFile(secureFile(), JSON.stringify(all))
})
ipcMain.handle('dw:secure-delete', async (e, key) => {
  const all = await secureRead()
  if (!(key in all)) return
  delete all[key]
  await fs.writeFile(secureFile(), JSON.stringify(all))
})

// One instance: a second would share the same storage and double-poll the
// table. DW_SMOKE runs are exempt so they work beside an open app. A second
// launch with a link (Windows) passes it on.
app.on('second-instance', (e, argv) => {
  const url = linkIn(argv)
  if (url) return openLink(url)
  const [win] = BrowserWindow.getAllWindows()
  if (win?.isMinimized()) win.restore()
  win?.focus()
})

if (!process.env.DW_SMOKE && !app.requestSingleInstanceLock()) app.quit()
else app.whenReady().then(() => {
  // Dev runs the stock Electron.app; give its Dock tile the real icon.
  if (!app.isPackaged) app.dock?.setIcon(path.join(__dirname, '..', 'build', 'icon-mac.png'))

  // The default menu, except View → Reload (which restarts the app) becomes
  // Refresh: it re-reads the lists on screen, standing in for pull-to-refresh
  // (shims/refresh-control.tsx).
  Menu.setApplicationMenu(
    Menu.buildFromTemplate([
      ...(process.platform === 'darwin' ? [{ role: 'appMenu' }] : []),
      { role: 'fileMenu' },
      { role: 'editMenu' },
      {
        label: 'View',
        submenu: [
          { label: 'Refresh', accelerator: 'CmdOrCtrl+R', click: (_, w) => w?.webContents.send('dw:refresh') },
          { role: 'forceReload' },
          { role: 'toggleDevTools' },
          { type: 'separator' },
          { role: 'resetZoom' },
          { role: 'zoomIn' },
          { role: 'zoomOut' },
          { type: 'separator' },
          { role: 'togglefullscreen' },
        ],
      },
      { role: 'windowMenu' },
    ]),
  )

  const roots = {
    bundle: path.join(__dirname, '..', 'dist'),
    data: path.join(app.getPath('userData'), 'documents'),
    cache: path.join(app.getPath('userData'), 'cache'),
  }
  protocol.handle('app', (req) => {
    const file = resolveAppUrl(roots, req.url)
    return file ? net.fetch(pathToFileURL(file).toString()) : new Response('Not found', { status: 404 })
  })

  const win = new BrowserWindow({
    width: 480,
    height: 900,
    minWidth: 360,
    minHeight: 560,
    title: 'Dune Weaver',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      additionalArguments: [`--dw-roots=${JSON.stringify(roots)}`],
      sandbox: false, // the preload needs node:fs for the expo-file-system shim
      // The table's firmware sends no CORS headers, so the page can't call it
      // under the same-origin policy. Only bundled content ever loads here
      // (navigation and popups go to the system browser below).
      webSecurity: false,
    },
  })
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (/^https?:/.test(url)) shell.openExternal(url)
    return { action: 'deny' }
  })
  win.webContents.on('will-navigate', (e, url) => {
    if (url.startsWith('app://')) return
    e.preventDefault()
    if (/^https?:/.test(url)) shell.openExternal(url)
  })
  win.webContents.on('console-message', ({ level, message }) => {
    if (level === 'error' || level === 'warning') console.log(`[renderer ${level}] ${message}`)
  })
  win.loadURL('app://bundle/index.html')

  // DW_SMOKE=http://<table-ip> → read /sand_status through fetch AND an XHR
  // carrying X-Sand-Key (the two request paths the app uses), list the tables
  // an mDNS browse finds in 5 s (the discovery path), print, quit.
  if (process.env.DW_SMOKE) {
    win.webContents.once('did-finish-load', async () => {
      const url = `${process.env.DW_SMOKE.replace(/\/$/, '')}/sand_status`
      const result = await win.webContents
        .executeJavaScript(
          `Promise.all([
            fetch(${JSON.stringify(url)}).then((r) => r.status + ' ' + r.headers.get('content-type')),
            new Promise((ok, fail) => {
              const x = new XMLHttpRequest()
              x.open('GET', ${JSON.stringify(url)})
              x.setRequestHeader('X-Sand-Key', 'smoke')
              x.onload = () => ok(x.status + ' ' + x.responseText.slice(0, 80))
              x.onerror = () => fail(new Error('xhr failed'))
              x.send()
            }),
            new Promise((ok, fail) => {
              const found = []
              const stop = dw.mdnsBrowse('http', 'tcp', (s) => s.txt?.api?.includes('sandtable') && found.push(s.name + ' ' + s.addresses), () => {})
              setTimeout(() => (stop(), found.length ? ok(found) : fail(new Error('mDNS found no tables'))), 5000)
            }),
          ])`,
        )
        .then((r) => ({ ok: true, r }), (err) => ({ ok: false, r: String(err) }))
      console.log('SMOKE', JSON.stringify(result))
      app.exit(result.ok ? 0 : 1)
    })
  }
})

app.on('window-all-closed', () => app.quit())
