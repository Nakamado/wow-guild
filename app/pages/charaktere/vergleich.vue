<script setup lang="ts">
import { difference, mergeDungeons, mergePointLines } from '#shared/domain/compare'
import type { DungeonProgress } from '#shared/domain/quests'
import type { ProgressType } from '#shared/schemas/points'
import type { Character, CommunityMember } from '#shared/types'

interface CompareSide {
  character: Character
  member: { id: string, displayName: string }
  points: { total: number, byType: { type: ProgressType, count: number, points: number }[] } | null
  quests: { dungeonQuests: number, groupQuests: number, completeDungeons: number, dungeons: DungeonProgress[] } | null
}

useSeoMeta({ title: 'Charaktere vergleichen', robots: 'noindex' })

const route = useRoute()
const router = useRouter()
const { can } = useViewer()
const canView = computed(() => can('members:view'))

const { data: directory } = await useProtectedFetch<(CommunityMember & { characters: Character[] })[]>('members', '/api/members', canView)

const asString = (value: unknown) => (typeof value === 'string' ? value : '')
const selection = computed({
  get: () => ({ a: asString(route.query.a), b: asString(route.query.b) }),
  set: value => router.replace({ query: { a: value.a || undefined, b: value.b || undefined } }),
})
const select = (side: 'a' | 'b', value: string) => (selection.value = { ...selection.value, [side]: value })
const swap = () => (selection.value = { a: selection.value.b, b: selection.value.a })

const options = computed(() => (directory.value ?? [])
  .filter(member => member.characters.length)
  .map(member => ({ label: member.displayName, characters: [...member.characters].sort((x, y) => Number(y.isMain) - Number(x.isMain) || y.level - x.level) }))
  .sort((x, y) => x.label.localeCompare(y.label, 'de')))

const ready = computed(() => Boolean(selection.value.a && selection.value.b && selection.value.a !== selection.value.b))
const { data, status, error, refresh } = useLazyAsyncData(
  'character-compare',
  () => (ready.value
    ? $fetch<{ sides: [CompareSide, CompareSide] }>('/api/characters/compare', { query: selection.value })
    : Promise.resolve(null)),
  { server: false, watch: [selection] },
)
const sides = computed(() => (ready.value ? data.value?.sides ?? null : null))

const ruleOrder: ProgressType[] = ['level', 'dungeon-quest', 'group-quest', 'dungeon-first', 'dungeon-complete', 'dungeon-boss', 'raid-first', 'raid-boss', 'profession-milestone']
const ruleLabels: Record<ProgressType, string> = {
  'level': 'Levelaufstiege',
  'dungeon-first': 'Dungeons vollständig',
  'dungeon-complete': 'Dungeon-Abschlüsse',
  'dungeon-quest': 'Dungeon-Quests',
  'group-quest': 'Gruppenquests',
  'dungeon-boss': 'Dungeon-Bosse',
  'raid-first': 'Raid-Erstabschlüsse',
  'raid-boss': 'Raid-Bosse',
  'profession-milestone': 'Berufsmeilensteine',
}
const number = new Intl.NumberFormat('de-DE')

const pointRows = computed(() => (sides.value ? mergePointLines(ruleOrder, sides.value[0].points?.byType ?? null, sides.value[1].points?.byType ?? null) : []))
const dungeonRows = computed(() => (sides.value ? mergeDungeons(sides.value[0].quests?.dungeons ?? null, sides.value[1].quests?.dungeons ?? null) : []))
// Anzahlen nur, wenn Questdaten da sind – wichtig vor allem ohne Ranglisten-Freigabe (keine Punkte)
const questRows = computed(() => {
  if (!sides.value || (!sides.value[0].quests && !sides.value[1].quests)) return []
  const [a, b] = sides.value
  return [
    { label: 'Dungeon-Quests', a: a.quests?.dungeonQuests ?? null, b: b.quests?.dungeonQuests ?? null },
    { label: 'Gruppenquests', a: a.quests?.groupQuests ?? null, b: b.quests?.groupQuests ?? null },
    { label: 'Dungeons vollständig', a: a.quests?.completeDungeons ?? null, b: b.quests?.completeDungeons ?? null },
  ]
})

/** „+150 für Name“ / „gleich“ / „–“ */
function diffLabel(a: number | null | undefined, b: number | null | undefined) {
  const result = difference(a, b)
  if (!result || !sides.value) return { text: '–', leader: null }
  if (!result.leader) return { text: 'gleich', leader: null }
  const name = sides.value[result.leader === 'a' ? 0 : 1].character.name
  return { text: `+${number.format(result.amount)} für ${name}`, leader: result.leader }
}
const value = (amount: number | null | undefined) => (amount == null ? '–' : number.format(amount))
const stand = (entry: { done: number, total: number } | null) => (entry ? `${entry.done}/${entry.total}` : '–')
</script>

