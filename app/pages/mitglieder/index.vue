<script setup lang="ts">
import { filterMembers, type MemberFilter } from '#shared/domain/members'
import type { RoleId } from '#shared/types'

useSeoMeta({ title: 'Mitglieder', robots: 'noindex' })

const { can } = useViewer()
const canView = computed(() => can('members:view'))
const requestFetch = useRequestFetch()

const { data: members, status, refresh } = await useAsyncData(
  'members',
  () => (canView.value ? requestFetch('/api/members') : Promise.resolve(null)),
  { watch: [canView] },
)

// Filter ↔ URL-Query (teilbare, wiederherstellbare Ansicht)
const route = useRoute()
const router = useRouter()
const asString = (value: unknown) => (typeof value === 'string' && value ? value : null)
const asNumber = (value: unknown) => {
  const parsed = Number.parseInt(asString(value) ?? '', 10)
  return Number.isFinite(parsed) ? parsed : null
}

const filter = computed<MemberFilter>({
  get: () => ({
    query: asString(route.query.q) ?? undefined,
    classId: asString(route.query.klasse),
    role: asString(route.query.rolle) as RoleId | null,
    minLevel: asNumber(route.query.von),
    maxLevel: asNumber(route.query.bis),
  }),
  set: (value) => {
    router.replace({
      query: {
        q: value.query || undefined,
        klasse: value.classId || undefined,
        rolle: value.role || undefined,
        von: value.minLevel ?? undefined,
        bis: value.maxLevel ?? undefined,
      },
    })
  },
})

const results = computed(() => (members.value ? filterMembers(members.value, filter.value) : []))
</script>

<template>
  <div class="members-page">
    <PageHeader
      title="Mitglieder"
      lead="Alle Gildenmitglieder mit ihren Charakteren. Neue Mitglieder hinterlegen ihren Hauptcharakter nach der ersten Anmeldung."
    />

    <div class="members-page__body container">
      <MembersLocked v-if="!canView" />

      <template v-else>
        <MemberFilters
          v-model="filter"
          :result-count="results.length"
        />

        <ErrorState
          v-if="status === 'error'"
          @retry="refresh()"
        />

        <ul
          v-else-if="status === 'pending'"
          class="members-page__grid"
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
          v-else-if="results.length"
          class="members-page__grid"
          role="list"
        >
          <li
            v-for="member in results"
            :key="member.id"
          >
            <MemberCard :member="member" />
          </li>
        </ul>

        <EmptyState
          v-else
          icon="users"
          title="Niemand passt auf diese Filter"
          description="Lockere die Stufen- oder Klassenauswahl, um mehr Mitglieder zu sehen."
        >
          <BaseButton
            size="sm"
            variant="secondary"
            @click="filter = {}"
          >
            Filter zurücksetzen
          </BaseButton>
        </EmptyState>
      </template>
    </div>
  </div>
</template>

<style scoped lang="scss">
.members-page {
  &__body {
    display: flex;
    flex-direction: column;
    gap: var(--space-8);
  }

  &__grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(17rem, 1fr));
    gap: var(--space-5);
  }
}
</style>
