<script setup lang="ts">
/**
 * Einmaliger Hinweis zur geänderten Datenschutzerklärung (Aktivitätsprotokoll) für angemeldete Konten.
 * Kein Einwilligungs-Popup: nur Information mit „Verstanden“.
 */
const { privacyNoticePending, refresh } = useViewer()
const hidden = ref(false)
const busy = ref(false)

async function acknowledge() {
  busy.value = true
  try {
    await $fetch('/api/me/privacy-notice', { method: 'POST' })
    hidden.value = true
    await refresh()
  }
  catch {
    hidden.value = true // nicht blockieren – beim nächsten Login erscheint er erneut
  }
  finally {
    busy.value = false
  }
}
</script>

<template>
  <aside
    v-if="privacyNoticePending && !hidden"
    class="privacy-notice"
    aria-label="Hinweis zum Datenschutz"
  >
    <div class="privacy-notice__inner container">
      <BaseIcon
        name="info"
        :size="18"
        class="privacy-notice__icon"
      />
      <p class="privacy-notice__text">
        <strong>Datenschutzerklärung aktualisiert:</strong> Zur Verwaltung der Webseite protokollieren wir jetzt wesentliche
        Konto- und Charakteränderungen (z. B. Charakter hinzugefügt), keine Logins oder Seitenaufrufe. Außerdem kannst du
        dein Konto in den Einstellungen selbst löschen.
        <NuxtLink to="/datenschutz">Zur Datenschutzerklärung</NuxtLink>
      </p>
      <BaseButton
        size="sm"
        variant="secondary"
        :loading="busy"
        @click="acknowledge"
      >
        Verstanden
      </BaseButton>
    </div>
  </aside>
</template>

<style scoped lang="scss">
.privacy-notice {
  background: var(--color-surface-raised);
  border-bottom: 1px solid var(--color-border);

  &__inner {
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-3);
    align-items: center;
    padding-block: var(--space-3);
  }

  &__icon {
    flex-shrink: 0;
    color: var(--color-accent);
  }

  &__text {
    flex: 1 1 20rem;
    font-size: var(--text-sm);
    color: var(--color-text-muted);
  }
}
</style>
