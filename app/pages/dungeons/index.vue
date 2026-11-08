<script setup lang="ts">
import { filterDungeons } from '#shared/domain/dungeons'
import type { DungeonQuestStatus } from '#shared/domain/quests'
import { isUpcoming } from '#shared/domain/runs'
import type { DungeonFilterState } from '~/components/dungeons/DungeonFilters.vue'

useSeoMeta({
  title: 'Dungeon-Finder',
  description: 'Alle Dungeons in WoW: Forever mit Levelbereichen – und die Gruppen, die die Gilde dafür plant.',
})

const route = useRoute()
const router = useRouter()
const { can } = useViewer()
const { runs, myCharacters, dungeons } = useRuns()

const formOpen = ref(false)
const canCreate = computed(() => can('runs:create'))

const asString = (value: unknown) => (typeof value === 'string' ? value : '')
const filter = computed<DungeonFilterState>({
  get: () => {
    const level = Number.parseInt(asString(route.query.stufe), 10)
    return {
      query: asString(route.query.q),
      level: Number.isFinite(level) ? level : null,
      characterId: asString(route.query.charakter) || null,
      onlyWithRuns: route.query.geplant === '1',
    }
  },
  set: (value) => {
    router.replace({
      query: {
        q: value.query || undefined,
        stufe: value.level ?? undefined,
        charakter: value.characterId || undefined,
        geplant: value.onlyWithRuns ? '1' : undefined,
      },
    })
  },
})

const selectedCharacter = computed(() => myCharacters.value.find(character => character.id === filter.value.characterId) ?? null)

// Quest-Fortschritt des ausgewählten Charakters je Dungeon (nur mit Blizzard-Daten)
const selectedId = computed(() => selectedCharacter.value?.id ?? null)
const { data: questData } = useLazyAsyncData(
  'dungeon-finder-quests',
  () => selectedId.value
    ? $fetch<{ dungeons: Record<string, DungeonQuestStatus> | null }>(`/api/me/characters/${selectedId.value}/quests`).catch(() => null)
    : Promise.resolve(null),
  { server: false, watch: [selectedId] },
)
const questsBySlug = computed(() => (selectedId.value ? questData.value?.dungeons ?? null : null))

const openRunsBySlug = computed(() => {
  const now = new Date()
  const counts = new Map<string, number>()
  for (const run of runs.value) if (isUpcoming(run, now)) counts.set(run.dungeonSlug, (counts.get(run.dungeonSlug) ?? 0) + 1)
  return counts
})

const results = computed(() =>
  filterDungeons(
    dungeons,
    {
      query: filter.value.query,
      level: filter.value.level,
      characterLevel: selectedCharacter.value?.level ?? null,
      onlyWithRuns: filter.value.onlyWithRuns,
    },
    { runs: runs.value, now: new Date() },
  ),
)

function onSaved(run: { id: string }) {
  navigateTo(`/gruppen/${run.id}`)
}
</script>

<template>
  <div class="dungeons-page">
    <PageHeader
      title="Dungeon-Finder"
      lead="Finde den passenden Dungeon für deinen Charakter und schließ dich einer Gruppe an – oder stell selbst eine zusammen."
    >
      <BaseButton
        to="/gruppen"
        variant="secondary"
        icon-left="users"
      >
        Alle Gruppen
      </BaseButton>
      <BaseButton
        v-if="canCreate"
        icon-left="heal"
        @click="formOpen = true"
      >
        Gruppe erstellen
      </BaseButton>
    </PageHeader>

    <div class="dungeons-page__body container">
      <SignInHint
        v-if="!canCreate"
        action="Gruppen zu erstellen oder beizutreten"
      />

      <DungeonFilters
        v-model="filter"
        :characters="myCharacters"
        :result-count="results.length"
      />

      <ul
        v-if="results.length"
        class="dungeons-page__grid"
        role="list"
      >
        <li
          v-for="dungeon in results"
          :key="dungeon.slug"
          class="dungeons-page__item"
        >
          <DungeonCard
            :dungeon="dungeon"
            :open-runs="openRunsBySlug.get(dungeon.slug) ?? 0"
            :character="selectedCharacter"
            :quests="questsBySlug?.[dungeon.slug] ?? null"
          />
        </li>
      </ul>
      <EmptyState
        v-else
        icon="search"
        title="Kein Dungeon passt auf diese Filter"
        description="Ändere die Stufe oder entferne den Filter „Nur mit geplanten Gruppen“."
      >
        <BaseButton
          size="sm"
          variant="secondary"
          @click="filter = { query: '', level: null, characterId: null, onlyWithRuns: false }"
        >
          Filter zurücksetzen
        </BaseButton>
      </EmptyState>

      <p class="dungeons-page__sources">
        Levelbereiche nach der WoW-Forever-Übersicht von Warcraft Tavern, Mindeststufen nach deren Classic-Übersicht.
        Für die neuen Forever-Dungeons ist noch keine Mindeststufe belegt.
      </p>
    </div>

    <GroupFormDialog
      v-model:open="formOpen"
      @saved="onSaved"
    />
  </div>
</template>

<style scoped lang="scss">
.dungeons-page {
  &__body {
    display: flex;
    flex-direction: column;
    gap: var(--space-6);
  }

  &__grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(16rem, 1fr));
    gap: var(--space-5);
  }

  // Jede Karte belegt sechs Zeilen des Rasters (Titel, englischer Name, Zahlen, Gebiet, Hinweise, Fuß) –
  // so liegen Titel, Zahlen und Fußzeilen nebeneinanderstehender Karten auf gleicher Höhe
  &__item {
    display: grid;
    grid-row: span 6;
    grid-template-rows: subgrid;
    row-gap: 0;
  }

  &__sources {
    max-width: 75ch;
    font-size: var(--text-xs);
    color: var(--color-text-subtle);
  }
}
</style>
