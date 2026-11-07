<script setup lang="ts">
import { findClass } from '#shared/data/classes'
import { dungeons } from '#shared/data/dungeons'
import { findRace } from '#shared/data/races'
import { filterDungeons } from '#shared/domain/dungeons'
import { guildRankLabel } from '~~/content/guild-ranks'
import { primaryProfessions, secondaryProfessions } from '#shared/domain/character-table'
import { formatRange } from '#shared/domain/level'
import type { Character } from '#shared/types'

interface CharacterResponse {
  character: Character
  media?: { avatarUrl: string | null, insetUrl: string | null, mainUrl: string | null } | null
  member: { id: string, displayName: string, avatarUrl: string | null }
  otherCharacters: Character[]
}

const route = useRoute()
const id = computed(() => String(route.params.id))

const { can } = useViewer()
const canView = computed(() => can('members:view'))

const { data, status, refresh, notFound } = await useProtectedFetch<CharacterResponse>(
  `character-${id.value}`,
  `/api/characters/${encodeURIComponent(id.value)}`,
  canView,
)

const character = computed(() => data.value?.character ?? null)
const gameClass = computed(() => (character.value ? findClass(character.value.classId) : undefined))
const race = computed(() => (character.value ? findRace(character.value.raceId) : undefined))
const guildName = useRuntimeConfig().public.guild.name
const primaries = computed(() => (character.value ? primaryProfessions(character.value) : []))
const secondaries = computed(() => (character.value ? secondaryProfessions(character.value) : []))
const professionSourceLabels = { 'blizzard-api': 'Blizzard-API', 'addon': 'Addon', 'manual': 'Eigene Angabe', 'demo': 'Beispieldaten (fiktiv)' } as const
const professionSource = computed(() => {
  const sources = [...new Set(character.value?.professions.map(profession => professionSourceLabels[profession.source]) ?? [])]
  return sources.join(', ')
})
// Charakterbild von Blizzard: freigestellter Ganzkörper-Render, sonst das Brustbild
const portrait = computed(() => {
  const media = data.value?.media
  if (!media) return null
  if (media.mainUrl) return { src: media.mainUrl, kind: 'main' as const }
  if (media.insetUrl) return { src: media.insetUrl, kind: 'inset' as const }
  return null
})
const portraitFailed = ref(false)
watch(portrait, () => (portraitFailed.value = false))
/** Kleiner Hinweis unter den Angaben, woher die Daten stammen */
const sourceNote = computed(() => {
  if (!character.value) return ''
  const parts = [`Daten: ${sourceLabel[character.value.source]}`]
  if (professionSource.value) parts.push(`Berufe: ${professionSource.value}`)
  if (portrait.value && !portraitFailed.value) parts.push('Charakterbild: Blizzard Entertainment')
  return parts.join(' · ')
})
const factionLabel = computed(() => (character.value?.faction === 'horde' ? 'Horde' : 'Allianz'))
const sourceLabel: Record<Character['source'], string> = {
  demo: 'Demo-Daten',
  self: 'vom Mitglied gepflegt',
  discord: 'Discord',
  twitch: 'Twitch',
  blizzard: 'Blizzard-API',
  static: 'statisch',
}

// Passende Dungeons: Stufe liegt im empfohlenen Bereich
const fittingDungeons = computed(() => (character.value ? filterDungeons(dungeons, { characterLevel: character.value.level }) : []))

useSeoMeta({ title: () => character.value?.name ?? 'Charakter', robots: 'noindex' })
</script>

