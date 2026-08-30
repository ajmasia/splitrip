export type ParsedAmount =
  | { ok: true; amountCents: number }
  | { ok: false; reason: 'missing' | 'malformed' | 'too-precise' | 'not-positive' }

/**
 * Reads what somebody typed into whole cents, accepting either decimal separator so that the same
 * field works for a comma and for a point.
 *
 * The digits are read from the string and never multiplied as a decimal number: `10.55 * 100` is
 * 1054.9999999999999 in floating point, and money that is off by a cent is money nobody trusts.
 *
 * A rejection is a value rather than an exception. Typing an amount wrong is ordinary, and the
 * reason travels to the interface, which is what turns it into a translated message.
 */
export function parseAmount(input: string): ParsedAmount {
  const cleaned = input.replace(/\s/g, '')

  if (cleaned === '') return { ok: false, reason: 'missing' }

  const digits = /^(\d+)(?:[.,](\d+))?$/.exec(cleaned)
  if (digits === null) {
    return /^-/.test(cleaned)
      ? { ok: false, reason: 'not-positive' }
      : { ok: false, reason: 'malformed' }
  }

  const [, whole = '', decimals = ''] = digits
  if (decimals.length > 2) return { ok: false, reason: 'too-precise' }

  const amountCents = Number(whole) * 100 + Number(decimals.padEnd(2, '0'))
  if (!Number.isSafeInteger(amountCents)) return { ok: false, reason: 'malformed' }
  if (amountCents <= 0) return { ok: false, reason: 'not-positive' }

  return { ok: true, amountCents }
}

/** Negative amounts are expected here: a balance is money owed as often as money owing. */
export function formatAmount(amountCents: number, locale: string): string {
  if (!Number.isInteger(amountCents)) {
    throw new TypeError(`An amount must be a whole number of cents, got ${amountCents}`)
  }

  return new Intl.NumberFormat(locale, { style: 'currency', currency: 'EUR' }).format(
    amountCents / 100,
  )
}

/**
 * The same amount as the contents of an input: the locale's decimal separator, no currency symbol
 * and no grouping. Grouping is the point — "1.234,56" is what a formatter writes and what
 * `parseAmount` refuses, so a field prefilled with a formatted amount could not be sent back.
 */
export function amountForField(amountCents: number, locale: string): string {
  if (!Number.isInteger(amountCents)) {
    throw new TypeError(`An amount must be a whole number of cents, got ${amountCents}`)
  }

  return new Intl.NumberFormat(locale, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
    useGrouping: false,
  }).format(amountCents / 100)
}
