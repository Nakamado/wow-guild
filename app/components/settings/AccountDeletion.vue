<script setup lang="ts">
/**
 * Eigenes Konto löschen. Ein erneuter Discord-Login legt später wieder ein leeres Konto an.
 */
const { isDemo } = useSiteConfig()
const { viewer, refresh } = useViewer()
const open = ref(false)
const understood = ref(false)
const busy = ref(false)
const errorMessage = ref<string | null>(null)
const isSuperadmin = computed(() => viewer.value.level === 'superadmin')

watch(open, (isOpen) => {
  if (isOpen) {
    understood.value = false
    errorMessage.value = null
  }
})

async function deleteAccount() {
  busy.value = true
  errorMessage.value = null
  try {
    await $fetch('/api/me/account', { method: 'DELETE', body: { confirm: true } })
    open.value = false
    await refresh()
    await navigateTo({ path: '/', query: { konto: 'geloescht' } })
  }
  catch (deleteError) {
    errorMessage.value = apiErrorMessage(deleteError)
  }
  finally {
    busy.value = false
  }
}
</script>

<template>
  <section
    class="account-deletion"
    aria-labelledby="account-deletion-title"
  >
    <h2
      id="account-deletion-title"
      class="account-deletion__title"
    >
      Konto löschen
    </h2>
    <p class="account-deletion__text">
      Löscht dein Profil mit allen Charakteren, Gruppenanmeldungen, selbst erstellten Gruppen und deiner Ranglisten-Teilnahme.
      Du erscheinst danach nicht mehr als Mitglied auf der Webseite. Mit einem neuen Discord-Login kannst du dich jederzeit
      wieder registrieren – dann mit einem leeren Konto.
    </p>
    <p
      v-if="isSuperadmin"
      class="account-deletion__text"
    >
      Als Hauptadmin kannst du dein Konto hier nicht löschen.
    </p>
    <div v-else>
      <BaseButton
        variant="ghost"
        icon-left="trash"
        :disabled="isDemo"
        @click="open = true"
      >
        Konto löschen
      </BaseButton>
      <p
        v-if="isDemo"
        class="account-deletion__text"
      >
        In der Demo nicht verfügbar.
      </p>
    </div>

    <BaseDialog
      v-model:open="open"
      size="sm"
      title="Konto wirklich löschen?"
      description="Das lässt sich nicht rückgängig machen. Deine Charaktere, Anmeldungen und selbst erstellten Gruppen werden gelöscht; kommende Anmeldungen geben deinen Platz an die Warteliste frei."
    >
      <label class="account-deletion__confirm">
        <input
          v-model="understood"
          type="checkbox"
          class="account-deletion__checkbox"
        >
        <span>Ja, ich möchte mein Konto mit allen Daten löschen.</span>
      </label>
      <p
        v-if="errorMessage"
        class="account-deletion__error"
        role="alert"
      >
        {{ errorMessage }}
      </p>
      <template #actions="{ close }">
        <BaseButton
          variant="ghost"
          @click="close"
        >
          Abbrechen
        </BaseButton>
        <BaseButton
          :disabled="!understood"
          :loading="busy"
          @click="deleteAccount"
        >
          Endgültig löschen
        </BaseButton>
      </template>
    </BaseDialog>
  </section>
</template>

<style scoped lang="scss">
.account-deletion {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
  padding-top: var(--space-6);
  border-top: 1px solid var(--color-border);

  &__title {
    font-size: var(--text-xl);
  }

  &__text {
    font-size: var(--text-sm);
    color: var(--color-text-muted);
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
    margin-top: var(--space-3);
    color: var(--color-danger);
  }
}
</style>
