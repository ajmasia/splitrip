import { create } from 'qrcode'

export type QrCode = {
  /** Modules per side, the quiet zone not counted. */
  size: number
  /** One SVG path covering every dark module, so a symbol is one element and not a thousand. */
  path: string
}

/**
 * Error correction M recovers a quarter of the symbol, which is what lets a phone read a code off
 * a screen held at an angle, in the light of a bar.
 */
export function qrCode(text: string): QrCode {
  const { modules } = create(text, { errorCorrectionLevel: 'M' })
  const { size, data } = modules

  let path = ''
  for (let row = 0; row < size; row += 1) {
    for (let column = 0; column < size; column += 1) {
      if (data[row * size + column] === 1) path += `M${column} ${row}h1v1h-1z`
    }
  }

  return { size, path }
}
