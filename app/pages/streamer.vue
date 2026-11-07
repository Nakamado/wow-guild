<script setup lang="ts">
useSeoMeta({
  title: 'Streamer',
  description: 'Weitere Streamerinnen und Streamer aus der Gilde.',
})

const { data: streamers, status, refresh } = await useFetch('/api/twitch/streamers', { key: 'streamers' })
</script>

<template>
  <div class="streamer-page">
    <PageHeader
      title="Streamer"
      lead="Neben Miinyu streamen auch andere aus der Gilde. Wer live ist, steht oben."
    />

    <div class="streamer-page__body container">
      <ErrorState
        v-if="status === 'error'"
        @retry="refresh()"
      />
      <ul
        v-else-if="streamers?.length"
        class="streamer-page__grid"
        role="list"
      >
        <li
          v-for="streamer in streamers"
          :key="streamer.id"
        >
          <StreamerCard :streamer="streamer" />
        </li>
      </ul>
      <EmptyState
        v-else-if="status === 'success'"
        icon="broadcast"
        title="Noch keine weiteren Streamer eingetragen"
        description="Du streamst selbst? Mit der Discord-Rolle „Streamer“ kannst du deinen Twitch-Kanal in den Einstellungen eintragen."
      />
      <p class="streamer-page__note">
        Kanäle werden nur nach Absprache aufgenommen und nie automatisch anhand ähnlicher Namen mit Discord-Profilen verknüpft.
      </p>
    </div>
  </div>
</template>

<style scoped lang="scss">
.streamer-page {
  &__body {
    display: flex;
    flex-direction: column;
    gap: var(--space-8);
  }

  &__grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(18rem, 1fr));
    gap: var(--space-5);
  }

  &__note {
    max-width: 70ch;
    font-size: var(--text-sm);
    color: var(--color-text-subtle);
  }
}
</style>
