<script setup lang="ts">
import { findRace } from '#shared/data/races'
import type { Character } from '#shared/types'

const props = defineProps<{ character: Character }>()
const race = computed(() => findRace(props.character.raceId))
</script>

<template>
  <article
    class="character-card"
    :style="{ '--class-color': `var(--color-class-${character.classId}, var(--color-class-unknown))` }"
  >
    <header class="character-card__header">
      <h3 class="character-card__name">
        <NuxtLink
          :to="`/charaktere/${character.id}`"
          class="character-card__link"
        >{{ character.name }}</NuxtLink>
      </h3>
      <span class="character-card__kind">{{ character.isMain ? 'Hauptcharakter' : 'Twink' }}</span>
    </header>
    <p class="character-card__line">
      Stufe {{ character.level }} {{ race?.name ?? 'Unbekanntes Volk' }}
    </p>
    <div class="character-card__badges">
      <ClassBadge :class-id="character.classId" />
      <RoleBadge
        v-for="role in character.roles"
        :key="role"
        :role="role"
      />
    </div>
  </article>
</template>

<style scoped lang="scss">
.character-card {
  position: relative;
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
  padding: var(--space-4) var(--space-5);
  border-left: 3px solid var(--class-color);

  @include card-surface;

  &:hover,
  &:focus-within {
    border-color: var(--color-border-strong);
    border-left-color: var(--class-color);
  }

  &__header {
    display: flex;
    gap: var(--space-3);
    align-items: baseline;
    justify-content: space-between;
  }

  &__name {
    font-family: var(--font-serif);
    font-size: var(--text-lg);
    font-style: italic;
    font-weight: var(--font-weight-semibold);
    letter-spacing: 0;
  }

  &__link {
    color: var(--color-frost);
    text-decoration: none;

    &::after {
      position: absolute;
      inset: 0;
      content: '';
    }
  }

  &__kind {
    font-size: var(--text-xs);
    color: var(--color-text-subtle);
  }

  &__line {
    font-size: var(--text-sm);
    color: var(--color-text-muted);
  }

  &__badges {
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-3);
    align-items: center;
  }
}
</style>
