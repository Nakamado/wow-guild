<script setup lang="ts">
import type { Streamer } from '#shared/types'

const props = defineProps<{ streamer: Streamer }>()

const isDemo = computed(() => props.streamer.login.startsWith('demo_'))
const url = computed(() => (isDemo.value ? null : `https://www.twitch.tv/${props.streamer.login}`))
</script>

<template>
  <article
    class="streamer-card"
    :class="{ 'streamer-card--live': streamer.isLive }"
  >
    <MemberAvatar
      :name="streamer.displayName"
      :src="streamer.avatarUrl"
    />
    <div class="streamer-card__body">
      <h3 class="streamer-card__name">
        <a
          v-if="url"
          :href="url"
          target="_blank"
          rel="noopener noreferrer"
          class="streamer-card__link"
        >
          {{ streamer.displayName }}<span class="visually-hidden"> (öffnet Twitch in neuem Tab)</span>
        </a>
        <template v-else>
          {{ streamer.displayName }}
        </template>
      </h3>
      <p class="streamer-card__status">
        <span
          class="streamer-card__dot"
          aria-hidden="true"
        />
        {{ streamer.isLive ? 'Gerade live' : 'Offline' }}
      </p>
      <NuxtLink
        v-if="streamer.memberId"
        :to="`/mitglieder/${streamer.memberId}`"
        class="streamer-card__member"
      >
        Zum Mitgliederprofil
      </NuxtLink>
    </div>
  </article>
</template>

<style scoped lang="scss">
.streamer-card {
  display: flex;
  gap: var(--space-4);
  align-items: center;
  padding: var(--space-4) var(--space-5);

  @include card-surface;

  &__body {
    display: flex;
    flex-direction: column;
    gap: var(--space-1);
    min-width: 0;
  }

  &__name {
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

  &__status {
    display: flex;
    gap: var(--space-2);
    align-items: center;
    font-size: var(--text-sm);
    color: var(--color-text-muted);
  }

  &__dot {
    width: 0.5rem;
    height: 0.5rem;
    background: var(--color-text-subtle);
    border-radius: 50%;
  }

  &--live &__dot {
    background: var(--color-live);
  }

  &--live &__status {
    color: var(--color-text);
  }

  &__member {
    font-size: var(--text-xs);
  }
}
</style>
