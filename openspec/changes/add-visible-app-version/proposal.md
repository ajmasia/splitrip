## Why

Nobody can tell from the application which release an instance is running: after an `update`, the only way to check is the console of the host. Worse, the version the application believes it is comes from `package.json`, which release candidates do not bump, so every candidate from `0.13.0-rc.12` to `0.13.0-rc.15` was built as `0.12.0`. Feedback has been stored with that wrong version, and the service worker, which carries the version in its own code and names its cache after it, came out identical from every candidate: the installed application was never offered an update between them and never let go of the previous one's cache.

## What Changes

- **The version is the release that was built.** A build made by the installer or by `update` takes its version from the release tag it is building, so a candidate is `0.13.0-rc.15` everywhere. A build with no release behind it — local development, a build by hand — keeps taking it from `package.json`, as now.
- **It is shown at the foot of every screen.** Beside the feedback link, in the same quiet style: the application's name and its version. On the feedback form and the operators' screen, where there is no feedback link, the version is still there.
- **What already reads the version reads the right one.** Feedback is stored with the release actually running, and the service worker's cache changes on every release, candidates included. Neither needs a change of its own; both follow the source.

### Out of scope

- **Showing anything else about the build**: the commit, the build date, the versions of the Supabase components. The release tag is what `update` takes and reports, and it is enough to name what is running.
- **Telling the user an update is available.** The PWA picking up a new release is already covered by the PWA shell.
- **Bumping `package.json` for candidates.** It keeps naming the last released version; the tag is what names a candidate.

## Capabilities

### New Capabilities

- `app-version`: which version the application is, where that comes from for a deployed instance and for a build with no release, and where the user sees it.

### Modified Capabilities

None. `user-feedback` already stores "the application version" and does not say where it comes from; it becomes correct without its requirements changing. The service worker's update behaviour lives in `pwa-shell`, which so far exists only in the unarchived `add-splitrip-mvp` change and cannot be targeted by a delta; its requirement — a new version is picked up without reinstalling — is what this change makes true for candidates.

## Impact

- **Build**: `next.config.ts` takes the version from an environment variable when it is set, and from `package.json` otherwise.
- **Deployment**: `build_release` in `deploy/lib.sh` passes the release being built. Only builds made from now on carry it; a release already built keeps the version it was built with.
- **Application**: the shared frame's footer shows the version on every screen.
- **No database or API change.**
