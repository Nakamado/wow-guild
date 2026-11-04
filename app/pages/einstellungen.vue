<script setup lang="ts">
import { isUpcoming } from '#shared/domain/runs'
import type { Character } from '#shared/types'

useSeoMeta({ title: 'Einstellungen', robots: 'noindex' })

const { isDemo } = useSiteConfig()
const { signedIn, displayName, avatarUrl, viewer } = useViewer()
const { mine, loaded, canManage, remove, setMain } = useCharacters()
const { runs } = useRuns()

const levelLabels = { visitor: 'Besucher', user: 'Angemeldet (ohne Gildenrolle)', member: 'Gildenmitglied', admin: 'Gildenleitung' } as const

const formOpen = ref(false)
const editing = ref<Character | null>(null)
const deleting = ref<Character | null>(null)
const busyId = ref<string | null>(null)
const notice = ref<{ tone: 'success' | 'error', text: string } | null>(null)

/** Charaktere mit Anmeldung in kommenden Runs lassen sich nicht löschen */
const signedUpIds = computed(() => {
  const now = new Date()
  return new Set(runs.value.filter(run => isUpcoming(run, now)).flatMap(run => [...run.participants, ...run.waitlist]).map(entry => entry.characterId))
})

function openCreate() {
  editing.value = null
  formOpen.value = true
}

function openEdit(character: Character) {
  editing.value = character
  formOpen.value = true
}

function onSaved(character: Character) {
  notice.value = { tone: 'success', text: editing.value ? `${character.name} wurde gespeichert.` : `${character.name} wurde hinzugefügt.` }
}

async function onSetMain(character: Character) {
  busyId.value = character.id
  const result = await setMain(character.id)
  busyId.value = null
  notice.value = result.ok
    ? { tone: 'success', text: `${character.name} ist jetzt dein Hauptcharakter.` }
    : { tone: 'error', text: result.error.message }
}

const deleteOpen = computed({
  get: () => deleting.value !== null,
  set: (value) => {
    if (!value) deleting.value = null
  },
})

async function onDelete() {
  const character = deleting.value
  if (!character) return
  busyId.value = character.id
  const result = await remove(character.id, { signedUp: signedUpIds.value.has(character.id) })
  busyId.value = null
  deleting.value = null
  notice.value = result.ok
    ? { tone: 'success', text: `${character.name} wurde gelöscht.` }
    : { tone: 'error', text: result.error.message }
}
</script>

