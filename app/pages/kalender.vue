<script setup lang="ts">
import { findDungeon } from '#shared/data/dungeons'
import type { CalendarEvent } from '#shared/types'
import type { CalendarTypeFilter } from '~/composables/useCalendar'

useSeoMeta({
  title: 'Eventkalender',
  description: 'Discord-Events, Dungeon-Runs und Raids der Gilde in einem Kalender.',
})

const route = useRoute()
const router = useRouter()
const { can } = useViewer()
const { events, status, refresh, filterEvents } = useCalendar()
const { getRun } = useRuns()

const canCreate = computed(() => can('runs:create'))
const formOpen = ref(false)

// --- Zustand in der URL (teilbar, Zurück-Taste funktioniert) -------------------------------
const today = dayKeyOf(new Date())
const view = computed<'monat' | 'liste'>(() => (route.query.ansicht === 'liste' ? 'liste' : 'monat'))
const month = computed(() => parseMonthKey(route.query.monat) ?? monthOf(new Date()))
const type = computed<CalendarTypeFilter>(() => {
  const value = route.query.typ
  return value === 'dungeon' || value === 'raid' || value === 'community' ? value : 'all'
})
const includeCancelled = computed(() => route.query.abgesagt === '1')
const selectedDay = computed(() => (typeof route.query.tag === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(route.query.tag) ? route.query.tag : null))

function setQuery(patch: Record<string, string | null | undefined>) {
  const query = Object.fromEntries(
    Object.entries({ ...route.query, ...patch }).filter(([, value]) => value !== null && value !== undefined && value !== ''),
  )
  router.replace({ query })
}

const types: { value: CalendarTypeFilter, label: string }[] = [
  { value: 'all', label: 'Alle' },
  { value: 'dungeon', label: 'Dungeons' },
  { value: 'raid', label: 'Raids' },
  { value: 'community', label: 'Community' },
]

// --- Daten ---------------------------------------------------------------------------------
const visible = computed(() => filterEvents(events.value, { type: type.value, includeCancelled: includeCancelled.value }))

const weeks = computed(() => monthGrid(month.value, today))
const eventsByDay = computed(() => {
  const map = new Map<string, CalendarEvent[]>()
  for (const event of visible.value) {
    const key = dayKeyOf(event.startsAt)
    map.set(key, [...(map.get(key) ?? []), event])
  }
  return map
})

const monthEventCount = computed(() => weeks.value.flat().filter(day => day.inMonth).reduce((sum, day) => sum + (eventsByDay.value.get(day.key)?.length ?? 0), 0))
const dayEvents = computed(() => (selectedDay.value ? eventsByDay.value.get(selectedDay.value) ?? [] : []))
const upcoming = computed(() => filterEvents(visible.value, { upcomingOnly: true, includeCancelled: includeCancelled.value }))

function goToMonth(delta: number | 'today') {
  const target = delta === 'today' ? monthOf(new Date()) : shiftMonth(month.value, delta)
  setQuery({ monat: monthKey(target), tag: delta === 'today' ? today : null })
}

function selectDay(key: string) {
  setQuery({ tag: selectedDay.value === key ? null : key })
}

// --- Dialoge -------------------------------------------------------------------------------
const detailsOpen = ref(false)
const activeEvent = ref<CalendarEvent | null>(null)
const signupOpen = ref(false)
const signupRunId = ref<string | null>(null)
const notice = ref<string | null>(null)

const signupRun = computed(() => (signupRunId.value ? getRun(signupRunId.value) : null))
const signupDungeon = computed(() => (signupRun.value ? findDungeon(signupRun.value.dungeonSlug) : undefined))

function openEvent(event: CalendarEvent) {
  activeEvent.value = event
  detailsOpen.value = true
}

function startSignup(runId: string) {
  signupRunId.value = runId
  signupOpen.value = true
}

function onJoined(_placement: string, message: string) {
  notice.value = message
}

// Aktualisierte Daten (z. B. nach Anmeldung) im offenen Detaildialog übernehmen
watch(events, (list) => {
  if (activeEvent.value) activeEvent.value = list.find(entry => entry.id === activeEvent.value?.id) ?? activeEvent.value
})

