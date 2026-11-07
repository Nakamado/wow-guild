<script setup lang="ts">
/** Hinweis, wenn Mitgliederdaten (Datenschutz) nur für Gildenmitglieder sichtbar sind. */
withDefaults(defineProps<{ compact?: boolean }>(), { compact: false })

const { isDemo } = useSiteConfig()
const { viewer } = useViewer()
const signedIn = computed(() => viewer.value.level !== 'visitor')
</script>

<template>
  <div
    class="members-locked"
    :class="{ 'members-locked--compact': compact }"
  >
    <BaseIcon
      name="lock"
      :size="compact ? 20 : 28"
      class="members-locked__icon"
    />
    <div class="members-locked__body">
      <p class="members-locked__title">
        {{ signedIn ? 'Nur für Gildenmitglieder' : 'Mitglieder sehen mehr' }}
      </p>
      <p class="members-locked__text">
        <template v-if="signedIn">
          Dein Discord-Konto hat noch nicht die Rolle „WoW Forever“. Frag im Discord nach, um freigeschaltet zu werden.
        </template>
        <template v-else>
          Mitgliederliste und Charakterprofile sind nur für Gildenmitglieder sichtbar, damit nicht jeder sieht, wer bei uns spielt.
        </template>
      </p>
      <p
        v-if="isDemo"
        class="members-locked__demo"
      >
        Demo: Stell oben bei „Ansicht als“ auf „Mitglied“, um die Liste zu sehen.
      </p>
      <LoginButton
        v-else-if="!signedIn"
        size="sm"
        notice
        class="members-locked__login"
      />
    </div>
  </div>
</template>

<style scoped lang="scss">
.members-locked__login {
  margin-top: var(--space-3);
}

.members-locked {
  display: flex;
  gap: var(--space-4);
  align-items: flex-start;
  padding: var(--space-8);
  border: 1px dashed var(--color-border-strong);
  border-radius: var(--radius-lg);

  &--compact {
    padding: var(--space-5);
  }

  &__icon {
    margin-top: 2px;
    color: var(--color-accent);
  }

  &__body {
    display: flex;
    flex-direction: column;
    gap: var(--space-2);
  }

  &__title {
    font-weight: var(--font-weight-semibold);
    color: var(--color-frost);
  }

  &__text {
    max-width: 60ch;
    color: var(--color-text-muted);
  }

  &__demo {
    font-size: var(--text-sm);
    color: var(--color-lantern);
  }
}
</style>
