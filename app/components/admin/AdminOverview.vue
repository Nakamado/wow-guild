<script setup lang="ts">
import type { ActivityEntry } from '#shared/schemas/admin'

const { data, error, status } = await useFetch<{
  counts: { members: number, characters: number, newMembers: number, newCharacters: number }
  recent: ActivityEntry[] | null
  names: Record<string, string>
}>('/api/admin/overview', { key: 'admin-overview' })

const tiles = computed(() => data.value
  ? [
      { label: 'Registrierte Mitglieder', value: data.value.counts.members },
      { label: 'Charaktere', value: data.value.counts.characters },
      { label: 'Neue Mitglieder (7 Tage)', value: data.value.counts.newMembers },
      { label: 'Neue Charaktere (7 Tage)', value: data.value.counts.newCharacters },
    ]
  : [])
</script>

<template>
  <section
    class="admin-overview"
    aria-labelledby="admin-overview-title"
  >
    <h2
      id="admin-overview-title"
      class="visually-hidden"
    >
      Übersicht
    </h2>
    <ErrorState
      v-if="error"
      :message="apiErrorMessage(error)"
    />
    <LoadingSkeleton
      v-else-if="status === 'pending'"
      :lines="3"
    />
    <template v-else-if="data">
      <dl class="admin-overview__tiles">
        <div
          v-for="tile in tiles"
          :key="tile.label"
          class="admin-overview__tile"
        >
          <dt>{{ tile.label }}</dt>
          <dd>{{ tile.value }}</dd>
        </div>
      </dl>

      <div
        v-if="data.recent"
        class="admin-overview__recent"
      >
        <h3 class="admin-overview__title">
          Letzte Änderungen
        </h3>
        <AdminActivityList
          :entries="data.recent"
          :names="data.names"
        />
      </div>
    </template>
  </section>
</template>

<style scoped lang="scss">
.admin-overview {
  display: flex;
  flex-direction: column;
  gap: var(--space-8);

  &__tiles {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(11rem, 1fr));
    gap: var(--space-4);
    margin: 0;
  }

  &__tile {
    @include card-surface;

    display: flex;
    flex-direction: column-reverse;
    gap: var(--space-1);
    padding: var(--space-4) var(--space-5);

    dt {
      font-size: var(--text-sm);
      color: var(--color-text-muted);
    }

    dd {
      margin: 0;
      font-family: var(--font-display);
      font-size: var(--text-2xl);
      color: var(--color-text);
    }
  }

  &__title {
    margin-bottom: var(--space-3);
    font-size: var(--text-lg);
  }
}
</style>
