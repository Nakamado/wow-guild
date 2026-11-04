<script setup lang="ts">
import { gameClasses } from '#shared/data/classes'
import type { GuildStats } from '#shared/types'

const props = defineProps<{ stats: GuildStats }>()

const facts = computed(() => [
  { label: 'Mitglieder', value: props.stats.memberCount },
  { label: 'Charaktere', value: props.stats.characterCount },
  { label: 'Durchschnittsstufe', value: props.stats.averageLevel.toLocaleString('de-DE') },
  { label: 'auf Stufe 60', value: props.stats.maxLevelCount },
  { label: 'geplante Runs', value: props.stats.upcomingRunCount },
])

const distribution = computed(() => {
  const max = Math.max(1, ...Object.values(props.stats.classDistribution))
  return gameClasses.map((gameClass) => {
    const count = props.stats.classDistribution[gameClass.id] ?? 0
    return { id: gameClass.id, name: gameClass.name, count, share: count / max }
  })
})
</script>

<template>
  <div class="guild-stats">
    <dl class="guild-stats__facts">
      <div
        v-for="fact in facts"
        :key="fact.label"
        class="guild-stats__fact"
      >
        <dd class="guild-stats__value">
          {{ fact.value }}
        </dd>
        <dt class="guild-stats__label">
          {{ fact.label }}
        </dt>
      </div>
    </dl>

    <figure class="guild-stats__classes">
      <figcaption class="guild-stats__caption">
        Charaktere nach Klasse
      </figcaption>
      <ul
        class="guild-stats__bars"
        role="list"
      >
        <li
          v-for="entry in distribution"
          :key="entry.id"
          class="guild-stats__bar"
          :style="{ '--class-color': `var(--color-class-${entry.id})`, '--share': entry.share }"
        >
          <span class="guild-stats__bar-name">{{ entry.name }}</span>
          <span
            class="guild-stats__bar-track"
            aria-hidden="true"
          >
            <span class="guild-stats__bar-fill" />
          </span>
          <span class="guild-stats__bar-count">{{ entry.count }}</span>
        </li>
      </ul>
    </figure>
  </div>
</template>

<style scoped lang="scss">
.guild-stats {
  display: flex;
  flex-direction: column;
  gap: var(--space-8);

  &__facts {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(8.5rem, 1fr));
    gap: var(--space-5) var(--space-4);
    margin: 0;
  }

  &__fact {
    display: flex;
    flex-direction: column-reverse;
    gap: var(--space-1);
  }

  &__value {
    margin: 0;
    font-family: var(--font-display);
    font-size: var(--text-xl);
    line-height: 1;
    color: var(--color-frost);
  }

  &__label {
    font-size: var(--text-sm);
    color: var(--color-text-muted);
  }

  &__classes {
    display: flex;
    flex-direction: column;
    gap: var(--space-3);
    margin: 0;
  }

  &__caption {
    font-size: var(--text-sm);
    font-weight: var(--font-weight-semibold);
    color: var(--color-text);
  }

  &__bars {
    display: flex;
    flex-direction: column;
    gap: var(--space-2);
  }

  &__bar {
    display: grid;
    grid-template-columns: 7.5rem 1fr 2ch;
    gap: var(--space-3);
    align-items: center;
    font-size: var(--text-sm);
  }

  &__bar-name {
    color: var(--class-color);
  }

  &__bar-track {
    height: 0.5rem;
    overflow: hidden;
    background: rgb(150 190 255 / 7%);
    border-radius: var(--radius-pill);
  }

  &__bar-fill {
    display: block;
    width: calc(var(--share) * 100%);
    height: 100%;
    background: var(--class-color);
    border-radius: inherit;
  }

  &__bar-count {
    color: var(--color-text-muted);
    text-align: right;
    font-variant-numeric: tabular-nums;
  }
}
</style>
