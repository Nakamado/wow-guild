<script setup lang="ts">
import type { GuildEvent } from '#shared/types'
import type { GuildEventDraft } from '~/composables/useGuildEvents'

/**
 * Gilden-Event eintragen oder bearbeiten (Gildentreffen, Angelwettbewerb …).
 * Ohne `event` wird ein neues Event angelegt.
 */
const open = defineModel<boolean>('open', { default: false })
const props = defineProps<{ event?: GuildEvent | null }>()
const emit = defineEmits<{ saved: [event: GuildEvent] }>()

const { isDemo } = useSiteConfig()
const { save } = useGuildEvents()

const ids = { title: useId(), date: useId(), time: useId(), end: useId(), location: useId(), description: useId(), error: useId() }
const isEdit = computed(() => Boolean(props.event))

function emptyDraft(): GuildEventDraft {
  const tomorrow = toZonedParts(new Date(Date.now() + 86_400_000)).date
  return { title: '', description: '', date: tomorrow, time: '20:00', endTime: '', location: '' }
}

function draftOf(event: GuildEvent): GuildEventDraft {
  const start = toZonedParts(event.startsAt)
  return {
    title: event.title,
    description: event.description,
    date: start.date,
    time: start.time,
    endTime: event.endsAt ? toZonedParts(event.endsAt).time : '',
    location: event.location ?? '',
  }
}

const form = reactive<GuildEventDraft>(emptyDraft())
const errorMessage = ref<string | null>(null)
const saving = ref(false)

watch(open, (isOpen) => {
  if (!isOpen) return
  Object.assign(form, props.event ? draftOf(props.event) : emptyDraft())
  errorMessage.value = null
}, { immediate: true })

async function submit() {
  if (saving.value) return
  saving.value = true
  const result = await save({ ...form }, props.event?.id)
  saving.value = false
  if (!result.ok) {
    errorMessage.value = result.error.message
    return
  }
  open.value = false
  emit('saved', result.value)
}
</script>

<template>
  <BaseDialog
    v-model:open="open"
    :title="isEdit ? 'Event bearbeiten' : 'Event eintragen'"
    description="Für Gildentreffen, Wettbewerbe und alles andere, was kein Dungeon-Run ist."
    size="lg"
  >
    <form
      :id="`${ids.error}-form`"
      class="event-form"
      novalidate
      @submit.prevent="submit"
    >
      <div class="event-form__field">
        <label
          :for="ids.title"
          class="event-form__label"
        >Titel</label>
        <input
          :id="ids.title"
          v-model="form.title"
          type="text"
          maxlength="80"
          class="event-form__input"
          placeholder="z. B. Gildentreffen in Eisenschmiede"
          required
        >
      </div>

      <div class="event-form__row">
        <div class="event-form__field">
          <label
            :for="ids.date"
            class="event-form__label"
          >Datum</label>
          <input
            :id="ids.date"
            v-model="form.date"
            type="date"
            class="event-form__input"
            required
          >
        </div>
        <div class="event-form__field">
          <label
            :for="ids.time"
            class="event-form__label"
          >Beginn</label>
          <input
            :id="ids.time"
            v-model="form.time"
            type="time"
            step="900"
            class="event-form__input"
            required
          >
        </div>
        <div class="event-form__field">
          <label
            :for="ids.end"
            class="event-form__label"
          >Ende <span class="event-form__optional">(optional)</span></label>
          <input
            :id="ids.end"
            v-model="form.endTime"
            type="time"
            step="900"
            class="event-form__input"
          >
        </div>
      </div>

      <div class="event-form__field">
        <label
          :for="ids.location"
          class="event-form__label"
        >Treffpunkt <span class="event-form__optional">(optional)</span></label>
        <input
          :id="ids.location"
          v-model="form.location"
          type="text"
          maxlength="80"
          class="event-form__input"
          placeholder="z. B. Eisenschmiede, vor der Bank"
        >
      </div>

      <div class="event-form__field">
        <label
          :for="ids.description"
          class="event-form__label"
        >Beschreibung <span class="event-form__optional">(optional)</span></label>
        <textarea
          :id="ids.description"
          v-model="form.description"
          rows="4"
          maxlength="1000"
          class="event-form__input event-form__input--textarea"
          placeholder="Worum geht’s, was soll man mitbringen …"
        />
        <p class="event-form__hint">
          {{ form.description.length }}/1000 Zeichen · Alle Zeiten in deutscher Zeit
        </p>
      </div>

      <p
        v-if="errorMessage"
        :id="ids.error"
        class="event-form__error"
        role="alert"
      >
        {{ errorMessage }}
      </p>
      <p
        v-if="isDemo"
        class="event-form__demo"
      >
        Demo: Das Event gilt nur in diesem Browser-Tab.
      </p>
    </form>

    <template #actions="{ close }">
      <BaseButton
        variant="ghost"
        @click="close"
      >
        Abbrechen
      </BaseButton>
      <BaseButton
        type="submit"
        :form="`${ids.error}-form`"
        :loading="saving"
      >
        {{ isEdit ? 'Änderungen speichern' : 'Event eintragen' }}
      </BaseButton>
    </template>
  </BaseDialog>
</template>

<style scoped lang="scss">
.event-form {
  display: flex;
  flex-direction: column;
  gap: var(--space-5);

  &__row {
    display: grid;
    gap: var(--space-4);

    @include mq('sm') {
      grid-template-columns: 1.4fr 1fr 1fr;
    }
  }

  &__field {
    display: flex;
    flex-direction: column;
    gap: var(--space-2);
    min-width: 0;
  }

  &__label {
    font-size: var(--text-sm);
    font-weight: var(--font-weight-medium);
    color: var(--color-text);
  }

  &__optional {
    font-weight: var(--font-weight-regular);
    color: var(--color-text-subtle);
  }

  &__input {
    width: 100%;
    min-height: 2.75rem;
    padding: var(--space-2) var(--space-3);
    color: var(--color-text);
    background: var(--color-bg);
    border: 1px solid var(--color-border-strong);
    border-radius: var(--radius-md);
    color-scheme: dark;

    @include focus-ring(2px);

    &--textarea {
      resize: vertical;
    }
  }

  &__hint {
    font-size: var(--text-xs);
    color: var(--color-text-muted);
  }

  &__error {
    padding: var(--space-3) var(--space-4);
    font-size: var(--text-sm);
    color: var(--color-danger);
    background: rgb(255 138 138 / 8%);
    border: 1px solid rgb(255 138 138 / 30%);
    border-radius: var(--radius-md);
  }

  &__demo {
    font-size: var(--text-xs);
    color: var(--color-lantern);
  }
}
</style>
