/**
 * Prozedurale, aber deterministische Formen für die Hero-Landschaft.
 * Gleicher Seed → gleiche Pfade auf Server und Client (keine Hydration-Abweichung).
 */

/** Kleiner, schneller Pseudozufallsgenerator (mulberry32). */
export function createRandom(seed: number) {
  let state = seed >>> 0
  return () => {
    state = (state + 0x6D2B79F5) >>> 0
    let t = state
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const round = (value: number) => Math.round(value * 10) / 10

export interface RidgeOptions {
  seed: number
  width: number
  height: number
  /** mittlere Höhe des Kamms (y) */
  baseY: number
  amplitude: number
  /** Anzahl Gipfel */
  peaks: number
}

/** Gipfel und Täler eines Kamms (Grundgerüst, wird von ridgePath und snowcapPath geteilt). */
function ridgeKeyPoints({ seed, width, baseY, amplitude, peaks }: RidgeOptions) {
  const random = createRandom(seed)
  const step = width / (peaks * 2)
  const points: { x: number, y: number, isPeak: boolean }[] = [{ x: 0, y: baseY + random() * amplitude * 0.4, isPeak: false }]
  for (let index = 1; index <= peaks * 2; index++) {
    const x = index * step + (random() - 0.5) * step * 0.6
    const isPeak = index % 2 === 1
    const y = isPeak ? baseY - amplitude * (0.45 + random() * 0.55) : baseY - amplitude * random() * 0.25
    points.push({ x, y, isPeak })
  }
  points.push({ x: width, y: baseY, isPeak: false })
  return points
}

/** Gezackter Bergkamm als geschlossener Pfad bis zum unteren Rand (mit feinen Zwischenzacken). */
export function ridgePath(options: RidgeOptions): string {
  const keyPoints = ridgeKeyPoints(options)
  const jitter = createRandom(options.seed * 31 + 1)
  const parts: string[] = [`M0 ${options.height}`, `L0 ${round(keyPoints[0]!.y)}`]

  for (let index = 1; index < keyPoints.length; index++) {
    const from = keyPoints[index - 1]!
    const to = keyPoints[index]!
    // drei Zwischenpunkte mit kleinen Versätzen → natürlichere Silhouette
    for (let sub = 1; sub <= 3; sub++) {
      const t = sub / 4
      const x = from.x + (to.x - from.x) * t
      const y = from.y + (to.y - from.y) * t + (jitter() - 0.5) * options.amplitude * 0.12
      parts.push(`L${round(x)} ${round(y)}`)
    }
    parts.push(`L${round(to.x)} ${round(to.y)}`)
  }
  parts.push(`L${options.width} ${options.height}`, 'Z')
  return parts.join(' ')
}

/** Schneekappen: kleine Dreiecke an den Gipfeln eines Kamms (gleiche Seeds wie ridgePath). */
export function snowcapPath(options: RidgeOptions): string {
  const caps: string[] = []
  for (const { x, y, isPeak } of ridgeKeyPoints(options)) {
    if (isPeak && options.baseY - y > options.amplitude * 0.7) {
      const size = (options.baseY - y) * 0.16
      caps.push(`M${round(x)} ${round(y)} L${round(x - size * 0.9)} ${round(y + size)} L${round(x - size * 0.2)} ${round(y + size * 0.75)} L${round(x + size * 0.3)} ${round(y + size * 1.05)} L${round(x + size)} ${round(y + size * 0.95)} Z`)
    }
  }
  return caps.join(' ')
}

/** Reihe von Tannen auf einer Bodenlinie. */
export function forestPath(seed: number, width: number, height: number, groundY: number, density = 60): string {
  const random = createRandom(seed)
  const parts: string[] = [`M0 ${height} L0 ${groundY}`]
  let x = 0
  while (x < width) {
    const treeWidth = 18 + random() * 26
    const treeHeight = 40 + random() * 90
    const ground = groundY + Math.sin(x / 140) * 10
    parts.push(
      `L${round(x)} ${round(ground)}`,
      `L${round(x + treeWidth * 0.5)} ${round(ground - treeHeight)}`,
      `L${round(x + treeWidth)} ${round(ground)}`,
    )
    x += treeWidth * (0.45 + random() * (60 / density))
  }
  parts.push(`L${width} ${groundY}`, `L${width} ${height}`, 'Z')
  return parts.join(' ')
}

export interface Star {
  x: number
  y: number
  r: number
  twinkle: boolean
  delay: number
}

export function createStars(seed: number, count: number, width: number, maxY: number): Star[] {
  const random = createRandom(seed)
  return Array.from({ length: count }, (_, index) => ({
    x: round(random() * width),
    y: round(Math.pow(random(), 1.6) * maxY),
    r: round(0.4 + random() * 1.3),
    twinkle: index % 7 === 0,
    delay: round(random() * 6),
  }))
}

export interface Drifter {
  /** Startposition in % der Breite */
  left: number
  size: number
  duration: number
  delay: number
  sway: number
}

/** Laternen bzw. Blütenblätter mit gestaffelten Animationen. */
export function createDrifters(seed: number, count: number, options: { minSize: number, maxSize: number, minDuration: number, maxDuration: number }): Drifter[] {
  const random = createRandom(seed)
  return Array.from({ length: count }, () => ({
    left: round(4 + random() * 92),
    size: round(options.minSize + random() * (options.maxSize - options.minSize)),
    duration: round(options.minDuration + random() * (options.maxDuration - options.minDuration)),
    delay: round(-random() * options.maxDuration),
    sway: round((random() - 0.5) * 80),
  }))
}
