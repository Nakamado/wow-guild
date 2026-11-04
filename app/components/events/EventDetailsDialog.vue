<script setup lang="ts">
import { findDungeon } from '#shared/data/dungeons'
import { getRole } from '#shared/data/roles'
import type { CalendarEvent } from '#shared/types'

const open = defineModel<boolean>('open', { default: false })
const props = defineProps<{ event: CalendarEvent | null }>()
const emit = defineEmits<{ join: [runId: string] }>()

const { can } = useViewer()
const { getRun, myEntry } = useRuns()

const run = computed(() => (props.event?.runId ? getRun(props.event.runId) : null))
const dungeon = computed(() => (run.value ? findDungeon(run.value.dungeonSlug) : undefined))
const mine = computed(() => (run.value ? myEntry(run.value) : null))
const isUpcoming = computed(() => Boolean(props.event && Date.parse(props.event.startsAt) > Date.now() && props.event.status === 'scheduled'))
const canJoin = computed(() => Boolean(run.value && isUpcoming.value && can('runs:join') && !mine.value))

const typeLabel: Record<CalendarEvent['type'], string> = { dungeon: 'Dungeon', raid: 'Raid', community: 'Community-Event' }
const statusLabel: Record<CalendarEvent['status'], string> = {
  scheduled: 'Geplant',
  active: 'Läuft gerade',
  completed: 'Abgeschlossen',
  cancelled: 'Abgesagt',
}

function join() {
  if (!props.event?.runId) return
  open.value = false
  emit('join', props.event.runId)
}
</script>

<template>
  <BaseDialog
    v-model:open="open"
    :title="event?.title ?? 'Termin'"
  >
    <div
      v-if="event"
      class="event-details"
      :class="`event-details--${event.type}`"
    >
      <p class="event-details__kind">
        <span class="event-details__type">{{ typeLabel[event.type] }}</span>
        <span>{{ event.source === 'discord' ? 'aus Discord' : 'auf dieser Seite geplant' }}</span>
      </p>

      <dl class="event-details__facts">
        <div class="event-details__fact">
          <dt>Beginn</dt>
          <dd><time :datetime="event.startsAt">{{ formatDateTime(event.startsAt) }} Uhr</time></dd>
        </div>
        <div
          v-if="event.endsAt"
          class="event-details__fact"
        >
          <dt>Ende</dt>
          <dd><time :datetime="event.endsAt">{{ formatTime(event.endsAt) }} Uhr</time></dd>
        </div>
        <div class="event-details__fact">
          <dt>Status</dt>
          <dd :class="{ 'event-details__cancelled': event.status === 'cancelled' }">
            {{ statusLabel[event.status] }}
          </dd>
        </div>
        <div
          v-if="event.organizerName"
          class="event-details__fact"
        >
          <dt>Veranstaltet von</dt>
          <dd>{{ event.organizerName }}</dd>
        </div>
        <div
          v-if="dungeon"
          class="event-details__fact"
        >
          <dt>{{ dungeon.kind === 'raid' ? 'Raid' : 'Dungeon' }}</dt>
          <dd>{{ dungeon.name }} ({{ dungeon.groupSize }} Spieler)</dd>
        </div>
      </dl>

      <div
        v-if="run"
        class="event-details__composition"
      >
        <GroupComposition :run="run" />
        <p
          v-if="event.openSlots"
          class="event-details__slots"
        >
          {{ event.openSlots }} {{ event.openSlots === 1 ? 'Platz' : 'Plätze' }} frei
        </p>
        <p
          v-else-if="run.waitlistEnabled && event.status === 'scheduled'"
          class="event-details__slots"
        >
          Voll – Warteliste offen
        </p>
        <p
          v-if="mine"
          class="event-details__mine"
        >
          {{ mine.placement === 'participant' ? 'Du bist dabei als' : 'Du stehst auf der Warteliste als' }} {{ getRole(mine.role).name }}.
        </p>
      </div>

      <p
        v-if="event.description"
        class="event-details__description"
      >
        {{ event.description }}
      </p>
    </div>

    <template #actions="{ close }">
      <BaseButton
        variant="ghost"
        @click="close"
      >
        Schließen
      </BaseButton>
      <BaseButton
        v-if="event?.url"
        :href="event.url"
        external
        variant="secondary"
      >
        In Discord öffnen
      </BaseButton>
      <BaseButton
        v-if="event?.runId"
        :to="`/gruppen/${event.runId}`"
        variant="secondary"
      >
        Zur Gruppe
      </BaseButton>
      <BaseButton
        v-if="canJoin"
        @click="join"
      >
        Beitreten
      </BaseButton>
    </template>
  </BaseDialog>
</template>

<style scoped lang="scss">
.event-details {
  --event-color: var(--color-accent);

  display: flex;
  flex-direction: column;
  gap: var(--space-5);

  &--raid { --event-color: var(--color-blossom); }
  &--community { --event-color: var(--color-lantern); }

  &__kind {
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-3);
    font-size: var(--text-sm);
    color: var(--color-text-muted);
  }

  &__type {
    font-weight: var(--font-weight-semibold);
    color: var(--event-color);
  }

  &__facts {
    margin: 0;
    border-top: 1px solid var(--color-border);
  }

  &__fact {
    display: grid;
    grid-template-columns: 9rem 1fr;
    gap: var(--space-3);
    padding: var(--space-2) 0;
    border-bottom: 1px solid var(--color-border);

    dt {
      font-size: var(--text-sm);
      color: var(--color-text-muted);
    }

    dd {
      margin: 0;
    }
  }

  &__cancelled {
    color: var(--color-danger);
  }

  &__composition {
    display: flex;
    flex-direction: column;
    gap: var(--space-2);
  }

  &__slots {
    font-size: var(--text-sm);
    font-weight: var(--font-weight-semibold);
    color: var(--color-success);
  }

  &__mine {
    font-size: var(--text-sm);
    color: var(--color-accent);
  }

  &__description {
    color: var(--color-text-muted);
    white-space: pre-line;
  }
}
</style>
