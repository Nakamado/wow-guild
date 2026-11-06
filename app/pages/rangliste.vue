<script setup lang="ts">
import type { ProgressType } from '#shared/schemas/points'

useSeoMeta({ title: 'Rangliste', description: 'Punkte für Levelaufstiege, Dungeons, Raids und Berufe – Main und Gesamt.' })

const { data } = await useFetch('/api/leaderboard', { key: 'leaderboard' })

type Board = 'main' | 'total'
const board = ref<Board>('main')
const boards: { id: Board, label: string, hint: string }[] = [
  { id: 'main', label: 'Main-Charakter', hint: 'Nur der Hauptcharakter einer Person zählt.' },
  { id: 'total', label: 'Gesamt', hint: 'Main und alle Twinks einer Person zusammen.' },
]
const rows = computed(() => (data.value ? data.value[board.value] : []))
const activeHint = computed(() => boards.find(entry => entry.id === board.value)!.hint)

const ruleLabels: Record<ProgressType, string> = {
  'level': 'Levelaufstieg',
  'dungeon-first': 'Dungeon-Erstabschluss (Bonus)',
  'dungeon-complete': 'Dungeon-Abschluss',
  'dungeon-quest': 'Dungeon-Quest abgeschlossen',
  'dungeon-boss': 'Dungeon-Boss besiegt',
  'raid-first': 'Raid-Erstabschluss (Bonus)',
  'raid-boss': 'Raid-Boss besiegt',
  'profession-milestone': 'Berufsmeilenstein',
}
const ruleOrder: ProgressType[] = ['level', 'dungeon-first', 'dungeon-complete', 'dungeon-quest', 'dungeon-boss', 'raid-first', 'raid-boss', 'profession-milestone']
const points = new Intl.NumberFormat('de-DE')
const dateTime = new Intl.DateTimeFormat('de-DE', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Europe/Berlin' })

// Aufgeklappte Zeile (Aufschlüsselung der Punkte); beim Wechsel der Liste zuklappen
const openRow = ref<string | null>(null)
watch(board, () => (openRow.value = null))
const toggleRow = (memberId: string) => (openRow.value = openRow.value === memberId ? null : memberId)
</script>

<template>
  <div class="ranking-page">
    <PageHeader
      title="Rangliste"
      lead="Wer hat am meisten erlebt? Punkte gibt es für Fortschritt – einmalige Erfolge zählen deutlich mehr als Farmen."
    />

    <div class="ranking-page__body container">
      <p
        v-if="data?.isDemo"
        class="ranking-page__demo"
      >
        <BaseIcon
          name="info"
          :size="18"
        />
        Beispieldaten: Personen, Charaktere und Punkte sind fiktiv.
      </p>
      <p
        v-else-if="data?.isPreview"
        class="ranking-page__demo"
      >
        <BaseIcon
          name="info"
          :size="18"
        />
        <span>
          Testlauf: Diese Einträge kommen direkt aus der Blizzard-API – bisher nur Stufe und Berufe, Dungeons folgen.
          Die API hinkt dem Spiel rund 13 Stunden hinterher<template v-if="data.updatedAt"> (Stand: letzter Login {{ dateTime.format(new Date(data.updatedAt)) }})</template>.
        </span>
      </p>

      <section aria-labelledby="ranking-board">
        <h2
          id="ranking-board"
          class="visually-hidden"
        >
          Rangliste
        </h2>
        <div
          class="ranking-page__switch"
          role="group"
          aria-label="Rangliste wählen"
        >
          <button
            v-for="entry in boards"
            :key="entry.id"
            type="button"
            class="ranking-page__switch-button"
            :aria-pressed="board === entry.id"
            @click="board = entry.id"
          >
            {{ entry.label }}
          </button>
        </div>
        <p class="ranking-page__hint">
          {{ activeHint }}
        </p>

        <EmptyState
          v-if="!rows.length"
          icon="star"
          title="Die Rangliste startet bald"
          description="Sobald die Punkte aus dem Spiel abgeglichen werden, erscheinen hier alle, die der Teilnahme zugestimmt haben."
        />

        <ol
          v-else
          class="ranking-page__list"
        >
          <li
            v-for="row in rows"
            :key="row.memberId"
            class="ranking-page__row"
            :class="{ [`ranking-page__row--top${row.rank}`]: row.rank <= 3, 'ranking-page__row--open': openRow === row.memberId }"
          >
            <button
              type="button"
              class="ranking-page__summary"
              :aria-expanded="openRow === row.memberId"
              :aria-controls="`breakdown-${board}-${row.memberId}`"
              @click="toggleRow(row.memberId)"
            >
              <span
                class="ranking-page__rank"
                :aria-label="`Platz ${row.rank}`"
              >{{ row.rank }}</span>
              <MemberAvatar
                :name="row.displayName"
                :src="row.avatarUrl"
                size="sm"
              />
              <span class="ranking-page__who">
                <!-- Main: Charaktername · Gesamt: Discord-Name der Person (gleiches Profilbild verbindet beide Listen) -->
                <span class="ranking-page__name">{{ board === 'main' ? (row.mainCharacter?.name ?? row.displayName) : row.displayName }}</span>
                <span
                  v-if="board === 'main'"
                  class="ranking-page__detail"
                >
                  <ClassBadge
                    v-if="row.mainCharacter"
                    :class-id="row.mainCharacter.classId"
                  />
                  <span v-if="row.mainCharacter">Stufe {{ row.mainCharacter.level }}</span>
                </span>
                <span
                  v-else
                  class="ranking-page__detail"
                >
                  {{ row.characterCount === 1 ? '1 Charakter' : `${row.characterCount} Charaktere` }}
                </span>
              </span>
              <span class="ranking-page__points">
                {{ points.format(row.points) }}
                <span class="ranking-page__unit">Punkte</span>
              </span>
              <BaseIcon
                name="chevronDown"
                :size="18"
                class="ranking-page__chevron"
              />
            </button>

            <div
              v-show="openRow === row.memberId"
              :id="`breakdown-${board}-${row.memberId}`"
              class="ranking-page__breakdown"
            >
              <h3 class="ranking-page__breakdown-title">
                So kommen die Punkte zustande
              </h3>
              <ul
                v-if="board === 'total' && row.breakdown.characters.length > 1"
                class="ranking-page__characters"
                aria-label="Punkte je Charakter"
              >
                <li
                  v-for="character in row.breakdown.characters"
                  :key="character.id"
                >
                  {{ character.name }}: <strong>{{ points.format(character.points) }}</strong>
                </li>
              </ul>
              <dl class="ranking-page__lines">
                <div
                  v-for="line in row.breakdown.lines"
                  :key="line.type"
                  class="ranking-page__line"
                >
                  <dt>
                    <span>{{ ruleLabels[line.type] }} <span class="ranking-page__count">×{{ line.count }}</span></span>
                    <strong>{{ points.format(line.points) }}</strong>
                  </dt>
                  <dd>
                    <ul class="ranking-page__items">
                      <li
                        v-for="item in line.items"
                        :key="item.label"
                      >
                        <span>{{ item.label }}<template v-if="item.count > 1 && line.type !== 'level'"> ×{{ item.count }}</template></span>
                        <span>{{ points.format(item.points) }}</span>
                      </li>
                    </ul>
                    <p
                      v-if="line.capped > 0"
                      class="ranking-page__capped"
                    >
                      {{ points.format(line.capped) }} Punkte wegen Wochenlimit nicht gezählt
                    </p>
                  </dd>
                </div>
              </dl>
            </div>
          </li>
        </ol>
      </section>

      <section
        v-if="data"
        class="ranking-page__rules"
        aria-labelledby="ranking-rules"
      >
        <h2
          id="ranking-rules"
          class="ranking-page__title"
        >
          So gibt es Punkte
        </h2>
        <dl class="ranking-page__rule-list">
          <div
            v-for="type in ruleOrder"
            :key="type"
            class="ranking-page__rule"
          >
            <dt>
              {{ ruleLabels[type] }}
              <span
                v-if="data.rules.repeatable.includes(type)"
                class="ranking-page__tag"
              >wiederholbar</span>
            </dt>
            <dd>{{ points.format(data.rules.points[type] ?? 0) }}</dd>
          </div>
        </dl>
        <ul class="ranking-page__notes">
          <li>Wiederholbare Aktivität zählt höchstens {{ points.format(data.rules.weeklyRepeatableCap) }} Punkte pro Woche und Person (Wochenwechsel am Mittwoch).</li>
          <li>Berufsmeilensteine bei Skill {{ data.rules.professionMilestones.join(', ') }}.</li>
          <li>Bereits erreichte Stufen, Berufsmeilensteine und Dungeon-Quests werden rückwirkend gezählt.</li>
          <li>Punkte berechnet nur die Webseite; dieselbe Leistung zählt nie doppelt.</li>
          <li>In der Rangliste erscheinen nur Mitglieder, die zugestimmt haben.</li>
        </ul>
      </section>
    </div>
  </div>
</template>

<style scoped lang="scss">
.ranking-page {
  &__body {
    display: flex;
    flex-direction: column;
    gap: var(--space-10, var(--space-8));
    max-width: 52rem;
    padding-block: var(--space-8) var(--space-16);
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

  &__switch {
    display: inline-flex;
    padding: var(--space-1);
    background: var(--color-surface);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-pill);
  }

  &__switch-button {
    min-height: 2.5rem;
    padding: var(--space-2) var(--space-4);
    font-size: var(--text-sm);
    color: var(--color-text-muted);
    border-radius: var(--radius-pill);

    @include focus-ring(2px);

    &[aria-pressed='true'] {
      color: var(--color-text-inverse);
      background: var(--color-accent);
    }
  }

  &__hint {
    margin: var(--space-3) 0 var(--space-5);
    font-size: var(--text-sm);
    color: var(--color-text-subtle);
  }

  &__list {
    display: flex;
    flex-direction: column;
    gap: var(--space-2);
    padding: 0;
    margin: 0;
    list-style: none;
  }

  &__row {
    background: var(--color-surface);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-md);

    &--top1 { --rank-color: var(--color-lantern); }
    &--top2 { --rank-color: var(--color-frost); }
    &--top3 { --rank-color: var(--color-blossom); }

    &--top1,
    &--top2,
    &--top3 {
      border-color: color-mix(in srgb, var(--rank-color) 40%, transparent);
    }
  }

  &__summary {
    display: grid;
    grid-template-columns: 2.5rem auto 1fr auto auto;
    gap: var(--space-3);
    align-items: center;
    width: 100%;
    padding: var(--space-3) var(--space-4);
    text-align: left;
    cursor: pointer;
    border-radius: inherit;

    @include focus-ring(2px);

    &:hover .ranking-page__chevron { color: var(--color-text); }
  }

  &__chevron {
    color: var(--color-text-subtle);
    transition: transform var(--duration-fast, 150ms) ease;

    .ranking-page__row--open & { transform: rotate(180deg); }
  }

  &__breakdown {
    display: grid;
    gap: var(--space-3);
    padding: var(--space-3) var(--space-4) var(--space-4);
    font-size: var(--text-sm);
    border-top: 1px solid var(--color-border);
  }

  &__breakdown-title {
    font-family: inherit;
    font-size: var(--text-sm);
    font-weight: var(--font-weight-semibold);
    color: var(--color-text);
    text-transform: none;
    letter-spacing: normal;
  }

  &__characters {
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-1) var(--space-4);
    padding: 0;
    margin: 0;
    color: var(--color-text-muted);
    list-style: none;
  }

  &__lines {
    display: grid;
    gap: var(--space-3);
  }

  &__line dt {
    display: flex;
    justify-content: space-between;
    gap: var(--space-3);
    color: var(--color-text);

    strong { color: var(--color-accent); }
  }

  &__count {
    color: var(--color-text-subtle);
  }

  &__items {
    display: grid;
    gap: var(--space-1);
    padding: 0 0 0 var(--space-4);
    margin: var(--space-1) 0 0;
    color: var(--color-text-muted);
    list-style: none;

    li {
      display: flex;
      justify-content: space-between;
      gap: var(--space-3);
    }
  }

  &__capped {
    padding-left: var(--space-4);
    margin-top: var(--space-1);
    font-size: var(--text-xs);
    color: var(--color-lantern);
  }

  &__rank {
    font-family: var(--font-display);
    font-size: var(--text-lg);
    color: var(--rank-color, var(--color-text-subtle));
    text-align: center;
  }

  &__who {
    display: flex;
    flex-direction: column;
    min-width: 0;
  }

  &__name {
    overflow: hidden;
    font-weight: var(--font-weight-medium);
    color: var(--color-text);
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  &__detail {
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-2);
    align-items: center;
    font-size: var(--text-xs);
    color: var(--color-text-subtle);
  }

  &__points {
    font-family: var(--font-display);
    font-size: var(--text-lg);
    color: var(--color-text);
    text-align: right;
    white-space: nowrap;
  }

  &__unit {
    display: block;
    font-family: inherit;
    font-size: var(--text-xs);
    color: var(--color-text-subtle);
  }

  &__title {
    margin-bottom: var(--space-4);
    font-size: var(--text-xl);
  }

  &__rule-list {
    display: grid;
    gap: var(--space-2);

    @include mq('md') {
      grid-template-columns: 1fr 1fr;
      column-gap: var(--space-6);
    }
  }

  &__rule {
    display: flex;
    gap: var(--space-3);
    justify-content: space-between;
    padding: var(--space-2) 0;
    font-size: var(--text-sm);
    border-bottom: 1px solid var(--color-border);

    dd {
      font-weight: var(--font-weight-medium);
      color: var(--color-accent);
    }
  }

  &__tag {
    margin-left: var(--space-2);
    font-size: var(--text-xs);
    color: var(--color-text-subtle);
  }

  &__notes {
    display: grid;
    gap: var(--space-1);
    padding-left: var(--space-5);
    margin-top: var(--space-4);
    font-size: var(--text-sm);
    color: var(--color-text-muted);
  }
}
</style>
