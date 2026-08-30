import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

import type { NextConfig } from 'next'

/**
 * package.json is the single source of the application version. Reading it here
 * exposes it to the bundle, so the PWA and the manifest can never drift from
 * the version that was actually released.
 */
const packageJsonPath = fileURLToPath(new URL('./package.json', import.meta.url))
const { version } = JSON.parse(readFileSync(packageJsonPath, 'utf8')) as { version: string }

const nextConfig: NextConfig = {
  reactStrictMode: true,
  env: {
    NEXT_PUBLIC_APP_VERSION: version,
  },
}

export default nextConfig
