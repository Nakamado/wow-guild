<script setup lang="ts">
import type { CalendarEvent } from '#shared/types'

const props = defineProps<{ event: CalendarEvent }>()

const date = computed(() => new Date(props.event.startsAt))
const day = computed(() => new Intl.DateTimeFormat('de-DE', { timeZone: DISPLAY_TIME_ZONE, day: '2-digit' }).format(date.value))
const month = computed(() => new Intl.DateTimeFormat('de-DE', { timeZone: DISPLAY_TIME_ZONE, month: 'short' }).format(date.value))
const weekday = computed(() => new Intl.DateTimeFormat('de-DE', { timeZone: DISPLAY_TIME_ZONE, weekday: 'long' }).format(date.value))

const typeLabel: Record<CalendarEvent['type'], string> = {
  dungeon: 'Dungeon',
  raid: 'Raid',
  community: 'Community',
}

const isCancelled = computed(() => props.event.status === 'cancelled')
</script>

<template>
  <article
    class="event-item"
    :class="[`event-item--${event.type}`, { 'event-item--cancelled': isCancelled }]"
  >
    <time
      class="event-item__date"
      :datetime="event.startsAt"
    >
      <span class="event-item__day">{{ day }}</span>
      <span class="event-item__month">{{ month }}</span>
    </time>
    <div class="event-item__body">
      <h3 class="event-item__title">
        {{ event.title }}
      </h3>
      <p class="event-item__meta">
        <span>{{ weekday }}, {{ formatTime(event.startsAt) }} Uhr</span>
        <span class="event-item__type">{{ typeLabel[event.type] }}</span>
        <span
          v-if="event.source === 'discord'"
          class="event-item__source"
        >Discord-Event</span>
      </p>
    </div>
    <p
      v-if="isCancelled"
      class="event-item__status event-item__status--cancelled"
    >
      Abgesagt
    </p>
    <p
      v-else-if="event.openSlots !== null"
      class="event-item__status"
    >
      <template v-if="event.openSlots === 0">
        Voll
      </template>
      <template v-else>
        {{ event.openSlots }} {{ event.openSlots === 1 ? 'Platz' : 'Plätze' }} frei
      </template>
    </p>
  </article>
</template>

<style scoped lang="scss">
.event-item {
  --event-accent: var(--color-accent);

  display: grid;
  grid-template-columns: auto 1fr auto;
  gap: var(--space-4);
  align-items: center;
  padding: var(--space-4) 0;
  border-bottom: 1px solid var(--color-border);

  &--raid { --event-accent: var(--color-blossom); }
  &--community { --event-accent: var(--color-lantern); }

  &__date {
    display: flex;
    flex-direction: column;
    align-items: center;
    width: 3.5rem;
    padding: var(--space-2) 0;
    line-height: 1;
    border: 1px solid color-mix(in srgb, var(--event-accent) 40%, transparent);
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
    color: var(--event-accent);
  }

  &__body {
    display: flex;
    flex-direction: column;
    gap: var(--space-1);
    min-width: 0;
  }

  &__title {
    font-family: var(--font-sans);
    font-size: var(--text-base);
    font-weight: var(--font-weight-semibold);
    color: var(--color-text);
    letter-spacing: 0;
  }

  &__meta {
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-1) var(--space-3);
    font-size: var(--text-sm);
    color: var(--color-text-muted);
  }

  &__type {
    color: var(--event-accent);
  }

  &__status {
    font-size: var(--text-sm);
    font-weight: var(--font-weight-semibold);
    color: var(--color-success);
    white-space: nowrap;

    &--cancelled {
      color: var(--color-danger);
    }
  }

  &--cancelled &__title {
    color: var(--color-text-subtle);
    text-decoration: line-through;
  }
}
</style>
