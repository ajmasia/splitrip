/** Surrounding whitespace and letter case do not count; nothing else is forgiven. */
const normalise = (name: string) => name.replace(/^\s+|\s+$/g, '').toLowerCase()

/**
 * Whether the name typed to confirm a deletion is the trip's.
 *
 * `delete_trip` makes the same comparison — trimming and lowercasing both sides — and has the last
 * word. This copy exists so the form never offers a button the database would refuse.
 */
export function confirmsTripName(typed: string, tripName: string): boolean {
  return normalise(typed) === normalise(tripName)
}
