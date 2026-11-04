<script setup lang="ts">
import { findClass } from '#shared/data/classes'

const props = defineProps<{ classId: string }>()
const gameClass = computed(() => findClass(props.classId))
</script>

<template>
  <span
    class="class-badge"
    :style="{ '--class-color': `var(--color-class-${classId}, var(--color-class-unknown))` }"
  >
    <span
      class="class-badge__swatch"
      aria-hidden="true"
    />
    {{ gameClass?.name ?? 'Unbekannte Klasse' }}
  </span>
</template>

<style scoped lang="scss">
.class-badge {
  display: inline-flex;
  gap: var(--space-2);
  align-items: center;
  padding: 0.125rem var(--space-2) 0.125rem var(--space-1);
  font-size: var(--text-xs);
  font-weight: var(--font-weight-semibold);
  line-height: 1.4;
  color: var(--class-color);
  white-space: nowrap;
  background: color-mix(in srgb, var(--class-color) 10%, transparent);
  border: 1px solid color-mix(in srgb, var(--class-color) 35%, transparent);
  border-radius: var(--radius-sm);

  &__swatch {
    width: 0.5rem;
    height: 0.5rem;
    background: var(--class-color);
    border-radius: 2px;
    transform: rotate(45deg);
  }
}
</style>
