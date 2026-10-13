# Dune Weaver Desktop

The Dune Weaver mobile app on macOS and Windows: its React Native source, built for web with
react-native-web and run in Electron. It talks to the table's firmware directly over the LAN,
exactly like the phone app.

**This repo has no app code of its own.** It bundles `../dune-weaver-mobile` (a sibling checkout)
**without modifying it**. Features and fixes land in the mobile repo, and desktop picks them up on
the next build.

## Run

```sh
nvm use                 # Node 24 (.nvmrc)
npm install
npm start               # expo export -p web → dist/, then open it in Electron
npm run electron        # reopen the last export without rebuilding
npm run dist            # export, then build installers into release/ (add --mac or --win for one)
```

Smoke test against a real table. It reads `/sand_status` through `fetch` and through an XHR that
carries `X-Sand-Key`, browses mDNS for 5 s, prints `SMOKE {...}`, and exits non-zero on failure
(including when no table answers mDNS). It also works on a packaged app: run
`DW_SMOKE=… "release/mac-arm64/Dune Weaver.app/Contents/MacOS/Dune Weaver"`.

```sh
DW_SMOKE=http://<table-ip> npm run electron
```

## How it works

- **`metro.config.js`** watches `../dune-weaver-mobile` and rewrites every bare import from a mobile
  file to resolve against THIS repo's `node_modules` (mobile's `node_modules` is blocked), so there
  is exactly one React. It refuses to build if a shared dependency's version spec drifts from
  mobile's `package.json`. When mobile bumps a dep, bump it here too.
- **`app.json` sets `experiments.onDemandFilesystem: false`.** Expo's export otherwise shrinks
  Metro's watch folders to this project, and the mobile source becomes unresolvable.
- **`electron/main.js`** serves everything over `app://`: `app://bundle/` is the web export,
  `app://data/` is documents, and `app://cache/` is cache (both under the OS app-data dir,
  `Dune Weaver/`). `electron/paths.js` maps those URLs to files and refuses any path that escapes
  its root.
- **`webSecurity: false` is deliberate.** The firmware sends no CORS headers, and the `X-Sand-Key`
  header would force a preflight request it doesn't answer. Disabling CORS in the shell works with
  every firmware version. The window only ever loads bundled content: navigation and popups are
  sent to the system browser. The scheme is `corsEnabled` because the app loads `app://cache`
  images into a canvas from `app://bundle` (imported-pattern previews), which counts as
  cross-origin.
- **One instance.** A second launch focuses the open window. Two instances would share storage
  and double-poll the table. `DW_SMOKE` runs are exempt.
- **Menu:** the Electron default, except View → Reload, which would restart the app, is replaced
  by **Refresh (⌘R / Ctrl+R)**. It re-reads the lists on the focused screen.
- **`package.json` splits dependencies by where they run.** Everything Metro bundles is in
  `devDependencies`. electron-builder ships `dependencies` inside the app, so that block holds only
  what `electron/` requires at runtime (`bonjour-service`). The drift check reads both blocks.
- **Installers** (`electron-builder.js`): macOS DMG (arm64) and Windows NSIS (x64), both built
  from macOS. `extraMetadata.main` points the packaged app at `electron/main.js`, because `main`
  belongs to Expo. The icon is the mobile app's `assets/icon.png`.
- **Version = the bundled mobile version.** `app.config.js` (what Settings and diagnostics show)
  and `electron-builder.js` (the installers) both read `../dune-weaver-mobile/app.json`. That way
  mobile's bundled "What's new" badges the right entry, and the update check compares like with
  like. package.json's `0.0.0` is a placeholder electron-builder insists on.
- **Every export runs `--clear`.** Metro's cache otherwise keeps old resolver results and the old
  inlined app config, such as a stale version after mobile bumps. A clean export takes a few
  seconds.

### Shims (what the mobile code needs that the web doesn't have)