function onSaved(run: { id: string }) {
  navigateTo(`/gruppen/${run.id}`)
}
</script>

<template>
  <div class="calendar-page">
    <PageHeader
      title="Eventkalender"
      lead="Discord-Events der Community und die hier geplanten Dungeon- und Raidgruppen an einem Ort. Alle Zeiten in deutscher Zeit."
    >
      <BaseButton
        v-if="canCreate"
        icon-left="heal"
        @click="formOpen = true"
      >
        Gruppe planen
      </BaseButton>
    </PageHeader>

    <div class="calendar-page__body container">
      <div class="calendar-page__toolbar">
        <div
          class="calendar-page__views"
          role="group"
          aria-label="Ansicht"
        >
          <button
            type="button"
            class="calendar-page__chip"
            :aria-pressed="view === 'monat'"
            @click="setQuery({ ansicht: null })"
          >
            Monat
          </button>
          <button
            type="button"
            class="calendar-page__chip"
            :aria-pressed="view === 'liste'"
            @click="setQuery({ ansicht: 'liste' })"
          >
            Liste
          </button>
        </div>

        <div
          class="calendar-page__types"
          role="group"
          aria-label="Art des Termins"
        >
          <button
            v-for="entry in types"
            :key="entry.value"
            type="button"
            class="calendar-page__chip"
            :class="`calendar-page__chip--${entry.value}`"
            :aria-pressed="type === entry.value"
            @click="setQuery({ typ: entry.value === 'all' ? null : entry.value })"
          >
            {{ entry.label }}
          </button>
        </div>

        <label class="calendar-page__toggle">
          <input
            type="checkbox"
            class="calendar-page__checkbox"
            :checked="includeCancelled"
            @change="setQuery({ abgesagt: ($event.target as HTMLInputElement).checked ? '1' : null })"
          >
          Abgesagte zeigen
        </label>
      </div>

      <p
        v-if="notice"
        class="calendar-page__notice"
        role="status"
      >
        {{ notice }}
      </p>

      <ErrorState
        v-if="status === 'error'"
        message="Der Kalender konnte gerade nicht geladen werden."
        @retry="refresh()"
      />

      <template v-else-if="view === 'monat'">
        <div class="calendar-page__month-nav">
          <h2
            class="calendar-page__month"
            aria-live="polite"
          >
            {{ formatMonthLabel(month) }}
          </h2>
          <div class="calendar-page__month-actions">
            <BaseButton
              variant="ghost"
              size="sm"
              icon-left="arrowLeft"
              @click="goToMonth(-1)"
            >
              <span class="visually-hidden">Vorheriger Monat</span>
            </BaseButton>
            <BaseButton
              variant="secondary"
              size="sm"
              @click="goToMonth('today')"
            >
              Heute
            </BaseButton>
            <BaseButton
              variant="ghost"
              size="sm"
              icon-left="arrowRight"
              @click="goToMonth(1)"
            >
              <span class="visually-hidden">Nächster Monat</span>
            </BaseButton>
          </div>
        </div>

        <EventCalendarMonth
          :weeks="weeks"
          :events-by-day="eventsByDay"
          :selected-day="selectedDay"
          @select-day="selectDay"
          @open-event="openEvent"
        />

        <p
          v-if="!monthEventCount && status === 'success'"
          class="calendar-page__empty-month"
        >
          In diesem Monat ist noch nichts geplant.
        </p>

        <section
          v-if="selectedDay"
          class="calendar-page__day"
          aria-labelledby="calendar-day-title"
        >
          <h2
            id="calendar-day-title"
            class="calendar-page__day-title"
          >
            {{ formatDayLabel(selectedDay) }}
          </h2>
          <ul
            v-if="dayEvents.length"
            class="calendar-page__day-list"
            role="list"
          >
            <li
              v-for="event in dayEvents"
              :key="event.id"
            >
              <EventListItem
                :event="event"
                clickable
                @open="openEvent"
              />
            </li>
          </ul>
          <p
            v-else
            class="calendar-page__muted"
          >
            An diesem Tag ist nichts geplant.
          </p>
        </section>
      </template>

      <template v-else>
        <EventAgenda
          v-if="upcoming.length"
          :events="upcoming"
          @open="openEvent"
        />
        <EmptyState
          v-else-if="status === 'success'"
          icon="calendar"
          title="Keine kommenden Termine"
          :description="canCreate ? 'Plane eine Gruppe – sie erscheint dann hier.' : 'Schau bald wieder vorbei.'"
        >
          <BaseButton
            v-if="canCreate"
            size="sm"
            @click="formOpen = true"
          >
            Gruppe planen
          </BaseButton>
        </EmptyState>
      </template>

      <ul
        class="calendar-page__legend"
        aria-label="Legende"
      >
        <li class="calendar-page__legend-item calendar-page__legend-item--dungeon">
          Dungeon
        </li>
        <li class="calendar-page__legend-item calendar-page__legend-item--raid">
          Raid
        </li>
        <li class="calendar-page__legend-item calendar-page__legend-item--community">
          Community (Discord)
        </li>
      </ul>
    </div>

    <EventDetailsDialog
      v-model:open="detailsOpen"
      :event="activeEvent"
      @join="startSignup"
    />
    <GroupSignupDialog
      v-if="signupRun && signupDungeon"
      v-model:open="signupOpen"
      :run="signupRun"
      :dungeon="signupDungeon"
      @joined="onJoined"
    />
    <GroupFormDialog
      v-model:open="formOpen"
      @saved="onSaved"
    />
  </div>
