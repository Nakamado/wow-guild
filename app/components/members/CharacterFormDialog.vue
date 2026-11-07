<script setup lang="ts">
import { gameClasses, findClass } from '#shared/data/classes'
import { races } from '#shared/data/races'
import { roles as roleDefinitions } from '#shared/data/roles'
import { MAX_LEVEL } from '#shared/schemas/common'
import { CharacterInputSchema, normalizeCharacterName, QuickCharacterInputSchema, splitCharacterName } from '#shared/schemas/community'
import type { Character, Faction, RoleId } from '#shared/types'

/**
 * Charakter anlegen oder bearbeiten – für Onboarding und Einstellungen.
 * Auswahl ist gekoppelt: Fraktion → Volk → Klasse → mögliche Rollen.
 */
const open = defineModel<boolean>('open', { default: false })
const props = withDefaults(
  defineProps<{
    character?: Character | null
    title?: string
    description?: string
    submitLabel?: string
    dismissible?: boolean
  }>(),
  { character: null, title: undefined, description: undefined, submitLabel: undefined, dismissible: true },
)
const emit = defineEmits<{ saved: [character: Character] }>()

const { guild, isDemo } = useSiteConfig()
const { create, createFromGame, update } = useCharacters()
const { settings, save: saveSettings } = useMemberSettings()

const ids = { firstName: useId(), lastName: useId(), faction: useId(), race: useId(), class: useId(), level: useId(), roles: useId(), error: useId() }
const isEdit = computed(() => Boolean(props.character))

const guildFaction: Faction = guild.faction === 'horde' ? 'horde' : 'alliance'
const form = reactive({
  firstName: '',
  lastName: '',
  faction: guildFaction as Faction,
  raceId: '',
  classId: '',
  level: 1,
  roles: [] as RoleId[],
})
const errorMessage = ref<string | null>(null)
/** Beim Anlegen direkt der Rangliste zustimmen – nur, solange noch keine Zustimmung besteht (Opt-in, nicht vorausgewählt) */
const showLeaderboardOptIn = computed(() => !isEdit.value && Boolean(settings.value?.available) && !settings.value?.leaderboardOptIn)
const joinLeaderboard = ref(false)
const saving = ref(false)
/** Live beim Anlegen: nur Name + Rollen, den Rest liefert die Blizzard-API */
const quick = ref(false)
/** Blizzard kennt den Namen (noch) nicht – der nächste Klick speichert bewusst trotzdem */
const confirmUnknown = ref(false)
const confirmedName = ref('')
const awaitingConfirm = computed(() => !quick.value && confirmUnknown.value
  && confirmedName.value === normalizeCharacterName(`${form.firstName} ${form.lastName}`))

watch(open, (isOpen) => {
  if (!isOpen) return
  errorMessage.value = null
  quick.value = !isDemo && !props.character
  confirmUnknown.value = false
  joinLeaderboard.value = false
  const source = props.character
  const name = splitCharacterName(source?.name ?? '')
  form.firstName = name.firstName
  form.lastName = name.lastName
  form.faction = source?.faction ?? guildFaction
  form.raceId = source?.raceId ?? ''
  form.classId = source?.classId ?? ''
  form.level = source?.level ?? 1
  form.roles = [...(source?.roles ?? [])]
}, { immediate: true })

const availableRaces = computed(() => races.filter(race => race.classesByFaction[form.faction]?.length))
const availableClasses = computed(() => {
  const race = races.find(entry => entry.id === form.raceId)
  const allowed = race?.classesByFaction[form.faction] ?? []
  return gameClasses.filter(entry => allowed.includes(entry.id))
})
const classRoles = computed(() => findClass(form.classId)?.roles ?? [])
/** Im Schnellmodus ist die Klasse noch unbekannt – alle Rollen wählbar, der Server filtert */
const selectableRoles = computed<readonly RoleId[]>(() => (quick.value ? roleDefinitions.map(role => role.id) : classRoles.value))

