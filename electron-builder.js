// Installers: macOS DMG (arm64) and Windows NSIS (x64), both buildable from
// macOS. Versioned like the bundled mobile app (see app.config.js); the
// "0.0.0" in package.json is only there because electron-builder requires one.
module.exports = {
  appId: 'com.duneweaver.desktop',
  productName: 'Dune Weaver',
  // package.json "main" belongs to Expo.
  extraMetadata: { main: 'electron/main.js', version: require('../dune-weaver-mobile/app.json').expo.version },
  files: ['electron/**', 'dist/**'],
  directories: { output: 'release' },
  // No spaces: GitHub turns them into dots in release asset names.
  artifactName: 'Dune-Weaver-${version}-${os}-${arch}.${ext}',
  icon: '../dune-weaver-mobile/assets/icon.png',
  mac: {
    target: [{ target: 'dmg', arch: ['arm64'] }],
    // macOS doesn't mask icons; this one has the shape baked in (scripts/mac-icon.py).
    icon: 'build/icon-mac.png',
    category: 'public.app-category.lifestyle',
    extendInfo: { NSLocalNetworkUsageDescription: 'Dune Weaver finds and controls your sand table on the local network.' },
  },
  win: { target: [{ target: 'nsis', arch: ['x64'] }] },
}
