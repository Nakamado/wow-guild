<script setup lang="ts">
/**
 * Hinweis „Miinyu ist live“ unter der Navigation – auf allen Seiten außer der Startseite
 * (dort steht der Status schon im Hero). Gehört zum Header und fährt daher beim Scrollen mit.
 * Wegklicken gilt für den laufenden Stream und diese Sitzung; ein neuer Stream zeigt ihn wieder.
 * Nur ein Link zu Twitch – es wird nichts von Twitch eingebettet.
 */
const DISMISS_KEY = 'wow-guild:live-banner-dismissed'

const { twitch } = useSiteConfig()
const { status, isLive, refresh } = useStreamStatus()
const route = useRoute()

const dismissed = ref<string | null>(null)
/** Kennung des laufenden Streams (Startzeit) – damit ein neuer Stream wieder angezeigt wird */
const streamKey = computed(() => status.value?.startedAt ?? 'live')
const visible = computed(() => isLive.value && route.path !== '/' && dismissed.value !== streamKey.value)

function dismiss() {
  dismissed.value = streamKey.value
  try {
    sessionStorage.setItem(DISMISS_KEY, streamKey.value)
  }
  catch {
    // ohne Speicher gilt das Ausblenden nur bis zum Neuladen
  }
}

let timer: ReturnType<typeof setInterval> | null = null

function onVisibility() {
  if (document.visibilityState === 'visible') void refresh()
}

onMounted(() => {
  try {
    dismissed.value = sessionStorage.getItem(DISMISS_KEY)
  }
  catch {
    dismissed.value = null
  }
  timer = setInterval(() => {
    if (document.visibilityState === 'visible') void refresh()
  }, STREAM_STATUS_POLL_MS)
  document.addEventListener('visibilitychange', onVisibility)
})

onBeforeUnmount(() => {
  if (timer) clearInterval(timer)
  document.removeEventListener('visibilitychange', onVisibility)
})
</script>

<template>
  <div
    v-if="visible"
    class="live-banner"
  >
    <div class="live-banner__inner">
      <a
        :href="twitch.url"
        target="_blank"
        rel="noopener noreferrer"
        class="live-banner__link"
      >
        <span
          class="live-banner__dot"
          aria-hidden="true"
        />
        <span class="live-banner__text">
          <span class="live-banner__state">Miinyu ist live</span>
          <span
            v-if="status?.title || status?.gameName"
            class="live-banner__title"
          >{{ status?.title ?? status?.gameName }}</span>
        </span>
        <span class="live-banner__cta">
          Zuschauen
          <BaseIcon
            name="external"
            :size="14"
          />
        </span>
        <span class="visually-hidden">(öffnet Twitch in neuem Tab)</span>
      </a>
      <button
        type="button"
        class="live-banner__close"
        aria-label="Live-Hinweis ausblenden"
        @click="dismiss"
      >
        <BaseIcon
          name="close"
          :size="16"
        />
      </button>
    </div>
  </div>
</template>

<style scoped lang="scss">
// Mobil: schmale Leiste über die volle Breite direkt unter dem Header.
// Ab „md“: freistehende Plakette rechts unter der Navigation.
.live-banner {
  position: absolute;
  top: 100%;
  right: 0;
  left: 0;
  pointer-events: none;

  @include mq('md') {
    top: calc(100% + var(--space-2));
    right: max(var(--container-padding), calc((100% - var(--container-max)) / 2));
    left: auto;
  }

  &__inner {
    display: flex;
    align-items: center;
    pointer-events: auto;
    background: rgb(12 19 41 / 92%);
    backdrop-filter: blur(10px);
    border-bottom: 1px solid rgb(255 77 106 / 45%);

    @include mq('md') {
      max-width: 26rem;
      border: 1px solid rgb(255 77 106 / 55%);
      border-radius: var(--radius-pill);
      box-shadow: var(--shadow-raised);
    }
  }

  &__link {
    display: flex;
    flex: 1;
    gap: var(--space-3);
    align-items: center;
    min-width: 0;
    min-height: 2.75rem;
    padding: var(--space-1) var(--space-2) var(--space-1) var(--space-4);
    color: var(--color-text);
    text-decoration: none;
    border-radius: var(--radius-pill);

    @include focus-ring(-2px);

    &:hover {
      color: var(--color-frost);
    }
  }

  &__dot {
    flex-shrink: 0;
    width: 0.625rem;
    height: 0.625rem;
    background: var(--color-live);
    border-radius: 50%;
    box-shadow: 0 0 0 0 rgb(255 77 106 / 60%);

    @include motion-safe {
      animation: live-banner-pulse 1.8s ease-out infinite;
    }
  }

  &__text {
    display: flex;
    flex-direction: column;
    min-width: 0;
    line-height: 1.2;
  }

  &__state {
    font-size: var(--text-sm);
    font-weight: var(--font-weight-semibold);
  }

  &__title {
    overflow: hidden;
    font-size: var(--text-xs);
    color: var(--color-text-muted);
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  &__cta {
    display: inline-flex;
    flex-shrink: 0;
    gap: var(--space-1);
    align-items: center;
    margin-left: auto;
    font-size: var(--text-sm);
    font-weight: var(--font-weight-medium);
    color: var(--color-live);
  }

  &__close {
    display: inline-grid;
    flex-shrink: 0;
    place-items: center;
    width: 2.75rem;
    height: 2.75rem;
    color: var(--color-text-muted);
    border-radius: var(--radius-pill);

    @include focus-ring(-2px);

    &:hover {
      color: var(--color-text);
    }
  }
}

@keyframes live-banner-pulse {
  to {
    box-shadow: 0 0 0 10px rgb(255 77 106 / 0%);
  }
}
</style>
