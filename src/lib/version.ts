/**
 * Application version, taken from package.json at build time.
 *
 * `npm version <bump>` is the only thing that changes it: it writes package.json,
 * commits and tags in one step, using the prefix and message configured in .npmrc.
 */
export const APP_VERSION: string = process.env.NEXT_PUBLIC_APP_VERSION ?? '0.0.0'
