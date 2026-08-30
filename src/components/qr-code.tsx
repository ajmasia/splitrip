import { qrCode } from '@/lib/qr'

/** Four modules of quiet zone, which the specification asks for and scanners rely on. */
const QUIET = 4

/**
 * A QR code is read by a camera, not by a person, so it does not follow the theme: it stays dark
 * ink on white whatever the rest of the page is doing. Inverting it in the dark palette would look
 * considered and would stop scanning on half the phones that tried it.
 */
export function QrCode({ text, label }: { text: string; label: string }) {
  const { size, path } = qrCode(text)
  const side = size + QUIET * 2

  return (
    <svg
      viewBox={`0 0 ${side} ${side}`}
      role="img"
      aria-label={label}
      shapeRendering="crispEdges"
      className="h-40 w-40 rounded-card border border-rule bg-white"
    >
      <path d={path} fill="#131816" transform={`translate(${QUIET} ${QUIET})`} />
    </svg>
  )
}
