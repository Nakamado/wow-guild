<script setup lang="ts">
/**
 * Deutlicher Hinweis, solange die Seite im Demo-Modus läuft – mit Demo-Steuerung
 * (Rolle wählen, Livestatus simulieren). Der Erklärtext lässt sich einklappen,
 * Badge und Steuerung bleiben immer sichtbar.
 */
const { isDemo } = useSiteConfig()
const collapsed = ref(false)
const storageKey = 'wow-guild:demo-banner-collapsed'

onMounted(() => {
  try {
    collapsed.value = sessionStorage.getItem(storageKey) === '1'
  }
  catch {
    // sessionStorage nicht verfügbar (z. B. Privatmodus) – Banner bleibt offen.
  }
})

function toggle() {
  collapsed.value = !collapsed.value
  try {
    sessionStorage.setItem(storageKey, collapsed.value ? '1' : '0')
  }
  catch {
    // ignorieren
  }
}
</script>

<template>
  <aside
    v-if="isDemo"
    class="demo-banner"
    aria-label="Demo-Hinweis"
  >
    <div class="demo-banner__inner container">
      <span class="demo-banner__badge">Demo</span>
      <p
        v-show="!collapsed"
        class="demo-banner__text"
      >
        <strong>Fiktive Beispieldaten</strong> – nichts wird dauerhaft gespeichert.
      </p>
      <DemoControls class="demo-banner__controls" />
      <button
        type="button"
        class="demo-banner__toggle"
        :aria-expanded="!collapsed"
        @click="toggle"
      >
        {{ collapsed ? 'Hinweis' : 'Ausblenden' }}
      </button>
    </div>
  </aside>
</template>

<style scoped lang="scss">
.demo-banner {
  font-size: var(--text-sm);
  color: var(--color-text);
  background: linear-gradient(90deg, rgb(245 183 104 / 14%), rgb(245 183 104 / 6%));
  border-bottom: 1px solid rgb(245 183 104 / 30%);

  &__inner {
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-2) var(--space-4);
    align-items: center;
    min-height: 2.5rem;
    padding-block: var(--space-2);
  }

  &__badge {
    flex-shrink: 0;
    padding: 0.125rem var(--space-2);
    font-size: var(--text-xs);
    font-weight: var(--font-weight-bold);
    color: var(--color-text-inverse);
    letter-spacing: 0.04em;
    background: var(--color-lantern);
    border-radius: var(--radius-sm);
  }

  &__text {
    flex: 1 1 16rem;
    font-size: var(--text-xs);
    line-height: var(--line-height-snug);
    color: var(--color-text-muted);

    @include mq('md') {
      font-size: var(--text-sm);
    }

    strong {
      color: var(--color-lantern);
    }
  }

  &__controls {
    margin-left: auto;
  }

  &__toggle {
    flex-shrink: 0;
    padding: var(--space-1) var(--space-2);
    font-size: var(--text-xs);
    color: var(--color-text-muted);
    text-decoration: underline;
    text-underline-offset: 0.2em;
    border-radius: var(--radius-sm);

    &:hover {
      color: var(--color-frost);
    }
  }
}
</style>
