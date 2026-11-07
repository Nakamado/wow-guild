<script setup lang="ts">
import { consentChannelLabels, type ConsentChannel, type LeaderboardGrant } from '#shared/schemas/admin'

interface GrantsResponse {
  grants: (LeaderboardGrant & { characterName: string })[]
  members: { id: string, displayName: string, optedIn: boolean, characters: { id: string, name: string }[] }[]
}

const { data, error, status, refresh } = await useFetch<GrantsResponse>('/api/admin/grants', { key: 'admin-grants' })

const today = toZonedParts(new Date()).date
const form = reactive({
  memberId: '',
  characterId: '',
  consentChannel: 'discord-message' as ConsentChannel,
  consentDate: today,
  note: '',
  confirmed: false,
})
const file = ref<File | null>(null)
const fileInput = ref<HTMLInputElement | null>(null)
const saving = ref(false)
const formError = ref<string | null>(null)
const notice = ref<{ tone: 'success' | 'error', text: string } | null>(null)

const memberName = (id: string) => data.value?.members.find(member => member.id === id)?.displayName ?? id
const activeCharacterIds = computed(() => new Set((data.value?.grants ?? []).filter(grant => !grant.revokedAt).map(grant => grant.characterId)))
const selectedMember = computed(() => data.value?.members.find(member => member.id === form.memberId) ?? null)
const availableCharacters = computed(() => (selectedMember.value?.characters ?? []).filter(character => !activeCharacterIds.value.has(character.id)))
watch(() => form.memberId, () => (form.characterId = ''))

const activeGrants = computed(() => (data.value?.grants ?? []).filter(grant => !grant.revokedAt))
const revokedGrants = computed(() => (data.value?.grants ?? []).filter(grant => grant.revokedAt))

function onFile(event: Event) {
  const selected = (event.target as HTMLInputElement).files?.[0] ?? null
  formError.value = null
  if (selected && selected.size > 3 * 1024 * 1024) {
    formError.value = 'Der Screenshot ist zu groß (höchstens 3 MB).'
    file.value = null
    if (fileInput.value) fileInput.value.value = ''
    return
  }
  file.value = selected
}

async function submit() {
  formError.value = null
  if (!form.memberId || !form.characterId) {
    formError.value = 'Bitte Mitglied und Charakter wählen.'
    return
  }
  if (!form.confirmed) {
    formError.value = 'Bitte bestätige, dass eine ausdrückliche Zustimmung zur öffentlichen Rangliste vorliegt.'
    return
  }
  const body = new FormData()
  body.set('memberId', form.memberId)
  body.set('characterId', form.characterId)
  body.set('consentChannel', form.consentChannel)
  body.set('consentDate', form.consentDate)
  body.set('note', form.note)
  body.set('confirmed', String(form.confirmed))
  if (file.value) body.set('evidence', file.value)
  saving.value = true
  try {
    await $fetch('/api/admin/grants', { method: 'POST', body })
    notice.value = { tone: 'success', text: 'Freigabe gespeichert – der Charakter erscheint mit der nächsten Aktualisierung in der Rangliste.' }
    Object.assign(form, { memberId: '', characterId: '', consentChannel: 'discord-message', consentDate: today, note: '', confirmed: false })
    file.value = null
    if (fileInput.value) fileInput.value.value = ''
    await refresh()
  }
  catch (submitError) {
    formError.value = apiErrorMessage(submitError)
  }
  finally {
    saving.value = false
  }
}

const pending = ref<{ kind: 'revoke' | 'evidence', grant: GrantsResponse['grants'][number] } | null>(null)
const dialogOpen = computed({
  get: () => pending.value !== null,
  set: (value) => {
    if (!value) pending.value = null
  },
})
const busy = ref(false)

async function confirmPending() {
  const action = pending.value
  if (!action) return
  busy.value = true
  try {
    await $fetch(action.kind === 'revoke' ? `/api/admin/grants/${action.grant.id}` : `/api/admin/grants/${action.grant.id}/evidence`, { method: 'DELETE' })
    notice.value = { tone: 'success', text: action.kind === 'revoke' ? `Freigabe für ${action.grant.characterName} zurückgezogen.` : 'Nachweis gelöscht.' }
    await refresh()
  }
  catch (actionError) {
    notice.value = { tone: 'error', text: apiErrorMessage(actionError) }
  }
  finally {
    busy.value = false
    pending.value = null
  }
}

const revokedLabel = (grant: LeaderboardGrant) => `${grant.revokedReason === 'member' ? 'vom Mitglied widerrufen' : 'zurückgezogen'} am ${formatDate(grant.revokedAt!)}`
</script>

