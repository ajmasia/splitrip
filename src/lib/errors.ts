import type { CopyKey } from './i18n'
import type { ParsedAmount } from './money/amount'

/**
 * The database refuses a broken rule with its own SQLSTATE, which travels to the client untouched.
 * Mapping the code — rather than reading the English message it comes with — is what lets the
 * interface say why in the reader's own language.
 *
 * Codes are added here as the screens that can provoke them are built, so an entry in this map is
 * always a rejection somebody can actually see.
 */
const COPY_BY_CODE: Record<string, CopyKey> = {
  '42501': 'error.not_allowed',
  SP001: 'error.trip_closed',
  SP002: 'error.amount_not_positive',
  SP005: 'error.split_empty',
  SP006: 'error.split_outsider',
  SP007: 'error.payer_not_in_trip',
  SP008: 'error.payment_to_self',
  SP009: 'error.payment_already_voided',
  SP010: 'error.invitation_invalid',
  SP011: 'error.invitation_expired',
  SP012: 'error.name_required',
  SP013: 'error.name_taken',
  SP015: 'error.trip_name_required',
  SP016: 'error.trip_dates_out_of_order',
  SP017: 'error.needs_an_account',
  SP018: 'error.needs_admin',
  SP023: 'error.trip_needs_an_admin',
  SP024: 'error.payer_is_organisers',
  SP025: 'error.type_is_organisers',
}

export function errorCopyKey(code: string | undefined): CopyKey {
  return (code !== undefined ? COPY_BY_CODE[code] : undefined) ?? 'error.unexpected'
}

/** Why an amount somebody typed was refused, in words they can read. */
const COPY_BY_REASON: Record<Extract<ParsedAmount, { ok: false }>['reason'], CopyKey> = {
  missing: 'error.amount_required',
  malformed: 'error.amount_malformed',
  'too-precise': 'error.amount_too_precise',
  'not-positive': 'error.amount_not_positive',
}

export function amountCopyKey(reason: Extract<ParsedAmount, { ok: false }>['reason']): CopyKey {
  return COPY_BY_REASON[reason]
}
