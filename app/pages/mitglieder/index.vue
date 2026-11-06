<script setup lang="ts">
import { characterSortKeys, defaultCharacterSort, type CharacterSort, type CharacterSortKey } from '#shared/domain/character-table'

useSeoMeta({ title: 'Mitglieder', robots: 'noindex' })

const { can } = useViewer()
const canView = computed(() => can('members:view'))
const requestFetch = useRequestFetch()

const { data: members, status, refresh } = await useAsyncData(
  'members',
  () => (canView.value ? requestFetch('/api/members') : Promise.resolve(null)),
  { watch: [canView] },
)

// Sortierung ↔ URL-Query (teilbare, wiederherstellbare Ansicht, ohne Neuladen)
const route = useRoute()
const router = useRouter()
const sort = computed<CharacterSort>({
  get: (): CharacterSort => {
    const key = route.query.sortierung
    const direction = route.query.richtung
    return characterSortKeys.includes(key as CharacterSortKey)
      ? { key: key as CharacterSortKey, direction: direction === 'absteigend' ? 'desc' as const : 'asc' as const }
      : defaultCharacterSort
  },
  set: (value) => {
    router.replace({ query: { ...route.query, sortierung: value.key, richtung: value.direction === 'asc' ? 'aufsteigend' : 'absteigend' } })
  },
})

const rows = computed(() => (members.value ?? []).flatMap(member => member.characters.map(character => ({
  character,
  playerName: member.displayName,
  player: { id: member.id, displayName: member.displayName, avatarUrl: member.avatarUrl },
}))))
const withoutCharacters = computed(() => (members.value ?? []).filter(member => !member.characters.length))
const hasDemoProfessions = computed(() => rows.value.some(row => row.character.professions.some(profession => profession.source === 'demo')))
</script>

<template>
  <div class="members-page">
    <PageHeader
      title="Mitglieder"
      lead="Alle Charaktere der Gilde auf einen Blick – ein Klick auf eine Spaltenüberschrift sortiert die Tabelle."
    />

    <div class="members-page__body container">
      <MembersLocked v-if="!canView" />

      <template v-else>
        <ErrorState
          v-if="status === 'error'"
          @retry="refresh()"
        />

        <LoadingSkeleton
          v-else-if="status === 'pending'"
          variant="card"
          :lines="6"
        />

        <template v-else-if="rows.length">
          <p
            v-if="hasDemoProfessions"
            class="members-page__demo"
          >
            <BaseIcon
              name="info"
              :size="18"
            />
            Beispieldaten: Berufe und Skillwerte sind fiktiv.
          </p>
          <CharacterTable
            v-model:sort="sort"
            :rows="rows"
          />
          <p class="members-page__hint">
            Berufe kommen automatisch aus der Blizzard-API und hinken dem Spiel einige Stunden hinterher.
          </p>
          <p
            v-if="withoutCharacters.length"
            class="members-page__hint"
          >
            Noch ohne Charakter:
            <template
              v-for="(member, index) in withoutCharacters"
              :key="member.id"
            >
              <NuxtLink
                :to="`/mitglieder/${member.id}`"
                class="members-page__link"
              >{{ member.displayName }}</NuxtLink><template v-if="index < withoutCharacters.length - 1">
                ,
              </template>
            </template>
          </p>
        </template>

        <EmptyState
          v-else-if="!members?.length"
          icon="users"
          title="Noch keine Mitglieder"
          description="Sobald sich Gildenmitglieder mit Discord anmelden, erscheinen sie hier mit ihren Charakteren."
        />

        <EmptyState
          v-else
          icon="users"
          title="Noch keine Charaktere"
          description="Sobald Mitglieder ihre Charaktere eintragen, erscheinen sie hier in der Tabelle."
        />
      </template>
    </div>
  </div>
</template>

<style scoped lang="scss">
.members-page {
  &__body {
    display: flex;
    flex-direction: column;
    gap: var(--space-5);
  }

  &__demo {
    display: flex;
    gap: var(--space-2);
    align-items: center;
    padding: var(--space-3) var(--space-4);
    font-size: var(--text-sm);
    color: var(--color-lantern);
    border: 1px dashed rgb(245 183 104 / 40%);
    border-radius: var(--radius-md);
  }

  &__hint {
    font-size: var(--text-sm);
    color: var(--color-text-subtle);
  }

  &__link {
    color: var(--color-frost);

    @include focus-ring(2px);
  }
}
</style>
