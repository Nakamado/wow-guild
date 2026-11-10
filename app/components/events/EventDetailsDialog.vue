<script setup lang="ts">
import { findDungeon } from '#shared/data/dungeons'
import { getRole } from '#shared/data/roles'
import type { CalendarEvent } from '#shared/types'

const open = defineModel<boolean>('open', { default: false })
const props = defineProps<{ event: CalendarEvent | null }>()
const emit = defineEmits<{ join: [runId: string], edit: [guildEventId: string] }>()

const { can } = useViewer()
const { getRun, myEntry } = useRuns()
const { getEvent: getGuildEvent, canEdit: canEditGuildEvent, canDelete: canDeleteGuildEvent, cancel: cancelGuildEvent, remove: removeGuildEvent } = useGuildEvents()

// Gilden-Event: bearbeiten/absagen für die Person, die es eingetragen hat, und Admins
const guildEvent = computed(() => (props.event?.guildEventId ? getGuildEvent(props.event.guildEventId) : null))
const canManageGuildEvent = computed(() => Boolean(guildEvent.value && isUpcoming.value && canEditGuildEvent(guildEvent.value)))
const canDeleteEvent = computed(() => Boolean(guildEvent.value && canDeleteGuildEvent(guildEvent.value)))
/** Bestätigung: absagen (mit optionalem Grund) oder endgültig löschen */
const confirm = ref<'cancel' | 'delete' | null>(null)
const cancelReason = ref('')
const actionError = ref<string | null>(null)
watch(open, () => {
  confirm.value = null
  cancelReason.value = ''
  actionError.value = null
})

async function cancelEvent() {
  if (!guildEvent.value) return
  const result = await cancelGuildEvent(guildEvent.value.id, cancelReason.value)
  if (!result.ok) {
    actionError.value = result.error.message
    return
  }
  confirm.value = null
}

async function deleteEvent() {
  if (!guildEvent.value) return
  const result = await removeGuildEvent(guildEvent.value.id)
  if (!result.ok) {
    actionError.value = result.error.message
    return
  }
  open.value = false
}

function edit() {
  if (!guildEvent.value) return
  open.value = false
  emit('edit', guildEvent.value.id)
}

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
        <span>{{ event.source === 'discord' ? 'aus Discord' : event.source === 'guild' ? 'auf dieser Seite eingetragen' : 'auf dieser Seite geplant' }}</span>
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
            {{ statusLabel[event.status] }}<template v-if="event.cancelReason">
              – {{ event.cancelReason }}
            </template>
          </dd>
        </div>
        <div
          v-if="event.location"
          class="event-details__fact"
        >
          <dt>Treffpunkt</dt>
          <dd>{{ event.location }}</dd>
        </div>
        <div
          v-if="event.organizerName"
          class="event-details__fact"
        >
          <dt>{{ event.source === 'guild' ? 'Eingetragen von' : 'Veranstaltet von' }}</dt>
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

      <div
        v-if="confirm === 'cancel'"
        class="event-details__confirm"
      >
        <p>Event absagen? Es bleibt als „abgesagt“ im Kalender sichtbar.</p>
        <label
          class="event-details__reason-label"
          for="event-cancel-reason"
        >Grund <span class="event-details__optional">(optional)</span></label>
        <input
          id="event-cancel-reason"
          v-model="cancelReason"
          type="text"
          maxlength="200"
          class="event-details__reason"
          placeholder="z. B. krank, zu wenig Interesse"
        >
        <div class="event-details__confirm-actions">
          <BaseButton
            size="sm"
            variant="ghost"
            @click="confirm = null"
          >
            Nein
          </BaseButton>
          <BaseButton
            size="sm"
            variant="lantern"
            @click="cancelEvent"
          >
            Ja, absagen
          </BaseButton>
        </div>
      </div>
      <div
        v-else-if="confirm === 'delete'"
        class="event-details__confirm"
        role="alert"
      >
        <p>Event endgültig löschen? Es verschwindet komplett aus dem Kalender – zum Beispiel bei einem Fehleintrag.</p>
        <div class="event-details__confirm-actions">
          <BaseButton
            size="sm"
            variant="ghost"
            @click="confirm = null"
          >
            Nein
          </BaseButton>
          <BaseButton
            size="sm"
            variant="lantern"
            @click="deleteEvent"
          >
            Endgültig löschen
          </BaseButton>
        </div>
      </div>
      <p
        v-if="actionError"
        class="event-details__cancelled"
        role="alert"
      >
        {{ actionError }}
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
        v-if="canDeleteEvent && !confirm"
        variant="ghost"
        @click="confirm = 'delete'"
      >
        Löschen
      </BaseButton>
      <BaseButton
        v-if="canManageGuildEvent && !confirm"
        variant="ghost"
        @click="confirm = 'cancel'"
      >
        Absagen
      </BaseButton>
      <BaseButton
        v-if="canManageGuildEvent"
        variant="secondary"
        @click="edit"
      >
        Bearbeiten
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

  &__confirm {
    display: flex;
    flex-direction: column;
    gap: var(--space-2);
    padding: var(--space-3) var(--space-4);
    font-size: var(--text-sm);
    border: 1px solid var(--color-border-strong);
    border-radius: var(--radius-md);
  }

  &__reason-label {
    font-weight: var(--font-weight-medium);
  }

  &__optional {
    font-weight: var(--font-weight-regular);
    color: var(--color-text-subtle);
  }

  &__reason {
    width: 100%;
    min-height: 2.5rem;
    padding: var(--space-2) var(--space-3);
    color: var(--color-text);
    background: var(--color-bg);
    border: 1px solid var(--color-border-strong);
    border-radius: var(--radius-md);

    @include focus-ring(2px);
  }

  &__confirm-actions {
    display: flex;
    gap: var(--space-2);
    justify-content: flex-end;
  }

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