<template>
  <div class="character-page container">
    <BackLink
      v-if="data"
      :to="`/mitglieder/${data.member.id}`"
      class="character-page__back"
    >
      Zu {{ data.member.displayName }}
    </BackLink>
    <BackLink
      v-else
      to="/mitglieder"
      class="character-page__back"
    >
      Alle Mitglieder
    </BackLink>

    <MembersLocked v-if="!canView" />

    <EmptyState
      v-else-if="notFound"
      title="Diesen Charakter gibt es nicht (mehr)"
      description="Vielleicht wurde er umbenannt oder entfernt."
      :heading-level="2"
    >
      <BaseButton
        to="/mitglieder"
        size="sm"
        variant="secondary"
      >
        Zur Mitgliederliste
      </BaseButton>
    </EmptyState>

    <ErrorState
      v-else-if="status === 'error'"
      @retry="refresh()"
    />

    <LoadingSkeleton
      v-else-if="!data || !character"
      variant="card"
    />

    <template v-else>
      <div
        class="character-page__hero"
        :class="{ 'character-page__hero--portrait': portrait && !portraitFailed }"
      >
        <header
          class="character-page__header"
          :style="{ '--class-color': `var(--color-class-${character.classId}, var(--color-class-unknown))` }"
        >
          <p class="character-page__kind">
            {{ character.isMain ? 'Hauptcharakter' : 'Twink' }} von {{ data.member.displayName }}
          </p>
          <h1 class="character-page__name">
            {{ character.name }}
          </h1>
          <p class="character-page__summary">
            Stufe {{ character.level }} {{ race?.name ?? 'Unbekanntes Volk' }} {{ gameClass?.name ?? '' }}
          </p>
        </header>
        <figure
          v-if="portrait && !portraitFailed"
          class="character-page__portrait"
          :class="`character-page__portrait--${portrait.kind}`"
        >
          <NuxtImg
            :src="portrait.src"
            :alt="`Charakterbild von ${character.name}`"
            class="character-page__portrait-image"
            :width="portrait.kind === 'main' ? 640 : 460"
            sizes="sm:100vw md:640px"
            @error="portraitFailed = true"
          />
        </figure>
      </div>

      <div class="character-page__layout">
        <div>
          <dl class="character-page__details">
            <div class="character-page__detail">
              <dt>Klasse</dt>
              <dd><ClassBadge :class-id="character.classId" /></dd>
            </div>
            <div class="character-page__detail">
              <dt>Volk</dt>
              <dd>{{ race?.name ?? 'Unbekannt' }}</dd>
            </div>
            <div class="character-page__detail">
              <dt>Stufe</dt>
              <dd>{{ character.level }}</dd>
            </div>
            <div class="character-page__detail">
              <dt>Rollen</dt>
              <dd class="character-page__roles">
                <RoleBadge
                  v-for="role in character.roles"
                  :key="role"
                  :role="role"
                />
              </dd>
            </div>
            <div
              v-if="character.guild"
              class="character-page__detail"
            >
              <dt>Gilde</dt>
              <dd>
                <template v-if="character.guild.inGuild">
                  {{ guildName }}<template v-if="character.guild.rank !== null">
                    · {{ guildRankLabel(character.guild.rank) }}
                  </template>
                </template>
                <template v-else>
                  Nicht in der Gilde
                </template>
              </dd>
            </div>
            <div class="character-page__detail">
              <dt>Hauptberufe</dt>
              <dd>
                <ul
                  v-if="primaries.length"
                  class="character-page__professions"
                >
                  <li
                    v-for="profession in primaries"
                    :key="profession.id"
                  >
                    {{ profession.name }} <strong>{{ profession.skill }}</strong><span v-if="profession.maxSkill"> / {{ profession.maxSkill }}</span>
                  </li>
                </ul>
                <template v-else>
                  Keine Angaben
                </template>
              </dd>
            </div>
            <div class="character-page__detail">
              <dt>Sekundärberufe</dt>
              <dd>
                <ul
                  v-if="secondaries.length"
                  class="character-page__professions"
                >
                  <li
                    v-for="profession in secondaries"
                    :key="profession.id"
                  >
                    {{ profession.name }} <strong>{{ profession.skill }}</strong><span v-if="profession.maxSkill"> / {{ profession.maxSkill }}</span>
                  </li>
                </ul>
                <template v-else>
                  Keine Angaben
                </template>
              </dd>
            </div>
            <div class="character-page__detail">
              <dt>Regelsatz</dt>
              <dd>{{ character.realm }}</dd>
            </div>
            <div class="character-page__detail">
              <dt>Fraktion</dt>
              <dd>{{ factionLabel }}</dd>
            </div>
            <div class="character-page__detail">
              <dt>Zuletzt aktualisiert</dt>
              <dd><time :datetime="character.updatedAt">{{ formatDateTime(character.updatedAt) }}</time></dd>
            </div>
          </dl>
          <p
            v-if="sourceNote"
            class="character-page__source-note"
          >
            {{ sourceNote }}
          </p>
        </div>

        <section aria-labelledby="character-dungeons">
          <h2
            id="character-dungeons"
            class="character-page__title"
          >
            Passende Dungeons
          </h2>
          <ul
            v-if="fittingDungeons.length"
            class="character-page__dungeons"
            role="list"
          >
            <li
              v-for="dungeon in fittingDungeons"
              :key="dungeon.slug"
              class="character-page__dungeon"
            >
              <span>{{ dungeon.name }}</span>
              <span class="character-page__dungeon-range">{{ formatRange(dungeon.levelRange.min, dungeon.levelRange.max) }}</span>
            </li>
          </ul>
          <p
            v-else
            class="character-page__muted"
          >
            Für diese Stufe ist gerade kein Dungeon empfohlen.
          </p>
        </section>
      </div>

      <section
        v-if="data.otherCharacters.length"
        aria-labelledby="character-others"
      >
        <h2
          id="character-others"
          class="character-page__title"
        >
          Weitere Charaktere von {{ data.member.displayName }}
        </h2>
        <ul
          class="character-page__others"
          role="list"
        >
          <li
            v-for="other in data.otherCharacters"
            :key="other.id"
          >
            <CharacterCard :character="other" />
          </li>
        </ul>
      </section>
    </template>
  </div>