<template>
  <section
    class="admin-grants"
    aria-labelledby="admin-grants-title"
  >
    <h2
      id="admin-grants-title"
      class="admin-grants__title"
    >
      Ranglistenfreigaben
    </h2>
    <p class="admin-grants__hint">
      Für Mitglieder, die dir ausdrücklich zugestimmt haben, in der öffentlichen Rangliste zu erscheinen. Eine Freigabe gilt
      nur für den gewählten Charakter. Widerruft das Mitglied in den Einstellungen, enden alle Freigaben sofort; eine neue
      braucht dann eine neue Zustimmung.
    </p>

    <p
      v-if="notice"
      class="admin-grants__notice"
      :class="`admin-grants__notice--${notice.tone}`"
      role="status"
    >
      {{ notice.text }}
    </p>

    <ErrorState
      v-if="error"
      :message="apiErrorMessage(error)"
    />
    <LoadingSkeleton
      v-else-if="status === 'pending'"
      :lines="5"
    />
    <template v-else-if="data">
      <BaseCard class="admin-grants__card">
        <form
          class="admin-grants__form"
          novalidate
          @submit.prevent="submit"
        >
          <h3 class="admin-grants__subtitle">
            Neue Freigabe
          </h3>
          <div class="admin-grants__row">
            <label class="admin-grants__field">
              <span class="admin-grants__label">Mitglied</span>
              <select
                v-model="form.memberId"
                class="admin-grants__input"
              >
                <option
                  value=""
                  disabled
                >Mitglied wählen</option>
                <option
                  v-for="member in data.members"
                  :key="member.id"
                  :value="member.id"
                >
                  {{ member.displayName }}{{ member.optedIn ? ' (nimmt bereits selbst teil)' : '' }}
                </option>
              </select>
            </label>
            <label class="admin-grants__field">
              <span class="admin-grants__label">Charakter</span>
              <select
                v-model="form.characterId"
                class="admin-grants__input"
                :disabled="!form.memberId"
              >
                <option
                  value=""
                  disabled
                >{{ form.memberId ? (availableCharacters.length ? 'Charakter wählen' : 'Alle bereits freigegeben') : 'Erst Mitglied wählen' }}</option>
                <option
                  v-for="character in availableCharacters"
                  :key="character.id"
                  :value="character.id"
                >
                  {{ character.name }}
                </option>
              </select>
            </label>
          </div>
          <div class="admin-grants__row">
            <label class="admin-grants__field">
              <span class="admin-grants__label">Art der Zustimmung</span>
              <select
                v-model="form.consentChannel"
                class="admin-grants__input"
              >
                <option
                  v-for="(label, value) in consentChannelLabels"
                  :key="value"
                  :value="value"
                >{{ label }}</option>
              </select>
            </label>
            <label class="admin-grants__field">
              <span class="admin-grants__label">Datum der Zustimmung</span>
              <input
                v-model="form.consentDate"
                type="date"
                :max="today"
                class="admin-grants__input"
              >
            </label>
          </div>
          <label class="admin-grants__field">
            <span class="admin-grants__label">Screenshot als Nachweis (optional)</span>
            <input
              ref="fileInput"
              type="file"
              accept="image/png,image/jpeg,image/webp"
              class="admin-grants__file"
              aria-describedby="evidence-hint"
              @change="onFile"
            >
            <span
              id="evidence-hint"
              class="admin-grants__small"
            >PNG, JPEG oder WebP, höchstens 3 MB. Bitte vorher auf die Zustimmung zuschneiden – keine anderen Nachrichten oder Personen.</span>
          </label>
          <label class="admin-grants__field">
            <span class="admin-grants__label">Interne Notiz (optional)</span>
            <textarea
              v-model="form.note"
              rows="2"
              maxlength="300"
              class="admin-grants__input"
            />
          </label>
          <label class="admin-grants__confirm">
            <input
              v-model="form.confirmed"
              type="checkbox"
              class="admin-grants__checkbox"
            >
            <span>Das Mitglied hat mir ausdrücklich zugestimmt, mit diesem Charakter in der <strong>öffentlichen Rangliste</strong> zu erscheinen.</span>
          </label>
          <p
            v-if="formError"
            class="admin-grants__error"
            role="alert"
          >
            {{ formError }}
          </p>
          <div>
            <BaseButton
              type="submit"
              :loading="saving"
            >
              Freigabe speichern
            </BaseButton>
          </div>
        </form>
      </BaseCard>

      <div>
        <h3 class="admin-grants__subtitle">
          Aktive Freigaben
        </h3>
        <p
          v-if="!activeGrants.length"
          class="admin-grants__small"
        >
          Noch keine Freigaben.
        </p>
        <ul
          v-else
          class="admin-grants__list"
        >
          <li
            v-for="grant in activeGrants"
            :key="grant.id"
            class="admin-grants__item"
          >
            <div>
              <strong>{{ grant.characterName }}</strong> · {{ memberName(grant.memberId) }}
              <p class="admin-grants__small">
                Zustimmung vom {{ formatDate(`${grant.consentDate}T12:00:00Z`) }} per {{ consentChannelLabels[grant.consentChannel] }}<template v-if="grant.note">
                  · {{ grant.note }}
                </template>
              </p>
            </div>
            <div class="admin-grants__actions">
              <BaseButton
                v-if="grant.hasEvidence"
                size="sm"
                variant="secondary"
                :href="`/api/admin/grants/${grant.id}/evidence`"
                external
              >
                Nachweis ansehen
              </BaseButton>
              <BaseButton
                v-if="grant.hasEvidence"
                size="sm"
                variant="ghost"
                @click="pending = { kind: 'evidence', grant }"
              >
                Nachweis löschen
              </BaseButton>
              <BaseButton
                size="sm"
                variant="ghost"
                icon-left="trash"
                @click="pending = { kind: 'revoke', grant }"
              >
                Zurückziehen
              </BaseButton>
            </div>
          </li>
        </ul>
      </div>

      <details
        v-if="revokedGrants.length"
        class="admin-grants__history"
      >
        <summary>Beendete Freigaben ({{ revokedGrants.length }})</summary>
        <ul class="admin-grants__list">
          <li
            v-for="grant in revokedGrants"
            :key="grant.id"
            class="admin-grants__item admin-grants__item--revoked"
          >
            <div>
              {{ grant.characterName }} · {{ memberName(grant.memberId) }}
              <p class="admin-grants__small">
                Zustimmung vom {{ formatDate(`${grant.consentDate}T12:00:00Z`) }} · {{ revokedLabel(grant) }}
              </p>
            </div>
          </li>
        </ul>
      </details>
    </template>

    <BaseDialog
      v-model:open="dialogOpen"
      size="sm"
      :title="pending?.kind === 'revoke' ? 'Freigabe zurückziehen?' : 'Nachweis löschen?'"
      :description="pending?.kind === 'revoke'
        ? `${pending?.grant.characterName} verschwindet aus der Rangliste (sofern das Mitglied nicht selbst teilnimmt). Der Nachweis wird gelöscht.`
        : 'Der Screenshot wird endgültig gelöscht. Die Freigabe bleibt bestehen.'"
    >
      <template #actions="{ close }">
        <BaseButton
          variant="ghost"
          @click="close"
        >
          Abbrechen
        </BaseButton>
        <BaseButton
          :loading="busy"
          @click="confirmPending"
        >
          {{ pending?.kind === 'revoke' ? 'Zurückziehen' : 'Löschen' }}
        </BaseButton>
      </template>
    </BaseDialog>
  </section>
