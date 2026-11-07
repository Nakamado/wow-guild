<script setup lang="ts">
import type { ActivityEntry } from '#shared/schemas/admin'

interface ActivityPage { entries: ActivityEntry[], names: Record<string, string>, hasMore: boolean, retentionDays: number }

const { data, error, status } = await useFetch<ActivityPage>('/api/admin/activity', { key: 'admin-activity' })
const older = ref<ActivityEntry[]>([])
const hasMore = ref(false)
const loading = ref(false)
const loadError = ref<string | null>(null)
watch(data, value => (hasMore.value = value?.hasMore ?? false), { immediate: true })

const entries = computed(() => [...(data.value?.entries ?? []), ...older.value])
const names = computed(() => data.value?.names ?? {})

async function loadMore() {
  const last = entries.value.at(-1)
  if (!last) return
  loading.value = true
  loadError.value = null
  try {
    const page = await $fetch<ActivityPage>('/api/admin/activity', { query: { vor: last.id } })
    older.value.push(...page.entries)
    hasMore.value = page.hasMore
  }
  catch (fetchError) {
    loadError.value = apiErrorMessage(fetchError)
  }
  finally {
    loading.value = false
  }
}
</script>

<template>
  <section
    class="admin-activity"
    aria-labelledby="admin-activity-title"
  >
    <h2
      id="admin-activity-title"
      class="admin-activity__title"
    >
      Aktivitätsprotokoll
    </h2>
    <p class="admin-activity__hint">
      Wesentliche Konto-, Charakter-, Rollen- und Freigabeänderungen – keine Logins oder Seitenaufrufe.
      Einträge werden nach {{ data?.retentionDays ?? 90 }} Tagen automatisch gelöscht. Nur du siehst dieses Protokoll.
    </p>
    <ErrorState
      v-if="error"
      :message="apiErrorMessage(error)"
    />
    <LoadingSkeleton
      v-else-if="status === 'pending'"
      :lines="5"
    />
    <template v-else>
      <AdminActivityList
        :entries="entries"
        :names="names"
      />
      <p
        v-if="loadError"
        class="admin-activity__error"
        role="alert"
      >
        {{ loadError }}
      </p>
      <div
        v-if="hasMore"
        class="admin-activity__more"
      >
        <BaseButton
          variant="secondary"
          size="sm"
          :loading="loading"
          @click="loadMore"
        >
          Ältere Einträge laden
        </BaseButton>
      </div>
    </template>
  </section>
</template>

<style scoped lang="scss">
.admin-activity {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);

  &__title {
    font-size: var(--text-xl);
  }

  &__hint {
    font-size: var(--text-sm);
    color: var(--color-text-muted);
  }

  &__error {
    color: var(--color-danger);
  }

  &__more {
    display: flex;
    justify-content: center;
  }
}
</style>
