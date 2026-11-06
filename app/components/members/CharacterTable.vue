<script setup lang="ts">
import { findRace } from '#shared/data/races'
import {
  nextSort,
  primaryProfessions,
  sortCharacterRows,
  type CharacterSort,
  type CharacterSortKey,
  type CharacterTableRow,
} from '#shared/domain/character-table'
import type { CommunityMember } from '#shared/types'

/**
 * Sortierbare Charaktertabelle: jede Spaltenüberschrift ist ein Button (Klick wechselt A–Z / Z–A),
 * die aktive Sortierung steht in `aria-sort` und als Pfeil. Keine Filter – bewusst.
 */
const props = defineProps<{
  rows: (CharacterTableRow & { player: Pick<CommunityMember, 'id' | 'displayName' | 'avatarUrl'> })[]
}>()

const sort = defineModel<CharacterSort>('sort', { required: true })

const columns: { key: CharacterSortKey, label: string, numeric?: boolean }[] = [
  { key: 'name', label: 'Charakter' },
  { key: 'player', label: 'Spieler' },
  { key: 'level', label: 'Stufe', numeric: true },
  { key: 'class', label: 'Klasse' },
  { key: 'race', label: 'Volk' },
  { key: 'profession', label: 'Hauptberufe' },
  { key: 'skill', label: 'Skill', numeric: true },
]

const sorted = computed(() => sortCharacterRows(props.rows, sort.value))

const ariaSort = (key: CharacterSortKey) =>
  sort.value.key === key ? (sort.value.direction === 'asc' ? 'ascending' : 'descending') : undefined

const announcement = computed(() => {
  const column = columns.find(entry => entry.key === sort.value.key)!
  return `Sortiert nach ${column.label}, ${sort.value.direction === 'asc' ? 'aufsteigend' : 'absteigend'}.`
})
</script>

<template>
  <div class="character-table">
    <div
      class="character-table__scroller"
      role="region"
      aria-labelledby="character-table-caption"
      tabindex="0"
    >
      <table class="character-table__table">
        <caption
          id="character-table-caption"
          class="visually-hidden"
        >
          Charaktere der Gilde – Spaltenüberschriften sortieren die Tabelle
        </caption>
        <thead>
          <tr>
            <th
              v-for="column in columns"
              :key="column.key"
              scope="col"
              :aria-sort="ariaSort(column.key)"
              class="character-table__head"
              :class="{ 'character-table__head--numeric': column.numeric }"
            >
              <button
                type="button"
                class="character-table__sort"
                :class="{ 'character-table__sort--active': sort.key === column.key }"
                @click="sort = nextSort(sort, column.key)"
              >
                {{ column.label }}
                <BaseIcon
                  name="chevronDown"
                  :size="14"
                  class="character-table__arrow"
                  :class="{
                    'character-table__arrow--asc': sort.key === column.key && sort.direction === 'asc',
                    'character-table__arrow--idle': sort.key !== column.key,
                  }"
                />
              </button>
            </th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="row in sorted"
            :key="row.character.id"
            class="character-table__row"
          >
            <th
              scope="row"
              class="character-table__cell character-table__cell--name"
            >
              <NuxtLink
                :to="`/charaktere/${row.character.id}`"
                class="character-table__link"
              >{{ row.character.name }}</NuxtLink>
              <span
                v-if="row.character.isMain"
                class="character-table__main"
              >Main</span>
            </th>
            <td class="character-table__cell">
              <NuxtLink
                :to="`/mitglieder/${row.player.id}`"
                class="character-table__player"
              >
                <MemberAvatar
                  :name="row.player.displayName"
                  :src="row.player.avatarUrl"
                  size="sm"
                />
                {{ row.player.displayName }}
              </NuxtLink>
            </td>
            <td class="character-table__cell character-table__cell--numeric">
              {{ row.character.level }}
            </td>
            <td class="character-table__cell">
              <ClassBadge :class-id="row.character.classId" />
            </td>
            <td class="character-table__cell">
              {{ findRace(row.character.raceId)?.name ?? row.character.raceId }}
            </td>
            <td class="character-table__cell">
              <ul
                v-if="primaryProfessions(row.character).length"
                class="character-table__professions"
              >
                <li
                  v-for="profession in primaryProfessions(row.character)"
                  :key="profession.id"
                >
                  {{ profession.name }}
                </li>
              </ul>
              <span
                v-else
                class="character-table__missing"
              >–<span class="visually-hidden">keine Angaben</span></span>
            </td>
            <td class="character-table__cell character-table__cell--numeric">
              <ul
                v-if="primaryProfessions(row.character).length"
                class="character-table__professions"
              >
                <li
                  v-for="profession in primaryProfessions(row.character)"
                  :key="profession.id"
                >
                  <span class="visually-hidden">{{ profession.name }}: </span>{{ profession.skill }}<span
                    v-if="profession.maxSkill"
                    class="character-table__max"
                  > / {{ profession.maxSkill }}</span>
                </li>
              </ul>
              <span
                v-else
                class="character-table__missing"
              >–<span class="visually-hidden">keine Angaben</span></span>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
    <p
      class="visually-hidden"
      aria-live="polite"
    >
      {{ announcement }}
    </p>
  </div>
