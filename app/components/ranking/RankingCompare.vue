<script setup lang="ts">
import { mergePointLines, standings, type PointsLine } from '#shared/domain/compare'
import type { ProgressType } from '#shared/schemas/points'

export interface CompareEntry {
  rank: number
  displayName: string
  mainCharacter: { name: string, classId: string, level: number } | null
  characterCount: number
  points: number
  breakdown: { lines: PointsLine[] }
}

const props = defineProps<{
  /** 2 bis 4 Einträge der Rangliste */
  entries: CompareEntry[]
  board: 'main' | 'total'
  order: ProgressType[]
}>()

/** kurze Bezeichnungen – die Tabelle muss auch auf dem Handy passen */
const labels: Record<ProgressType, string> = {
  'level': 'Levelaufstiege',
  'dungeon-quest': 'Dungeon-Quests',
  'group-quest': 'Gruppenquests',
  'dungeon-first': 'Dungeons vollständig',
  'dungeon-complete': 'Dungeon-Abschlüsse',
  'dungeon-boss': 'Dungeon-Bosse',
  'raid-first': 'Raid-Erstabschlüsse',
  'raid-boss': 'Raid-Bosse',
  'profession-milestone': 'Berufsmeilensteine',
}

const number = new Intl.NumberFormat('de-DE')
const nameOf = (entry: CompareEntry) => (props.board === 'main' ? entry.mainCharacter?.name ?? entry.displayName : entry.displayName)

interface Cell { value: string, count: number | null, best: boolean, gap: string | null }
interface Row { label: string, cells: Cell[], total?: boolean }

const rows = computed<Row[]>(() => {
  const format = (value: number | null | undefined) => (value == null ? '–' : number.format(value))
  const row = (label: string, values: (number | null | undefined)[], options: { counts?: number[], lowerIsBetter?: boolean, total?: boolean } = {}): Row => {
    const marks = standings(values, options.lowerIsBetter)
    return {
      label,
      total: options.total,
      cells: values.map((value, index) => ({
        value: format(value),
        count: options.counts?.[index] ?? null,
        best: marks[index]!.best,
        // Rückstand nur bei Punkten und Stufen – beim Platz sagt die Zahl selbst schon alles
        gap: !options.lowerIsBetter && marks[index]!.gap ? `−${number.format(marks[index]!.gap!)}` : null,
      })),
    }
  }
  const lines = mergePointLines(props.order, props.entries.map(entry => entry.breakdown.lines))
  return [
    row('Platz', props.entries.map(entry => entry.rank), { lowerIsBetter: true }),
    row('Punkte gesamt', props.entries.map(entry => entry.points), { total: true }),
    props.board === 'main'
      ? row('Stufe', props.entries.map(entry => entry.mainCharacter?.level))
      : row('Charaktere', props.entries.map(entry => entry.characterCount)),
    ...lines.map(line => row(labels[line.type], line.entries.map(entry => entry.points), { counts: line.entries.map(entry => entry.count) })),
  ]
})
</script>

<template>
  <div
    class="ranking-compare"
    role="region"
    aria-label="Vergleichstabelle"
    tabindex="0"
  >
    <table class="ranking-compare__table">
      <thead>
        <tr>
          <th scope="col">
            <span class="visually-hidden">Wert</span>
          </th>
          <th
            v-for="(entry, index) in entries"
            :key="index"
            scope="col"
          >
            <span
              class="ranking-compare__name"
              :style="board === 'main' && entry.mainCharacter ? { '--class-color': `var(--color-class-${entry.mainCharacter.classId}, var(--color-text))` } : undefined"
            >{{ nameOf(entry) }}</span>
            <span
              v-if="board === 'main' && entry.mainCharacter"
              class="ranking-compare__owner"
            >{{ entry.displayName }}</span>
          </th>
        </tr>
      </thead>
      <tbody>
        <tr
          v-for="row in rows"
          :key="row.label"
          :class="{ 'ranking-compare__total': row.total }"
        >
          <th scope="row">
            {{ row.label }}
          </th>
          <td
            v-for="(cell, index) in row.cells"
            :key="index"
            :class="{ 'ranking-compare__best': cell.best }"
          >
            {{ cell.value }}<span
              v-if="cell.count !== null"
              class="ranking-compare__count"
            > ×{{ cell.count }}</span>
            <span
              v-if="cell.best"
              class="visually-hidden"
            > (Bestwert)</span>
            <span
              v-else-if="cell.gap"
              class="ranking-compare__gap"
            ><span class="visually-hidden">Abstand zum Bestwert: </span>{{ cell.gap }}</span>
          </td>
        </tr>
      </tbody>
    </table>
    <p class="ranking-compare__legend">
      Hervorgehoben: der beste Wert je Zeile. Darunter der Abstand dazu.
    </p>
  </div>
</template>

<style scoped lang="scss">
.ranking-compare {
  overflow-x: auto;

  @include focus-ring(2px);

  &__table {
    width: 100%;
    font-size: var(--text-sm);

    // separate statt collapse: sonst verschwinden Linien an der festen ersten Spalte
    border-spacing: 0;
    border-collapse: separate;

    th,
    td {
      padding: var(--space-2);
      text-align: left;
      vertical-align: top;
      border-bottom: 1px solid var(--color-border);
    }

    tbody tr:last-child > * {
      border-bottom: 0;
    }

    thead th {
      min-width: 6rem;
      vertical-align: bottom;
    }

    // Bezeichnungen bleiben beim seitlichen Scrollen stehen
    th:first-child {
      position: sticky;
      left: 0;
      z-index: 1;
      min-width: 6.5rem;
      max-width: 9rem;
      background: color-mix(in srgb, var(--color-surface-raised) 50%, var(--color-surface));
      box-shadow: inset 0 -1px 0 var(--color-border);
      hyphens: auto;
    }

    tbody th {
      font-weight: var(--font-weight-medium);
      color: var(--color-text-muted);
    }

    td {
      font-variant-numeric: tabular-nums;
      white-space: nowrap;
    }
  }

  &__name {
    display: block;
    font-family: var(--font-display);
    font-size: var(--text-sm);
    color: var(--class-color, var(--color-text));
  }

  &__owner {
    display: block;
    font-size: var(--text-xs);
    font-weight: var(--font-weight-regular);
    color: var(--color-text-subtle);
  }

  &__total > * {
    font-weight: var(--font-weight-semibold);
    color: var(--color-text);
  }

  &__count {
    font-size: var(--text-xs);
    color: var(--color-text-subtle);
  }

  &__best {
    font-weight: var(--font-weight-semibold);
    color: var(--color-accent);
  }

  &__gap {
    display: block;
    font-size: var(--text-xs);
    color: var(--color-text-subtle);
  }

  &__legend {
    margin-top: var(--space-3);
    font-size: var(--text-xs);
    color: var(--color-text-subtle);
  }
}
</style>
