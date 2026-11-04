<script setup lang="ts">
/**
 * Livestatus von Miinyu. Wird clientseitig nachgeladen (Seite bleibt cachebar) und zeigt
 * im Zweifel nie „live“ an: Fehler oder Ladezustand → normaler Twitch-Link.
 */
withDefaults(defineProps<{ variant?: 'hero' | 'compact' }>(), { variant: 'hero' })

const { twitch } = useSiteConfig()
const { data: status } = useFetch('/api/twitch/status', { key: 'twitch-status', server: false, lazy: true })

const isLive = computed(() => status.value?.isLive === true)
</script>

<template>
  <a
    :href="twitch.url"
    target="_blank"
    rel="noopener noreferrer"
    class="twitch-live"
    :class="[`twitch-live--${variant}`, { 'twitch-live--live': isLive }]"
  >
    <span
      class="twitch-live__dot"
      aria-hidden="true"
    />
    <span class="twitch-live__text">
      <span
        v-if="isLive"
        class="twitch-live__state"
      >Miinyu ist live</span>
      <span
        v-else
        class="twitch-live__state"
      >Miinyu auf Twitch</span>
      <span
        v-if="isLive && status?.title"
        class="twitch-live__title"
      >{{ status.title }}</span>
    </span>
    <span class="visually-hidden">(öffnet in neuem Tab)</span>
  </a>
</template>

<style scoped lang="scss">
.twitch-live {
  display: inline-flex;
  gap: var(--space-3);
  align-items: center;
  max-width: 100%;
  min-height: 2.5rem;
  padding: var(--space-2) var(--space-4) var(--space-2) var(--space-3);
  color: var(--color-text);
  text-decoration: none;
  background: rgb(7 11 26 / 55%);
  backdrop-filter: blur(8px);
  border: 1px solid var(--color-border-strong);
  border-radius: var(--radius-pill);
  transition: border-color var(--duration-base) var(--ease-out);

  @include focus-ring;

  &:hover {
    color: var(--color-frost);
    border-color: var(--color-accent);
  }

  &__dot {
    flex-shrink: 0;
    width: 0.625rem;
    height: 0.625rem;
    background: var(--color-text-subtle);
    border-radius: 50%;
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

  &--live {
    border-color: rgb(255 77 106 / 55%);
  }

  &--live &__dot {
    background: var(--color-live);
    box-shadow: 0 0 0 0 rgb(255 77 106 / 60%);

    @include motion-safe {
      animation: twitch-live-pulse 1.8s ease-out infinite;
    }
  }

  &--compact {
    min-height: 2rem;
    padding-block: var(--space-1);
  }
}

@keyframes twitch-live-pulse {
  to {
    box-shadow: 0 0 0 10px rgb(255 77 106 / 0%);
  }
}
</style>
