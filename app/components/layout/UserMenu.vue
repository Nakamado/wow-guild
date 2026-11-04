<script setup lang="ts">
/**
 * Angemeldet: Avatar mit Menü (Einstellungen, Abmelden).
 * Nicht angemeldet (live): Anmelde-Button. In der Demo ersetzt „Ansicht als“ den Login.
 */
const { isDemo } = useSiteConfig()
const { signedIn, displayName, avatarUrl, logout } = useViewer()
const route = useRoute()

const open = ref(false)
const rootRef = ref<HTMLElement | null>(null)
const menuId = useId()

watch(() => route.fullPath, () => {
  open.value = false
})

function onDocumentClick(event: MouseEvent) {
  if (open.value && rootRef.value && !rootRef.value.contains(event.target as Node)) open.value = false
}

function onKeydown(event: KeyboardEvent) {
  if (event.key === 'Escape') open.value = false
}

onMounted(() => {
  document.addEventListener('click', onDocumentClick)
  document.addEventListener('keydown', onKeydown)
})
onBeforeUnmount(() => {
  document.removeEventListener('click', onDocumentClick)
  document.removeEventListener('keydown', onKeydown)
})

async function onLogout() {
  open.value = false
  await logout()
  await navigateTo('/')
}
</script>

<template>
  <div
    v-if="signedIn"
    ref="rootRef"
    class="user-menu"
  >
    <button
      type="button"
      class="user-menu__trigger"
      :aria-expanded="open"
      :aria-controls="menuId"
      @click="open = !open"
    >
      <MemberAvatar
        :name="displayName ?? 'Du'"
        :src="avatarUrl"
        size="sm"
      />
      <span class="user-menu__name">{{ displayName ?? 'Mein Konto' }}</span>
      <BaseIcon
        name="chevronDown"
        :size="16"
      />
    </button>
    <div
      v-show="open"
      :id="menuId"
      class="user-menu__panel"
    >
      <NuxtLink
        to="/einstellungen"
        class="user-menu__item"
      >
        <BaseIcon
          name="settings"
          :size="18"
        />
        Meine Charaktere
      </NuxtLink>
      <button
        v-if="!isDemo"
        type="button"
        class="user-menu__item"
        @click="onLogout"
      >
        <BaseIcon
          name="logout"
          :size="18"
        />
        Abmelden
      </button>
    </div>
  </div>
  <LoginButton
    v-else-if="!isDemo"
    size="sm"
    label="Anmelden"
  />
</template>

<style scoped lang="scss">
.user-menu {
  position: relative;

  &__trigger {
    display: inline-flex;
    gap: var(--space-2);
    align-items: center;
    min-height: 2.75rem;
    padding: var(--space-1) var(--space-2);
    color: var(--color-text);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-pill);

    @include focus-ring(2px);

    &:hover {
      border-color: var(--color-border-strong);
    }
  }

  &__name {
    display: none;
    max-width: 10rem;
    overflow: hidden;
    font-size: var(--text-sm);
    text-overflow: ellipsis;
    white-space: nowrap;

    @include mq('xl') {
      display: inline;
    }
  }

  &__panel {
    position: absolute;
    top: calc(100% + var(--space-2));
    right: 0;
    z-index: var(--z-raised);
    display: flex;
    flex-direction: column;
    min-width: 13rem;
    padding: var(--space-2);
    background: var(--color-surface);
    border: 1px solid var(--color-border-strong);
    border-radius: var(--radius-md);
    box-shadow: var(--shadow-raised);
  }

  &__item {
    display: flex;
    gap: var(--space-2);
    align-items: center;
    min-height: 2.75rem;
    padding: var(--space-2) var(--space-3);
    font-size: var(--text-sm);
    color: var(--color-text);
    text-align: left;
    text-decoration: none;
    border-radius: var(--radius-sm);

    @include focus-ring(2px);

    &:hover {
      color: var(--color-text);
      background: var(--color-surface-raised);
    }
  }
}
</style>
