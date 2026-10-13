const path = require('node:path')

/**
 * Maps an app:// url to a file inside one of the roots (app://bundle/… → the web
 * export, app://data/… → documents, app://cache/…). Returns null for any other
 * scheme or unknown host; throws if the path escapes its root.
 */
function resolveAppUrl(roots, uri) {
  let u
  try {
    u = new URL(uri, 'app://bundle/')
  } catch {
    return null
  }
  const root = u.protocol === 'app:' && roots[u.host]
  if (!root) return null
  const file = path.join(root, decodeURIComponent(u.pathname))
  if (file !== root && !file.startsWith(root + path.sep)) throw new Error(`Path escapes ${u.host}: ${uri}`)
  return file
}

module.exports = { resolveAppUrl }