| Mobile uses | On desktop |
|---|---|
| `Alert.alert` (a no-op in react-native-web) | `shims/alert.ts` → native dialog via IPC. Cancel buttons go last so macOS and Windows lay them out natively. |
| `expo-file-system` `File`/`Directory`/`Paths` (no web backend) | `shims/expo-file-system.ts` → Node `fs` via `electron/preload.js`. Picked files (`blob:` URLs) are mapped back to their path on disk. |
| `react-native-zeroconf` (mDNS) | `shims/zeroconf.ts` → `bonjour-service` in the preload, re-querying every 2 s because Wi-Fi drops multicast. Scan and DHCP auto-relocate work. |
| `Share.share` (react-native-web needs `navigator.share`, which Electron lacks) | `shims/share.ts` → native save dialog. The diagnostics report is saved as a `.txt` file. |
| `RefreshControl` (react-native-web drops `onRefresh`: no pull gesture) | `shims/refresh-control.tsx`, swapped for react-native-web's own file in `metro.config.js` → runs `onRefresh` on View → Refresh, only for lists on the focused screen. |
| `ErrorUtils` global handler (web errors never reach it) and `Platform.Version` (`'0.0.0'` on web) | `shims/diagnostics.ts` → uncaught errors reach the app's crash log, and the diagnostics report names the OS (e.g. `macOS 27.0.1`). |

## Releasing

Desktop releases match mobile one-for-one. Every mobile version published to the stores gets a
desktop release with the same version, and desktop never releases a version mobile hasn't. You
don't bump a version here: `app.config.js` and `electron-builder.config.js` read it from
`../dune-weaver-mobile/app.json`.

1. With `../dune-weaver-mobile` at the source that went to the stores, run `npm run dist`.
2. Publish the release:
   `gh release create v<version> -R tuanchris/dune-weaver-desktop --title v<version> --notes-file <notes> <the .dmg and .exe from release/>`.
   For the notes, use that version's `APP_CHANGELOG` entry (mobile `src/lib/appChangelog.ts`).

The tag and release type matter. The app's update check (the `web` branch of `fetchLatestApp` in
mobile `src/lib/updates.ts`) reads `releases/latest` from the GitHub API without authentication
and compares the tag (minus its `v`) with the running version. It also shows the release body as
"What's new". So the repo must be public, and the release must be a full release: the endpoint
skips drafts and prereleases.

## Release

Releases are GitHub Releases of `tuanchris/dune-weaver-desktop`, tagged `v<mobile version>`. The
repo must be public, because the app reads `releases/latest` without auth. Settings' update check
(mobile `fetchLatestApp`, `web` branch) compares that tag with the running version, and its
"Update" button opens the release page.

```sh
npm run dist
gh release create v1.2.0 --repo tuanchris/dune-weaver-desktop --notes "…" \
  "release/Dune Weaver-1.2.0-arm64.dmg" "release/Dune Weaver Setup 1.2.0.exe"
```

## Known gaps

- The release repo doesn't exist yet. Until it does, the update check shows "unknown".
- Desktop-only fixes can't get a new version (it mirrors mobile), so the update check won't
  announce them. They reach users with the next mobile version.
- Signing: electron-builder signs the Mac app automatically if a "Developer ID Application" cert
  is in the keychain. It notarizes only when `APPLE_API_KEY`/`APPLE_API_KEY_ID`/`APPLE_API_ISSUER`
  (or `APPLE_ID`/`APPLE_APP_SPECIFIC_PASSWORD`/`APPLE_TEAM_ID`) are set. Windows needs
  `CSC_LINK`/`CSC_KEY_PASSWORD`. Without these, Gatekeeper and SmartScreen warn on other machines.
  Pass `CSC_IDENTITY_AUTO_DISCOVERY=false` for a local unsigned build.
- Intel Macs: there is no x64 DMG. Add `x64` to `mac.target[0].arch` in `electron-builder.js` if
  you need it.

## Checks

`npx tsc --noEmit` type-checks the shims and the mobile source they pull in. `npm run web` confirms
the bundle builds.
