@README.md

- Never edit `../dune-weaver-mobile` from here to make desktop work: fix it with a shim, or with Metro/Electron config in this repo. App features belong in the mobile repo.
- Verify with `npx tsc --noEmit` and `npm run web`. Then launch with `npm run electron` and hand it to the owner to test (same rule as mobile: don't drive the UI yourself).
