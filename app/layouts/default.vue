<template>
  <div class="default-layout">
    <a
      href="#main"
      class="default-layout__skip-link"
    >Zum Inhalt springen</a>
    <DemoBanner />
    <AppHeader />
    <main
      id="main"
      class="default-layout__main"
      tabindex="-1"
    >
      <slot />
    </main>
    <AppFooter />
  </div>
</template>

<style scoped lang="scss">
.default-layout {
  display: flex;
  flex-direction: column;
  min-height: 100dvh;

  &__main {
    flex: 1;

    &:focus {
      outline: none;
    }
  }

  &__skip-link {
    position: absolute;
    top: var(--space-2);
    left: var(--space-2);
    z-index: var(--z-toast);
    padding: var(--space-2) var(--space-4);
    font-weight: var(--font-weight-semibold);
    color: var(--color-text-inverse);
    background: var(--color-accent);
    border-radius: var(--radius-md);
    transform: translateY(-200%);

    &:focus {
      color: var(--color-text-inverse);
      transform: none;
    }
  }
}
</style>
