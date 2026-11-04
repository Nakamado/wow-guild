<script setup lang="ts">
import { MAX_LEVEL } from '#shared/schemas/common'
import type { Character } from '#shared/types'

export interface DungeonFilterState {
  query: string
  level: number | null
  characterId: string | null
  onlyWithRuns: boolean
}

const filter = defineModel<DungeonFilterState>({ required: true })
defineProps<{ characters: Character[], resultCount: number }>()

const ids = { query: useId(), level: useId(), character: useId(), runs: useId() }

function update<K extends keyof DungeonFilterState>(key: K, value: DungeonFilterState[K]) {
  filter.value = { ...filter.value, [key]: value }
}

function toLevel(value: string) {
  const level = Number.parseInt(value, 10)
  return Number.isFinite(level) ? Math.min(MAX_LEVEL, Math.max(1, level)) : null
}

const isActive = computed(() => Boolean(filter.value.query || filter.value.level || filter.value.characterId || filter.value.onlyWithRuns))
</script>

<template>
  <form
    class="dungeon-filters"
    role="search"
    aria-label="Dungeons filtern"
    @submit.prevent
  >
    <div class="dungeon-filters__field dungeon-filters__field--query">
      <label
        :for="ids.query"
        class="dungeon-filters__label"
      >Dungeon</label>
      <input
        :id="ids.query"
        type="search"
        class="dungeon-filters__input"
        placeholder="Name, Kürzel oder Gebiet"
        :value="filter.query"
        @input="update('query', ($event.target as HTMLInputElement).value)"
      >
    </div>

    <div class="dungeon-filters__field">
      <label
        :for="ids.level"
        class="dungeon-filters__label"
      >Für Stufe</label>
      <input
        :id="ids.level"
        type="number"
        inputmode="numeric"
        min="1"
        :max="MAX_LEVEL"
        class="dungeon-filters__input"
        placeholder="z. B. 24"
        :value="filter.level ?? ''"
        @change="update('level', toLevel(($event.target as HTMLInputElement).value))"
      >
    </div>

    <div
      v-if="characters.length"
      class="dungeon-filters__field"
    >
      <label
        :for="ids.character"
        class="dungeon-filters__label"
      >Passend für</label>
      <select
        :id="ids.character"
        class="dungeon-filters__input"
        :value="filter.characterId ?? ''"
        @change="update('characterId', ($event.target as HTMLSelectElement).value || null)"
      >
        <option value="">
          Alle Charaktere
        </option>
        <option
          v-for="character in characters"
          :key="character.id"
          :value="character.id"
        >
          {{ character.name }} (Stufe {{ character.level }})
        </option>
      </select>
    </div>

    <label
      :for="ids.runs"
      class="dungeon-filters__toggle"
    >
      <input
        :id="ids.runs"
        type="checkbox"
        class="dungeon-filters__checkbox"
        :checked="filter.onlyWithRuns"
        @change="update('onlyWithRuns', ($event.target as HTMLInputElement).checked)"
      >
      Nur mit geplanten Gruppen
    </label>

    <div class="dungeon-filters__summary">
      <p
        class="dungeon-filters__count"
        role="status"
      >
        {{ resultCount }} {{ resultCount === 1 ? 'Dungeon' : 'Dungeons' }}
      </p>
      <BaseButton
        v-if="isActive"
        variant="ghost"
        size="sm"
        @click="filter = { query: '', level: null, characterId: null, onlyWithRuns: false }"
      >
        Filter zurücksetzen
      </BaseButton>
    </div>
  </form>
</template>

<style scoped lang="scss">
.dungeon-filters {
  display: grid;
  gap: var(--space-4);
  align-items: end;
  padding: var(--space-5);

  @include card-surface;

  @include mq('md') {
    grid-template-columns: 2fr 1fr 1.4fr auto;
  }

  &__field {
    display: flex;
    flex-direction: column;
    gap: var(--space-2);
    min-width: 0;
  }

  &__label {
    font-size: var(--text-sm);
    font-weight: var(--font-weight-medium);
    color: var(--color-text-muted);
  }

  &__input {
    width: 100%;
    min-height: 2.75rem;
    padding: var(--space-2) var(--space-3);
    color: var(--color-text);
    background: var(--color-bg);
    border: 1px solid var(--color-border-strong);
    border-radius: var(--radius-md);

    &:hover {
      border-color: var(--color-accent-strong);
    }

    @include focus-ring(2px);
  }

  &__toggle {
    display: inline-flex;
    gap: var(--space-2);
    align-items: center;
    min-height: 2.75rem;
    font-size: var(--text-sm);
    color: var(--color-text);
    cursor: pointer;
  }

  &__checkbox {
    width: 1.125rem;
    height: 1.125rem;
    accent-color: var(--color-accent);
  }

  &__summary {
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-3);
    align-items: center;
    justify-content: space-between;
    padding-top: var(--space-3);
    border-top: 1px solid var(--color-border);

    @include mq('md') {
      grid-column: 1 / -1;
    }
  }

  &__count {
    font-size: var(--text-sm);
    color: var(--color-text-muted);
  }
}
</style>
