/**
 * CameraFrame - SVG corner brackets for camera overlay
 * Static component, no memo needed
 */
export function CameraFrame(): JSX.Element {
  const L = 24
  const S = 3
  const points = [
    { x: 16, y: 16, rx: S, dx: L, dy: 0, dx2: 0, dy2: L },
    { x: 84, y: 16, rx: S, dx: -L, dy: 0, dx2: 0, dy2: L },
    { x: 16, y: 84, rx: S, dx: L, dy: 0, dx2: 0, dy2: -L },
    { x: 84, y: 84, rx: S, dx: -L, dy: 0, dx2: 0, dy2: -L },
  ]

  return (
    <svg viewBox="0 0 100 100" className="cameraFrame" aria-hidden>
      {points.map(({ x, y, dx, dy, dx2, dy2 }, i) => (
        <g key={i}>
          <line x1={x} y1={y} x2={x + dx} y2={y + dy} stroke="#3b96f5" strokeWidth={S} strokeLinecap="round" />
          <line x1={x} y1={y} x2={x + dx2} y2={y + dy2} stroke="#3b96f5" strokeWidth={S} strokeLinecap="round" />
        </g>
      ))}
    </svg>
  )
}
