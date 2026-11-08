<script setup lang="ts">
import { checkLevelFit, formatRange } from '#shared/domain/level'
import { dungeonQuestCount, type DungeonQuestStatus } from '#shared/domain/quests'
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
// Gesamtzahl der Quests – für die Fraktion des ausgewählten Charakters, sonst Allianz (Gildenfraktion)
const questTotal = computed(() => dungeonQuestCount(props.dungeon.slug, props.character?.faction === 'horde' ? 'horde' : 'alliance'))
</script>

<template>
  <article
    class="dungeon-card"
    :class="{ 'dungeon-card--new': dungeon.isNewInForever }"
  >
    <!-- Titel und englischer Name sind zwei Zeilen des gemeinsamen Rasters -->
    <header class="dungeon-card__header">
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
    </header>
    <!-- Abzeichen sitzt oben rechts auf der Kartenkante und braucht keine eigene Zeile -->
    <span
      v-if="dungeon.isNewInForever"
      class="dungeon-card__badge"
    >Neu in Forever</span>

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
      <div
        class="dungeon-card__fact"
        :class="{ 'dungeon-card__fact--complete': quests?.complete }"
      >
        <dt>Quests</dt>
        <dd>
          <template v-if="quests">
            {{ quests.done }}/{{ quests.total }}<span
              v-if="quests.complete"
              class="visually-hidden"
            > – alle erledigt</span>
          </template>
          <template v-else>
            {{ questTotal || '–' }}
          </template>
        </dd>
        <!-- Haken unter der Zahl; der Platz ist in jeder Spalte reserviert, damit alle Zahlen gleich hoch stehen -->
        <BaseIcon
          v-if="quests?.complete"
          name="check"
          :size="16"
          class="dungeon-card__check"
        />
      </div>
    </dl>

    <p class="dungeon-card__zone">
      {{ dungeon.zone }}
    </p>

    <div class="dungeon-card__info">
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
        v-if="quests && !quests.complete && quests.missing.length <= 2"
        class="dungeon-card__quests"
      >
        Fehlt noch: {{ quests.missing.join(', ') }}
      </p>
    </div>

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
  display: grid;
  grid-row: span 6;
  grid-template-rows: subgrid;
  row-gap: var(--space-4);
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
    display: grid;
    grid-row: span 2;
    grid-template-rows: subgrid;
    row-gap: var(--space-1);
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
    align-self: start;
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
    position: absolute;
    top: 0;
    right: var(--space-4);
    padding: 0.125rem var(--space-2);
    font-size: var(--text-xs);
    font-weight: var(--font-weight-semibold);
    color: var(--color-blossom);
    white-space: nowrap;
    background: var(--color-surface);
    border: 1px solid rgb(243 196 221 / 40%);
    border-radius: var(--radius-sm);
    transform: translateY(-50%);
  }

  &__facts {
    display: grid;

    // feste Spaltenbreiten: dieselbe Angabe steht in jeder Karte an derselben Stelle
    grid-template-columns: minmax(0, 1.5fr) repeat(3, minmax(0, 1fr));
    gap: var(--space-2);
    align-self: start;
    margin: 0;
  }

  &__fact {
    display: grid;

    // Zahl · Platz für den Haken · Bezeichnung (dt steht im Markup zuerst)
    grid-template-rows: auto 1rem auto;
    grid-template-areas: 'value' 'mark' 'label';

    dt {
      grid-area: label;
      font-size: var(--text-xs);
      color: var(--color-text-subtle);
    }

    dd {
      grid-area: value;
      margin: 0;
      font-family: var(--font-display);
      font-size: var(--text-lg);
      line-height: var(--line-height-snug);
      color: var(--color-text);
      font-variant-numeric: tabular-nums;
      white-space: nowrap;
    }

    &--complete dd {
      color: var(--color-success);
    }
  }

  &__check {
    grid-area: mark;
    color: var(--color-success);
  }

  &__zone {
    align-self: start;
    font-size: var(--text-sm);
    color: var(--color-text-muted);
  }

  &__info {
    display: flex;
    flex-direction: column;
    gap: var(--space-2);
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
    color: var(--color-text-subtle);
  }

  &__footer {
    align-self: end;
    padding-top: var(--space-3);
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
