// Installers: macOS DMG (arm64) and Windows NSIS (x64), both buildable from
// macOS. Versioned like the bundled mobile app (see app.config.js); the
// "0.0.0" in package.json is only there because electron-builder requires one.
const { execFileSync } = require('node:child_process')
const crypto = require('node:crypto')
const fs = require('node:fs')
const path = require('node:path')
const mobile = require('../dune-weaver-mobile/app.json').expo

const appId = 'com.duneweaver.desktop'

// macOS Local Network privacy tells programs apart by the main executable's
// Mach-O UUID (Apple TN3179). Electron's stock binary has the same UUID in every
// app on that Electron version, dev Electron.app included, so give ours its own.
// It's derived from appId so it stays the same across builds. Runs before signing.
// The patch breaks the binary's own ad-hoc signature, and Apple Silicon kills
// unsigned code, so re-sign it ad hoc. Developer ID signing then replaces that.
function ownUuid({ electronPlatformName, appOutDir, packager }) {
  if (electronPlatformName !== 'darwin') return
  const name = packager.appInfo.productFilename
  const exe = path.join(appOutDir, `${name}.app`, 'Contents', 'MacOS', name)
  const bin = fs.readFileSync(exe)
  if (bin.readUInt32LE(0) !== 0xfeedfacf) throw new Error(`${exe}: not a thin 64-bit Mach-O`)
  for (let i = 0, off = 32; i < bin.readUInt32LE(16); i++, off += bin.readUInt32LE(off + 4)) {
    if (bin.readUInt32LE(off) !== 0x1b) continue // LC_UUID: cmd, cmdsize, uuid[16]
    crypto.createHash('sha256').update(appId).digest().copy(bin, off + 8, 0, 16)
    fs.writeFileSync(exe, bin)
    execFileSync('codesign', ['--force', '--sign', '-', exe])
    return
  }
  throw new Error(`${exe}: no LC_UUID`)
}

module.exports = {
  appId,
  afterPack: ownUuid,
  productName: 'Dune Weaver',
  // package.json "main" belongs to Expo.
  extraMetadata: { main: 'electron/main.js', version: mobile.version },
  files: ['electron/**', 'dist/**'],
  directories: { output: 'release' },
  // No spaces: GitHub turns them into dots in release asset names.
  artifactName: 'Dune-Weaver-${version}-${os}-${arch}.${ext}',
  // The mobile app's icon (Windows uses it as is).
  icon: `../dune-weaver-mobile/${mobile.icon}`,
  mac: {
    target: [{ target: 'dmg', arch: ['arm64'] }],
    // macOS doesn't mask icons; this one has the shape baked in (scripts/mac-icon.py).
    icon: 'build/icon-mac.png',
    category: 'public.app-category.lifestyle',
    extendInfo: { NSLocalNetworkUsageDescription: 'Dune Weaver finds and controls your sand table on the local network.' },
  },
  win: { target: [{ target: 'nsis', arch: ['x64'] }] },
}
