<script setup lang="ts">
import { getRole } from '#shared/data/roles'
import type { RoleId } from '#shared/types'
import type { IconName } from '../base/BaseIcon.vue'

const props = defineProps<{ role: RoleId }>()

const icons: Record<RoleId, IconName> = { tank: 'shield', healer: 'heal', dps: 'swords' }
const definition = computed(() => getRole(props.role))
</script>

<template>
  <span
    class="role-badge"
    :class="`role-badge--${role}`"
    :title="definition.name"
  >
    <BaseIcon
      :name="icons[role]"
      :size="14"
    />
    {{ definition.short }}
  </span>
</template>

<style scoped lang="scss">
.role-badge {
  --role-color: var(--color-text-muted);

  display: inline-flex;
  gap: var(--space-1);
  align-items: center;
  font-size: var(--text-xs);
  font-weight: var(--font-weight-medium);
  color: var(--role-color);
  white-space: nowrap;

  &--tank { --role-color: #9cc3ff; }
  &--healer { --role-color: #8fe3b6; }
  &--dps { --role-color: #ffb3a3; }
}
</style>
