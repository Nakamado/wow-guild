<script setup lang="ts">
/** Hinweis für Besucher, warum Aktionen (beitreten, erstellen) fehlen. */
defineProps<{ action: string }>()
const { isDemo } = useSiteConfig()
</script>

<template>
  <p class="sign-in-hint">
    <BaseIcon
      name="lock"
      :size="16"
      class="sign-in-hint__icon"
    />
    <span>
      Um {{ action }}, brauchst du die Discord-Rolle „WoW Forever“.
      <template v-if="isDemo">In der Demo: oben „Ansicht als“ auf „Mitglied“ stellen.</template>
      <template v-else>Die Anmeldung mit Discord folgt in Kürze.</template>
    </span>
  </p>
</template>

<style scoped lang="scss">
.sign-in-hint {
  display: flex;
  gap: var(--space-2);
  align-items: flex-start;
  font-size: var(--text-sm);
  color: var(--color-text-muted);

  &__icon {
    margin-top: 2px;
    color: var(--color-accent);
  }
}
</style>