</template>

<style scoped lang="scss">
.character-page {
  display: flex;
  flex-direction: column;
  gap: var(--space-10);
  padding-block: var(--space-10) 0;

  &__back {
    align-self: flex-start;
  }

  &__hero {
    display: grid;
    gap: var(--space-6);
    align-items: end;

    &--portrait {
      @include mq('md') {
        grid-template-columns: 1fr minmax(16rem, 26rem);
      }
    }
  }

  &__portrait {
    margin: 0;
    overflow: hidden;
    border-radius: var(--radius-lg);

    &--main {
      max-height: 26rem;
      background: radial-gradient(ellipse at 50% 70%, var(--color-surface-raised), transparent 70%);
    }

    &--inset {
      border: 1px solid var(--color-border);
    }
  }

  &__portrait-image {
    display: block;
    width: 100%;
    height: 100%;
    max-height: 26rem;
    object-fit: contain;
    object-position: center bottom;
  }

  &__source-note {
    margin-top: var(--space-3);
    font-size: var(--text-xs);
    color: var(--color-text-subtle);
  }

  &__header {
    display: flex;
    flex-direction: column;
    gap: var(--space-2);
    padding-left: var(--space-6);
    border-left: 3px solid var(--class-color);
  }

  &__kind {
    font-size: var(--text-sm);
    color: var(--color-text-muted);
  }

  &__name {
    font-family: var(--font-serif);
    font-size: var(--text-3xl);
    font-style: italic;
    font-weight: var(--font-weight-semibold);
    letter-spacing: 0;
  }

  &__summary {
    font-size: var(--text-md);
    color: var(--class-color);
  }

  &__layout {
    display: grid;
    gap: var(--space-12);

    @include mq('lg') {
      grid-template-columns: 1fr 1fr;
    }
  }

  &__details {
    margin: 0;
    border-top: 1px solid var(--color-border);
  }

  &__detail {
    display: grid;
    grid-template-columns: 11rem 1fr;
    gap: var(--space-4);
    align-items: center;
    padding: var(--space-3) 0;
    border-bottom: 1px solid var(--color-border);

    dt {
      font-size: var(--text-sm);
      color: var(--color-text-muted);
    }

    dd {
      margin: 0;
      color: var(--color-text);
    }
  }

  &__roles {
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-3);
  }

  &__professions {
    display: grid;
    gap: 2px;
    padding: 0;
    margin: 0;
    list-style: none;

    strong { color: var(--color-text); }
  }

  &__title {
    margin-bottom: var(--space-5);
    font-size: var(--text-xl);
  }

  &__dungeons {
    border-top: 1px solid var(--color-border);
  }

  &__dungeon {
    display: flex;
    justify-content: space-between;
    padding: var(--space-3) 0;
    border-bottom: 1px solid var(--color-border);
  }

  &__dungeon-range {
    font-size: var(--text-sm);
    color: var(--color-text-muted);
    font-variant-numeric: tabular-nums;
  }

  &__muted {
    color: var(--color-text-muted);
  }

  &__others {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(17rem, 1fr));
    gap: var(--space-4);
  }
}
</style>
