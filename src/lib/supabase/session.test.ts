import {
  AuthApiError,
  AuthRetryableFetchError,
  AuthSessionMissingError,
} from '@supabase/supabase-js'
import { describe, expect, it } from 'vitest'

import { sessionRefused } from './session'

describe('sessionRefused', () => {
  it('drops a session Auth no longer accepts', () => {
    expect(sessionRefused(new AuthApiError('invalid JWT', 403, 'bad_jwt'))).toBe(true)
    expect(sessionRefused(new AuthApiError('unauthorized', 401, 'no_authorization'))).toBe(true)
  })

  it('keeps it when Auth could not be asked', () => {
    expect(sessionRefused(new AuthRetryableFetchError('fetch failed', 0))).toBe(false)
    expect(sessionRefused(new AuthApiError('unavailable', 503, undefined))).toBe(false)
  })

  it('has nothing to drop when there was no session', () => {
    expect(sessionRefused(new AuthSessionMissingError())).toBe(false)
    expect(sessionRefused(null)).toBe(false)
  })
})
