import { roleIds } from '../data/roles'
import type { GroupRun, RoleCapacity, RoleId } from '../types'

export interface RoleSlots {
  role: RoleId
  filled: number
  capacity: number
  open: number
}

export interface Composition {
  slots: RoleSlots[]
  filled: number
  capacity: number
  open: number
  isFull: boolean
}

/** Besetzung eines Runs, z. B. „Tank 1/1 · Heiler 0/1 · DD 2/3“ */
export function computeComposition(run: Pick<GroupRun, 'capacity' | 'participants'>): Composition {
  const slots = roleIds.map((role) => {
    const capacity = run.capacity[role]
    const filled = run.participants.filter(participant => participant.role === role).length
    return { role, filled, capacity, open: Math.max(0, capacity - filled) }
  })
  const filled = slots.reduce((sum, slot) => sum + slot.filled, 0)
  const capacity = slots.reduce((sum, slot) => sum + slot.capacity, 0)
  const open = slots.reduce((sum, slot) => sum + slot.open, 0)
  return { slots, filled, capacity, open, isFull: open === 0 }
}

export function totalCapacity(capacity: RoleCapacity): number {
  return capacity.tank + capacity.healer + capacity.dps
}

/**
 * Standardbesetzung je Gruppengröße. Fünfer: 1 Tank, 1 Heiler, 3 DD.
 * Größere Gruppen sind Richtwerte und pro Run frei anpassbar.
 */
export function defaultCapacity(groupSize: number): RoleCapacity {
  const presets: Record<number, RoleCapacity> = {
    5: { tank: 1, healer: 1, dps: 3 },
    10: { tank: 2, healer: 3, dps: 5 },
    20: { tank: 3, healer: 5, dps: 12 },
    40: { tank: 4, healer: 10, dps: 26 },
  }
  const preset = presets[groupSize]
  if (preset) return preset

  const tank = Math.max(1, Math.round(groupSize / 10))
  const healer = Math.max(1, Math.round(groupSize / 4))
  return { tank, healer, dps: Math.max(0, groupSize - tank - healer) }
}
