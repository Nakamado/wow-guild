<script setup lang="ts">
import type { ClipPeriod, ClipSort } from '#shared/types'

useSeoMeta({
  title: 'Clips',
  description: 'Aktuelle und beliebte Twitch-Clips aus Miinyus Kanal.',
})

const route = useRoute()
const router = useRouter()

const periods: { value: ClipPeriod, label: string }[] = [
  { value: '7d', label: '7 Tage' },
  { value: '30d', label: '30 Tage' },
  { value: 'all', label: 'Alle' },
]
const sorts: { value: ClipSort, label: string }[] = [
  { value: 'recent', label: 'Neueste' },
  { value: 'popular', label: 'Beliebteste' },
]

const period = computed<ClipPeriod>(() => periods.find(entry => entry.value === route.query.zeitraum)?.value ?? '30d')
const sort = computed<ClipSort>(() => sorts.find(entry => entry.value === route.query.sortierung)?.value ?? 'recent')

function select(key: 'zeitraum' | 'sortierung', value: string) {
  router.replace({ query: { ...route.query, [key]: value } })
}

const { data: clips, status, refresh } = await useFetch('/api/twitch/clips', {
  key: 'clips',
  query: { period, sort, limit: 24 },
})

const { twitch } = useSiteConfig()
</script>

<template>
  <div class="clips-page">
    <PageHeader
      title="Clips"
      lead="Die Highlights aus Miinyus Streams – automatisch von Twitch geladen."
    >
      <TwitchLiveIndicator variant="compact" />
    </PageHeader>

    <div class="clips-page__body container">
      <div class="clips-page__controls">
        <div
          class="clips-page__group"
          role="group"
          aria-label="Zeitraum"
        >
          <button
            v-for="entry in periods"
            :key="entry.value"
            type="button"
            class="clips-page__chip"
            :aria-pressed="period === entry.value"
            @click="select('zeitraum', entry.value)"
          >
            {{ entry.label }}
          </button>
        </div>
        <div
          class="clips-page__group"
          role="group"
          aria-label="Sortierung"
        >
          <button
            v-for="entry in sorts"
            :key="entry.value"
            type="button"
            class="clips-page__chip"
            :aria-pressed="sort === entry.value"
            @click="select('sortierung', entry.value)"
          >
            {{ entry.label }}
          </button>
        </div>
      </div>

      <p class="clips-page__privacy">
        Clips werden erst nach deinem Klick von Twitch geladen. Erst dann werden Daten an Twitch übertragen.
      </p>

      <ErrorState
        v-if="status === 'error'"
        message="Die Clips konnten gerade nicht von Twitch geladen werden."
        @retry="refresh()"
      />

      <ul
        v-else-if="status === 'pending' && !clips"
        class="clips-page__grid"
        role="list"
      >
        <li
          v-for="index in 6"
          :key="index"
        >
          <LoadingSkeleton
            variant="card"
            :lines="2"
          />
        </li>
      </ul>

      <ul
        v-else-if="clips?.length"
        class="clips-page__grid"
        role="list"
        :aria-busy="status === 'pending' || undefined"
      >
        <li
          v-for="clip in clips"
          :key="clip.id"
        >
          <TwitchClipCard :clip="clip" />
        </li>
      </ul>

      <EmptyState
        v-else
        icon="play"
        title="Keine Clips in diesem Zeitraum"
        description="Wähle einen längeren Zeitraum oder schau direkt auf Twitch vorbei."
      >
        <BaseButton
          :href="twitch.url"
          external
          size="sm"
          variant="secondary"
        >
          Zu Twitch
        </BaseButton>
      </EmptyState>
    </div>
  </div>
</template>

<style scoped lang="scss">
.clips-page {
  &__body {
    display: flex;
    flex-direction: column;
    gap: var(--space-6);
  }

  &__controls {
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-4) var(--space-8);
  }

  &__group {
    display: inline-flex;
    padding: var(--space-1);
    background: var(--color-surface);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-pill);
  }

  &__chip {
    min-height: 2.25rem;
    padding: 0 var(--space-4);
    font-size: var(--text-sm);
    color: var(--color-text-muted);
    border-radius: var(--radius-pill);
    transition:
      background var(--duration-fast) var(--ease-out),
      color var(--duration-fast) var(--ease-out);

    &:hover {
      color: var(--color-frost);
    }

    &[aria-pressed='true'] {
      color: var(--color-text-inverse);
      background: var(--color-accent);
    }
  }

  &__privacy {
    font-size: var(--text-sm);
    color: var(--color-text-subtle);
  }

  &__grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(17rem, 1fr));
    gap: var(--space-6);
  }
}
</style>
