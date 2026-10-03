## 1. The version is the release being built

- [x] 1.1 Make `next.config.ts` take the version from `SPLITRIP_VERSION` when it is set and not empty, and from `package.json` otherwise, and bring the comments in `next.config.ts` and `src/lib/version.ts` in line with it; verify that `SPLITRIP_VERSION=0.0.0-test npm run build` serves `/sw.js` with the cache `splitrip-0.0.0-test`, and that a build without it serves `splitrip-` followed by `package.json`'s version
- [x] 1.2 Pass `SPLITRIP_VERSION` with the release being built from `build_release` in `deploy/lib.sh`, and say in the update section of `docs/deployment.md` that the foot of every screen names the release running; verify that `shellcheck` reports nothing on `deploy/`

## 2. The version at the foot of every screen

- [x] 2.1 Show `Splitrip <version>` in the shared frame's footer, after the feedback link, faint and wrapping under it on a narrow screen; verify on the local server that it appears on the public entry page, the trip list, a trip screen, the feedback form and the operators' screen, that on a trip screen on a phone it is not hidden under the bottom bar, and that `npm run check:viewport` reports no overflow at 360 pixels on the public entry page and on a trip screen

## 3. On the running instance

- [ ] 3.1 Publish a release candidate with this change and update the Proxmox instance to it; verify that the foot of the screen names that candidate, that feedback sent from it is stored with that version on the operators' screen, and that an installed PWA offers the update and, once applied, keeps a cache named for that candidate and no other
- [ ] 3.2 With the next candidate published, update to it and then move back to the previous one with `update <version>`; verify that the foot of the screen names each release in turn
