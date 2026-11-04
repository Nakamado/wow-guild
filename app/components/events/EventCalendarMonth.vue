<script setup lang="ts">
import type { CalendarEvent } from '#shared/types'
import type { CalendarDay } from '#shared/utils/calendar'

const props = defineProps<{
  weeks: CalendarDay[][]
  eventsByDay: Map<string, CalendarEvent[]>
  selectedDay: string | null
}>()

const emit = defineEmits<{
  'select-day': [key: string]
  'open-event': [event: CalendarEvent]
}>()

const MAX_VISIBLE = 3

function eventsOf(key: string) {
  return props.eventsByDay.get(key) ?? []
}

function dayLabel(day: CalendarDay) {
  const count = eventsOf(day.key).length
  const events = count === 0 ? 'keine Termine' : count === 1 ? '1 Termin' : `${count} Termine`
  return `${formatDayLabel(day.key)}, ${events}`
}
</script>

<template>
  <div class="calendar-month">
    <div
      class="calendar-month__weekdays"
      aria-hidden="true"
    >
      <span
        v-for="label in WEEKDAY_LABELS"
        :key="label"
        class="calendar-month__weekday"
      >{{ label }}</span>
    </div>

    <div class="calendar-month__grid">
      <div
        v-for="day in weeks.flat()"
        :key="day.key"
        class="calendar-month__day"
        :class="{
          'calendar-month__day--outside': !day.inMonth,
          'calendar-month__day--today': day.isToday,
          'calendar-month__day--selected': day.key === selectedDay,
          'calendar-month__day--weekend': day.weekday >= 5,
        }"
      >
        <button
          type="button"
          class="calendar-month__date"
          :aria-label="dayLabel(day)"
          :aria-pressed="day.key === selectedDay"
          @click="emit('select-day', day.key)"
        >
          <span class="calendar-month__number">{{ day.day }}</span>
          <span
            v-if="eventsOf(day.key).length"
            class="calendar-month__dots"
            aria-hidden="true"
          >
            <span
              v-for="event in eventsOf(day.key).slice(0, 4)"
              :key="event.id"
              class="calendar-month__dot"
              :class="[`calendar-month__dot--${event.type}`, { 'calendar-month__dot--cancelled': event.status === 'cancelled' }]"
            />
          </span>
        </button>

        <ul
          v-if="eventsOf(day.key).length"
          class="calendar-month__events"
          role="list"
        >
          <li
            v-for="event in eventsOf(day.key).slice(0, MAX_VISIBLE)"
            :key="event.id"
          >
            <button
              type="button"
              class="calendar-month__event"
              :class="[`calendar-month__event--${event.type}`, { 'calendar-month__event--cancelled': event.status === 'cancelled' }]"
              @click="emit('open-event', event)"
            >
              <span class="calendar-month__time">{{ formatTime(event.startsAt) }}</span>
              <span class="calendar-month__title">{{ event.title }}</span>
            </button>
          </li>
          <li v-if="eventsOf(day.key).length > MAX_VISIBLE">
            <button
              type="button"
              class="calendar-month__more"
              @click="emit('select-day', day.key)"
            >
              {{ eventsOf(day.key).length - MAX_VISIBLE }} weitere
            </button>
          </li>
        </ul>
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
.calendar-month {
  --dungeon: var(--color-accent);
  --raid: var(--color-blossom);
  --community: var(--color-lantern);

  overflow: hidden;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);

  &__weekdays,
  &__grid {
    display: grid;
    grid-template-columns: repeat(7, minmax(0, 1fr));
  }

  &__weekdays {
    background: var(--color-surface);
    border-bottom: 1px solid var(--color-border);
  }

  &__weekday {
    padding: var(--space-2);
    font-size: var(--text-xs);
    font-weight: var(--font-weight-semibold);
    color: var(--color-text-muted);
    text-align: center;

    @include mq('md') {
      text-align: left;
    }
  }

  &__day {
    display: flex;
    flex-direction: column;
    gap: var(--space-1);
    min-height: 3.5rem;
    padding: var(--space-1);
    border-right: 1px solid var(--color-border);
    border-bottom: 1px solid var(--color-border);

    &:nth-child(7n) {
      border-right: 0;
    }

    @include mq('md') {
      min-height: 7.5rem;
      padding: var(--space-2);
    }

    &--weekend {
      background: rgb(150 190 255 / 2%);
    }

    &--outside {
      background: rgb(4 6 15 / 45%);
    }

    &--selected {
      background: rgb(143 211 255 / 7%);
      box-shadow: inset 0 0 0 1px var(--color-accent);
    }
  }

  &__date {
    display: flex;
    flex-direction: column;
    gap: var(--space-1);
    align-items: center;
    width: 100%;
    padding: var(--space-1);
    border-radius: var(--radius-sm);

    @include focus-ring(2px);

    @include mq('md') {
      flex-direction: row;
      justify-content: space-between;
    }

    &:hover {
      background: rgb(150 190 255 / 6%);
    }
  }

  &__number {
    display: inline-grid;
    place-items: center;
    width: 1.75rem;
    height: 1.75rem;
    font-size: var(--text-sm);
    font-variant-numeric: tabular-nums;
    color: var(--color-text);
    border-radius: 50%;
  }

  &__day--outside &__number {
    color: var(--color-text-subtle);
  }

  &__day--today &__number {
    font-weight: var(--font-weight-bold);
    color: var(--color-text-inverse);
    background: var(--color-accent);
  }

  &__dots {
    display: flex;
    gap: 3px;

    @include mq('md') {
      display: none;
    }
  }

  &__dot {
    width: 6px;
    height: 6px;
    border-radius: 50%;

    &--dungeon { background: var(--dungeon); }
    &--raid { background: var(--raid); }
    &--community { background: var(--community); }

    &--cancelled {
      opacity: 0.35;
    }
  }

  // Auf kleinen Screens nur Punkte – Termine erscheinen in der Tagesansicht darunter
  &__events {
    display: none;
    flex-direction: column;
    gap: 2px;

    @include mq('md') {
      display: flex;
    }
  }

  &__event {
    --event-color: var(--dungeon);

    display: flex;
    gap: var(--space-1);
    width: 100%;
    padding: 2px var(--space-1);
    overflow: hidden;
    font-size: var(--text-xs);
    line-height: 1.4;
    color: var(--color-text);
    text-align: left;
    background: color-mix(in srgb, var(--event-color) 12%, transparent);
    border-left: 2px solid var(--event-color);
    border-radius: 3px;

    @include focus-ring(1px);

    &:hover {
      background: color-mix(in srgb, var(--event-color) 22%, transparent);
    }

    &--raid { --event-color: var(--raid); }
    &--community { --event-color: var(--community); }

    &--cancelled {
      color: var(--color-text-subtle);
      text-decoration: line-through;
      opacity: 0.7;
    }
  }

  &__time {
    flex-shrink: 0;
    color: var(--color-text-muted);
    font-variant-numeric: tabular-nums;
  }

  &__title {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  &__more {
    padding: 0 var(--space-1);
    font-size: var(--text-xs);
    color: var(--color-accent);
    text-decoration: underline;
    text-underline-offset: 0.15em;
  }
}
</style>
