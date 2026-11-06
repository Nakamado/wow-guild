<script setup lang="ts">
import type { GuildMilestone, MilestoneCategory } from '#shared/schemas/chronicle'

/**
 * Gilden-Chronik als vertikale Timeline (neueste oben).
 * Manuelle und automatische Einträge sehen gleich aus; die Quelle wird nicht angezeigt.
 */
const props = defineProps<{ milestones: GuildMilestone[] }>()

const categoryIcons: Record<MilestoneCategory, string> = {
  community: 'users',
  dungeon: 'swords',
  raid: 'shield',
  achievement: 'star',
  custom: 'sparkle',
}
const categoryLabels: Record<MilestoneCategory, string> = {
  community: 'Community',
  dungeon: 'Dungeon',
  raid: 'Raid',
  achievement: 'Erfolg',
  custom: 'Besonderes',
}

const hasDemo = computed(() => props.milestones.some(milestone => milestone.isDemo))

const dateFormat = new Intl.DateTimeFormat('de-DE', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Europe/Berlin' })

/** Kalendertage ohne Zeitzonen-Verschiebung formatieren */
function formatDay(value: string): string {
  const date = /^\d{4}-\d{2}-\d{2}$/.test(value) ? new Date(`${value}T12:00:00Z`) : new Date(value)
  return dateFormat.format(date)
}

function dateLabel(milestone: GuildMilestone): { text: string, iso: string } {
  if (milestone.occurredAt) return { text: formatDay(milestone.occurredAt), iso: milestone.occurredAt }
  // Kein echtes Ereignisdatum bekannt → ehrlich als Erkennungsdatum ausweisen
  const detected = milestone.detectedAt ?? ''
  return { text: detected ? `erkannt am ${formatDay(detected)}` : 'Datum unbekannt', iso: detected }
}
</script>

<template>
  <div class="guild-chronicle">
    <p
      v-if="hasDemo"
      class="guild-chronicle__demo"
    >
      <BaseIcon
        name="info"
        :size="18"
      />
      Beispieldaten: Diese Einträge sind fiktiv und zeigen nur, wie unsere Chronik aussehen wird.
    </p>

    <EmptyState
      v-if="!milestones.length"
      icon="sparkle"
      title="Unsere Geschichte beginnt gerade"
      description="Sobald wir die ersten Meilensteine erreicht haben, erscheinen sie hier."
    />

    <ol
      v-else
      class="guild-chronicle__list"
    >
      <li
        v-for="milestone in milestones"
        :key="milestone.id"
        class="guild-chronicle__entry"
        :class="[`guild-chronicle__entry--${milestone.category}`, { 'guild-chronicle__entry--highlight': milestone.highlight }]"
      >
        <span
          class="guild-chronicle__node"
          aria-hidden="true"
        >
          <BaseIcon
            :name="(milestone.icon ?? categoryIcons[milestone.category]) as never"
            :size="18"
          />
        </span>

        <article class="guild-chronicle__card">
          <header class="guild-chronicle__meta">
            <time
              class="guild-chronicle__date"
              :datetime="dateLabel(milestone).iso"
            >{{ dateLabel(milestone).text }}</time>
            <span class="guild-chronicle__category">{{ categoryLabels[milestone.category] }}</span>
            <span
              v-if="milestone.isDemo"
              class="guild-chronicle__badge"
            >Beispiel</span>
          </header>
          <h3 class="guild-chronicle__title">
            {{ milestone.title }}
          </h3>
          <p
            v-if="milestone.description"
            class="guild-chronicle__description"
          >
            {{ milestone.description }}
          </p>
          <img
            v-if="milestone.image"
            class="guild-chronicle__image"
            :src="milestone.image.src"
            :alt="milestone.image.alt"
            loading="lazy"
          >
        </article>
      </li>
    </ol>
  </div>
</template>

<style scoped lang="scss">
.guild-chronicle {
  --chronicle-line: 1.25rem; // Mitte der Linie (Abstand von links)
  --chronicle-color: var(--color-accent);

  display: flex;
  flex-direction: column;
  gap: var(--space-6);

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

  &__list {
    position: relative;
    display: flex;
    flex-direction: column;
    gap: var(--space-6);
    padding: 0;
    margin: 0;
    list-style: none;

    // Die durchgehende Zeitlinie
    &::before {
      position: absolute;
      top: var(--space-2);
      bottom: var(--space-2);
      left: calc(var(--chronicle-line) - 1px);
      width: 2px;
      content: '';
      background: linear-gradient(to bottom, var(--color-accent-glow), var(--color-border) 70%, transparent);
    }
  }

  &__entry {
    position: relative;
    display: grid;
    grid-template-columns: calc(var(--chronicle-line) * 2) 1fr;
    gap: var(--space-4);
    align-items: start;

    &--community { --chronicle-color: var(--color-accent); }
    &--dungeon { --chronicle-color: var(--color-success); }
    &--raid { --chronicle-color: var(--color-lantern); }
    &--achievement { --chronicle-color: var(--color-blossom); }
    &--custom { --chronicle-color: var(--color-frost); }
  }

  &__node {
    position: relative;
    z-index: 1;
    display: grid;
    place-items: center;
    width: calc(var(--chronicle-line) * 2);
    height: calc(var(--chronicle-line) * 2);
    margin-top: var(--space-3);
    color: var(--chronicle-color);
    background: var(--color-bg);
    border: 1px solid var(--chronicle-color);
    border-radius: 50%;
    box-shadow: 0 0 0 4px var(--color-bg), 0 0 16px color-mix(in srgb, var(--chronicle-color) 35%, transparent);
  }

  &__card {
    display: flex;
    flex-direction: column;
    gap: var(--space-2);
    min-width: 0;
    padding: var(--space-4) var(--space-5);
    background: var(--color-surface);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-lg, var(--radius-md));
  }

  &__entry--highlight &__card {
    background: linear-gradient(135deg, color-mix(in srgb, var(--chronicle-color) 10%, var(--color-surface)), var(--color-surface) 60%);
    border-color: color-mix(in srgb, var(--chronicle-color) 45%, transparent);
  }

  &__meta {
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-2) var(--space-3);
    align-items: center;
    font-size: var(--text-xs);
  }

  &__date {
    font-weight: var(--font-weight-medium);
    color: var(--chronicle-color);
    letter-spacing: 0.04em;
    text-transform: uppercase;
  }

  &__category {
    color: var(--color-text-subtle);
  }

  &__badge {
    padding: 0 var(--space-2);
    color: var(--color-lantern);
    border: 1px solid rgb(245 183 104 / 40%);
    border-radius: var(--radius-pill);
  }

  &__title {
    font-family: var(--font-display);
    font-size: var(--text-lg);
    color: var(--color-text);
  }

  &__entry--highlight &__title {
    font-size: var(--text-xl);
  }

  &__description {
    color: var(--color-text-muted);
  }

  &__image {
    width: 100%;
    max-height: 22rem;
    margin-top: var(--space-2);
    object-fit: cover;
    border-radius: var(--radius-md);
  }

  @include mq('md') {
    --chronicle-line: 1.5rem;
  }
}
</style>
