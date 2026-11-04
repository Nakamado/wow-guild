<script setup lang="ts">
import { gameClasses } from '#shared/data/classes'
import { roles } from '#shared/data/roles'
import { MAX_LEVEL } from '#shared/schemas/common'
import type { MemberFilter } from '#shared/domain/members'

const filter = defineModel<MemberFilter>({ required: true })
defineProps<{ resultCount: number }>()

const ids = { query: useId(), classId: useId(), role: useId(), min: useId(), max: useId() }

function update<K extends keyof MemberFilter>(key: K, value: MemberFilter[K]) {
  filter.value = { ...filter.value, [key]: value }
}

function toLevel(value: string): number | null {
  const level = Number.parseInt(value, 10)
  return Number.isFinite(level) ? Math.min(MAX_LEVEL, Math.max(1, level)) : null
}

const isActive = computed(() =>
  Boolean(filter.value.query || filter.value.classId || filter.value.role || filter.value.minLevel || filter.value.maxLevel),
)
</script>

<template>
  <form
    class="member-filters"
    role="search"
    aria-label="Mitglieder filtern"
    @submit.prevent
  >
    <div class="member-filters__field member-filters__field--query">
      <label
        :for="ids.query"
        class="member-filters__label"
      >Name</label>
      <div class="member-filters__search">
        <BaseIcon
          name="search"
          :size="18"
          class="member-filters__search-icon"
        />
        <input
          :id="ids.query"
          type="search"
          class="member-filters__input member-filters__input--search"
          placeholder="Mitglied oder Charakter"
          :value="filter.query ?? ''"
          @input="update('query', ($event.target as HTMLInputElement).value)"
        >
      </div>
    </div>

    <div class="member-filters__field">
      <label
        :for="ids.classId"
        class="member-filters__label"
      >Klasse</label>
      <select
        :id="ids.classId"
        class="member-filters__input"
        :value="filter.classId ?? ''"
        @change="update('classId', ($event.target as HTMLSelectElement).value || null)"
      >
        <option value="">
          Alle Klassen
        </option>
        <option
          v-for="gameClass in gameClasses"
          :key="gameClass.id"
          :value="gameClass.id"
        >
          {{ gameClass.name }}
        </option>
      </select>
    </div>

    <div class="member-filters__field">
      <label
        :for="ids.role"
        class="member-filters__label"
      >Rolle</label>
      <select
        :id="ids.role"
        class="member-filters__input"
        :value="filter.role ?? ''"
        @change="update('role', (($event.target as HTMLSelectElement).value || null) as MemberFilter['role'])"
      >
        <option value="">
          Alle Rollen
        </option>
        <option
          v-for="role in roles"
          :key="role.id"
          :value="role.id"
        >
          {{ role.name }}
        </option>
      </select>
    </div>

    <fieldset class="member-filters__field member-filters__levels">
      <legend class="member-filters__label">
        Stufe
      </legend>
      <label
        :for="ids.min"
        class="visually-hidden"
      >Stufe von</label>
      <input
        :id="ids.min"
        type="number"
        inputmode="numeric"
        min="1"
        :max="MAX_LEVEL"
        class="member-filters__input member-filters__input--level"
        placeholder="von"
        :value="filter.minLevel ?? ''"
        @change="update('minLevel', toLevel(($event.target as HTMLInputElement).value))"
      >
      <span aria-hidden="true">–</span>
      <label
        :for="ids.max"
        class="visually-hidden"
      >Stufe bis</label>
      <input
        :id="ids.max"
        type="number"
        inputmode="numeric"
        min="1"
        :max="MAX_LEVEL"
        class="member-filters__input member-filters__input--level"
        placeholder="bis"
        :value="filter.maxLevel ?? ''"
        @change="update('maxLevel', toLevel(($event.target as HTMLInputElement).value))"
      >
    </fieldset>

    <div class="member-filters__summary">
      <p
        class="member-filters__count"
        role="status"
      >
        {{ resultCount }} {{ resultCount === 1 ? 'Mitglied' : 'Mitglieder' }}
      </p>
      <BaseButton
        v-if="isActive"
        variant="ghost"
        size="sm"
        @click="filter = {}"
      >
        Filter zurücksetzen
      </BaseButton>
    </div>
  </form>
</template>

<style scoped lang="scss">
.member-filters {
  display: grid;
  grid-template-columns: 1fr;
  gap: var(--space-4);
  align-items: end;
  padding: var(--space-5);

  @include card-surface;

  @include mq('md') {
    grid-template-columns: 2fr 1fr 1fr auto;
  }

  &__field {
    display: flex;
    flex-direction: column;
    gap: var(--space-2);
    min-width: 0;
    padding: 0;
    margin: 0;
    border: 0;
  }

  &__label {
    padding: 0;
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
    transition: border-color var(--duration-fast) var(--ease-out);

    &:hover {
      border-color: var(--color-accent-strong);
    }

    @include focus-ring(2px);

    &--search {
      padding-left: 2.5rem;
    }

    &--level {
      width: 5rem;
    }
  }

  &__search {
    position: relative;
  }

  &__search-icon {
    position: absolute;
    top: 50%;
    left: var(--space-3);
    color: var(--color-text-subtle);
    transform: translateY(-50%);
  }

  &__levels {
    flex-flow: row wrap;
    gap: var(--space-2);
    align-items: center;

    .member-filters__label {
      flex-basis: 100%;
    }
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
