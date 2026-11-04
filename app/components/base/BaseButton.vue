<script setup lang="ts">
import type { RouteLocationRaw } from 'vue-router'
import type { IconName } from './BaseIcon.vue'

const props = withDefaults(
  defineProps<{
    variant?: 'primary' | 'secondary' | 'ghost' | 'lantern'
    size?: 'sm' | 'md' | 'lg'
    /** Interne Route → NuxtLink */
    to?: RouteLocationRaw
    /** Externe URL → <a> (öffnet in neuem Tab, wenn `external`) */
    href?: string
    external?: boolean
    type?: 'button' | 'submit' | 'reset'
    disabled?: boolean
    loading?: boolean
    iconLeft?: IconName
    iconRight?: IconName
    block?: boolean
  }>(),
  {
    variant: 'primary',
    size: 'md',
    to: undefined,
    href: undefined,
    external: false,
    type: 'button',
    disabled: false,
    loading: false,
    iconLeft: undefined,
    iconRight: undefined,
    block: false,
  },
)

const isLink = computed(() => Boolean(props.to || props.href))

const classes = computed(() => [
  'base-button',
  `base-button--${props.variant}`,
  `base-button--${props.size}`,
  {
    'base-button--block': props.block,
    'base-button--loading': props.loading,
  },
])
</script>

<template>
  <NuxtLink
    v-if="isLink"
    :to="to ?? href"
    :external="external || undefined"
    :target="external ? '_blank' : undefined"
    :rel="external ? 'noopener noreferrer' : undefined"
    :class="classes"
  >
    <BaseIcon
      v-if="iconLeft"
      :name="iconLeft"
      class="base-button__icon"
      :size="18"
    />
    <span class="base-button__label"><slot /></span>
    <BaseIcon
      v-if="iconRight"
      :name="iconRight"
      class="base-button__icon"
      :size="18"
    />
    <span
      v-if="external"
      class="visually-hidden"
    >(öffnet in neuem Tab)</span>
  </NuxtLink>

  <button
    v-else
    :type="type"
    :class="classes"
    :disabled="disabled || loading"
    :aria-busy="loading || undefined"
  >
    <span
      v-if="loading"
      class="base-button__spinner"
      aria-hidden="true"
    />
    <BaseIcon
      v-else-if="iconLeft"
      :name="iconLeft"
      class="base-button__icon"
      :size="18"
    />
    <span class="base-button__label"><slot /></span>
    <BaseIcon
      v-if="iconRight"
      :name="iconRight"
      class="base-button__icon"
      :size="18"
    />
  </button>
</template>

<style scoped lang="scss">
.base-button {
  --button-bg: transparent;
  --button-color: var(--color-text);
  --button-border: transparent;
  --button-shadow: none;

  position: relative;
  display: inline-flex;
  gap: var(--space-2);
  align-items: center;
  justify-content: center;
  min-height: 2.75rem;
  padding: var(--space-2) var(--space-5);
  font-family: var(--font-serif);
  font-size: var(--text-md);
  font-style: italic;
  font-weight: var(--font-weight-semibold);
  line-height: 1;
  color: var(--button-color);
  text-decoration: none;
  letter-spacing: 0.02em;
  white-space: nowrap;
  background: var(--button-bg);
  border: 1px solid var(--button-border);
  border-radius: var(--radius-pill);
  box-shadow: var(--button-shadow);
  transition:
    background var(--duration-base) var(--ease-out),
    border-color var(--duration-base) var(--ease-out),
    box-shadow var(--duration-base) var(--ease-out),
    color var(--duration-base) var(--ease-out),
    transform var(--duration-fast) var(--ease-out);

  @include focus-ring(3px);

  &:hover {
    color: var(--button-color);
  }

  &:active:not(:disabled) {
    transform: translateY(1px);
  }

  &:disabled {
    cursor: not-allowed;
    opacity: 0.55;
  }

  &__label {
    display: inline-block;
  }

  &__spinner {
    width: 1rem;
    height: 1rem;
    border: 2px solid currentcolor;
    border-right-color: transparent;
    border-radius: 50%;

    @include motion-safe {
      animation: base-button-spin 0.8s linear infinite;
    }
  }

  // Varianten
  &--primary {
    --button-bg: linear-gradient(180deg, #a9ddff 0%, var(--color-accent-strong) 100%);
    --button-color: var(--color-text-inverse);
    --button-border: rgb(223 233 255 / 60%);
    --button-shadow: 0 0 0 0 transparent, 0 8px 24px -12px var(--color-accent-glow);

    &:hover:not(:disabled) {
      --button-shadow: var(--shadow-glow);
    }
  }

  &--secondary {
    --button-bg: rgb(18 27 58 / 70%);
    --button-color: var(--color-frost);
    --button-border: var(--color-border-strong);

    &:hover:not(:disabled) {
      --button-bg: var(--color-surface-hover);
      --button-border: var(--color-accent);
    }
  }

  &--ghost {
    --button-color: var(--color-text-muted);

    &:hover:not(:disabled) {
      --button-color: var(--color-frost);
      --button-bg: rgb(150 190 255 / 8%);
    }
  }

  &--lantern {
    --button-bg: linear-gradient(180deg, #ffd59a 0%, var(--color-lantern) 100%);
    --button-color: var(--color-text-inverse);
    --button-border: rgb(255 228 190 / 70%);

    &:hover:not(:disabled) {
      --button-shadow: var(--shadow-lantern);
    }
  }

  // Größen
  &--sm {
    min-height: 2.25rem;
    padding: var(--space-1) var(--space-4);
    font-size: var(--text-base);
  }

  &--lg {
    min-height: 3.25rem;
    padding: var(--space-3) var(--space-8);
    font-size: var(--text-lg);
  }

  &--block {
    display: flex;
    width: 100%;
  }
}

@keyframes base-button-spin {
  to {
    transform: rotate(360deg);
  }
}
</style>
