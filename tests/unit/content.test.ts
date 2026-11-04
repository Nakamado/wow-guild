import { describe, expect, it } from 'vitest'
import { guildContent } from '../../content/guild'
import { rulesContent } from '../../content/rules'
import { GuildContentSchema, RulesContentSchema } from '../../shared/schemas/content'
import { createDrifters, createStars, forestPath, ridgePath } from '../../app/utils/landscape'

describe('Inhaltsdateien', () => {
  it('Gildentexte entsprechen dem Schema', () => {
    expect(() => GuildContentSchema.parse(guildContent)).not.toThrow()
  })

  it('Regeln entsprechen dem Schema und haben eindeutige Abschnitts-IDs (Sprungmarken)', () => {
    RulesContentSchema.parse(rulesContent)
    const ids = rulesContent.sections.map(section => section.id)
    expect(new Set(ids).size).toBe(ids.length)
  })
})

describe('Hero-Landschaft', () => {
  it('erzeugt bei gleichem Seed identische Formen (keine Hydration-Abweichung)', () => {
    const options = { seed: 7, width: 1600, height: 900, baseY: 560, amplitude: 230, peaks: 7 }
    expect(ridgePath(options)).toBe(ridgePath(options))
    expect(forestPath(5, 1600, 900, 735)).toBe(forestPath(5, 1600, 900, 735))
    expect(createStars(3, 20, 1600, 500)).toEqual(createStars(3, 20, 1600, 500))
  })

  it('bleibt innerhalb der Zeichenfläche', () => {
    const numbers = ridgePath({ seed: 21, width: 1600, height: 900, baseY: 650, amplitude: 160, peaks: 9 })
      .match(/-?\d+(\.\d+)?/g)!
      .map(Number)
    expect(Math.min(...numbers)).toBeGreaterThanOrEqual(0)
    for (const drifter of createDrifters(1, 30, { minSize: 8, maxSize: 14, minDuration: 10, maxDuration: 20 })) {
      expect(drifter.left).toBeGreaterThanOrEqual(0)
      expect(drifter.left).toBeLessThanOrEqual(100)
    }
  })
})