<template>
  <div class="compare-page container">
    <BackLink
      :to="selection.a ? `/charaktere/${selection.a}` : '/mitglieder'"
      class="compare-page__back"
    >
      {{ selection.a ? 'Zum Charakter' : 'Alle Mitglieder' }}
    </BackLink>

    <PageHeader
      title="Charaktere vergleichen"
      lead="Zwei Charaktere der Gilde nebeneinander – Stufe, Punkte und Dungeon-Fortschritt."
    />

    <MembersLocked v-if="!canView" />

    <template v-else>
      <form
        class="compare-page__pickers"
        aria-label="Charaktere auswählen"
        @submit.prevent
      >
        <div
          v-for="(side, index) in (['a', 'b'] as const)"
          :key="side"
          class="compare-page__field"
        >
          <label
            :for="`compare-${side}`"
            class="compare-page__label"
          >Charakter {{ index + 1 }}</label>
          <select
            :id="`compare-${side}`"
            class="compare-page__input"
            :value="selection[side]"
            @change="select(side, ($event.target as HTMLSelectElement).value)"
          >
            <option value="">
              Bitte wählen
            </option>
            <optgroup
              v-for="group in options"
              :key="group.label"
              :label="group.label"
            >
              <option
                v-for="character in group.characters"
                :key="character.id"
                :value="character.id"
                :disabled="character.id === selection[side === 'a' ? 'b' : 'a']"
              >
                {{ character.name }} (Stufe {{ character.level }})
              </option>
            </optgroup>
          </select>
        </div>
        <BaseButton
          variant="ghost"
          size="sm"
          class="compare-page__swap"
          :disabled="!selection.a && !selection.b"
          @click="swap"
        >
          Tauschen
        </BaseButton>
      </form>

      <EmptyState
        v-if="!ready"
        icon="users"
        title="Wähle zwei Charaktere aus"
        description="Zum Beispiel deinen Main und einen Twink – oder dich und eine Gildenkameradin."
        :heading-level="2"
      />

      <ErrorState
        v-else-if="error"
        @retry="refresh()"
      />

      <LoadingSkeleton
        v-else-if="!sides || status === 'pending'"
        variant="card"
      />

      <template v-else>
        <section class="compare-page__section">
          <h2
            id="compare-points"
            class="compare-page__title"
          >
            Überblick
          </h2>
          <div
            class="compare-page__table-wrap"
            role="region"
            aria-labelledby="compare-points"
            tabindex="0"
          >
            <table class="compare-page__table">
              <thead>
                <tr>
                  <th scope="col">
                    <span class="visually-hidden">Wert</span>
                  </th>
                  <th
                    v-for="side in sides"
                    :key="side.character.id"
                    scope="col"
                  >
                    <NuxtLink
                      :to="`/charaktere/${side.character.id}`"
                      class="compare-page__name"
                      :style="{ '--class-color': `var(--color-class-${side.character.classId}, var(--color-class-unknown))` }"
                    >{{ side.character.name }}</NuxtLink>
                    <span class="compare-page__owner">{{ side.member.displayName }}</span>
                  </th>
                  <th scope="col">
                    Unterschied
                  </th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <th scope="row">
                    Stufe
                  </th>
                  <td
                    v-for="side in sides"
                    :key="side.character.id"
                  >
                    {{ side.character.level }}
                  </td>
                  <td class="compare-page__diff">
                    {{ diffLabel(sides[0].character.level, sides[1].character.level).text }}
                  </td>
                </tr>
                <tr class="compare-page__total">
                  <th scope="row">
                    Punkte gesamt
                  </th>
                  <td
                    v-for="side in sides"
                    :key="side.character.id"
                  >
                    {{ side.points ? value(side.points.total) : 'nicht freigegeben' }}
                  </td>
                  <td class="compare-page__diff">
                    {{ diffLabel(sides[0].points?.total, sides[1].points?.total).text }}
                  </td>
                </tr>
                <tr
                  v-for="row in pointRows"
                  :key="row.type"
                >
                  <th scope="row">
                    {{ ruleLabels[row.type] }}
                  </th>
                  <td
                    v-for="(entry, index) in [row.a, row.b]"
                    :key="index"
                  >
                    <template v-if="entry">
                      {{ value(entry.points) }}
                      <span class="compare-page__count">({{ entry.count }}×)</span>
                    </template>
                    <template v-else>
                      –
                    </template>
                  </td>
                  <td class="compare-page__diff">
                    {{ diffLabel(row.a?.points, row.b?.points).text }}
                  </td>
                </tr>
                <tr
                  v-for="row in questRows"
                  :key="row.label"
                >
                  <th scope="row">
                    {{ row.label }} (Anzahl)
                  </th>
                  <td>{{ value(row.a) }}</td>
                  <td>{{ value(row.b) }}</td>
                  <td class="compare-page__diff">
                    {{ diffLabel(row.a, row.b).text }}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
          <p class="compare-page__note">
            Punkte zeigen wir nur für Charaktere, die an der Rangliste teilnehmen. Quests kommen aus der
            Blizzard-API und hinken dem Spiel etwas hinterher.
          </p>
        </section>

        <section
          v-if="dungeonRows.length"
          class="compare-page__section"
        >
          <h2
            id="compare-dungeons"
            class="compare-page__title"
          >
            Dungeon-Quests
          </h2>
          <div
            class="compare-page__table-wrap"
            role="region"
            aria-labelledby="compare-dungeons"
            tabindex="0"
          >
            <table class="compare-page__table">
              <thead>
                <tr>
                  <th scope="col">
                    Dungeon
                  </th>
                  <th
                    v-for="side in sides"
                    :key="side.character.id"
                    scope="col"
                  >
                    {{ side.character.name }}
                  </th>
                </tr>
              </thead>
              <tbody>
                <tr
                  v-for="row in dungeonRows"
                  :key="row.groupId"
                >
                  <th scope="row">
                    {{ row.name }}
                  </th>
                  <td
                    v-for="(entry, index) in [row.a, row.b]"
                    :key="index"
                    :class="{ 'compare-page__complete': entry?.complete }"
                  >
                    {{ stand(entry) }}<span
                      v-if="entry?.complete"
                      class="visually-hidden"
                    > (vollständig)</span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>
      </template>
    </template>
  </div>
