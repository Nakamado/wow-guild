<script setup lang="ts">
withDefaults(
  defineProps<{
    /** Semantisches Element der Karte */
    as?: 'div' | 'article' | 'section' | 'li' | 'aside'
    /** `ornate` = Frost-Ornamente an den Ecken, `interactive` = Hover-Zustand */
    variant?: 'default' | 'ornate' | 'interactive'
    padding?: 'sm' | 'md' | 'lg' | 'none'
  }>(),
  { as: 'div', variant: 'default', padding: 'md' },
)
</script>

<template>
  <component
    :is="as"
    class="base-card"
    :class="[`base-card--${variant}`, `base-card--padding-${padding}`]"
  >
    <header
      v-if="$slots.header"
      class="base-card__header"
    >
      <slot name="header" />
    </header>
    <div class="base-card__body">
      <slot />
    </div>
    <footer
      v-if="$slots.footer"
      class="base-card__footer"
    >
      <slot name="footer" />
    </footer>
  </component>
</template>

<style scoped lang="scss">
.base-card {
  --card-padding: var(--space-6);

  position: relative;
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
  padding: var(--card-padding);

  @include card-surface;

  &__header {
    display: flex;
    gap: var(--space-3);
    align-items: center;
    justify-content: space-between;
  }

  &__body {
    flex: 1;
    color: var(--color-text-muted);
  }

  &__footer {
    display: flex;
    gap: var(--space-3);
    align-items: center;
    padding-top: var(--space-4);
    border-top: 1px solid var(--color-border);
  }

  &--padding-none {
    --card-padding: 0;
  }

  &--padding-sm {
    --card-padding: var(--space-4);
  }

  &--padding-lg {
    --card-padding: var(--space-8);
  }

  &--ornate {
    @include ornament-border(18px);
  }

  &--interactive {
    transition:
      border-color var(--duration-base) var(--ease-out),
      transform var(--duration-base) var(--ease-out),
      box-shadow var(--duration-base) var(--ease-out);

    &:hover,
    &:focus-within {
      border-color: var(--color-border-strong);
      box-shadow: var(--shadow-raised);
    }

    @include motion-safe {
      &:hover {
        transform: translateY(-2px);
      }
    }
  }
}
</style>
