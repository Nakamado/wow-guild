<script setup lang="ts">
import { describeNotification, timeAgo } from '#shared/domain/notifications'

/**
 * Glocke im Header (nur Gildenmitglieder): ungelesene Anzahl als Zähler, Liste im Aufklapp-Panel.
 * Beim Öffnen gilt alles als gelesen – neue Einträge bleiben bis zum Schließen hervorgehoben.
 */
const { allowed, items, unread, load, markAllRead } = useNotifications()
const route = useRoute()
const NuxtLinkComponent = resolveComponent('NuxtLink')

const open = ref(false)
const rootRef = ref<HTMLElement | null>(null)
const panelId = useId()
/** IDs, die beim Öffnen noch ungelesen waren (für die Hervorhebung) */
const fresh = ref<Set<string>>(new Set())
const now = ref(new Date())
/** Mobil: Panel über die volle Breite, direkt unter der Glocke */
const panelTop = ref('0px')

const entries = computed(() => items.value.map(item => ({ ...item, ...describeNotification(item), isFresh: fresh.value.has(item.id) })))
const label = computed(() => (unread.value ? `Benachrichtigungen, ${unread.value} ungelesen` : 'Benachrichtigungen'))

function toggle() {
  open.value = !open.value
}

watch(open, (isOpen) => {
  if (isOpen) {
    now.value = new Date()
    if (rootRef.value) panelTop.value = `${rootRef.value.getBoundingClientRect().bottom + 8}px`
    fresh.value = new Set(items.value.filter(item => !item.readAt).map(item => item.id))
    void markAllRead()
  }
})

watch(() => route.fullPath, () => {
  open.value = false
})

function onDocumentClick(event: MouseEvent) {
  if (open.value && rootRef.value && !rootRef.value.contains(event.target as Node)) open.value = false
}

function onKeydown(event: KeyboardEvent) {
  if (event.key === 'Escape') open.value = false
}

function onVisibility() {
  if (document.visibilityState === 'visible') void load()
}

let timer: ReturnType<typeof setInterval> | null = null

onMounted(() => {
  void load()
  timer = setInterval(() => {
    if (document.visibilityState === 'visible' && !open.value) void load()
  }, NOTIFICATION_POLL_MS)
  document.addEventListener('click', onDocumentClick)
  document.addEventListener('keydown', onKeydown)
  document.addEventListener('visibilitychange', onVisibility)
})

onBeforeUnmount(() => {
  if (timer) clearInterval(timer)
  document.removeEventListener('click', onDocumentClick)
  document.removeEventListener('keydown', onKeydown)
  document.removeEventListener('visibilitychange', onVisibility)
})

// Persona-Wechsel (Demo) oder Login: neu laden
watch(allowed, () => void load())
</script>

<template>
  <div
    v-if="allowed"
    ref="rootRef"
    class="notification-bell"
  >
    <button
      type="button"
      class="notification-bell__trigger"
      :aria-expanded="open"
      :aria-controls="panelId"
      :aria-label="label"
      @click="toggle"
    >
      <BaseIcon
        name="bell"
        :size="20"
      />
      <span
        v-if="unread"
        class="notification-bell__count"
        aria-hidden="true"
      >{{ unread > 9 ? '9+' : unread }}</span>
    </button>
    <div
      v-show="open"
      :id="panelId"
      class="notification-bell__panel"
      :style="{ '--panel-top': panelTop }"
    >
      <p class="notification-bell__heading">
        Benachrichtigungen
      </p>
      <p
        v-if="!entries.length"
        class="notification-bell__empty"
      >
        Noch nichts Neues. Hier erscheint zum Beispiel, wenn sich jemand für deine Gruppe anmeldet oder du nachrückst.
      </p>
      <ul
        v-else
        class="notification-bell__list"
      >
        <li
          v-for="entry in entries"
          :key="entry.id"
          class="notification-bell__item"
          :class="{ 'notification-bell__item--fresh': entry.isFresh }"
        >
          <component
            :is="entry.href ? NuxtLinkComponent : 'div'"
            :to="entry.href ?? undefined"
            class="notification-bell__entry"
          >
            <span class="notification-bell__text">
              <span
                v-if="entry.isFresh"
                class="visually-hidden"
              >Neu: </span>{{ entry.text }}
            </span>
            <time
              class="notification-bell__time"
              :datetime="entry.createdAt"
            >{{ timeAgo(entry.createdAt, now) }}</time>
          </component>
        </li>
      </ul>
      <p class="notification-bell__note">
        Einträge werden nach 30 Tagen automatisch gelöscht.
      </p>
    </div>
  </div>
</template>

<style scoped lang="scss">
.notification-bell {
  position: relative;

  &__trigger {
    position: relative;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 2.75rem;
    height: 2.75rem;
    color: var(--color-text);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-pill);

    @include focus-ring(2px);

    &:hover {
      border-color: var(--color-border-strong);
    }
  }

  &__count {
    position: absolute;
    top: -0.25rem;
    right: -0.25rem;
    min-width: 1.25rem;
    height: 1.25rem;
    padding: 0 0.3rem;
    font-size: var(--text-xs);
    font-weight: var(--font-weight-bold);
    line-height: 1.25rem;
    color: var(--color-text-inverse);
    text-align: center;
    background: var(--color-lantern);
    border-radius: var(--radius-pill);
  }

  &__panel {
    position: fixed;
    top: var(--panel-top);
    right: var(--space-3);
    left: var(--space-3);
    z-index: var(--z-raised);
    display: flex;
    flex-direction: column;
    gap: var(--space-2);
    max-height: min(32rem, 70vh);
    padding: var(--space-3);
    overflow-y: auto;
    background: var(--color-surface);
    border: 1px solid var(--color-border-strong);
    border-radius: var(--radius-md);
    box-shadow: var(--shadow-raised);

    @include mq('sm') {
      position: absolute;
      top: calc(100% + var(--space-2));
      left: auto;
      right: 0;
      width: 22rem;
    }
  }

  &__heading {
    font-weight: var(--font-weight-medium);
  }

  &__empty,
  &__note {
    font-size: var(--text-sm);
    color: var(--color-text-subtle);
  }

  &__note {
    font-size: var(--text-xs);
  }

  &__list {
    display: flex;
    flex-direction: column;
    gap: var(--space-1);
    padding: 0;
    margin: 0;
    list-style: none;
  }

  &__item {
    border-left: 3px solid transparent;
    border-radius: var(--radius-sm);

    &--fresh {
      background: var(--color-surface-raised);
      border-left-color: var(--color-lantern);
    }
  }

  &__entry {
    display: flex;
    flex-direction: column;
    gap: var(--space-1);
    padding: var(--space-2) var(--space-3);
    font-size: var(--text-sm);
    color: var(--color-text);
    text-decoration: none;
    border-radius: var(--radius-sm);

    @include focus-ring(2px);
  }

  a#{&}__entry:hover {
    color: var(--color-text);
    background: var(--color-surface-raised);
  }

  &__time {
    font-size: var(--text-xs);
    color: var(--color-text-subtle);
  }
}
</style>
