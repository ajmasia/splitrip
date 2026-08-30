import { describe, expect, it } from 'vitest'

import { amountForField, formatAmount, parseAmount } from './amount'

const cents = (input: string) => {
  const parsed = parseAmount(input)
  return parsed.ok ? parsed.amountCents : parsed.reason
}

/** Intl separates the amount from the symbol with a non-breaking space. */
const plain = (formatted: string) => formatted.replace(/ /g, ' ')

describe('parseAmount', () => {
  it('reads either decimal separator', () => {
    expect(cents('10,55')).toBe(1055)
    expect(cents('10.55')).toBe(1055)
  })

  it('reads an amount with no decimals at all', () => {
    expect(cents('10')).toBe(1000)
  })

  it('completes a single decimal', () => {
    expect(cents('12,3')).toBe(1230)
  })

  it('reads the smallest amount there is', () => {
    expect(cents('0,01')).toBe(1)
  })

  it('is not thrown off by surrounding spaces', () => {
    expect(cents('  45,00  ')).toBe(4500)
  })

  it('converts to cents without a rounding error', () => {
    expect(cents('1,15')).toBe(115)
    expect(cents('8,29')).toBe(829)
    expect(cents('1234567,89')).toBe(123456789)
  })

  it('refuses more than two decimals', () => {
    expect(cents('10,555')).toBe('too-precise')
    expect(cents('1,005')).toBe('too-precise')
  })

  it('refuses zero', () => {
    expect(cents('0')).toBe('not-positive')
    expect(cents('0,00')).toBe('not-positive')
  })

  it('refuses a negative amount', () => {
    expect(cents('-5')).toBe('not-positive')
    expect(cents('-0,01')).toBe('not-positive')
  })

  it('refuses an empty field', () => {
    expect(cents('')).toBe('missing')
    expect(cents('   ')).toBe('missing')
  })

  it('refuses what is not an amount', () => {
    expect(cents('abc')).toBe('malformed')
    expect(cents('10,')).toBe('malformed')
    expect(cents('10,5,5')).toBe('malformed')
    expect(cents('1e3')).toBe('malformed')
    expect(cents('12€')).toBe('malformed')
  })

  it('refuses an amount too large to count in cents', () => {
    expect(cents('999999999999999999')).toBe('malformed')
  })
})

describe('formatAmount', () => {
  it('follows Spanish conventions', () => {
    expect(plain(formatAmount(1055, 'es-ES'))).toBe('10,55 €')
  })

  it('follows English conventions', () => {
    expect(plain(formatAmount(1055, 'en-GB'))).toBe('€10.55')
  })

  it('shows a balance that is owed as a negative amount', () => {
    expect(plain(formatAmount(-3885, 'es-ES'))).toBe('-38,85 €')
  })

  it('shows a settled balance as zero', () => {
    expect(plain(formatAmount(0, 'es-ES'))).toBe('0,00 €')
  })

  it('leaves a four-figure amount ungrouped, as Spanish does', () => {
    expect(plain(formatAmount(170265, 'es-ES'))).toBe('1702,65 €')
  })

  it('groups from five figures up', () => {
    expect(plain(formatAmount(1234567, 'es-ES'))).toBe('12.345,67 €')
    expect(plain(formatAmount(1234567, 'en-GB'))).toBe('€12,345.67')
  })

  it('refuses to show an amount that is not whole cents', () => {
    expect(() => formatAmount(10.5, 'es-ES')).toThrow(TypeError)
  })
})

describe('amountForField', () => {
  it('writes an amount a field can hold and the parser can read back', () => {
    for (const [locale, written] of [
      ['es-ES', '1234,56'],
      ['en-GB', '1234.56'],
    ] as const) {
      expect(amountForField(123456, locale)).toBe(written)
      expect(parseAmount(written)).toEqual({ ok: true, amountCents: 123456 })
    }
  })

  it('keeps both decimal places, so a round amount does not read as an integer', () => {
    expect(amountForField(4000, 'es-ES')).toBe('40,00')
  })
})
