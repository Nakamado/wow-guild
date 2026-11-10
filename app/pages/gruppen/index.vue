<script setup lang="ts">
import { findDungeon } from '#shared/data/dungeons'
import { filterRuns } from '#shared/domain/runs'

useSeoMeta({
  title: 'Gruppen',
  description: 'Alle geplanten Dungeon- und Raidgruppen der Gilde mit freien Plätzen.',
})

const route = useRoute()
const router = useRouter()
const { can } = useViewer()
const { runs, status, refresh, myEntry, dungeons, hasDemoChanges, resetDemoChanges } = useRuns()
const { isDemo } = useSiteConfig()

const canCreate = computed(() => can('runs:create'))
const formOpen = ref(false)
const ids = { dungeon: useId(), period: useId(), open: useId(), cancelled: useId() }

const periods = [
  { value: '', label: 'Alle kommenden' },
  { value: '1', label: 'Heute und morgen' },
  { value: '7', label: 'Nächste 7 Tage' },
  { value: '30', label: 'Nächste 30 Tage' },
]

const asString = (value: unknown) => (typeof value === 'string' ? value : '')
const dungeonSlug = computed(() => asString(route.query.dungeon) || null)
const period = computed(() => asString(route.query.zeitraum))
const onlyOpen = computed(() => route.query.frei === '1')
const includeCancelled = computed(() => route.query.abgesagt === '1')

function setQuery(key: string, value: string | null) {
  router.replace({ query: { ...route.query, [key]: value || undefined } })
}

const results = computed(() =>
  filterRuns(
    runs.value,
    {
      dungeonSlug: dungeonSlug.value,
      withinDays: period.value ? Number(period.value) : null,
      onlyOpenSlots: onlyOpen.value,
      includeCancelled: includeCancelled.value,
    },
    new Date(),
  ),
)

const selectableDungeons = computed(() => {
  const used = new Set(runs.value.map(run => run.dungeonSlug))
  return dungeons.filter(dungeon => used.has(dungeon.slug))
})

function onSaved(run: { id: string }) {
  navigateTo(`/gruppen/${run.id}`)
}
</script>

