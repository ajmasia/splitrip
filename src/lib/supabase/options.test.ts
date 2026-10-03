import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { forwardedFor, serverSupabaseUrl } from './options'

describe('forwardedFor', () => {
  it('passes on the address the reverse proxy saw', () => {
    expect(forwardedFor(new Headers({ 'x-forwarded-for': '203.0.113.7' }))).toEqual({
      'X-Forwarded-For': '203.0.113.7',
    })
  })

  it('ignores whatever the visitor put before it', () => {
    expect(
      forwardedFor(new Headers({ 'x-forwarded-for': '198.51.100.1, 10.0.0.9 , 203.0.113.7 ' })),
    ).toEqual({ 'X-Forwarded-For': '203.0.113.7' })
  })

  it('forwards nothing when the request carries no address', () => {
    expect(forwardedFor(new Headers())).toEqual({})
    expect(forwardedFor(new Headers({ 'x-forwarded-for': ' ' }))).toEqual({})
  })
})

describe('serverSupabaseUrl', () => {
  it('prefers the internal address when there is one', () => {
    expect(serverSupabaseUrl('https://api.example.com', 'http://kong:8000')).toBe(
      'http://kong:8000',
    )
  })

  it('falls back to the public address', () => {
    expect(serverSupabaseUrl('https://api.example.com', undefined)).toBe('https://api.example.com')
    expect(serverSupabaseUrl('https://api.example.com', '')).toBe('https://api.example.com')
  })
})

describe('the session cookie', () => {
  const createBrowserClient = vi.fn()
  const createServerClient = vi.fn()

  beforeEach(() => {
    vi.resetModules()
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://api.example.com')
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY', 'publishable')
    vi.stubEnv('SUPABASE_INTERNAL_URL', 'http://kong:8000')
    vi.doMock('@supabase/ssr', () => ({ createBrowserClient, createServerClient }))
    vi.doMock('next/headers', () => ({
      cookies: async () => ({ getAll: () => [], set: () => {} }),
      headers: async () => new Headers(),
    }))
  })

  afterEach(() => {
    vi.unstubAllEnvs()
    vi.doUnmock('@supabase/ssr')
    vi.doUnmock('next/headers')
  })

  it('has the same name in the browser and on the server, whatever address each uses', async () => {
    const { createSupabaseBrowserClient } = await import('./client')
    const { createSupabaseServerClient } = await import('./server')

    createSupabaseBrowserClient()
    await createSupabaseServerClient()

    const [browserUrl, , browserOptions] = createBrowserClient.mock.calls[0]!
    const [serverUrl, , serverOptions] = createServerClient.mock.calls[0]!

    expect(browserUrl).not.toBe(serverUrl)
    expect(browserOptions.cookieOptions.name).toBeTruthy()
    expect(serverOptions.cookieOptions.name).toBe(browserOptions.cookieOptions.name)
  })
})
