<script setup lang="ts">
import { findRace } from '#shared/data/races'
import { getRole } from '#shared/data/roles'
import { computeComposition } from '#shared/domain/composition'
import { checkLevelFit, type LevelFitStatus } from '#shared/domain/level'
import { canJoinRun, supporterToBump } from '#shared/domain/runs'
import type { Dungeon, GroupRun, RoleId } from '#shared/types'

const open = defineModel<boolean>('open', { default: false })
const props = defineProps<{ run: GroupRun, dungeon: Dungeon }>()
const emit = defineEmits<{ joined: [placement: 'participant' | 'waitlist', message: string] }>()

const { isDemo } = useSiteConfig()
const { viewer } = useViewer()
const { myCharacters, joinRun } = useRuns()

const characterId = ref<string | null>(null)
const role = ref<RoleId | null>(null)
/** false = fest dabei, true = Supporter (hilft aus, macht Platz) */
const support = ref(false)
const submitError = ref<string | null>(null)
const ids = { characters: useId(), roles: useId(), mode: useId() }

const character = computed(() => myCharacters.value.find(entry => entry.id === characterId.value) ?? null)
const slots = computed(() => computeComposition(props.run).slots)

// Beim Öffnen: Hauptcharakter vorauswählen
// `immediate`: der Dialog kann bereits geöffnet eingeblendet werden (z. B. aus dem Kalender)
watch(open, (isOpen) => {
  if (!isOpen) return
  submitError.value = null
  support.value = false
  const preferred = myCharacters.value.find(entry => entry.isMain) ?? myCharacters.value[0] ?? null
  characterId.value = preferred?.id ?? null
}, { immediate: true })

// Rolle passend zum Charakter vorauswählen (bevorzugt eine mit freiem Platz)
watch(character, (current) => {
  if (!current) {
    role.value = null
    return
  }
  if (role.value && current.roles.includes(role.value)) return
  role.value = current.roles.find(entry => (slots.value.find(slot => slot.role === entry)?.open ?? 0) > 0) ?? current.roles[0] ?? null
}, { immediate: true })

const check = computed(() => {
  if (!character.value || !role.value || !viewer.value.memberId) return null
  return canJoinRun({
    run: props.run,
    dungeon: props.dungeon,
    member: { id: viewer.value.memberId, isGuildMember: true },
    character: character.value,
    role: role.value,
    support: support.value,
    now: new Date(),
  })
})

const fitLabels: Record<LevelFitStatus, string> = {
  'fit': 'Stufe passt',
  'below-minimum': 'Stufe zu niedrig',
  'below-recommended': 'Unter der empfohlenen Stufe',
  'above-recommended': 'Über der empfohlenen Stufe',
}

function fitOf(level: number) {
  return checkLevelFit(level, props.dungeon)
}

function slotLabel(roleId: RoleId) {
  const slot = slots.value.find(entry => entry.role === roleId)
  if (!slot || slot.capacity === 0) return 'nicht gesucht'
  if (slot.open > 0) return `${slot.open} frei`
  if (!support.value && supporterToBump(props.run, roleId)) return 'Supporter macht Platz'
  return props.run.waitlistEnabled ? 'voll, Warteliste' : 'voll'
}

const submitting = ref(false)

async function submit() {
  if (!characterId.value || !role.value || submitting.value) return
  submitting.value = true
  const result = await joinRun(props.run.id, characterId.value, role.value, support.value)
  submitting.value = false
  if (!result.ok) {
    submitError.value = result.error.message
    return
  }
  const { placement } = result.value.check
  const name = character.value?.name ?? 'Dein Charakter'
  const as = support.value ? `Supporter (${getRole(role.value).name})` : getRole(role.value).name
  const message = placement === 'participant'
    ? `Du bist dabei: ${name} als ${as}.`
    : `${name} steht auf der Warteliste für ${getRole(role.value).name}.`
  open.value = false
  emit('joined', placement, message)
}
</script>

