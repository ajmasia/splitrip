import { describe, expect, it } from 'vitest'

import { en } from './en'
import { es } from './es'
import { formatDate } from './format'
import { DEFAULT_LOCALE, resolveLocale, translator } from './index'

describe('the catalogues', () => {
  it('say the same things in both languages', () => {
    expect(Object.keys(en).sort()).toEqual(Object.keys(es).sort())
  })

  it('leave no phrase empty', () => {
    for (const [key, copy] of [...Object.entries(es), ...Object.entries(en)]) {
      expect(copy.trim(), key).not.toBe('')
    }
  })
})

describe('translator', () => {
  it('reads the catalogue of the language it was given', () => {
    expect(translator('es')('app.tagline')).toBe(
      'Gastos de viaje compartidos, cuadrados en un momento.',
    )
    expect(translator('en')('app.tagline')).toBe('Shared travel expenses, settled in seconds.')
  })

  it('fills in the values a phrase asks for', () => {
    expect(translator('es')('app.version', { version: '0.4.0' })).toBe('Versión 0.4.0')
  })

  it('leaves a placeholder alone when nothing was given for it', () => {
    expect(translator('en')('app.version')).toBe('Version {version}')
  })
})

describe('resolveLocale', () => {
  it('honours a stored preference above everything else', () => {
    expect(resolveLocale('en', 'es-ES,es;q=0.9')).toBe('en')
  })

  it('falls back to what the browser asks for', () => {
    expect(resolveLocale(undefined, 'en-GB,en;q=0.9')).toBe('en')
  })

  it('follows the order the browser stated, not the order it wrote', () => {
    expect(resolveLocale(undefined, 'en;q=0.7, es;q=0.9')).toBe('es')
  })

  it('skips languages it does not speak', () => {
    expect(resolveLocale(undefined, 'fr-FR,fr;q=0.9,en;q=0.5')).toBe('en')
  })

  it('falls back to Spanish when it recognises nothing', () => {
    expect(resolveLocale(undefined, 'fr-FR,de;q=0.9')).toBe(DEFAULT_LOCALE)
    expect(resolveLocale(undefined, null)).toBe(DEFAULT_LOCALE)
    expect(resolveLocale('kl', null)).toBe(DEFAULT_LOCALE)
  })
})

describe('formatDate', () => {
  it('follows Spanish conventions', () => {
    expect(formatDate('2026-07-01', 'es')).toBe('1 de julio de 2026')
  })

  it('follows English conventions', () => {
    expect(formatDate('2026-07-01', 'en')).toBe('1 July 2026')
  })

  it('keeps the day of the trip, whatever zone the reader is in', () => {
    expect(formatDate('2026-12-31', 'es')).toBe('31 de diciembre de 2026')
  })

  it('refuses anything that is not a civil date', () => {
    expect(() => formatDate('not a date', 'es')).toThrow(TypeError)
  })
})
