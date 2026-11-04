<script setup lang="ts">
import { findDungeon } from '#shared/data/dungeons'
import { roles } from '#shared/data/roles'
import { defaultCapacity, totalCapacity } from '#shared/domain/composition'
import type { GroupRun, RoleCapacity } from '#shared/types'

const open = defineModel<boolean>('open', { default: false })
const props = withDefaults(
  defineProps<{
    /** Vorbelegter Dungeon beim Erstellen */
    dungeonSlug?: string | null
    /** Bestehender Run → Bearbeiten-Modus */
    run?: GroupRun | null
  }>(),
  { dungeonSlug: null, run: null },
)
const emit = defineEmits<{ saved: [run: GroupRun] }>()

const { isDemo } = useSiteConfig()
const { createRun, updateRun, dungeons } = useRuns()
const selectableDungeons = computed(() => [...dungeons].sort((a, b) => a.levelRange.min - b.levelRange.min || a.name.localeCompare(b.name, 'de')))

const ids = { dungeon: useId(), title: useId(), date: useId(), time: useId(), description: useId(), waitlist: useId(), error: useId() }

interface FormState {
  dungeonSlug: string
  title: string
  date: string
  time: string
  description: string
  capacity: RoleCapacity
  waitlistEnabled: boolean
}

function tomorrow() {
  return toZonedParts(new Date(Date.now() + 86_400_000)).date
}

function initialState(): FormState {
  if (props.run) {
    const { date, time } = toZonedParts(props.run.startsAt)
    return {
      dungeonSlug: props.run.dungeonSlug,
      title: props.run.title ?? '',
      date,
      time,
      description: props.run.description,
      capacity: { ...props.run.capacity },
      waitlistEnabled: props.run.waitlistEnabled,
    }
  }
  const slug = props.dungeonSlug ?? ''
  return {
    dungeonSlug: slug,
    title: '',
    date: tomorrow(),
    time: '19:00',
    description: '',
    capacity: defaultCapacity(findDungeon(slug)?.groupSize ?? 5),
    waitlistEnabled: true,
  }
}

const form = reactive<FormState>(initialState())
const capacityTouched = ref(false)
const errorMessage = ref<string | null>(null)

// Beim Öffnen frisch befüllen
watch(open, (isOpen) => {
  if (!isOpen) return
  Object.assign(form, initialState())
  capacityTouched.value = Boolean(props.run)
  errorMessage.value = null
})

const dungeon = computed(() => findDungeon(form.dungeonSlug))

// Standardbesetzung an die Gruppengröße anpassen, solange sie nicht manuell geändert wurde
watch(() => form.dungeonSlug, () => {
  if (!capacityTouched.value && dungeon.value) form.capacity = defaultCapacity(dungeon.value.groupSize)
})

const size = computed(() => totalCapacity(form.capacity))
const isEdit = computed(() => Boolean(props.run))

function setCapacity(role: keyof RoleCapacity, value: string) {
  const parsed = Number.parseInt(value, 10)
  form.capacity = { ...form.capacity, [role]: Number.isFinite(parsed) ? Math.max(0, Math.min(40, parsed)) : 0 }
  capacityTouched.value = true
}

