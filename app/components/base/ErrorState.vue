<script setup lang="ts">
withDefaults(
  defineProps<{
    title?: string
    /** Nutzerfreundliche Beschreibung – keine technischen Details oder Stacktraces */
    message?: string
    retryable?: boolean
  }>(),
  {
    title: 'Da ist etwas schiefgelaufen',
    message: 'Die Daten konnten gerade nicht geladen werden. Bitte versuche es gleich noch einmal.',
    retryable: true,
  },
)

defineEmits<{ retry: [] }>()
</script>

<template>
  <div
    class="error-state"
    role="alert"
  >
    <BaseIcon
      name="alert"
      :size="24"
      class="error-state__icon"
    />
    <div class="error-state__content">
      <p class="error-state__title">
        {{ title }}
      </p>
      <p class="error-state__message">
        {{ message }}
      </p>
    </div>
    <BaseButton
      v-if="retryable"
      variant="secondary"
      size="sm"
      icon-left="refresh"
      class="error-state__retry"
      @click="$emit('retry')"
    >
      Erneut versuchen
    </BaseButton>
  </div>
</template>

<style scoped lang="scss">
.error-state {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-4);
  align-items: flex-start;
  padding: var(--space-5) var(--space-6);
  background: rgb(255 138 138 / 6%);
  border: 1px solid rgb(255 138 138 / 30%);
  border-radius: var(--radius-lg);

  &__icon {
    margin-top: 2px;
    color: var(--color-danger);
  }

  &__content {
    display: flex;
    flex: 1 1 16rem;
    flex-direction: column;
    gap: var(--space-1);
  }

  &__title {
    font-weight: var(--font-weight-semibold);
    color: var(--color-frost);
  }

  &__message {
    color: var(--color-text-muted);
  }

  &__retry {
    align-self: center;
  }
}
</style>
