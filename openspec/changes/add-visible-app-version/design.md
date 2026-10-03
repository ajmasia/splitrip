## Context

The version reaches the bundle once, in `next.config.ts`, which reads `package.json` and exposes it as `NEXT_PUBLIC_APP_VERSION`; `src/lib/version.ts` is the only reader, and through it the feedback form, the feedback action and the service worker route. A deployed instance is built by `build_release` in `deploy/lib.sh`, from a shallow clone of the release tag in `/opt/splitrip/releases/<tag>`, and a release already built for the instance's API domain is not built again.

## Goals / Non-Goals

**Goals:**

- One source of the version for the whole bundle, as now, with the release tag taking precedence when there is one.
- Nothing to remember when cutting a release: the tag already names it.

**Non-Goals:**

- Reading the version at run time. It is fixed at build time, like everything else under `NEXT_PUBLIC_`, and the service worker needs it then anyway.

## Decisions

### The installer and `update` say which release they are building

`build_release` passes `SPLITRIP_VERSION=<tag>` into the build's environment, beside the variables it already passes, and `next.config.ts` uses it when it is set and not empty, and `package.json`'s version otherwise.

- *Asking git at build time* (`git describe --tags`): works in the release's shallow clone, but in a development checkout names whatever tag is nearest, with a commit count and hash after it, which is a version nobody released. The script that builds a release knows which one it is; it is simpler to be told than to infer.
- *Bumping `package.json` for every candidate*: it would make candidates a commit each, against how they are cut now — a tag on `main` — and still leave the version wrong whenever somebody forgot.

### Shown in the shared frame's footer, beside the feedback link

The footer the feedback link already sits in, inside `main`, is the one place every screen of the shared frame has in common that is clear of the bar pinned to the bottom of a phone. The version goes in it as plain faint text, after the link, and wraps under it on a narrow screen rather than squeezing it. On the feedback form and the operators' screen the link renders nothing, and the version is left on its own.

It reads `Splitrip <version>` in every language: a product name and a version number translate to themselves, so no message is added.

The offline page is not in the shared frame — the service worker serves it when there is no network — and is left as it is.

## Risks / Trade-offs

- [A release built before this change keeps the version it was built with] → Only builds from now on carry the tag; moving back to an earlier candidate shows `0.12.0` again. This is limited to the candidates already published and disappears with the next final release.
- [An installed PWA is offered an update the first time this change reaches it] → Expected and wanted: the service worker's code changes for the first time since `0.12.0`.

## Migration Plan

Nothing to migrate. Publishing a candidate with this change and running `update` builds it with its tag.
