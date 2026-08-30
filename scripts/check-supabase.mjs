/**
 * Verifies that the application's own environment variables reach a working
 * Supabase API.
 *
 * This deliberately reads the same variables the app reads, rather than the
 * CLI's reported URLs: the failure this catches is a mistyped or missing
 * .env.local, which `supabase status` would happily report as healthy.
 *
 * Run with: npm run db:check
 */

const REQUIRED = ['NEXT_PUBLIC_SUPABASE_URL', 'NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY']

const missing = REQUIRED.filter((name) => !process.env[name])
if (missing.length > 0) {
  console.error(`Missing environment variables: ${missing.join(', ')}`)
  console.error('Copy .env.example to .env.local and try again.')
  process.exit(1)
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY

/**
 * @param {string} label
 * @param {string} endpoint
 */
async function check(label, endpoint) {
  try {
    const response = await fetch(endpoint, { headers: { apikey: String(key) } })
    if (!response.ok) {
      console.error(`✗ ${label}: HTTP ${response.status}`)
      return false
    }
    console.log(`✓ ${label}`)
    return true
  } catch (error) {
    console.error(`✗ ${label}: ${error instanceof Error ? error.message : String(error)}`)
    return false
  }
}

console.log(`Checking Supabase at ${url}`)

const results = [
  await check('REST API reachable', `${url}/rest/v1/`),
  await check('Auth service healthy', `${url}/auth/v1/health`),
]

if (results.includes(false)) {
  console.error('\nThe local stack does not look ready. Start it with: npm run db:start')
  process.exit(1)
}

console.log('\nThe application environment reaches Supabase.')
