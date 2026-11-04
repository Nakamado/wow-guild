<script setup lang="ts">
/**
 * Modaler Dialog auf Basis des nativen <dialog>-Elements:
 * Fokus-Trap, Escape-Taste und Top-Layer bringt der Browser mit.
 */
const open = defineModel<boolean>('open', { default: false })

const props = withDefaults(
  defineProps<{
    title: string
    description?: string
    /** Schließen per Klick auf den Hintergrund erlauben */
    dismissible?: boolean
    size?: 'sm' | 'md' | 'lg'
  }>(),
  { description: undefined, dismissible: true, size: 'md' },
)

const dialogRef = ref<HTMLDialogElement | null>(null)
const titleId = useId()
const descriptionId = useId()

watch(
  open,
  (isOpen) => {
    const dialog = dialogRef.value
    if (!dialog) return
    if (isOpen && !dialog.open) dialog.showModal()
    if (!isOpen && dialog.open) dialog.close()
  },
  { flush: 'post' },
)

onMounted(() => {
  if (open.value) dialogRef.value?.showModal()
})

function close() {
  open.value = false
}

function onCancel(event: Event) {
  if (!props.dismissible) event.preventDefault()
}

function onBackdropClick(event: MouseEvent) {
  if (props.dismissible && event.target === dialogRef.value) close()
}
</script>

<template>
  <dialog
    ref="dialogRef"
    class="base-dialog"
    :class="`base-dialog--${size}`"
    :aria-labelledby="titleId"
    :aria-describedby="description ? descriptionId : undefined"
    @close="close"
    @cancel="onCancel"
    @click="onBackdropClick"
  >
    <div class="base-dialog__panel">
      <header class="base-dialog__header">
        <h2
          :id="titleId"
          class="base-dialog__title"
        >
          {{ title }}
        </h2>
        <button
          v-if="dismissible"
          type="button"
          class="base-dialog__close"
          aria-label="Dialog schließen"
          @click="close"
        >
          <BaseIcon name="close" />
        </button>
      </header>
      <p
        v-if="description"
        :id="descriptionId"
        class="base-dialog__description"
      >
        {{ description }}
      </p>
      <div class="base-dialog__body">
        <slot />
      </div>
      <footer
        v-if="$slots.actions"
        class="base-dialog__actions"
      >
        <slot
          name="actions"
          :close="close"
        />
      </footer>
    </div>
  </dialog>
</template>

<style scoped lang="scss">
.base-dialog {
  width: min(100% - 2 * var(--space-4), var(--dialog-width, 32rem));
  max-height: min(90dvh, 48rem);
  padding: 0;
  margin: auto;
  color: var(--color-text);
  background: transparent;
  border: 0;

  &::backdrop {
    background: var(--color-overlay);
    backdrop-filter: blur(4px);
  }

  &--sm {
    --dialog-width: 24rem;
  }

  &--lg {
    --dialog-width: 44rem;
  }

  &__panel {
    position: relative;
    display: flex;
    flex-direction: column;
    gap: var(--space-4);
    padding: var(--space-8);

    @include card-surface;
    @include ornament-border(20px);
  }

  &__header {
    display: flex;
    gap: var(--space-4);
    align-items: flex-start;
    justify-content: space-between;
  }

  &__title {
    font-size: var(--text-xl);
  }

  &__close {
    display: inline-grid;
    place-items: center;
    width: 2.5rem;
    height: 2.5rem;
    margin: calc(-1 * var(--space-2)) calc(-1 * var(--space-2)) 0 0;
    color: var(--color-text-muted);
    border-radius: var(--radius-pill);
    transition: color var(--duration-fast) var(--ease-out), background var(--duration-fast);

    &:hover {
      color: var(--color-frost);
      background: rgb(150 190 255 / 10%);
    }
  }

  &__description {
    color: var(--color-text-muted);
  }

  &__actions {
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-3);
    justify-content: flex-end;
    padding-top: var(--space-2);
  }

  @include motion-safe {
    &[open] {
      animation: base-dialog-in var(--duration-slow) var(--ease-out);
    }
  }
}

@keyframes base-dialog-in {
  from {
    opacity: 0;
    transform: translateY(8px) scale(0.98);
  }
}
</style>