// Ungültig gewordene Auswahl zurücksetzen, sobald sich eine Ebene darüber ändert
watch(() => form.faction, () => {
  if (!availableRaces.value.some(race => race.id === form.raceId)) form.raceId = ''
})
watch(() => [form.raceId, form.faction], () => {
  if (!availableClasses.value.some(entry => entry.id === form.classId)) form.classId = ''
})
watch(classRoles, (allowed) => {
  form.roles = form.roles.filter(role => allowed.includes(role))
  // Klassen mit nur einer Rolle: direkt vorauswählen
  if (!form.roles.length && allowed.length === 1) form.roles = [...allowed]
})

/** Verständliche Meldung je Feld (Reihenfolge wie im Formular) */
function describeIssue(field: PropertyKey | undefined): string {
  if (field === 'name') {
    if (!form.firstName.trim() || !form.lastName.trim()) return 'Bitte gib Vor- und Nachnamen an.'
    if (/(\p{L})\1\1/iu.test(`${form.firstName}${form.lastName}`)) return 'Ein Buchstabe darf nicht dreimal hintereinander stehen.'
    return 'Vor- und Nachname bestehen aus je 2–12 Buchstaben, ohne Leer- oder Sonderzeichen.'
  }
  if (!form.raceId) return 'Bitte wähle ein Volk.'
  if (!form.classId) return 'Bitte wähle eine Klasse.'
  if (field === 'level') return `Die Stufe muss zwischen 1 und ${MAX_LEVEL} liegen.`
  if (field === 'roles') return 'Wähle mindestens eine Rolle.'
  return 'Bitte prüfe deine Eingaben.'
}

/** Nach dem Speichern: ggf. Ranglisten-Zustimmung übernehmen, dann schließen */
async function finish(character: Character) {
  if (showLeaderboardOptIn.value && joinLeaderboard.value) await saveSettings({ leaderboardOptIn: true })
  open.value = false
  emit('saved', character)
}

function toggleRole(role: RoleId) {
  form.roles = form.roles.includes(role) ? form.roles.filter(entry => entry !== role) : [...form.roles, role]
}

async function submit() {
  if (saving.value) return
  errorMessage.value = null
  const { firstName, lastName, ...rest } = form
  const name = `${firstName} ${lastName}`

  if (quick.value) {
    const parsed = QuickCharacterInputSchema.safeParse({ name, roles: rest.roles })
    if (!parsed.success) {
      errorMessage.value = describeIssue(parsed.error.issues[0]?.path[0])
      return
    }
    saving.value = true
    const result = await createFromGame(parsed.data)
    saving.value = false
    if (result.ok) {
      await finish(result.value)
      return
    }
    // Blizzard kennt den Charakter (noch) nicht, ist nicht erreichbar oder unvollständig:
    // volles Formular, soweit bekannt vorausgefüllt – bei „nicht gefunden“ mit bewusster Bestätigung
    if (result.error.code === 'character-not-in-game') {
      confirmUnknown.value = true
      confirmedName.value = normalizeCharacterName(name)
    }
    if (['game-data-unavailable', 'game-data-incomplete', 'character-not-in-game'].includes(result.error.code)) {
      quick.value = false
      const prefill = 'prefill' in result ? result.prefill : undefined
      if (prefill?.faction) form.faction = prefill.faction
      if (prefill?.raceId) form.raceId = prefill.raceId
      await nextTick()
      if (prefill?.classId) form.classId = prefill.classId
      if (prefill?.level) form.level = prefill.level
    }
    errorMessage.value = result.error.message
    return
  }

  const parsed = CharacterInputSchema.safeParse({ ...rest, name })
  if (!parsed.success) {
    errorMessage.value = describeIssue(parsed.error.issues[0]?.path[0])
    return
  }
  // Bestätigung gilt nur für genau diesen Namen
  const allowUnknown = confirmUnknown.value && confirmedName.value === parsed.data.name
  saving.value = true
  const result = props.character
    ? await update(props.character.id, parsed.data, { allowUnknown })
    : await create(parsed.data, { allowUnknown })
  saving.value = false
  if (!result.ok) {
    if (result.error.code === 'character-not-in-game') {
      confirmUnknown.value = true
      confirmedName.value = parsed.data.name
    }
    errorMessage.value = result.error.message
    return
  }
  await finish(result.value)
}
</script>