<template>
  <BaseDialog
    v-model:open="open"
    title="Gruppe beitreten"
    :description="`${dungeon.name}, ${formatDateTime(run.startsAt)} Uhr`"
  >
    <div
      v-if="!myCharacters.length"
      class="signup"
    >
      <EmptyState
        title="Noch kein Charakter hinterlegt"
        description="Trag zuerst deinen Hauptcharakter ein, dann kannst du Gruppen beitreten."
      />
    </div>

    <form
      v-else
      id="signup-form"
      class="signup"
      @submit.prevent="submit"
    >
      <fieldset class="signup__group">
        <legend
          :id="ids.characters"
          class="signup__legend"
        >
          Charakter
        </legend>
        <label
          v-for="entry in myCharacters"
          :key="entry.id"
          class="signup__option"
          :class="{ 'signup__option--selected': entry.id === characterId }"
          :style="{ '--class-color': `var(--color-class-${entry.classId}, var(--color-class-unknown))` }"
        >
          <input
            v-model="characterId"
            type="radio"
            name="character"
            :value="entry.id"
            class="signup__radio"
          >
          <span class="signup__option-main">
            <span class="signup__character">{{ entry.name }}</span>
            <span class="signup__character-meta">Stufe {{ entry.level }} {{ findRace(entry.raceId)?.name }}</span>
          </span>
          <ClassBadge :class-id="entry.classId" />
          <span
            class="signup__fit"
            :class="`signup__fit--${fitOf(entry.level).status}`"
          >
            {{ fitLabels[fitOf(entry.level).status] }}
          </span>
        </label>
      </fieldset>

      <fieldset
        v-if="character"
        class="signup__group"
      >
        <legend
          :id="ids.roles"
          class="signup__legend"
        >
          Rolle
        </legend>
        <div class="signup__roles">
          <label
            v-for="entry in character.roles"
            :key="entry"
            class="signup__role"
            :class="{ 'signup__role--selected': entry === role }"
          >
            <input
              v-model="role"
              type="radio"
              name="role"
              :value="entry"
              class="signup__radio"
            >
            <RoleBadge :role="entry" />
            <span class="signup__slot">{{ slotLabel(entry) }}</span>
          </label>
        </div>
        <p class="signup__hint">
          Es stehen nur Rollen zur Wahl, die {{ character.name }} als Spielrolle hinterlegt hat.
        </p>
      </fieldset>

      <fieldset
        v-if="character"
        class="signup__group"
      >
        <legend
          :id="ids.mode"
          class="signup__legend"
        >
          Wie bist du dabei?
        </legend>
        <label
          class="signup__mode"
          :class="{ 'signup__mode--selected': !support }"
        >
          <input
            v-model="support"
            type="radio"
            name="mode"
            :value="false"
            class="signup__radio"
          >
          <span>
            <span class="signup__mode-title">Fest dabei</span>
            <span class="signup__mode-text">Ich brauche den Dungeon, z. B. für Quests oder Ausrüstung.</span>
          </span>
        </label>
        <label
          class="signup__mode"
          :class="{ 'signup__mode--selected': support }"
        >
          <input
            v-model="support"
            type="radio"
            name="mode"
            :value="true"
            class="signup__radio"
          >
          <span>
            <span class="signup__mode-title">Als Supporter</span>
            <span class="signup__mode-text">Ich helfe aus. Meldet sich jemand fest an, der den Dungeon braucht, mache ich Platz und rücke auf die Warteliste.</span>
          </span>
        </label>
      </fieldset>

      <div
        v-if="check"
        class="signup__check"
        aria-live="polite"
      >
        <p
          v-if="!check.ok"
          class="signup__message signup__message--error"
        >
          {{ check.error.message }}
        </p>
        <template v-else>
          <p
            v-for="warning in check.value.warnings"
            :key="warning"
            class="signup__message signup__message--warning"
          >
            {{ warning }}
          </p>
          <p
            v-if="!check.value.warnings.length"
            class="signup__message signup__message--ok"
          >
            Alles passt – du kannst beitreten.
          </p>
        </template>
      </div>

      <p
        v-if="submitError"
        class="signup__message signup__message--error"
        role="alert"
      >
        {{ submitError }}
      </p>
      <p
        v-if="isDemo"
        class="signup__demo"
      >
        Demo: Die Anmeldung gilt nur in diesem Browser-Tab.
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
        v-if="myCharacters.length"
        type="submit"
        form="signup-form"
        :disabled="!check || !check.ok"
        :loading="submitting"
      >
        {{ check?.ok && check.value.placement === 'waitlist' ? 'Auf die Warteliste' : 'Beitreten' }}
      </BaseButton>
    </template>
  </BaseDialog>
