<script setup lang="ts">
import type { IconName } from './BaseIcon.vue'

withDefaults(
  defineProps<{
    title: string
    description?: string
    icon?: IconName
    headingLevel?: 2 | 3 | 4
  }>(),
  { description: undefined, icon: 'inbox', headingLevel: 3 },
)
</script>

<template>
  <div class="empty-state">
    <div
      class="empty-state__icon"
      aria-hidden="true"
    >
      <BaseIcon
        :name="icon"
        :size="28"
      />
    </div>
    <component
      :is="`h${headingLevel}`"
      class="empty-state__title"
    >
      {{ title }}
    </component>
    <p
      v-if="description"
      class="empty-state__description"
    >
      {{ description }}
    </p>
    <div
      v-if="$slots.default"
      class="empty-state__actions"
    >
      <slot />
    </div>
  </div>
</template>

<style scoped lang="scss">
.empty-state {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
  align-items: center;
  padding: var(--space-12) var(--space-6);
  text-align: center;
  border: 1px dashed var(--color-border-strong);
  border-radius: var(--radius-lg);

  &__icon {
    display: grid;
    place-items: center;
    width: 3.5rem;
    height: 3.5rem;
    margin-bottom: var(--space-2);
    color: var(--color-accent);
    background: radial-gradient(circle, var(--color-accent-glow), transparent 70%);
    border: 1px solid var(--color-border-strong);
    border-radius: 50%;
  }

  &__title {
    font-family: var(--font-display);
    font-size: var(--text-lg);
    color: var(--color-frost);
  }

  &__description {
    max-width: 48ch;
    color: var(--color-text-muted);
  }

  &__actions {
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-3);
    justify-content: center;
    margin-top: var(--space-3);
  }
}
</style>
