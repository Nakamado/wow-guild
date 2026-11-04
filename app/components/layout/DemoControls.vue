<script setup lang="ts">
import type { DemoPersonaId } from '~~/data/demo/personas'

/** Sichtbar markierte Demo-Steuerung: Rolle wählen statt echtem Discord-Login. */
const { demo, setPersona, setSimulateLive } = useViewer()
const personaId = useId()
const liveId = useId()
const busy = ref(false)

async function onPersona(event: Event) {
  busy.value = true
  await setPersona((event.target as HTMLSelectElement).value as DemoPersonaId)
  busy.value = false
}

async function onLive(event: Event) {
  busy.value = true
  await setSimulateLive((event.target as HTMLInputElement).checked)
  busy.value = false
}
</script>

<template>
  <div
    v-if="demo"
    class="demo-controls"
    :aria-busy="busy || undefined"
  >
    <label
      :for="personaId"
      class="demo-controls__label"
    >Ansicht als</label>
    <select
      :id="personaId"
      class="demo-controls__select"
      :value="demo.persona ?? 'member'"
      @change="onPersona"
    >
      <option
        v-for="persona in demo.personas"
        :key="persona.id"
        :value="persona.id"
      >
        {{ persona.label }}
      </option>
    </select>
    <label
      :for="liveId"
      class="demo-controls__toggle"
    >
      <input
        :id="liveId"
        type="checkbox"
        class="demo-controls__checkbox"
        :checked="demo.simulateLive"
        @change="onLive"
      >
      Live simulieren
    </label>
  </div>
</template>

<style scoped lang="scss">
.demo-controls {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-2) var(--space-3);
  align-items: center;
  font-size: var(--text-xs);
  color: var(--color-text-muted);

  &__select {
    min-height: 1.75rem;
    padding: 0 var(--space-2);
    font-size: var(--text-xs);
    color: var(--color-text);
    background: var(--color-surface);
    border: 1px solid rgb(245 183 104 / 40%);
    border-radius: var(--radius-sm);

    @include focus-ring(2px);
  }

  &__toggle {
    display: inline-flex;
    gap: var(--space-1);
    align-items: center;
    cursor: pointer;
  }

  &__checkbox {
    accent-color: var(--color-lantern);
  }
}
</style>