</template>

<style scoped lang="scss">
.signup {
  display: flex;
  flex-direction: column;
  gap: var(--space-5);

  &__group {
    display: flex;
    flex-direction: column;
    gap: var(--space-2);
    padding: 0;
    margin: 0;
    border: 0;
  }

  &__legend {
    padding: 0;
    margin-bottom: var(--space-2);
    font-size: var(--text-sm);
    font-weight: var(--font-weight-semibold);
  }

  &__option {
    display: grid;
    grid-template-columns: auto 1fr auto;
    gap: var(--space-1) var(--space-3);
    align-items: center;
    padding: var(--space-3) var(--space-4);
    cursor: pointer;
    border: 1px solid var(--color-border);
    border-left: 3px solid var(--class-color);
    border-radius: var(--radius-md);
    transition: border-color var(--duration-fast) var(--ease-out), background var(--duration-fast);

    &:hover {
      background: rgb(150 190 255 / 5%);
    }

    &--selected {
      background: rgb(143 211 255 / 8%);
      border-color: var(--color-accent);
      border-left-color: var(--class-color);
    }
  }

  &__radio {
    accent-color: var(--color-accent);
  }

  &__option-main {
    display: flex;
    flex-direction: column;
    min-width: 0;
  }

  &__character {
    font-weight: var(--font-weight-semibold);
  }

  &__character-meta {
    font-size: var(--text-xs);
    color: var(--color-text-muted);
  }

  &__fit {
    grid-column: 2 / -1;
    font-size: var(--text-xs);

    &--fit { color: var(--color-success); }

    &--below-recommended,
    &--above-recommended { color: var(--color-warning); }
    &--below-minimum { color: var(--color-danger); }
  }

  &__mode {
    display: grid;
    grid-template-columns: auto 1fr;
    gap: var(--space-3);
    align-items: start;
    padding: var(--space-3) var(--space-4);
    cursor: pointer;
    border: 1px solid var(--color-border);
    border-radius: var(--radius-md);

    &:hover {
      background: rgb(150 190 255 / 5%);
    }

    &--selected {
      background: rgb(143 211 255 / 8%);
      border-color: var(--color-accent);
    }

    .signup__radio {
      margin-top: 0.2rem;
    }
  }

  &__mode-title {
    display: block;
    font-weight: var(--font-weight-semibold);
  }

  &__mode-text {
    display: block;
    font-size: var(--text-xs);
    color: var(--color-text-muted);
  }

  &__roles {
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-2);
  }

  &__role {
    display: inline-flex;
    gap: var(--space-2);
    align-items: center;
    padding: var(--space-2) var(--space-3);
    cursor: pointer;
    border: 1px solid var(--color-border);
    border-radius: var(--radius-pill);

    &--selected {
      background: rgb(143 211 255 / 8%);
      border-color: var(--color-accent);
    }
  }

  &__slot {
    font-size: var(--text-xs);
    color: var(--color-text-muted);
  }

  &__hint {
    font-size: var(--text-xs);
    color: var(--color-text-subtle);
  }

  &__check {
    display: flex;
    flex-direction: column;
    gap: var(--space-2);
  }

  &__message {
    padding: var(--space-3) var(--space-4);
    font-size: var(--text-sm);
    border-radius: var(--radius-md);

    &--ok {
      color: var(--color-success);
      background: rgb(126 226 168 / 8%);
    }

    &--warning {
      color: var(--color-warning);
      background: rgb(245 199 104 / 8%);
    }

    &--error {
      color: var(--color-danger);
      background: rgb(255 138 138 / 8%);
    }
  }

  &__demo {
    font-size: var(--text-xs);
    color: var(--color-lantern);
  }
}
</style>