<template>
  <BaseDialog
    v-model:open="open"
    :title="title ?? (isEdit ? 'Charakter bearbeiten' : 'Charakter hinzufügen')"
    :description="description"
    :dismissible="dismissible"
  >
    <form
      :id="`${ids.error}-form`"
      class="character-form"
      novalidate
      @submit.prevent="submit"
    >
      <div class="character-form__field">
        <div class="character-form__row">
          <div class="character-form__field">
            <label
              :for="ids.firstName"
              class="character-form__label"
            >Vorname</label>
            <input
              :id="ids.firstName"
              v-model="form.firstName"
              autofocus
              type="text"
              class="character-form__input"
              autocomplete="off"
              spellcheck="false"
              maxlength="12"
              required
            >
          </div>
          <div class="character-form__field">
            <label
              :for="ids.lastName"
              class="character-form__label"
            >Nachname</label>
            <input
              :id="ids.lastName"
              v-model="form.lastName"
              type="text"
              class="character-form__input"
              autocomplete="off"
              spellcheck="false"
              maxlength="12"
              required
            >
          </div>
        </div>
        <p class="character-form__hint">
          So wie im Spiel: je 2–12 Buchstaben. Groß- und Kleinschreibung passen wir automatisch an.
        </p>
      </div>

      <p
        v-if="quick"
        class="character-form__quick"
      >
        <BaseIcon
          name="sparkle"
          :size="16"
        />
        <span>
          Stufe, Klasse und Volk holen wir automatisch von Blizzard – und halten sie aktuell.
          <button
            type="button"
            class="character-form__switch"
            @click="quick = false"
          >Lieber selbst eintragen</button>
        </span>
      </p>

      <template v-else>
        <p
          v-if="!isDemo && isEdit"
          class="character-form__hint"
        >
          Stufe, Klasse und Volk übernimmt die Seite automatisch von Blizzard, sobald der Charakter dort zu finden ist.
        </p>
        <fieldset class="character-form__fieldset">
          <legend
            :id="ids.faction"
            class="character-form__label"
          >
            Fraktion
          </legend>
          <div class="character-form__choices">
            <label class="character-form__choice">
              <input
                v-model="form.faction"
                type="radio"
                value="alliance"
                class="character-form__radio"
              >
              Allianz
            </label>
            <label class="character-form__choice">
              <input
                v-model="form.faction"
                type="radio"
                value="horde"
                class="character-form__radio"
              >
              Horde
            </label>
          </div>
        </fieldset>

        <div class="character-form__row">
          <div class="character-form__field">
            <label
              :for="ids.race"
              class="character-form__label"
            >Volk</label>
            <select
              :id="ids.race"
              v-model="form.raceId"
              class="character-form__input"
              required
            >
              <option
                value=""
                disabled
              >
                Volk wählen
              </option>
              <option
                v-for="race in availableRaces"
                :key="race.id"
                :value="race.id"
              >
                {{ race.name }}
              </option>
            </select>
          </div>
          <div class="character-form__field">
            <label
              :for="ids.class"
              class="character-form__label"
            >Klasse</label>
            <select
              :id="ids.class"
              v-model="form.classId"
              class="character-form__input"
              :disabled="!form.raceId"
              required
            >
              <option
                value=""
                disabled
              >
                {{ form.raceId ? 'Klasse wählen' : 'Erst Volk wählen' }}
              </option>
              <option
                v-for="entry in availableClasses"
                :key="entry.id"
                :value="entry.id"
              >
                {{ entry.name }}
              </option>
            </select>
          </div>
        </div>

        <div class="character-form__field">
          <label
            :for="ids.level"
            class="character-form__label"
          >Stufe</label>
          <input
            :id="ids.level"
            v-model.number="form.level"
            type="number"
            min="1"
            :max="MAX_LEVEL"
            inputmode="numeric"
            class="character-form__input character-form__input--number"
            required
          >
        </div>
      </template>

      <fieldset
        class="character-form__fieldset"
        :disabled="!quick && !form.classId"
      >
        <legend
          :id="ids.roles"
          class="character-form__label"
        >
          Rollen in Gruppen
        </legend>
        <div class="character-form__choices">
          <label
            v-for="role in roleDefinitions"
            :key="role.id"
            class="character-form__choice"
            :class="{ 'character-form__choice--unavailable': !selectableRoles.includes(role.id) }"
          >
            <input
              type="checkbox"
              class="character-form__checkbox"
              :checked="form.roles.includes(role.id)"
              :disabled="!selectableRoles.includes(role.id)"
              @change="toggleRole(role.id)"
            >
            {{ role.name }}
          </label>
        </div>
        <p class="character-form__hint">
          {{ quick || form.classId ? 'Welche Rollen möchtest du mit diesem Charakter übernehmen?' : 'Wähle zuerst eine Klasse.' }}
        </p>
      </fieldset>

      <label
        v-if="showLeaderboardOptIn"
        class="character-form__choice character-form__opt-in"
      >
        <input
          v-model="joinLeaderboard"
          type="checkbox"
          class="character-form__checkbox"
        >
        <span>
          In der Rangliste erscheinen
          <span class="character-form__hint character-form__opt-in-hint">
            Öffentlich mit Discord-Name, Profilbild, Charakteren und Punkten – jederzeit in den Einstellungen abschaltbar.
          </span>
        </span>
      </label>

      <p
        v-if="errorMessage"
        class="character-form__error"
        role="alert"
      >
        {{ errorMessage }}
      </p>
      <p
        v-if="isDemo"
        class="character-form__demo"
      >
        Demo: Der Charakter wird nur in diesem Browser-Tab gespeichert.
      </p>
    </form>

    <template #actions="{ close }">
      <BaseButton
        v-if="dismissible"
        variant="ghost"
        @click="close"
      >
        Abbrechen
      </BaseButton>
      <slot
        name="secondary-action"
        :close="close"
      />
      <BaseButton
        type="submit"
        :form="`${ids.error}-form`"
        :loading="saving"
      >
        {{ awaitingConfirm ? 'Trotzdem speichern' : (submitLabel ?? (isEdit ? 'Änderungen speichern' : 'Charakter speichern')) }}
      </BaseButton>
    </template>
  </BaseDialog>
