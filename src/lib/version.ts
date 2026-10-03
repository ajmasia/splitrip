/**
 * Application version, fixed at build time by next.config.ts: the release a deployed instance was
 * built from, or package.json's version for any other build.
 *
 * `npm version <bump>` is what changes package.json: it writes it, commits and tags in one step,
 * using the prefix and message configured in .npmrc.
 */
export const APP_VERSION: string = process.env.NEXT_PUBLIC_APP_VERSION ?? '0.0.0'