<template>
  <div class="settings-page">
    <PageHeader
      title="Einstellungen"
      lead="Dein Profil und deine Charaktere. Andere Mitglieder sehen hier, mit wem sie in Gruppen spielen."
      narrow
    />

    <div class="settings-page__body container container--narrow">
      <BaseCard
        v-if="!signedIn"
        class="settings-page__card"
      >
        <EmptyState
          icon="lock"
          title="Bitte melde dich an"
          :description="isDemo
            ? 'In der Demo: oben bei „Ansicht als“ eine Mitglieder-Ansicht wählen.'
            : 'Mit deinem Discord-Konto kannst du deine Charaktere eintragen und Gruppen beitreten.'"
        />
        <div class="settings-page__center">
          <LoginButton />
        </div>
      </BaseCard>

      <template v-else>
        <section
          class="settings-page__profile"
          aria-labelledby="settings-profile"
        >
          <h2
            id="settings-profile"
            class="visually-hidden"
          >
            Profil
          </h2>
          <MemberAvatar
            :name="displayName ?? 'Du'"
            :src="avatarUrl"
            size="lg"
          />
          <div>
            <p class="settings-page__name">
              {{ displayName ?? 'Unbekannt' }}
            </p>
            <p class="settings-page__level">
              {{ levelLabels[viewer.level] }}
            </p>
            <p class="settings-page__hint">
              Name und Avatar kommen aus Discord.
            </p>
          </div>
        </section>

        <MembersLocked v-if="!canManage" />

        <section
          v-else
          class="settings-page__characters"
          aria-labelledby="settings-characters"
        >
          <header class="settings-page__section-header">
            <h2
              id="settings-characters"
              class="settings-page__title"
            >
              Meine Charaktere
            </h2>
            <BaseButton
              size="sm"
              icon-left="plus"
              @click="openCreate"
            >
              {{ mine.length ? 'Twink hinzufügen' : 'Hauptcharakter eintragen' }}
            </BaseButton>
          </header>

          <p
            v-if="notice"
            class="settings-page__notice"
            :class="`settings-page__notice--${notice.tone}`"
            role="status"
          >
            {{ notice.text }}
          </p>

          <LoadingSkeleton
            v-if="!loaded"
            :lines="3"
          />
          <EmptyState
            v-else-if="!mine.length"
            title="Noch keine Charaktere"
            description="Trag deinen Hauptcharakter ein, damit du Gruppen beitreten kannst."
          />
          <ul
            v-else
            class="settings-page__list"
          >
            <li
              v-for="character in mine"
              :key="character.id"
              class="settings-page__item"
            >
              <CharacterCard :character="character" />
              <div class="settings-page__actions">
                <BaseButton
                  size="sm"
                  variant="secondary"
                  icon-left="edit"
                  :aria-label="`${character.name} bearbeiten`"
                  @click="openEdit(character)"
                >
                  Bearbeiten
                </BaseButton>
                <BaseButton
                  v-if="!character.isMain"
                  size="sm"
                  variant="ghost"
                  icon-left="star"
                  :loading="busyId === character.id"
                  :aria-label="`${character.name} als Hauptcharakter festlegen`"
                  @click="onSetMain(character)"
                >
                  Als Hauptcharakter
                </BaseButton>
                <BaseButton
                  size="sm"
                  variant="ghost"
                  icon-left="trash"
                  :aria-label="`${character.name} löschen`"
                  @click="deleting = character"
                >
                  Löschen
                </BaseButton>
              </div>
            </li>
          </ul>
        </section>
      </template>
    </div>

    <CharacterFormDialog
      v-model:open="formOpen"
      :character="editing"
      @saved="onSaved"
    />

    <BaseDialog
      v-model:open="deleteOpen"
      title="Charakter löschen?"
      size="sm"
      :description="deleting && signedUpIds.has(deleting.id)
        ? `${deleting.name} ist noch für kommende Gruppen angemeldet. Melde ihn zuerst dort ab.`
        : `${deleting?.name ?? 'Der Charakter'} wird aus deinem Profil entfernt.`"
    >
      <template #actions="{ close }">
        <BaseButton
          variant="ghost"
          @click="close"
        >
          Abbrechen
        </BaseButton>
        <BaseButton
          :disabled="!!deleting && signedUpIds.has(deleting.id)"
          :loading="!!deleting && busyId === deleting.id"
          @click="onDelete"
        >
          Löschen
        </BaseButton>
      </template>
    </BaseDialog>
  </div>
</template>

<style scoped lang="scss">
.settings-page {
  &__body {
    display: flex;
    flex-direction: column;
    gap: var(--space-8);
    padding-block: var(--space-8) var(--space-16);
  }

  &__center {
    display: flex;
    justify-content: center;
  }

  &__profile {
    display: flex;
    gap: var(--space-4);
    align-items: center;
  }

  &__name {
    font-family: var(--font-display);
    font-size: var(--text-xl);
    color: var(--color-text);
  }

  &__level {
    font-size: var(--text-sm);
    color: var(--color-accent);
  }

  &__hint {
    font-size: var(--text-xs);
    color: var(--color-text-subtle);
  }

  &__characters {
    display: flex;
    flex-direction: column;
    gap: var(--space-4);
  }

  &__section-header {
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-3);
    align-items: center;
    justify-content: space-between;
  }

  &__title {
    font-size: var(--text-xl);
  }

  &__notice {
    padding: var(--space-3) var(--space-4);
    font-size: var(--text-sm);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-md);

    &--success {
      color: var(--color-success);
      border-color: rgb(130 220 170 / 30%);
    }

    &--error {
      color: var(--color-danger);
      border-color: rgb(255 138 138 / 30%);
    }
  }

  &__list {
    display: flex;
    flex-direction: column;
    gap: var(--space-4);
    padding: 0;
    margin: 0;
    list-style: none;
  }

  &__item {
    display: flex;
    flex-direction: column;
    gap: var(--space-3);
  }

  &__actions {
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-2);
  }
}
</style>
