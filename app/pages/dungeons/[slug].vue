<script setup lang="ts">
import { dataSources } from '#shared/data/sources'
import { findDungeon } from '#shared/data/dungeons'
import { checkLevelFit, formatRange } from '#shared/domain/level'
import { filterRuns } from '#shared/domain/runs'

const route = useRoute()
const dungeon = computed(() => findDungeon(String(route.params.slug)))

if (!dungeon.value) {
  throw createError({ statusCode: 404, statusMessage: 'Dungeon nicht gefunden', fatal: true })
}

useSeoMeta({
  title: () => dungeon.value?.name ?? 'Dungeon',
  description: () => (dungeon.value ? `${dungeon.value.name}: empfohlen für Stufe ${formatRange(dungeon.value.levelRange.min, dungeon.value.levelRange.max)}, ${dungeon.value.zone}.` : ''),
})

const { can } = useViewer()
const { runs, myCharacters, myEntry } = useRuns()
const canCreate = computed(() => can('runs:create'))
const formOpen = ref(false)

const upcoming = computed(() => filterRuns(runs.value, { dungeonSlug: dungeon.value?.slug, includeCancelled: true }, new Date()))
const sources = computed(() => dataSources.filter(source => (dungeon.value?.sourceIds ?? []).includes(source.id)))

function onSaved(run: { id: string }) {
  navigateTo(`/gruppen/${run.id}`)
}
</script>

<template>
  <div
    v-if="dungeon"
    class="dungeon-page container"
  >
    <BackLink
      to="/dungeons"
      class="dungeon-page__back"
    >
      Alle Dungeons
    </BackLink>

    <header class="dungeon-page__header">
      <p
        v-if="dungeon.isNewInForever"
        class="dungeon-page__badge"
      >
        Neu in WoW: Forever
      </p>
      <h1 class="dungeon-page__title">
        {{ dungeon.name }}
      </h1>
      <p class="dungeon-page__name-en">
        <span
          v-if="dungeon.nameEn !== dungeon.name"
          lang="en"
        >{{ dungeon.nameEn }}</span>
        <span class="dungeon-page__abbr"><span class="visually-hidden">Kürzel: </span>{{ dungeon.abbreviation }}</span>
      </p>
      <p class="dungeon-page__description">
        {{ dungeon.description }}
      </p>
    </header>

    <div class="dungeon-page__layout">
      <section aria-labelledby="dungeon-runs">
        <header class="dungeon-page__section-header">
          <h2
            id="dungeon-runs"
            class="dungeon-page__section-title"
          >
            Geplante Gruppen
          </h2>
          <BaseButton
            v-if="canCreate"
            size="sm"
            @click="formOpen = true"
          >
            Gruppe erstellen
          </BaseButton>
        </header>
        <ul
          v-if="upcoming.length"
          class="dungeon-page__runs"
          role="list"
        >
          <li
            v-for="run in upcoming"
            :key="run.id"
          >
            <GroupCard
              :run="run"
              :dungeon="dungeon"
              :joined="myEntry(run)?.placement ?? null"
              :joined-as-support="myEntry(run)?.support ?? false"
            />
          </li>
        </ul>
        <EmptyState
          v-else
          icon="calendar"
          title="Für diesen Dungeon ist nichts geplant"
          :description="canCreate ? 'Stell die erste Gruppe zusammen – andere können dann beitreten.' : undefined"
        >
          <BaseButton
            v-if="canCreate"
            size="sm"
            @click="formOpen = true"
          >
            Gruppe erstellen
          </BaseButton>
        </EmptyState>
        <SignInHint
          v-if="!canCreate"
          action="Gruppen zu erstellen oder beizutreten"
          class="dungeon-page__hint"
        />
      </section>

      <aside
        class="dungeon-page__aside"
        aria-label="Dungeon-Details"
      >
        <dl class="dungeon-page__facts">
          <div class="dungeon-page__fact">
            <dt>Empfohlene Stufe</dt>
            <dd>{{ formatRange(dungeon.levelRange.min, dungeon.levelRange.max) }}</dd>
          </div>
          <div class="dungeon-page__fact">
            <dt>Mindeststufe</dt>
            <dd>{{ dungeon.minLevel ?? 'nicht belegt' }}</dd>
          </div>
          <div class="dungeon-page__fact">
            <dt>Gruppengröße</dt>
            <dd>{{ dungeon.groupSize }} Spieler</dd>
          </div>
          <div class="dungeon-page__fact">
            <dt>Gebiet</dt>
            <dd>{{ dungeon.zone }}</dd>
          </div>
        </dl>
        <p
          v-if="dungeon.note"
          class="dungeon-page__note"
        >
          {{ dungeon.note }}
        </p>

        <div
          v-if="myCharacters.length"
          class="dungeon-page__fit"
        >
          <h2 class="dungeon-page__aside-title">
            Deine Charaktere
          </h2>
          <ul
            class="dungeon-page__fit-list"
            role="list"
          >
            <li
              v-for="character in myCharacters"
              :key="character.id"
              class="dungeon-page__fit-item"
            >
              <span class="dungeon-page__fit-name">{{ character.name }} ({{ character.level }})</span>
              <span
                class="dungeon-page__fit-message"
                :class="`dungeon-page__fit-message--${checkLevelFit(character.level, dungeon).status}`"
              >
                {{ checkLevelFit(character.level, dungeon).message }}
              </span>
            </li>
          </ul>
        </div>

        <p class="dungeon-page__sources">
          Quellen:
          <template
            v-for="(source, index) in sources"
            :key="source.id"
          >
            <a
              :href="source.url"
              target="_blank"
              rel="noopener noreferrer"
            >{{ source.title }}</a><template v-if="index < sources.length - 1">
              ,
            </template>
          </template>
        </p>
      </aside>
    </div>

    <GroupFormDialog
      v-model:open="formOpen"
      :dungeon-slug="dungeon.slug"
      @saved="onSaved"
    />
  </div>
