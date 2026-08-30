import { readFileSync } from 'node:fs'
import { networkInterfaces } from 'node:os'
import { fileURLToPath } from 'node:url'

import type { NextConfig } from 'next'

/**
 * package.json is the single source of the application version. Reading it here
 * exposes it to the bundle, so the PWA and the manifest can never drift from
 * the version that was actually released.
 */
const packageJsonPath = fileURLToPath(new URL('./package.json', import.meta.url))
const { version } = JSON.parse(readFileSync(packageJsonPath, 'utf8')) as { version: string }

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
  allowedDevOrigins: localNetworkOrigins(),
  env: {
    NEXT_PUBLIC_APP_VERSION: version,
  },
}

export default nextConfig
