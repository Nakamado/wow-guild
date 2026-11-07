<script setup lang="ts">
/**
 * Einstellungen eines Gildenmitglieds: Teilnahme an der Rangliste (Opt-in) und – mit
 * Discord-Rolle „Streamer“ – der eigene Twitch-Kanal für Streamer-Liste und Clips.
 */
const { isDemo } = useSiteConfig()
const { settings, loaded, save } = useMemberSettings()

const busy = ref<'leaderboard' | 'twitch' | null>(null)
const notice = ref<{ tone: 'success' | 'error', text: string } | null>(null)
const twitchInput = ref('')
watch(() => settings.value?.twitchLogin, value => (twitchInput.value = value ?? ''), { immediate: true })

const disabled = computed(() => !settings.value?.available)

async function onToggleLeaderboard(event: Event) {
  const checked = (event.target as HTMLInputElement).checked
  busy.value = 'leaderboard'
  const result = await save({ leaderboardOptIn: checked })
  busy.value = null
  notice.value = result.ok
    ? { tone: 'success', text: checked ? 'Du erscheinst ab jetzt in der Rangliste.' : 'Du wirst nicht mehr in der Rangliste angezeigt.' }
    : { tone: 'error', text: result.error.message }
  if (!result.ok) (event.target as HTMLInputElement).checked = !checked
}

async function onSaveTwitch() {
  busy.value = 'twitch'
  const result = await save({ twitchLogin: twitchInput.value.trim() || null })
  busy.value = null
  notice.value = result.ok
    ? { tone: 'success', text: result.value.twitchLogin ? `Twitch-Kanal „${result.value.twitchLogin}“ gespeichert.` : 'Twitch-Kanal entfernt.' }
    : { tone: 'error', text: result.error.message }
}
</script>

<template>
  <section
    class="member-settings"
    aria-labelledby="member-settings-title"
  >
    <h2
      id="member-settings-title"
      class="member-settings__title"
    >
      Sichtbarkeit
    </h2>

    <p
      v-if="isDemo"
      class="member-settings__hint"
    >
      In der Demo lassen sich diese Einstellungen nicht speichern.
    </p>

    <p
      v-if="notice"
      class="member-settings__notice"
      :class="`member-settings__notice--${notice.tone}`"
      role="status"
    >
      {{ notice.text }}
    </p>

    <LoadingSkeleton
      v-if="!loaded"
      :lines="2"
    />
    <template v-else>
      <div class="member-settings__option">
        <input
          id="leaderboard-opt-in"
          type="checkbox"
          class="member-settings__checkbox"
          :checked="settings?.leaderboardOptIn ?? false"
          :disabled="disabled || busy === 'leaderboard'"
          aria-describedby="leaderboard-opt-in-hint"
          @change="onToggleLeaderboard"
        >
        <div>
          <label
            for="leaderboard-opt-in"
            class="member-settings__label"
          >In der Rangliste erscheinen</label>
          <p
            id="leaderboard-opt-in-hint"
            class="member-settings__hint"
          >
            Öffentlich sichtbar mit deinem Discord-Namen, Profilbild, Charakteren und Punkten. Du kannst das jederzeit
            wieder abschalten.
          </p>
        </div>
      </div>

      <form
        v-if="settings?.isStreamer"
        class="member-settings__twitch"
        @submit.prevent="onSaveTwitch"
      >
        <label
          for="twitch-login"
          class="member-settings__label"
        >Dein Twitch-Kanal</label>
        <p
          id="twitch-login-hint"
          class="member-settings__hint"
        >
          Du hast die Discord-Rolle „Streamer“. Mit deinem Kanal erscheinst du unter Streamer, und deine
          WoW-Clips laufen unter Clips mit. Leer lassen und speichern entfernt den Kanal.
        </p>
        <div class="member-settings__row">
          <input
            id="twitch-login"
            v-model="twitchInput"
            class="member-settings__input"
            type="text"
            inputmode="url"
            autocomplete="off"
            spellcheck="false"
            placeholder="twitch.tv/deinkanal"
            maxlength="100"
            aria-describedby="twitch-login-hint"
            :disabled="disabled"
          >
          <BaseButton
            type="submit"
            size="sm"
            :loading="busy === 'twitch'"
            :disabled="disabled"
          >
            Speichern
          </BaseButton>
        </div>
      </form>
    </template>
  </section>
</template>

<style scoped lang="scss">
.member-settings {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);

  &__title {
    font-size: var(--text-xl);
  }

  &__option {
    display: flex;
    gap: var(--space-3);
    align-items: flex-start;
  }

  &__checkbox {
    flex-shrink: 0;
    width: 1.25rem;
    height: 1.25rem;
    margin-top: 0.15rem;
    accent-color: var(--color-accent);

    @include focus-ring(2px);
  }

  &__label {
    font-weight: var(--font-weight-semibold);
    color: var(--color-text);
  }

  &__hint {
    font-size: var(--text-sm);
    color: var(--color-text-muted);
  }

  &__twitch {
    display: flex;
    flex-direction: column;
    gap: var(--space-2);
  }

  &__row {
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-2);
    align-items: center;
  }

  &__input {
    flex: 1 1 14rem;
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
}
</style>
