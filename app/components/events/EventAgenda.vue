<script setup lang="ts">
import type { CalendarEvent } from '#shared/types'

/** Termine gruppiert nach Tag (Europe/Berlin). */
const props = defineProps<{ events: CalendarEvent[] }>()
defineEmits<{ open: [event: CalendarEvent] }>()

const groups = computed(() => {
  const byDay = new Map<string, CalendarEvent[]>()
  for (const event of props.events) {
    const key = dayKeyOf(event.startsAt)
    byDay.set(key, [...(byDay.get(key) ?? []), event])
  }
  return [...byDay.entries()].map(([key, events]) => ({ key, events }))
})
</script>

<template>
  <div class="event-agenda">
    <section
      v-for="group in groups"
      :key="group.key"
      class="event-agenda__day"
      :aria-labelledby="`agenda-${group.key}`"
    >
      <h3
        :id="`agenda-${group.key}`"
        class="event-agenda__heading"
      >
        {{ formatDayLabel(group.key) }}
      </h3>
      <ul
        class="event-agenda__list"
        role="list"
      >
        <li
          v-for="event in group.events"
          :key="event.id"
        >
          <EventListItem
            :event="event"
            clickable
            @open="$emit('open', $event)"
          />
        </li>
      </ul>
    </section>
  </div>
</template>

<style scoped lang="scss">
.event-agenda {
  display: flex;
  flex-direction: column;
  gap: var(--space-8);

  &__heading {
    padding-bottom: var(--space-2);
    font-family: var(--font-serif);
    font-size: var(--text-lg);
    font-style: italic;
    font-weight: var(--font-weight-semibold);
    color: var(--color-frost);
    letter-spacing: 0;
    border-bottom: 1px solid var(--color-border-strong);
  }
}
</style>