</template>

<style scoped lang="scss">
.character-form {
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
  }

  &__fieldset {
    display: flex;
    flex-direction: column;
    gap: var(--space-2);
    padding: 0;
    margin: 0;
    border: 0;

    &:disabled {
      opacity: 0.7;
    }
  }

  &__label {
    padding: 0;
    font-size: var(--text-sm);
    font-weight: var(--font-weight-medium);
    color: var(--color-text);
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

    &:disabled {
      cursor: not-allowed;
      opacity: 0.6;
    }

    &--number {
      width: 6rem;
    }
  }

  &__choices {
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-2) var(--space-5);
  }

  &__choice {
    display: inline-flex;
    gap: var(--space-2);
    align-items: center;
    min-height: 2.75rem;
    font-size: var(--text-sm);
    cursor: pointer;

    &--unavailable {
      color: var(--color-text-subtle);
      cursor: not-allowed;
    }
  }

  &__radio,
  &__checkbox {
    width: 1.125rem;
    height: 1.125rem;
    accent-color: var(--color-accent);
  }

  &__quick {
    display: flex;
    gap: var(--space-2);
    align-items: flex-start;
    padding: var(--space-3) var(--space-4);
    font-size: var(--text-sm);
    color: var(--color-text-muted);
    background: rgb(143 211 255 / 6%);
    border: 1px solid rgb(143 211 255 / 25%);
    border-radius: var(--radius-md);

    :deep(svg) {
      flex-shrink: 0;
      margin-top: 2px;
      color: var(--color-frost);
    }
  }

  &__switch {
    display: inline;
    padding: 0;
    color: var(--color-frost);
    text-decoration: underline;
    text-underline-offset: 3px;
    cursor: pointer;

    @include focus-ring(2px);
  }

  &__hint {
    font-size: var(--text-xs);
    color: var(--color-text-muted);
  }

  &__opt-in {
    align-items: flex-start;
    padding-top: var(--space-3);
    border-top: 1px solid var(--color-border);
  }

  &__opt-in-hint {
    display: block;
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