</template>

<style scoped lang="scss">
.character-table {
  &__scroller {
    overflow-x: auto;
    border: 1px solid var(--color-border);
    border-radius: var(--radius-lg);

    @include focus-ring(2px);
  }

  &__table {
    width: 100%;
    min-width: 52rem;
    font-size: var(--text-sm);
    border-collapse: collapse;
  }

  &__head {
    padding: 0;
    text-align: left;
    white-space: nowrap;
    background: var(--color-surface);
    border-bottom: 1px solid var(--color-border-strong);

    &--numeric { text-align: right; }
  }

  &__sort {
    display: inline-flex;
    gap: var(--space-1);
    align-items: center;
    width: 100%;
    padding: var(--space-3) var(--space-4);
    font-size: var(--text-xs);
    font-weight: var(--font-weight-semibold);
    color: var(--color-text-muted);
    text-transform: uppercase;
    letter-spacing: 0.06em;
    cursor: pointer;

    @include focus-ring(-2px);

    .character-table__head--numeric & { justify-content: flex-end; }

    &:hover { color: var(--color-text); }

    &--active { color: var(--color-frost); }
  }

  &__arrow {
    flex-shrink: 0;
    transition: transform var(--duration-fast, 150ms) ease;

    &--asc { transform: rotate(180deg); }

    // Inaktive Spalten: angedeuteter Pfeil, erst beim Überfahren sichtbar
    &--idle {
      opacity: 0;

      .character-table__sort:hover &,
      .character-table__sort:focus-visible & { opacity: 0.5; }
    }
  }

  &__row {
    border-bottom: 1px solid var(--color-border);

    &:last-child { border-bottom: 0; }

    &:hover { background: rgb(150 190 255 / 4%); }
  }

  &__cell {
    padding: var(--space-3) var(--space-4);
    font-weight: var(--font-weight-regular);
    color: var(--color-text-muted);
    text-align: left;
    vertical-align: middle;

    &--name {
      white-space: nowrap;
    }

    &--numeric {
      font-variant-numeric: tabular-nums;
      text-align: right;
    }
  }

  &__link {
    font-weight: var(--font-weight-semibold);
    color: var(--color-frost);
    text-decoration: none;

    @include focus-ring(2px);

    &:hover { text-decoration: underline; }
  }

  &__main {
    padding: 0 var(--space-1);
    margin-left: var(--space-2);
    font-size: var(--text-xs);
    color: var(--color-lantern);
    border: 1px solid rgb(245 183 104 / 40%);
    border-radius: var(--radius-sm);
  }

  &__player {
    display: inline-flex;
    gap: var(--space-2);
    align-items: center;
    color: inherit;
    text-decoration: none;
    white-space: nowrap;

    @include focus-ring(2px);

    &:hover { color: var(--color-text); }
  }

  &__professions {
    display: grid;
    gap: 2px;
    padding: 0;
    margin: 0;
    list-style: none;
    white-space: nowrap;
  }

  &__max {
    color: var(--color-text-subtle);
  }

  &__missing {
    color: var(--color-text-subtle);
  }
}
</style>
