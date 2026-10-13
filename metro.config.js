// Bundles the Dune Weaver mobile app's source (../dune-weaver-mobile, untouched)
// for web. Bare imports from mobile files resolve against THIS repo's
// node_modules (one copy of React), and the native-only modules are swapped
// for desktop shims.
const path = require('node:path')
const { getDefaultConfig } = require('expo/metro-config')

const MOBILE = path.resolve(__dirname, '../dune-weaver-mobile')
const ENTRY = path.join(__dirname, 'index.ts')
const SHIMS = {
  'expo-file-system': path.join(__dirname, 'shims/expo-file-system.ts'),
  'react-native-zeroconf': path.join(__dirname, 'shims/zeroconf.ts'),
}
// react-native-web's own files, swapped wherever they're imported from (its
// FlatList/ScrollView reach RefreshControl by relative path).
const RNW_SHIMS = {
  [require.resolve('react-native-web/dist/exports/RefreshControl/index.js')]: path.join(__dirname, 'shims/refresh-control.tsx'),
}

// Shared deps must carry the mobile app's exact specs, or desktop silently
// runs different library code than the phones do. (Bundled deps live in
// devDependencies so electron-builder doesn't ship them twice.)
const mobileDeps = require(path.join(MOBILE, 'package.json')).dependencies
const own = require('./package.json')
const ownDeps = { ...own.dependencies, ...own.devDependencies }
const drift = Object.keys(ownDeps).filter((n) => n in mobileDeps && mobileDeps[n] !== ownDeps[n])
if (drift.length) {
  throw new Error(`Deps drifted from dune-weaver-mobile: ${drift.map((n) => `${n} ${ownDeps[n]} ≠ ${mobileDeps[n]}`).join(', ')}`)
}

const config = getDefaultConfig(__dirname)
config.watchFolders = [MOBILE]
const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
config.resolver.blockList = [
  ...[].concat(config.resolver.blockList ?? []),
  new RegExp(`^${esc(MOBILE)}[\\\\/](node_modules|ios|android|dist|\\.expo|fastlane)[\\\\/]`),
]
config.resolver.assetExts.push('thr')
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (SHIMS[moduleName]) return { type: 'sourceFile', filePath: SHIMS[moduleName] }
  const fromMobile = context.originModulePath.startsWith(MOBILE + path.sep)
  const bare = !moduleName.startsWith('.') && !path.isAbsolute(moduleName)
  const ctx = fromMobile && bare ? { ...context, originModulePath: ENTRY } : context
  const res = context.resolveRequest(ctx, moduleName, platform)
  const swap = res.type === 'sourceFile' && RNW_SHIMS[res.filePath]
  return swap ? { type: 'sourceFile', filePath: swap } : res
}

module.exports = config
