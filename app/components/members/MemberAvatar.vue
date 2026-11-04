<script setup lang="ts">
const props = withDefaults(
  defineProps<{
    name: string
    src?: string | null
    size?: 'sm' | 'md' | 'lg'
  }>(),
  { src: null, size: 'md' },
)

const initial = computed(() => props.name.trim().charAt(0).toLocaleUpperCase('de-DE') || '?')
const sizes = { sm: 32, md: 44, lg: 88 }
</script>

<template>
  <span
    class="member-avatar"
    :class="`member-avatar--${size}`"
  >
    <NuxtImg
      v-if="src"
      :src="src"
      :alt="`Avatar von ${name}`"
      :width="sizes[size]"
      :height="sizes[size]"
      class="member-avatar__image"
      loading="lazy"
    />
    <span
      v-else
      class="member-avatar__initial"
      aria-hidden="true"
    >{{ initial }}</span>
  </span>
</template>

<style scoped lang="scss">
.member-avatar {
  --avatar-size: 2.75rem;

  display: inline-grid;
  flex-shrink: 0;
  place-items: center;
  width: var(--avatar-size);
  height: var(--avatar-size);
  overflow: hidden;
  background: radial-gradient(circle at 30% 25%, #2a3d72, var(--color-surface-raised));
  border: 1px solid var(--color-border-strong);
  border-radius: 50%;

  &--sm { --avatar-size: 2rem; }
  &--lg { --avatar-size: 5.5rem; }

  &__image {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  &__initial {
    font-family: var(--font-display);
    font-size: calc(var(--avatar-size) * 0.42);
    color: var(--color-frost);
  }
}
</style>
