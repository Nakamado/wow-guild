<script setup lang="ts">
const { guild, isDemo } = useSiteConfig()
const { signedIn } = useViewer()
const route = useRoute()

const menuOpen = ref(false)
const scrolled = ref(false)
const menuId = useId()

function closeMenu() {
  menuOpen.value = false
}

watch(() => route.fullPath, closeMenu)

function onKeydown(event: KeyboardEvent) {
  if (event.key === 'Escape' && menuOpen.value) closeMenu()
}

function onScroll() {
  scrolled.value = window.scrollY > 8
}

onMounted(() => {
  onScroll()
  window.addEventListener('scroll', onScroll, { passive: true })
  window.addEventListener('keydown', onKeydown)
})

onBeforeUnmount(() => {
  window.removeEventListener('scroll', onScroll)
  window.removeEventListener('keydown', onKeydown)
})

const headerRef = ref<HTMLElement | null>(null)
const menuTop = ref('var(--header-height)')

// Menü exakt unter dem Header fixieren (Banner darüber kann unterschiedlich hoch sein)
// und Scrollen der Seite sperren, solange es offen ist.
watch(menuOpen, (open) => {
  if (!import.meta.client) return
  if (open && headerRef.value) menuTop.value = `${headerRef.value.getBoundingClientRect().bottom}px`
  document.documentElement.classList.toggle('is-scroll-locked', open)
})

onBeforeUnmount(() => {
  if (import.meta.client) document.documentElement.classList.remove('is-scroll-locked')
})
</script>

<template>
  <header
    ref="headerRef"
    class="app-header"
    :class="{ 'app-header--scrolled': scrolled, 'app-header--menu-open': menuOpen }"
  >
    <div class="app-header__inner container">
      <AppLogo class="app-header__logo" />

      <AppNav
        class="app-header__nav"
        variant="desktop"
      />

      <div class="app-header__actions">
        <BaseButton
          :href="guild.discordInvite"
          external
          size="sm"
          variant="secondary"
          icon-left="chat"
          class="app-header__cta"
        >
          Discord
        </BaseButton>

        <UserMenu class="app-header__user" />

        <button
          type="button"
          class="app-header__toggle"
          :aria-expanded="menuOpen"
          :aria-controls="menuId"
          @click="menuOpen = !menuOpen"
        >
          <BaseIcon
            :name="menuOpen ? 'close' : 'menu'"
            :size="24"
          />
          <span class="visually-hidden">{{ menuOpen ? 'Menü schließen' : 'Menü öffnen' }}</span>
        </button>
      </div>
    </div>

    <div
      v-show="menuOpen"
      :id="menuId"
      class="app-header__mobile"
      :style="{ '--menu-top': menuTop }"
    >
      <div class="app-header__mobile-inner container">
        <AppNav
          variant="mobile"
          @navigate="closeMenu"
        />
        <BaseButton
          :href="guild.discordInvite"
          external
          block
          size="lg"
          icon-left="chat"
          class="app-header__mobile-cta"
        >
          Discord beitreten
        </BaseButton>
        <LoginButton
          v-if="!signedIn && !isDemo"
          block
          size="lg"
        />
      </div>
    </div>
  </header>
</template>

<style scoped lang="scss">
.app-header {
  position: sticky;
  top: 0;
  z-index: var(--z-header);
  border-bottom: 1px solid transparent;
  transition:
    background var(--duration-base) var(--ease-out),
    border-color var(--duration-base) var(--ease-out);

  &--scrolled {
    background: rgb(7 11 26 / 85%);
    backdrop-filter: blur(12px) saturate(140%);
    border-bottom-color: var(--color-border);
  }

  // Ohne backdrop-filter, sonst wird der Header zum Bezugsrahmen des fixierten Menüs.
  &--menu-open {
    background: var(--color-bg);
    backdrop-filter: none;
    border-bottom-color: var(--color-border);
  }

  &__inner {
    display: flex;
    gap: var(--space-6);
    align-items: center;
    height: var(--header-height);
  }

  &__nav {
    display: none;
    margin-inline: auto;

    @include mq('lg') {
      display: block;
    }
  }

  &__actions {
    display: flex;
    gap: var(--space-2);
    align-items: center;
    margin-left: auto;

    @include mq('lg') {
      margin-left: 0;
    }
  }

  &__cta {
    display: none;

    @include mq('sm') {
      display: inline-flex;
    }
  }

  &__toggle {
    display: inline-grid;
    place-items: center;
    width: 2.75rem;
    height: 2.75rem;
    color: var(--color-frost);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-md);

    @include mq('lg') {
      display: none;
    }
  }

  &__mobile {
    position: fixed;
    inset: var(--menu-top, var(--header-height)) 0 0;
    overflow-y: auto;
    overscroll-behavior: contain;
    background: var(--color-bg);
    border-top: 1px solid var(--color-border);

    @include mq('lg') {
      display: none;
    }
  }

  &__mobile-inner {
    display: flex;
    flex-direction: column;
    gap: var(--space-8);
    padding-block: var(--space-6) var(--space-12);
  }
}

:global(.is-scroll-locked) {
  overflow: hidden;
}
</style>
