<script setup lang="ts">
import { checkLevelFit, formatRange } from '#shared/domain/level'
import type { DungeonQuestStatus } from '#shared/domain/quests'
import type { Character, Dungeon } from '#shared/types'

const props = defineProps<{
  dungeon: Dungeon
  openRuns: number
  /** Ausgewählter eigener Charakter für die Levelprüfung */
  character?: Character | null
  /** Quest-Stand des ausgewählten Charakters in diesem Dungeon */
  quests?: DungeonQuestStatus | null
}>()

const fit = computed(() => (props.character ? checkLevelFit(props.character.level, props.dungeon) : null))
const showEnglish = computed(() => props.dungeon.nameEn !== props.dungeon.name)
</script>

<template>
  <article
    class="dungeon-card"
    :class="{ 'dungeon-card--new': dungeon.isNewInForever }"
  >
    <header class="dungeon-card__header">
      <div class="dungeon-card__titles">
        <h2 class="dungeon-card__name">
          <NuxtLink
            :to="`/dungeons/${dungeon.slug}`"
            class="dungeon-card__link"
          >{{ dungeon.name }}</NuxtLink>
        </h2>
        <p class="dungeon-card__name-en">
          <span
            v-if="showEnglish"
            lang="en"
          >{{ dungeon.nameEn }}</span>
          <span class="dungeon-card__abbr"><span class="visually-hidden">Kürzel: </span>{{ dungeon.abbreviation }}</span>
        </p>
      </div>
      <span
        v-if="dungeon.isNewInForever"
        class="dungeon-card__badge"
      >Neu in Forever</span>
    </header>

    <dl class="dungeon-card__facts">
      <div class="dungeon-card__fact">
        <dt>Stufe</dt>
        <dd>{{ formatRange(dungeon.levelRange.min, dungeon.levelRange.max) }}</dd>
      </div>
      <div class="dungeon-card__fact">
        <dt>Ab</dt>
        <dd>{{ dungeon.minLevel ?? '–' }}</dd>
      </div>
      <div class="dungeon-card__fact">
        <dt>Spieler</dt>
        <dd>{{ dungeon.groupSize }}</dd>
      </div>
    </dl>

    <p class="dungeon-card__zone">
      {{ dungeon.zone }}
    </p>

    <p
      v-if="fit"
      class="dungeon-card__fit"
      :class="`dungeon-card__fit--${fit.status}`"
    >
      {{ fit.message }}
    </p>
    <p
      v-else-if="dungeon.note"
      class="dungeon-card__note"
    >
      {{ dungeon.note }}
    </p>

    <p
      v-if="quests"
      class="dungeon-card__quests"
      :class="{ 'dungeon-card__quests--complete': quests.complete }"
    >
      <span class="dungeon-card__quests-count">{{ quests.done }}/{{ quests.total }} Quests</span>
      <span v-if="quests.complete"> · alle erledigt</span>
      <span
        v-else-if="quests.missing.length <= 2"
        class="dungeon-card__quests-missing"
      > · fehlt noch: {{ quests.missing.join(', ') }}</span>
    </p>

    <footer class="dungeon-card__footer">
      <span
        v-if="openRuns"
        class="dungeon-card__runs"
      >
        {{ openRuns }} {{ openRuns === 1 ? 'Gruppe geplant' : 'Gruppen geplant' }}
      </span>
      <span
        v-else
        class="dungeon-card__runs dungeon-card__runs--none"
      >Keine Gruppe geplant</span>
    </footer>
  </article>
</template>

<style scoped lang="scss">
.dungeon-card {
  position: relative;
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
  height: 100%;
  padding: var(--space-5);
  transition: border-color var(--duration-base) var(--ease-out);

  @include card-surface;

  &:hover,
  &:focus-within {
    border-color: var(--color-border-strong);
  }

  &--new {
    border-top: 2px solid var(--color-blossom);
  }

  &__header {
    display: flex;
    gap: var(--space-3);
    align-items: flex-start;
    justify-content: space-between;
  }

  &__titles {
    min-width: 0;
  }

  &__name {
    font-family: var(--font-display);
    font-size: var(--text-md);
    line-height: var(--line-height-snug);
    overflow-wrap: normal;
    hyphens: auto;
  }

  &__link {
    color: var(--color-frost);
    text-decoration: none;

    &::after {
      position: absolute;
      inset: 0;
      content: '';
      border-radius: var(--radius-lg);
    }
  }

  &__name-en {
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-2);
    align-items: center;
    margin-top: var(--space-1);
    font-size: var(--text-xs);
    color: var(--color-text-subtle);
  }

  &__abbr {
    padding: 0 var(--space-1);
    font-weight: var(--font-weight-semibold);
    color: var(--color-text-muted);
    letter-spacing: 0.04em;
    border: 1px solid var(--color-border);
    border-radius: var(--radius-sm);
  }

  &__badge {
    flex-shrink: 0;
    padding: 0.125rem var(--space-2);
    font-size: var(--text-xs);
    font-weight: var(--font-weight-semibold);
    color: var(--color-blossom);
    white-space: nowrap;
    border: 1px solid rgb(243 196 221 / 40%);
    border-radius: var(--radius-sm);
  }

  &__facts {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: var(--space-2);
    margin: 0;
  }

  &__fact {
    display: flex;
    flex-direction: column-reverse;
    gap: 2px;

    dt {
      font-size: var(--text-xs);
      color: var(--color-text-subtle);
    }

    dd {
      margin: 0;
      font-family: var(--font-display);
      font-size: var(--text-lg);
      color: var(--color-text);
      font-variant-numeric: tabular-nums;
    }
  }

  &__zone {
    font-size: var(--text-sm);
    color: var(--color-text-muted);
  }

  &__note {
    font-size: var(--text-xs);
    color: var(--color-warning);
  }

  &__fit {
    padding: var(--space-2) var(--space-3);
    font-size: var(--text-xs);
    border-radius: var(--radius-sm);

    &--fit {
      color: var(--color-success);
      background: rgb(126 226 168 / 8%);
    }

    &--below-recommended,
    &--above-recommended {
      color: var(--color-warning);
      background: rgb(245 199 104 / 8%);
    }

    &--below-minimum {
      color: var(--color-danger);
      background: rgb(255 138 138 / 8%);
    }
  }

  &__quests {
    font-size: var(--text-xs);
    color: var(--color-text-muted);

    &--complete {
      color: var(--color-success);
    }
  }

  &__quests-count {
    font-weight: var(--font-weight-semibold);
    font-variant-numeric: tabular-nums;
  }

  &__quests-missing {
    color: var(--color-text-subtle);
  }

  &__footer {
    padding-top: var(--space-3);
    margin-top: auto;
    border-top: 1px solid var(--color-border);
  }

  &__runs {
    font-size: var(--text-sm);
    font-weight: var(--font-weight-semibold);
    color: var(--color-accent);

    &--none {
      font-weight: var(--font-weight-regular);
      color: var(--color-text-subtle);
    }
  }
}
</style>
