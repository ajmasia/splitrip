import { describe, expect, it } from 'vitest'

import {
  applicationPath,
  feedbackHref,
  isFeedbackKind,
  tripIdFromPath,
  tripIdOrNull,
} from './feedback'

const TRIP = 'aa15ac1a-0000-0000-0000-000000000001'

describe('applicationPath', () => {
  it('keeps a path within the application', () => {
    expect(applicationPath('/')).toBe('/')
    expect(applicationPath(`/trips/${TRIP}/balances`)).toBe(`/trips/${TRIP}/balances`)
  })

  it('drops what a browser would read as another site', () => {
    expect(applicationPath('//evil.example/path')).toBeNull()
    expect(applicationPath('/\\evil.example')).toBeNull()
    expect(applicationPath('https://evil.example/')).toBeNull()
    expect(applicationPath('javascript:alert(1)')).toBeNull()
  })

  it('drops nothing at all, and a path too long to be one of ours', () => {
    expect(applicationPath(null)).toBeNull()
    expect(applicationPath('')).toBeNull()
    expect(applicationPath(`/${'a'.repeat(512)}`)).toBeNull()
  })
})

describe('tripIdFromPath', () => {
  it('reads the trip of a trip screen and of everything under it', () => {
    expect(tripIdFromPath(`/trips/${TRIP}`)).toBe(TRIP)
    expect(tripIdFromPath(`/trips/${TRIP}/expenses/new`)).toBe(TRIP)
  })

  it('finds none outside a trip', () => {
    expect(tripIdFromPath('/')).toBeNull()
    expect(tripIdFromPath('/trips/new')).toBeNull()
    expect(tripIdFromPath(`/join/${TRIP}`)).toBeNull()
  })
})

describe('tripIdOrNull', () => {
  it('keeps an identifier and drops anything else', () => {
    expect(tripIdOrNull(TRIP)).toBe(TRIP)
    expect(tripIdOrNull('new')).toBeNull()
    expect(tripIdOrNull(null)).toBeNull()
  })
})

describe('feedbackHref', () => {
  it('carries the screen it was opened from', () => {
    expect(feedbackHref('/')).toBe('/feedback?from=%2F')
  })

  it('and, under a trip, the trip', () => {
    expect(feedbackHref(`/trips/${TRIP}/balances`)).toBe(
      `/feedback?from=%2Ftrips%2F${TRIP}%2Fbalances&trip=${TRIP}`,
    )
  })
})

describe('isFeedbackKind', () => {
  it('knows the three kinds and nothing else', () => {
    expect(['bug', 'idea', 'other'].every(isFeedbackKind)).toBe(true)
    expect(isFeedbackKind('praise')).toBe(false)
  })
})
