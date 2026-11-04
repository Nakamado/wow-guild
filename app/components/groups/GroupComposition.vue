<script setup lang="ts">
import { getRole } from '#shared/data/roles'
import { computeComposition } from '#shared/domain/composition'
import type { GroupRun, RoleId } from '#shared/types'
import type { IconName } from '../base/BaseIcon.vue'

const props = withDefaults(
  defineProps<{
    run: Pick<GroupRun, 'capacity' | 'participants'>
    variant?: 'compact' | 'full'
  }>(),
  { variant: 'compact' },
)

const icons: Record<RoleId, IconName> = { tank: 'shield', healer: 'heal', dps: 'swords' }
const composition = computed(() => computeComposition(props.run))
const slots = computed(() => composition.value.slots.filter(slot => slot.capacity > 0 || slot.filled > 0))
</script>

<template>
  <ul
    class="group-composition"
    :class="`group-composition--${variant}`"
    role="list"
    aria-label="Besetzung"
  >
    <li
      v-for="slot in slots"
      :key="slot.role"
      class="group-composition__role"
      :class="[`group-composition__role--${slot.role}`, { 'group-composition__role--full': slot.open === 0 }]"
    >
      <BaseIcon
        :name="icons[slot.role]"
        :size="variant === 'full' ? 18 : 14"
      />
      <span class="group-composition__label">{{ getRole(slot.role).short }}</span>
      <span class="group-composition__count">{{ slot.filled }}/{{ slot.capacity }}</span>
      <span
        v-if="variant === 'full'"
        class="group-composition__pips"
        aria-hidden="true"
      >
        <span
          v-for="index in slot.capacity"
          :key="index"
          class="group-composition__pip"
          :class="{ 'group-composition__pip--filled': index <= slot.filled }"
        />
      </span>
    </li>
  </ul>
</template>

<style scoped lang="scss">
.group-composition {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-2) var(--space-4);

  &__role {
    --role-color: var(--color-text-muted);

    display: inline-flex;
    gap: var(--space-1);
    align-items: center;
    font-size: var(--text-sm);
    color: var(--role-color);

    &--tank { --role-color: #9cc3ff; }
    &--healer { --role-color: #8fe3b6; }
    &--dps { --role-color: #ffb3a3; }
  }

  &__label {
    color: var(--color-text-muted);
  }

  &__count {
    font-weight: var(--font-weight-semibold);
    color: var(--color-text);
    font-variant-numeric: tabular-nums;
  }

  &__role--full &__count {
    color: var(--color-text-subtle);
  }

  &--full {
    flex-direction: column;
    gap: var(--space-3);
  }

  &--full &__role {
    display: grid;
    grid-template-columns: auto 4rem 3rem 1fr;
    gap: var(--space-3);
    font-size: var(--text-base);
  }

  &__pips {
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-1);
  }

  &__pip {
    width: 0.875rem;
    height: 0.875rem;
    border: 1.5px solid var(--role-color);
    border-radius: 50%;
    opacity: 0.6;

    &--filled {
      background: var(--role-color);
      opacity: 1;
    }
  }
}
</style>