</template>

<style scoped lang="scss">
.compare-page {
  display: flex;
  flex-direction: column;
  gap: var(--space-6);
  padding-block: var(--space-6) var(--space-10);

  &__pickers {
    display: grid;
    gap: var(--space-4);
    align-items: end;
    padding: var(--space-5);

    @include card-surface;

    @include mq('md') {
      grid-template-columns: 1fr 1fr auto;
    }
  }

  &__field {
    display: flex;
    flex-direction: column;
    gap: var(--space-2);
    min-width: 0;
  }

  &__label {
    font-size: var(--text-sm);
    font-weight: var(--font-weight-medium);
    color: var(--color-text-muted);
  }

  &__input {
    width: 100%;
    min-height: 2.75rem;
    padding: var(--space-2) var(--space-3);
    color: var(--color-text);
    background: var(--color-bg);
    border: 1px solid var(--color-border-strong);
    border-radius: var(--radius-md);

    &:hover {
      border-color: var(--color-accent-strong);
    }

    @include focus-ring(2px);
  }

  &__section {
    display: flex;
    flex-direction: column;
    gap: var(--space-3);
  }

  &__title {
    font-family: var(--font-display);
    font-size: var(--text-lg);
  }

  &__table-wrap {
    overflow-x: auto;

    @include card-surface;
    @include focus-ring(2px);
  }

  &__table {
    width: 100%;
    font-size: var(--text-sm);
    border-collapse: collapse;

    th,
    td {
      padding: var(--space-3) var(--space-4);
      text-align: left;
      border-bottom: 1px solid var(--color-border);
    }

    tbody tr:last-child > * {
      border-bottom: 0;
    }

    thead th {
      font-weight: var(--font-weight-semibold);
      color: var(--color-text-muted);
      vertical-align: bottom;
    }

    tbody th {
      font-weight: var(--font-weight-medium);
      color: var(--color-text-muted);
    }

    td {
      font-variant-numeric: tabular-nums;
      white-space: nowrap;
    }
  }

  &__name {
    display: block;
    font-family: var(--font-display);
    font-size: var(--text-md);
    color: var(--class-color);
    text-decoration: none;

    &:hover {
      text-decoration: underline;
    }
  }

  &__owner {
    display: block;
    font-size: var(--text-xs);
    font-weight: var(--font-weight-regular);
    color: var(--color-text-subtle);
  }

  &__total td,
  &__total th {
    font-weight: var(--font-weight-semibold);
    color: var(--color-text);
  }

  &__count {
    font-size: var(--text-xs);
    color: var(--color-text-subtle);
  }

  &__diff {
    color: var(--color-accent);
  }

  &__complete {
    color: var(--color-success);
  }

  &__note {
    max-width: 75ch;
    font-size: var(--text-xs);
    color: var(--color-text-subtle);
  }
}
</style>