<template>
  <div class="groups-page">
    <PageHeader
      title="Gruppen"
      lead="Alle geplanten Dungeon-Runs der Gilde. Tritt einer Gruppe bei oder stell selbst eine zusammen."
    >
      <BaseButton
        v-if="canCreate"
        icon-left="heal"
        @click="formOpen = true"
      >
        Gruppe erstellen
      </BaseButton>
      <BaseButton
        to="/dungeons"
        variant="secondary"
      >
        Zum Dungeon-Katalog
      </BaseButton>
    </PageHeader>

    <div class="groups-page__body container">
      <SignInHint
        v-if="!canCreate"
        action="Gruppen zu erstellen oder beizutreten"
      />

      <form
        class="groups-page__filters"
        role="search"
        aria-label="Gruppen filtern"
        @submit.prevent
      >
        <div class="groups-page__field">
          <label
            :for="ids.dungeon"
            class="groups-page__label"
          >Dungeon</label>
          <select
            :id="ids.dungeon"
            class="groups-page__input"
            :value="dungeonSlug ?? ''"
            @change="setQuery('dungeon', ($event.target as HTMLSelectElement).value)"
          >
            <option value="">
              Alle Dungeons
            </option>
            <option
              v-for="dungeon in selectableDungeons"
              :key="dungeon.slug"
              :value="dungeon.slug"
            >
              {{ dungeon.name }}
            </option>
          </select>
        </div>
        <div class="groups-page__field">
          <label
            :for="ids.period"
            class="groups-page__label"
          >Zeitraum</label>
          <select
            :id="ids.period"
            class="groups-page__input"
            :value="period"
            @change="setQuery('zeitraum', ($event.target as HTMLSelectElement).value)"
          >
            <option
              v-for="entry in periods"
              :key="entry.value"
              :value="entry.value"
            >
              {{ entry.label }}
            </option>
          </select>
        </div>
        <label
          :for="ids.open"
          class="groups-page__toggle"
        >
          <input
            :id="ids.open"
            type="checkbox"
            class="groups-page__checkbox"
            :checked="onlyOpen"
            @change="setQuery('frei', ($event.target as HTMLInputElement).checked ? '1' : null)"
          >
          Nur mit freien Plätzen
        </label>
        <label
          :for="ids.cancelled"
          class="groups-page__toggle"
        >
          <input
            :id="ids.cancelled"
            type="checkbox"
            class="groups-page__checkbox"
            :checked="includeCancelled"
            @change="setQuery('abgesagt', ($event.target as HTMLInputElement).checked ? '1' : null)"
          >
          Abgesagte zeigen
        </label>
      </form>

      <ErrorState
        v-if="status === 'error'"
        @retry="refresh()"
      />
      <ul
        v-else-if="status === 'pending' && !runs.length"
        class="groups-page__list"
        role="list"
      >
        <li
          v-for="index in 3"
          :key="index"
        >
          <LoadingSkeleton :lines="2" />
        </li>
      </ul>
      <ul
        v-else-if="results.length"
        class="groups-page__list"
        role="list"
      >
        <li
          v-for="run in results"
          :key="run.id"
        >
          <GroupCard
            :run="run"
            :dungeon="findDungeon(run.dungeonSlug)"
            :joined="myEntry(run)?.placement ?? null"
            :joined-as-support="myEntry(run)?.support ?? false"
          />
        </li>
      </ul>
      <EmptyState
        v-else
        icon="calendar"
        title="Keine Gruppe passt auf diese Filter"
        :description="canCreate ? 'Erstelle selbst eine Gruppe – andere können dann beitreten.' : 'Schau später wieder vorbei oder ändere die Filter.'"
      >
        <BaseButton
          v-if="canCreate"
          size="sm"
          @click="formOpen = true"
        >
          Gruppe erstellen
        </BaseButton>
      </EmptyState>

      <p
        v-if="isDemo && hasDemoChanges"
        class="groups-page__demo"
      >
        Du hast in dieser Demo Gruppen verändert.
        <button
          type="button"
          class="groups-page__reset"
          @click="resetDemoChanges()"
        >
          Demo-Änderungen verwerfen
        </button>
      </p>
    </div>

    <GroupFormDialog
      v-model:open="formOpen"
      @saved="onSaved"
    />
  </div>
</template>

<style scoped lang="scss">
.groups-page {
  &__body {
    display: flex;
    flex-direction: column;
    gap: var(--space-6);
  }

  &__filters {
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-4) var(--space-6);
    align-items: flex-end;
    padding: var(--space-5);

    @include card-surface;
  }

  &__field {
    display: flex;
    flex: 1 1 12rem;
    flex-direction: column;
    gap: var(--space-2);
  }

  &__label {
    font-size: var(--text-sm);
    font-weight: var(--font-weight-medium);
    color: var(--color-text-muted);
  }

  &__input {
    min-height: 2.75rem;
    padding: var(--space-2) var(--space-3);
    color: var(--color-text);
    background: var(--color-bg);
    border: 1px solid var(--color-border-strong);
    border-radius: var(--radius-md);

    @include focus-ring(2px);
  }

  &__toggle {
    display: inline-flex;
    gap: var(--space-2);
    align-items: center;
    min-height: 2.75rem;
    font-size: var(--text-sm);
    cursor: pointer;
  }

  &__checkbox {
    width: 1.125rem;
    height: 1.125rem;
    accent-color: var(--color-accent);
  }

  &__list {
    display: flex;
    flex-direction: column;
    gap: var(--space-3);
  }

  &__demo {
    font-size: var(--text-sm);
    color: var(--color-lantern);
  }

  &__reset {
    color: var(--color-lantern);
    text-decoration: underline;
    text-underline-offset: 0.2em;
  }
}
</style>
