<script setup lang="ts">
withDefaults(
  defineProps<{
    title: string
    eyebrow?: string
    lead?: string
    /** An schmale Inhaltsspalte (container--narrow) ausrichten */
    narrow?: boolean
  }>(),
  { eyebrow: undefined, lead: undefined, narrow: false },
)
</script>

<template>
  <header class="page-header">
    <div
      class="page-header__inner container"
      :class="{ 'container--narrow': narrow }"
    >
      <p
        v-if="eyebrow"
        class="page-header__eyebrow"
      >
        {{ eyebrow }}
      </p>
      <h1 class="page-header__title">
        {{ title }}
      </h1>
      <p
        v-if="lead"
        class="page-header__lead"
      >
        {{ lead }}
      </p>
      <div
        v-if="$slots.default"
        class="page-header__actions"
      >
        <slot />
      </div>
    </div>
  </header>
</template>

<style scoped lang="scss">
.page-header {
  position: relative;
  padding-block: var(--space-16) var(--space-10);
  overflow: hidden;

  &::before {
    position: absolute;
    inset: 0;
    z-index: -1;
    pointer-events: none;
    content: '';
    background: radial-gradient(ellipse 50% 80% at 20% 0%, rgb(143 211 255 / 9%), transparent 70%);
  }

  &__inner {
    display: flex;
    flex-direction: column;
    gap: var(--space-4);
  }

  &__eyebrow {
    font-family: var(--font-serif);
    font-size: var(--text-lg);
    font-style: italic;
    color: var(--color-accent);
  }

  &__title {
    font-size: clamp(1.75rem, 0.9rem + 4.2vw, 4rem);
    text-transform: uppercase;
    letter-spacing: var(--letter-spacing-caps);
  }

  &__lead {
    max-width: 62ch;
    font-size: var(--text-md);
    color: var(--color-text-muted);
  }

  &__actions {
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-3);
    margin-top: var(--space-2);
  }
}
</style>