function submit() {
  errorMessage.value = null
  const startsAt = zonedToIso(form.date, form.time)
  if (!startsAt) {
    errorMessage.value = 'Bitte gib ein gültiges Datum und eine gültige Uhrzeit an.'
    return
  }
  const input = {
    dungeonSlug: form.dungeonSlug,
    title: form.title,
    description: form.description,
    startsAt,
    capacity: form.capacity,
    waitlistEnabled: form.waitlistEnabled,
  }
  const result = props.run ? updateRun(props.run.id, input) : createRun(input)
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
    :title="isEdit ? 'Gruppe bearbeiten' : 'Gruppe erstellen'"
    size="lg"
  >
    <form
      :id="`${ids.error}-form`"
      class="group-form"
      novalidate
      @submit.prevent="submit"
    >
      <div class="group-form__row">
        <div class="group-form__field group-form__field--wide">
          <label
            :for="ids.dungeon"
            class="group-form__label"
          >Dungeon</label>
          <select
            :id="ids.dungeon"
            v-model="form.dungeonSlug"
            class="group-form__input"
            required
          >
            <option
              value=""
              disabled
            >
              Dungeon auswählen
            </option>
            <option
              v-for="entry in selectableDungeons"
              :key="entry.slug"
              :value="entry.slug"
            >
              {{ entry.name }} ({{ entry.levelRange.min }}–{{ entry.levelRange.max }})
            </option>
          </select>
          <p
            v-if="dungeon"
            class="group-form__hint"
          >
            Empfohlen ab Stufe {{ dungeon.levelRange.min }}, für bis zu {{ dungeon.groupSize }} Spieler.
          </p>
        </div>
      </div>

      <div class="group-form__field">
        <label
          :for="ids.title"
          class="group-form__label"
        >Titel <span class="group-form__optional">(optional)</span></label>
        <input
          :id="ids.title"
          v-model="form.title"
          type="text"
          maxlength="80"
          class="group-form__input"
          placeholder="z. B. Entspannter Twink-Run"
        >
      </div>

      <div class="group-form__row">
        <div class="group-form__field">
          <label
            :for="ids.date"
            class="group-form__label"
          >Datum</label>
          <input
            :id="ids.date"
            v-model="form.date"
            type="date"
            class="group-form__input"
            required
          >
        </div>
        <div class="group-form__field">
          <label
            :for="ids.time"
            class="group-form__label"
          >Uhrzeit</label>
          <input
            :id="ids.time"
            v-model="form.time"
            type="time"
            step="900"
            class="group-form__input"
            required
          >
        </div>
      </div>

      <fieldset class="group-form__capacity">
        <legend class="group-form__label">
          Plätze je Rolle
        </legend>
        <div class="group-form__roles">
          <label
            v-for="role in roles"
            :key="role.id"
            class="group-form__role"
          >
            <span>{{ role.name }}</span>
            <input
              type="number"
              inputmode="numeric"
              min="0"
              max="40"
              class="group-form__input group-form__input--number"
              :value="form.capacity[role.id]"
              @input="setCapacity(role.id, ($event.target as HTMLInputElement).value)"
            >
          </label>
        </div>
        <p
          class="group-form__hint"
          :class="{ 'group-form__hint--warning': dungeon && size > dungeon.groupSize }"
        >
          {{ size }} {{ size === 1 ? 'Platz' : 'Plätze' }}<template v-if="dungeon">
            von maximal {{ dungeon.groupSize }}
          </template>
        </p>
      </fieldset>

      <div class="group-form__field">
        <label
          :for="ids.description"
          class="group-form__label"
        >Beschreibung <span class="group-form__optional">(optional)</span></label>
        <textarea
          :id="ids.description"
          v-model="form.description"
          rows="3"
          maxlength="500"
          class="group-form__input group-form__input--textarea"
          placeholder="Ablauf, Questen, Lootregeln …"
        />
        <p class="group-form__hint">
          {{ form.description.length }}/500 Zeichen
        </p>
      </div>

      <label
        :for="ids.waitlist"
        class="group-form__toggle"
      >
        <input
          :id="ids.waitlist"
          v-model="form.waitlistEnabled"
          type="checkbox"
          class="group-form__checkbox"
        >
        Warteliste erlauben, wenn eine Rolle voll ist
      </label>

      <p
        v-if="errorMessage"
        :id="ids.error"
        class="group-form__error"
        role="alert"
      >
        {{ errorMessage }}
      </p>
      <p
        v-if="isDemo"
        class="group-form__demo"
      >
        Demo: Die Gruppe gilt nur in diesem Browser-Tab.
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
      >
        {{ isEdit ? 'Änderungen speichern' : 'Gruppe erstellen' }}
      </BaseButton>
    </template>
  </BaseDialog>
</template>

<style scoped lang="scss">
.group-form {
  display: flex;
  flex-direction: column;
  gap: var(--space-5);

  &__row {
    display: grid;
    gap: var(--space-4);

    @include mq('sm') {
      grid-template-columns: 1fr 1fr;
    }
  }

  &__field {
    display: flex;
    flex-direction: column;
    gap: var(--space-2);
    min-width: 0;

    &--wide {
      grid-column: 1 / -1;
    }
  }

  &__label {
    padding: 0;
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

    &--number {
      width: 5rem;
    }

    &--textarea {
      resize: vertical;
    }
  }

  &__capacity {
    display: flex;
    flex-direction: column;
    gap: var(--space-3);
    padding: 0;
    margin: 0;
    border: 0;
  }

  &__roles {
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-4);
  }

  &__role {
    display: flex;
    flex-direction: column;
    gap: var(--space-1);
    font-size: var(--text-sm);
    color: var(--color-text-muted);
  }

  &__hint {
    font-size: var(--text-xs);
    color: var(--color-text-muted);

    &--warning {
      color: var(--color-danger);
    }
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
