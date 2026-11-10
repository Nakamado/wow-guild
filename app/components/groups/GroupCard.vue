<script setup lang="ts">
import { computeComposition } from '#shared/domain/composition'
import type { Dungeon, GroupRun } from '#shared/types'

const props = defineProps<{
  run: GroupRun
  dungeon: Dungeon | undefined
  /** Eigene Anmeldung des Betrachters */
  joined?: 'participant' | 'waitlist' | null
  /** eigene Anmeldung ist eine Supporter-Anmeldung */
  joinedAsSupport?: boolean
}>()

const composition = computed(() => computeComposition(props.run))
// Plätze mit Supportern werden für feste Zusagen frei
const supporters = computed(() => props.run.participants.filter(entry => entry.support).length)
const openForFixed = computed(() => composition.value.open + supporters.value)
const title = computed(() => props.run.title ?? props.dungeon?.name ?? 'Gruppe')
const showDungeon = computed(() => Boolean(props.run.title && props.dungeon))
const date = computed(() => new Date(props.run.startsAt))
const day = computed(() => new Intl.DateTimeFormat('de-DE', { timeZone: DISPLAY_TIME_ZONE, day: '2-digit' }).format(date.value))
const month = computed(() => new Intl.DateTimeFormat('de-DE', { timeZone: DISPLAY_TIME_ZONE, month: 'short' }).format(date.value))
const weekday = computed(() => new Intl.DateTimeFormat('de-DE', { timeZone: DISPLAY_TIME_ZONE, weekday: 'long' }).format(date.value))
</script>

<template>
  <article
    class="group-card"
    :class="{ 'group-card--cancelled': run.status === 'cancelled', 'group-card--joined': joined }"
  >
    <time
      class="group-card__date"
      :datetime="run.startsAt"
    >
      <span class="group-card__day">{{ day }}</span>
      <span class="group-card__month">{{ month }}</span>
    </time>

    <div class="group-card__body">
      <h3 class="group-card__title">
        <NuxtLink
          :to="`/gruppen/${run.id}`"
          class="group-card__link"
        >{{ title }}</NuxtLink>
      </h3>
      <p class="group-card__meta">
        <span>{{ weekday }}, {{ formatTime(run.startsAt) }} Uhr</span>
        <span v-if="showDungeon">{{ dungeon?.name }}</span>
        <span
          v-if="supporters"
          class="group-card__support"
        >(+{{ supporters }}) = Supporter, macht Platz für feste Zusagen</span>
        <span v-if="run.questIds?.length">{{ run.questIds.length === 1 ? '1 Quest geplant' : `${run.questIds.length} Quests geplant` }}</span>
      </p>
      <GroupComposition :run="run" />
    </div>

    <div class="group-card__aside">
      <span
        v-if="run.status === 'cancelled'"
        class="group-card__status group-card__status--cancelled"
      >Abgesagt</span>
      <span
        v-else-if="openForFixed === 0"
        class="group-card__status group-card__status--full"
      >
        Voll<template v-if="run.waitlistEnabled">, Warteliste offen</template>
      </span>
      <span
        v-else
        class="group-card__status"
      >
        {{ openForFixed }} {{ openForFixed === 1 ? 'Platz' : 'Plätze' }} frei<template v-if="supporters"> für feste Zusagen</template>
      </span>
      <span
        v-if="joined === 'participant'"
        class="group-card__joined"
      >{{ joinedAsSupport ? 'Du hilfst aus' : 'Du bist dabei' }}</span>
      <span
        v-else-if="joined === 'waitlist'"
        class="group-card__joined"
      >Auf der Warteliste</span>
    </div>
  </article>
</template>

<style scoped lang="scss">
.group-card {
  position: relative;
  display: grid;
  grid-template-columns: auto 1fr;
  gap: var(--space-4);
  align-items: start;
  padding: var(--space-4) var(--space-5);
  transition: border-color var(--duration-base) var(--ease-out);

  @include card-surface;

  @include mq('md') {
    grid-template-columns: auto 1fr auto;
    align-items: center;
  }

  &:hover,
  &:focus-within {
    border-color: var(--color-border-strong);
  }

  &--joined {
    border-left: 3px solid var(--color-accent);
  }

  &__date {
    display: flex;
    flex-direction: column;
    align-items: center;
    width: 3.5rem;
    padding: var(--space-2) 0;
    line-height: 1;
    border: 1px solid rgb(143 211 255 / 35%);
    border-radius: var(--radius-md);
  }

  &__day {
    font-family: var(--font-display);
    font-size: var(--text-lg);
    color: var(--color-frost);
  }

  &__month {
    margin-top: var(--space-1);
    font-size: var(--text-xs);
    color: var(--color-accent);
  }

  &__body {
    display: flex;
    flex-direction: column;
    gap: var(--space-2);
    min-width: 0;
  }

  &__title {
    font-family: var(--font-sans);
    font-size: var(--text-base);
    font-weight: var(--font-weight-semibold);
    letter-spacing: 0;
  }

  &__link {
    color: var(--color-text);
    text-decoration: none;

    &::after {
      position: absolute;
      inset: 0;
      content: '';
      border-radius: var(--radius-lg);
    }

    &:hover {
      color: var(--color-frost);
    }
  }

  &__meta {
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-1) var(--space-3);
    font-size: var(--text-sm);
    color: var(--color-text-muted);
  }

  &__support {
    color: var(--color-frost);
  }

  &__aside {
    display: flex;
    flex-direction: column;
    grid-column: 2;
    gap: var(--space-1);
    align-items: flex-start;

    @include mq('md') {
      grid-column: auto;
      align-items: flex-end;
    }
  }

  &__status {
    font-size: var(--text-sm);
    font-weight: var(--font-weight-semibold);
    color: var(--color-success);
    white-space: nowrap;

    &--full {
      color: var(--color-text-muted);
    }

    &--cancelled {
      color: var(--color-danger);
    }
  }

  &__joined {
    font-size: var(--text-xs);
    color: var(--color-accent);
  }

  &--cancelled &__title {
    text-decoration: line-through;
  }

  &--cancelled &__link {
    color: var(--color-text-subtle);
  }
}
</style>
