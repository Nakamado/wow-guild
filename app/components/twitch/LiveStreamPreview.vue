<script setup lang="ts">
/**
 * Startseite: große Vorschau, solange Miinyu live ist. Nur ein Bild (kein Player) – ein Klick
 * öffnet ihren Twitch-Kanal. Das Vorschaubild liefert der eigene Server aus (NuxtImg),
 * der Browser verbindet sich also nicht vorab mit Twitch.
 */
const { twitch } = useSiteConfig()
const { status, isLive } = useStreamStatus()

const now = ref(Date.now())
let timer: ReturnType<typeof setInterval> | null = null
onMounted(() => {
  timer = setInterval(() => (now.value = Date.now()), 60_000)
})
onBeforeUnmount(() => {
  if (timer) clearInterval(timer)
})

/** „seit 1 Std. 20 Min.“ */
const since = computed(() => {
  if (!status.value?.startedAt) return null
  const minutes = Math.max(0, Math.floor((now.value - new Date(status.value.startedAt).getTime()) / 60_000))
  const hours = Math.floor(minutes / 60)
  return hours ? `seit ${hours} Std. ${minutes % 60} Min.` : `seit ${minutes} Min.`
})

const viewers = computed(() => (status.value?.viewerCount != null ? `${status.value.viewerCount.toLocaleString('de-DE')} Zuschauer` : null))
</script>

<template>
  <a
    v-if="isLive && status"
    :href="twitch.url"
    target="_blank"
    rel="noopener noreferrer"
    class="live-preview"
  >
    <span class="live-preview__media">
      <NuxtImg
        v-if="status.thumbnailUrl"
        :src="status.thumbnailUrl"
        alt=""
        width="640"
        height="360"
        class="live-preview__image"
      />
      <span
        v-else
        class="live-preview__placeholder"
        aria-hidden="true"
      />
      <span class="live-preview__badge">
        <span
          class="live-preview__dot"
          aria-hidden="true"
        />
        Live
      </span>
      <span
        v-if="viewers"
        class="live-preview__viewers"
      >{{ viewers }}</span>
      <span
        class="live-preview__play"
        aria-hidden="true"
      >
        <BaseIcon
          name="play"
          :size="28"
        />
      </span>
    </span>
    <span class="live-preview__body">
      <span class="live-preview__heading">Miinyu ist gerade live</span>
      <span
        v-if="status.title"
        class="live-preview__title"
      >{{ status.title }}</span>
      <span class="live-preview__meta">
        <template v-if="status.gameName">{{ status.gameName }}</template>
        <template v-if="status.gameName && since"> · </template>
        <template v-if="since">{{ since }}</template>
      </span>
      <span class="live-preview__cta">
        Auf Twitch ansehen
        <BaseIcon
          name="external"
          :size="16"
        />
      </span>
    </span>
    <span class="visually-hidden">(öffnet Twitch in neuem Tab)</span>
  </a>
</template>

<style scoped lang="scss">
.live-preview {
  display: flex;
  flex-direction: column;
  width: 100%;
  overflow: hidden;
  color: var(--color-text);
  text-decoration: none;
  background: rgb(12 19 41 / 85%);
  backdrop-filter: blur(10px);
  border: 1px solid rgb(255 77 106 / 50%);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-raised), 0 0 40px rgb(255 77 106 / 15%);
  transition:
    border-color var(--duration-base) var(--ease-out),
    transform var(--duration-base) var(--ease-out);

  @include focus-ring(3px);

  &:hover {
    color: var(--color-text);
    border-color: var(--color-live);

    @include motion-safe {
      transform: translateY(-2px);
    }
  }

  &__media {
    position: relative;
    display: block;
    aspect-ratio: 16 / 9;
    background: var(--color-bg-deep);
  }

  &__image,
  &__placeholder {
    display: block;
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  // Demo / kein Vorschaubild: ruhige Fläche statt leerem Kasten
  &__placeholder {
    background:
      radial-gradient(circle at 30% 35%, rgb(143 211 255 / 25%), transparent 45%),
      radial-gradient(circle at 75% 70%, rgb(243 196 221 / 20%), transparent 50%),
      linear-gradient(135deg, #121b3a, #070b1a);
  }

  &__badge,
  &__viewers {
    position: absolute;
    top: var(--space-3);
    display: inline-flex;
    gap: var(--space-2);
    align-items: center;
    padding: var(--space-1) var(--space-2);
    font-size: var(--text-xs);
    font-weight: var(--font-weight-bold);
    border-radius: var(--radius-sm);
  }

  &__badge {
    left: var(--space-3);
    color: #fff;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    background: #c8102e;
  }

  &__viewers {
    right: var(--space-3);
    color: var(--color-text);
    background: rgb(4 6 15 / 75%);
  }

  &__dot {
    width: 0.5rem;
    height: 0.5rem;
    background: #fff;
    border-radius: 50%;

    @include motion-safe {
      animation: live-preview-blink 1.6s ease-in-out infinite;
    }
  }

  &__play {
    position: absolute;
    inset: 50% auto auto 50%;
    display: grid;
    place-items: center;
    width: 3.5rem;
    height: 3.5rem;
    color: #fff;
    background: rgb(4 6 15 / 60%);
    border: 1px solid rgb(255 255 255 / 35%);
    border-radius: 50%;
    opacity: 0.85;
    transform: translate(-50%, -50%);
    transition: opacity var(--duration-base) var(--ease-out);
  }

  &:hover &__play {
    opacity: 1;
  }

  &__body {
    display: flex;
    flex-direction: column;
    gap: var(--space-1);
    padding: var(--space-4);
  }

  &__heading {
    font-size: var(--text-sm);
    font-weight: var(--font-weight-semibold);
    color: var(--color-live);
  }

  &__title {
    display: -webkit-box;
    overflow: hidden;
    font-size: var(--text-lg);
    font-weight: var(--font-weight-semibold);
    line-height: 1.3;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
  }

  &__meta {
    font-size: var(--text-sm);
    color: var(--color-text-muted);
  }

  &__cta {
    display: inline-flex;
    gap: var(--space-1);
    align-items: center;
    margin-top: var(--space-2);
    font-size: var(--text-sm);
    font-weight: var(--font-weight-medium);
    color: var(--color-accent);
  }
}

@keyframes live-preview-blink {
  50% {
    opacity: 0.35;
  }
}
</style>