</template>

<style scoped lang="scss">
.dungeon-page {
  display: flex;
  flex-direction: column;
  gap: var(--space-10);
  padding-block: var(--space-10) 0;

  &__back {
    align-self: flex-start;
  }

  &__header {
    display: flex;
    flex-direction: column;
    gap: var(--space-2);
  }

  &__badge {
    font-size: var(--text-sm);
    color: var(--color-blossom);
  }

  &__title {
    font-size: var(--text-3xl);
  }

  &__name-en {
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-3);
    align-items: center;
    font-family: var(--font-serif);
    font-size: var(--text-lg);
    font-style: italic;
    color: var(--color-text-muted);
  }

  &__abbr {
    padding: 0 var(--space-2);
    font-family: var(--font-sans);
    font-size: var(--text-sm);
    font-style: normal;
    font-weight: var(--font-weight-semibold);
    letter-spacing: 0.04em;
    border: 1px solid var(--color-border);
    border-radius: var(--radius-sm);
  }

  &__description {
    max-width: 60ch;
    margin-top: var(--space-2);
    font-size: var(--text-md);
    color: var(--color-text-muted);
  }

  &__layout {
    display: grid;
    gap: var(--space-12);

    @include mq('lg') {
      grid-template-columns: 2fr 1fr;
    }
  }

  &__section-header {
    display: flex;
    gap: var(--space-4);
    align-items: center;
    justify-content: space-between;
    margin-bottom: var(--space-5);
  }

  &__section-title {
    font-size: var(--text-xl);
  }

  &__runs {
    display: flex;
    flex-direction: column;
    gap: var(--space-3);
  }

  &__hint {
    margin-top: var(--space-4);
  }

  &__aside {
    display: flex;
    flex-direction: column;
    gap: var(--space-6);
  }

  &__facts {
    margin: 0;
    border-top: 1px solid var(--color-border);
  }

  &__fact {
    display: flex;
    justify-content: space-between;
    padding: var(--space-3) 0;
    border-bottom: 1px solid var(--color-border);

    dt {
      color: var(--color-text-muted);
    }

    dd {
      margin: 0;
      color: var(--color-frost);
      text-align: right;
    }
  }

  &__note {
    font-size: var(--text-sm);
    color: var(--color-warning);
  }

  &__aside-title {
    margin-bottom: var(--space-3);
    font-family: var(--font-sans);
    font-size: var(--text-base);
    font-weight: var(--font-weight-semibold);
    letter-spacing: 0;
  }

  &__fit-list {
    display: flex;
    flex-direction: column;
    gap: var(--space-3);
  }

  &__fit-item {
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  &__fit-name {
    font-weight: var(--font-weight-medium);
  }

  &__fit-message {
    font-size: var(--text-sm);

    &--fit { color: var(--color-success); }

    &--below-recommended,
    &--above-recommended { color: var(--color-warning); }
    &--below-minimum { color: var(--color-danger); }
  }

  &__sources {
    font-size: var(--text-xs);
    color: var(--color-text-subtle);
  }
}
</style>