</template>

<style scoped lang="scss">
.calendar-page {
  &__body {
    display: flex;
    flex-direction: column;
    gap: var(--space-6);
  }

  &__toolbar {
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-3) var(--space-6);
    align-items: center;
  }

  &__views,
  &__types {
    display: inline-flex;
    flex-wrap: wrap;
    padding: var(--space-1);
    background: var(--color-surface);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-pill);
  }

  &__chip {
    min-height: 2.25rem;
    padding: 0 var(--space-4);
    font-size: var(--text-sm);
    color: var(--color-text-muted);
    border-radius: var(--radius-pill);
    transition: background var(--duration-fast) var(--ease-out), color var(--duration-fast);

    &:hover {
      color: var(--color-frost);
    }

    &[aria-pressed='true'] {
      color: var(--color-text-inverse);
      background: var(--color-accent);
    }

    &--raid[aria-pressed='true'] { background: var(--color-blossom); }
    &--community[aria-pressed='true'] { background: var(--color-lantern); }
  }

  &__toggle {
    display: inline-flex;
    gap: var(--space-2);
    align-items: center;
    font-size: var(--text-sm);
    cursor: pointer;
  }

  &__checkbox {
    width: 1.125rem;
    height: 1.125rem;
    accent-color: var(--color-accent);
  }

  &__notice {
    padding: var(--space-3) var(--space-4);
    color: var(--color-success);
    background: rgb(126 226 168 / 8%);
    border: 1px solid rgb(126 226 168 / 25%);
    border-radius: var(--radius-md);
  }

  &__month-nav {
    display: flex;
    gap: var(--space-4);
    align-items: center;
    justify-content: space-between;
  }

  &__month {
    font-size: var(--text-xl);
  }

  &__month-actions {
    display: flex;
    gap: var(--space-1);
    align-items: center;
  }

  &__empty-month,
  &__muted {
    font-size: var(--text-sm);
    color: var(--color-text-muted);
  }

  &__day {
    display: flex;
    flex-direction: column;
    gap: var(--space-3);
  }

  &__day-title {
    font-family: var(--font-serif);
    font-size: var(--text-lg);
    font-style: italic;
    font-weight: var(--font-weight-semibold);
    letter-spacing: 0;
  }

  &__day-list {
    border-top: 1px solid var(--color-border);
  }

  &__legend {
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-2) var(--space-5);
    font-size: var(--text-xs);
    color: var(--color-text-muted);
  }

  &__legend-item {
    display: inline-flex;
    gap: var(--space-2);
    align-items: center;

    &::before {
      width: 0.625rem;
      height: 0.625rem;
      content: '';
      background: var(--legend-color);
      border-radius: 2px;
    }

    &--dungeon { --legend-color: var(--color-accent); }
    &--raid { --legend-color: var(--color-blossom); }
    &--community { --legend-color: var(--color-lantern); }
  }
}
</style>
