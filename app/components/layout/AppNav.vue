<script setup lang="ts">
withDefaults(
  defineProps<{
    variant?: 'desktop' | 'mobile'
  }>(),
  { variant: 'desktop' },
)

defineEmits<{ navigate: [] }>()
</script>

<template>
  <nav
    class="app-nav"
    :class="`app-nav--${variant}`"
    aria-label="Hauptnavigation"
  >
    <ul
      class="app-nav__list"
      role="list"
    >
      <li
        v-for="item in mainNavigation"
        :key="item.to"
        class="app-nav__item"
      >
        <NuxtLink
          :to="item.to"
          class="app-nav__link"
          active-class="app-nav__link--active"
          exact-active-class="app-nav__link--exact"
          @click="$emit('navigate')"
        >
          {{ item.label }}
        </NuxtLink>
      </li>
    </ul>
  </nav>
</template>

<style scoped lang="scss">
.app-nav {
  &__list {
    display: flex;
    gap: var(--space-1);
  }

  &__link {
    position: relative;
    display: block;
    padding: var(--space-2) var(--space-3);
    font-size: var(--text-sm);
    font-weight: var(--font-weight-medium);
    color: var(--color-text-muted);
    text-decoration: none;
    letter-spacing: 0.01em;
    border-radius: var(--radius-pill);
    transition:
      color var(--duration-fast) var(--ease-out),
      background var(--duration-fast) var(--ease-out);

    &:hover {
      color: var(--color-frost);
      background: rgb(150 190 255 / 7%);
    }

    // „Start“ nur bei exaktem Treffer aktiv, alle anderen auch bei Unterseiten.
    &--active:not([href='/']),
    &--exact {
      color: var(--color-frost);

      &::after {
        position: absolute;
        right: var(--space-3);
        bottom: 2px;
        left: var(--space-3);
        height: 1px;
        content: '';
        background: linear-gradient(90deg, transparent, var(--color-accent), transparent);
        box-shadow: 0 0 8px var(--color-accent-glow);
      }
    }
  }

  &--mobile &__list {
    flex-direction: column;
    gap: var(--space-1);
  }

  &--mobile &__link {
    padding: var(--space-3) var(--space-4);
    font-family: var(--font-display);
    font-size: var(--text-lg);
    border-radius: var(--radius-md);

    &::after {
      display: none;
    }
  }

  &--mobile &__link--active:not([href='/']),
  &--mobile &__link--exact {
    background: rgb(143 211 255 / 8%);
    box-shadow: inset 2px 0 0 var(--color-accent);
  }
}
</style>
