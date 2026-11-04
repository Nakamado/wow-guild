<script setup lang="ts">
import type { Clip } from '#shared/types'

const props = defineProps<{ clip: Clip }>()

const isDemo = computed(() => props.clip.url === null)
const duration = computed(() => {
  const seconds = Math.round(props.clip.durationSeconds)
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`
})
const views = computed(() => new Intl.NumberFormat('de-DE').format(props.clip.viewCount))
</script>

<template>
  <article class="clip-card">
    <div class="clip-card__media">
      <ConsentEmbed
        v-if="clip.embedUrl"
        :src="clip.embedUrl"
        :title="clip.title"
        :thumbnail="clip.thumbnailUrl"
      />
      <div
        v-else
        class="clip-card__placeholder"
      >
        <BaseIcon
          name="play"
          :size="28"
        />
        <span>{{ isDemo ? 'Demo-Clip – keine Wiedergabe' : 'Vorschau nicht verfügbar' }}</span>
      </div>
      <span class="clip-card__duration">{{ duration }}</span>
    </div>
    <div class="clip-card__body">
      <h3 class="clip-card__title">
        <a
          v-if="clip.url"
          :href="clip.url"
          target="_blank"
          rel="noopener noreferrer"
          class="clip-card__link"
        >
          {{ clip.title }}<span class="visually-hidden"> (öffnet Twitch in neuem Tab)</span>
        </a>
        <template v-else>
          {{ clip.title }}
        </template>
      </h3>
      <p class="clip-card__meta">
        <span>{{ formatDate(clip.createdAt) }}</span>
        <span>{{ views }} Aufrufe</span>
        <span>geclippt von {{ clip.creatorName }}</span>
      </p>
    </div>
  </article>
</template>

<style scoped lang="scss">
.clip-card {
  display: flex;
  flex-direction: column;
  overflow: hidden;

  @include card-surface;

  &__media {
    position: relative;
    aspect-ratio: 16 / 9;
    background: var(--color-bg-deep);
  }

  &__placeholder {
    display: flex;
    flex-direction: column;
    gap: var(--space-2);
    align-items: center;
    justify-content: center;
    height: 100%;
    font-size: var(--text-xs);
    color: var(--color-text-subtle);
    background:
      repeating-linear-gradient(135deg, rgb(150 190 255 / 4%) 0 12px, transparent 12px 24px),
      radial-gradient(circle at 50% 40%, rgb(143 211 255 / 10%), transparent 60%);
  }

  &__duration {
    position: absolute;
    right: var(--space-2);
    bottom: var(--space-2);
    padding: 0.125rem var(--space-2);
    font-size: var(--text-xs);
    font-variant-numeric: tabular-nums;
    color: var(--color-frost);
    background: rgb(4 6 15 / 80%);
    border-radius: var(--radius-sm);
  }

  &__body {
    display: flex;
    flex-direction: column;
    gap: var(--space-2);
    padding: var(--space-4) var(--space-5) var(--space-5);
  }

  &__title {
    font-family: var(--font-sans);
    font-size: var(--text-base);
    font-weight: var(--font-weight-semibold);
    color: var(--color-text);
    letter-spacing: 0;
  }

  &__link {
    color: inherit;
    text-decoration: none;

    &:hover {
      color: var(--color-accent);
      text-decoration: underline;
    }
  }

  &__meta {
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-1) var(--space-3);
    font-size: var(--text-xs);
    color: var(--color-text-muted);
  }
}
</style>
