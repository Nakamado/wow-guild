<script setup lang="ts">
import type { RouteLocationRaw } from 'vue-router'

defineProps<{ to: RouteLocationRaw }>()
</script>

<template>
  <NuxtLink
    :to="to"
    class="back-link"
  >
    <BaseIcon
      name="arrowLeft"
      :size="16"
    />
    <slot />
  </NuxtLink>
</template>

<style scoped lang="scss">
.back-link {
  display: inline-flex;
  gap: var(--space-2);
  align-items: center;
  font-size: var(--text-sm);
  color: var(--color-text-muted);
  text-decoration: none;

  &:hover {
    color: var(--color-frost);
  }
}
</style>
