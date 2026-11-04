import { describe, expect, it } from 'vitest'
import { legalNavigation, mainNavigation } from '../../app/utils/navigation'

describe('navigation', () => {
  it('beginnt mit der Startseite', () => {
    expect(mainNavigation[0]).toEqual({ label: 'Start', to: '/' })
  })

  it('enthält keine doppelten Ziele', () => {
    const targets = [...mainNavigation, ...legalNavigation].map(item => item.to)
    expect(new Set(targets).size).toBe(targets.length)
  })

  it('verwendet nur interne, absolute Pfade', () => {
    for (const item of [...mainNavigation, ...legalNavigation]) {
      expect(item.to).toMatch(/^\/[a-z-]*$/)
    }
  })
})
