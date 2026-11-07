<script setup lang="ts">
import { activityLabels } from '#shared/domain/admin'
import type { ActivityEntry } from '#shared/schemas/admin'

defineProps<{ entries: ActivityEntry[], names: Record<string, string> }>()

const who = (id: string | null, names: Record<string, string>) => (id ? names[id] ?? `Gelöschtes Konto (${id})` : 'System')
</script>

<template>
  <p
    v-if="!entries.length"
    class="activity-list__empty"
  >
    Noch keine Einträge.
  </p>
  <ol
    v-else
    class="activity-list"
  >
    <li
      v-for="entry in entries"
      :key="entry.id"
      class="activity-list__item"
    >
      <time
        class="activity-list__time"
        :datetime="entry.occurredAt"
      >{{ formatDateTime(entry.occurredAt) }}</time>
      <span class="activity-list__action">{{ activityLabels[entry.action] ?? entry.action }}</span>
      <span class="activity-list__summary">{{ entry.summary }}</span>
      <span class="activity-list__meta">
        von {{ who(entry.actorId, names) }}<template v-if="entry.subjectType === 'member' && entry.subjectId && entry.subjectId !== entry.actorId"> · betrifft {{ who(entry.subjectId, names) }}</template>
      </span>
    </li>
  </ol>
</template>

<style scoped lang="scss">
.activity-list {
  display: flex;
  flex-direction: column;
  padding: 0;
  margin: 0;
  list-style: none;
  border-top: 1px solid var(--color-border);

  &__item {
    display: grid;
    gap: var(--space-1) var(--space-4);
    padding: var(--space-3) 0;
    font-size: var(--text-sm);
    border-bottom: 1px solid var(--color-border);

    @include mq('md') {
      grid-template-columns: 9.5rem 14rem 1fr;
    }
  }

  &__time,
  &__meta {
    color: var(--color-text-subtle);
  }

  &__action {
    font-weight: var(--font-weight-semibold);
    color: var(--color-text);
  }

  &__summary {
    color: var(--color-text-muted);
  }

  &__meta {
    font-size: var(--text-xs);

    @include mq('md') {
      grid-column: 3;
    }
  }

  &__empty {
    color: var(--color-text-muted);
  }
}
</style>
