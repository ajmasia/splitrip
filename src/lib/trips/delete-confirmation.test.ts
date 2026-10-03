import { describe, expect, it } from 'vitest'

import { confirmsTripName } from './delete-confirmation'

describe('confirmsTripName', () => {
  it('accepts the name exactly as it is', () => {
    expect(confirmsTripName('Lisboa 2026', 'Lisboa 2026')).toBe(true)
  })

  it('ignores letter case and the spaces around it', () => {
    expect(confirmsTripName('lisboa 2026 ', 'Lisboa 2026')).toBe(true)
    expect(confirmsTripName('  LISBOA 2026\t', 'Lisboa 2026')).toBe(true)
  })

  it('refuses part of the name', () => {
    expect(confirmsTripName('Lisboa', 'Lisboa 2026')).toBe(false)
  })

  it('refuses another name', () => {
    expect(confirmsTripName('Porto 2026', 'Lisboa 2026')).toBe(false)
  })

  it('refuses nothing typed at all', () => {
    expect(confirmsTripName('', 'Lisboa 2026')).toBe(false)
    expect(confirmsTripName('   ', 'Lisboa 2026')).toBe(false)
  })

  it('counts the spaces inside the name', () => {
    expect(confirmsTripName('Lisboa  2026', 'Lisboa 2026')).toBe(false)
  })
})
