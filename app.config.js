// Desktop reports the version of the mobile app it bundles, so Settings, the
// diagnostics report and "What's new" (mobile's bundled changelog) agree, and
// the update check compares against desktop releases tagged the same way.
// electron-builder.js stamps the same version on the installers.
module.exports = ({ config }) => ({ ...config, version: require('../dune-weaver-mobile/app.json').expo.version })
