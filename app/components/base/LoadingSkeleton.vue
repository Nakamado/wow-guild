<script setup lang="ts">
/**
 * Platzhalter während des Ladens. Feste Maße verhindern Layout Shifts.
 */
withDefaults(
  defineProps<{
    variant?: 'text' | 'card' | 'avatar' | 'block'
    lines?: number
    /** Beschriftung für Screenreader */
    label?: string
  }>(),
  { variant: 'text', lines: 3, label: 'Inhalt wird geladen …' },
)
</script>

<template>
  <div
    class="loading-skeleton"
    :class="`loading-skeleton--${variant}`"
    role="status"
  >
    <span class="visually-hidden">{{ label }}</span>
    <template v-if="variant === 'text'">
      <span
        v-for="line in lines"
        :key="line"
        class="loading-skeleton__line"
        aria-hidden="true"
      />
    </template>
    <template v-else-if="variant === 'card'">
      <span
        class="loading-skeleton__media"
        aria-hidden="true"
      />
      <span
        class="loading-skeleton__line loading-skeleton__line--title"
        aria-hidden="true"
      />
      <span
        v-for="line in lines"
        :key="line"
        class="loading-skeleton__line"
        aria-hidden="true"
      />
    </template>
    <span
      v-else
      class="loading-skeleton__shape"
      aria-hidden="true"
    />
  </div>
</template>

<style scoped lang="scss">
.loading-skeleton {
  --skeleton-base: rgb(150 190 255 / 7%);
  --skeleton-shine: rgb(150 190 255 / 14%);

  display: flex;
  flex-direction: column;
  gap: var(--space-3);

  &__line,
  &__media,
  &__shape {
    display: block;
    background: var(--skeleton-base);
    border-radius: var(--radius-sm);

    @include motion-safe {
      background: linear-gradient(
        90deg,
        var(--skeleton-base) 25%,
        var(--skeleton-shine) 50%,
        var(--skeleton-base) 75%
      );
      background-size: 200% 100%;
      animation: loading-skeleton-shimmer 1.6s ease-in-out infinite;
    }
  }

  &__line {
    height: 0.875rem;

    &:last-child:not(:first-child) {
      width: 65%;
    }

    &--title {
      width: 50%;
      height: 1.25rem;
    }
  }

  &__media {
    aspect-ratio: 16 / 9;
    border-radius: var(--radius-md);
  }

  &--card {
    padding: var(--space-5);

    @include card-surface;
  }

  &--avatar &__shape {
    width: 3rem;
    height: 3rem;
    border-radius: 50%;
  }

  &--block &__shape {
    height: 8rem;
    border-radius: var(--radius-lg);
  }
}

@keyframes loading-skeleton-shimmer {
  from {
    background-position: 200% 0;
  }

  to {
    background-position: -200% 0;
  }
}
</style>