</template>

<style scoped lang="scss">
.admin-grants {
  display: flex;
  flex-direction: column;
  gap: var(--space-5);

  &__title {
    font-size: var(--text-xl);
  }

  &__subtitle {
    margin-bottom: var(--space-3);
    font-size: var(--text-lg);
  }

  &__hint,
  &__small {
    font-size: var(--text-sm);
    color: var(--color-text-muted);
  }

  &__small {
    font-size: var(--text-xs);
  }

  &__form {
    display: flex;
    flex-direction: column;
    gap: var(--space-4);
  }

  &__row {
    display: grid;
    gap: var(--space-4);

    @include mq('md') {
      grid-template-columns: 1fr 1fr;
    }
  }

  &__field {
    display: flex;
    flex-direction: column;
    gap: var(--space-1);
  }

  &__label {
    font-size: var(--text-sm);
    font-weight: var(--font-weight-semibold);
    color: var(--color-text);
  }

  &__input,
  &__file {
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
  }

  &__confirm {
    display: flex;
    gap: var(--space-3);
    align-items: flex-start;
    font-size: var(--text-sm);
  }

  &__checkbox {
    flex-shrink: 0;
    width: 1.25rem;
    height: 1.25rem;
    margin-top: 0.1rem;
    accent-color: var(--color-accent);
  }

  &__error {
    color: var(--color-danger);
  }

  &__list {
    display: flex;
    flex-direction: column;
    padding: 0;
    margin: 0;
    list-style: none;
    border-top: 1px solid var(--color-border);
  }

  &__item {
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-3);
    align-items: center;
    justify-content: space-between;
    padding: var(--space-3) 0;
    font-size: var(--text-sm);
    border-bottom: 1px solid var(--color-border);

    &--revoked {
      color: var(--color-text-muted);
    }
  }

  &__actions {
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-2);
  }

  &__history summary {
    font-size: var(--text-sm);
    color: var(--color-text-muted);
    cursor: pointer;
  }

  &__notice {
    padding: var(--space-3) var(--space-4);
    font-size: var(--text-sm);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-md);

    &--success {
      color: var(--color-success);
    }

    &--error {
      color: var(--color-danger);
    }
  }
}
</style>
