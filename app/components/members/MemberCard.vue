<script setup lang="ts">
import type { Character, CommunityMember } from '#shared/types'

const props = defineProps<{ member: CommunityMember & { characters: Character[] } }>()

const main = computed(() => props.member.characters.find(character => character.isMain) ?? props.member.characters[0] ?? null)
const alts = computed(() => props.member.characters.filter(character => character !== main.value))
</script>

<template>
  <article class="member-card">
    <header class="member-card__header">
      <MemberAvatar
        :name="member.displayName"
        :src="member.avatarUrl"
      />
      <div class="member-card__identity">
        <h2 class="member-card__name">
          <NuxtLink
            :to="`/mitglieder/${member.id}`"
            class="member-card__link"
          >{{ member.displayName }}</NuxtLink>
        </h2>
        <p
          v-if="member.isAdmin"
          class="member-card__tag"
        >
          Gildenleitung
        </p>
      </div>
    </header>

    <div
      v-if="main"
      class="member-card__main"
    >
      <p class="member-card__character">
        <span class="member-card__character-name">{{ main.name }}</span>
        <span class="member-card__level">Stufe {{ main.level }}</span>
      </p>
      <div class="member-card__badges">
        <ClassBadge :class-id="main.classId" />
        <RoleBadge
          v-for="role in main.roles"
          :key="role"
          :role="role"
        />
      </div>
    </div>
    <p
      v-else
      class="member-card__empty"
    >
      Noch kein Charakter hinterlegt
    </p>

    <p
      v-if="alts.length"
      class="member-card__alts"
    >
      <span class="visually-hidden">Twinks:</span>
      <span
        v-for="alt in alts"
        :key="alt.id"
        class="member-card__alt"
        :style="{ '--class-color': `var(--color-class-${alt.classId})` }"
      >
        {{ alt.name }} <span class="member-card__alt-level">{{ alt.level }}</span>
      </span>
    </p>
  </article>
</template>

<style scoped lang="scss">
.member-card {
  position: relative;
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
  height: 100%;
  padding: var(--space-5);
  transition: border-color var(--duration-base) var(--ease-out);

  @include card-surface;

  &:hover,
  &:focus-within {
    border-color: var(--color-border-strong);
  }

  &__header {
    display: flex;
    gap: var(--space-3);
    align-items: center;
  }

  &__identity {
    min-width: 0;
  }

  &__name {
    font-family: var(--font-sans);
    font-size: var(--text-base);
    font-weight: var(--font-weight-semibold);
    letter-spacing: 0;
  }

  // Ganze Karte klickbar, Link bleibt semantisch im Namen
  &__link {
    color: var(--color-text);
    text-decoration: none;

    &::after {
      position: absolute;
      inset: 0;
      content: '';
      border-radius: var(--radius-lg);
    }

    &:hover {
      color: var(--color-frost);
    }
  }

  &__tag {
    font-size: var(--text-xs);
    color: var(--color-accent);
  }

  &__main {
    display: flex;
    flex-direction: column;
    gap: var(--space-2);
  }

  &__character {
    display: flex;
    gap: var(--space-2);
    align-items: baseline;
  }

  &__character-name {
    font-family: var(--font-serif);
    font-size: var(--text-lg);
    font-style: italic;
    color: var(--color-frost);
  }

  &__level {
    font-size: var(--text-sm);
    color: var(--color-text-muted);
  }

  &__badges {
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-3);
    align-items: center;
  }

  &__empty {
    font-size: var(--text-sm);
    font-style: italic;
    color: var(--color-text-subtle);
  }

  &__alts {
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-2);
    padding-top: var(--space-3);
    margin-top: auto;
    font-size: var(--text-xs);
    border-top: 1px solid var(--color-border);
  }

  &__alt {
    color: var(--class-color);
  }

  &__alt-level {
    color: var(--color-text-subtle);
  }
}
</style>
