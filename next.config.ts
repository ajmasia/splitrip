import { readFileSync } from 'node:fs'
import { networkInterfaces } from 'node:os'
import { fileURLToPath } from 'node:url'

import type { NextConfig } from 'next'

/**
 * The application version, fixed here for the whole bundle so the PWA and the feedback can never
 * drift from what is running.
 *
 * A deployed instance is the release it was built from: the installer and `update` say which one in
 * SPLITRIP_VERSION, release candidates included, which package.json does not name. Any other build
 * takes package.json's version.
 */
const packageJsonPath = fileURLToPath(new URL('./package.json', import.meta.url))
const { version: packageVersion } = JSON.parse(readFileSync(packageJsonPath, 'utf8')) as {
  version: string
}
const version = process.env.SPLITRIP_VERSION || packageVersion

/**
 * The addresses this machine answers to on the local network.
 *
 * The development server refuses to serve its own build output to any origin but localhost, and a
 * phone on the same wifi is not localhost. The page arrives, the scripts are refused with a 403,
 * React never hydrates, and every control on the screen is painted and dead — which looks like a
 * bug in whatever you were building rather than in how you reached it.
 *
 * Read from the machine rather than written down, because the address is handed out by a router and
 * changes: a list in a file would be right until the next lease. It applies to the development
 * server only; a production build serves whoever asks.
 */
function localNetworkOrigins(): string[] {
  return Object.values(networkInterfaces())
    .flat()
    .flatMap((address) =>
      address !== undefined && address.family === 'IPv4' && !address.internal
        ? [address.address]
        : [],
    )
}

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // A self-contained server with only the files it needs, which is what a deployed instance runs.
  output: 'standalone',
  allowedDevOrigins: localNetworkOrigins(),
  env: {
    NEXT_PUBLIC_APP_VERSION: version,
  },
}

export default nextConfig
