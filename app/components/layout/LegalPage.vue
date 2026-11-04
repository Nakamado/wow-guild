<script setup lang="ts">
const props = defineProps<{ title: string }>()

useSeoMeta({ title: props.title, robots: 'noindex' })
</script>

<template>
  <div class="legal-page">
    <PageHeader
      :title="title"
      eyebrow="Rechtliches"
      narrow
    />
    <div class="container container--narrow">
      <div
        v-if="$slots.notice"
        class="legal-page__notice"
        role="note"
      >
        <BaseIcon
          name="info"
          class="legal-page__notice-icon"
        />
        <p><slot name="notice" /></p>
      </div>
      <article class="legal-page__content">
        <slot />
      </article>
    </div>
  </div>
</template>

<style scoped lang="scss">
.legal-page {
  &__notice {
    display: flex;
    gap: var(--space-3);
    padding: var(--space-4) var(--space-5);
    margin-bottom: var(--space-10);
    font-size: var(--text-sm);
    color: var(--color-text-muted);
    background: rgb(245 183 104 / 8%);
    border: 1px solid rgb(245 183 104 / 30%);
    border-radius: var(--radius-md);
  }

  &__notice-icon {
    margin-top: 2px;
    color: var(--color-lantern);
  }

  &__content {
    display: flex;
    flex-direction: column;
    gap: var(--space-4);
    color: var(--color-text-muted);

    // Inhalte stammen aus Fließtext – Elementselektoren nur innerhalb dieses Blocks.
    :deep(h2) {
      margin-top: var(--space-6);
      font-size: var(--text-lg);
    }

    :deep(h2:first-child) {
      margin-top: 0;
    }

    :deep(h2 small) {
      font-family: var(--font-serif);
      font-style: italic;
      font-weight: var(--font-weight-regular);
      color: var(--color-text-subtle);
    }

    :deep(mark) {
      padding: 0 0.25em;
      color: var(--color-lantern);
      background: rgb(245 183 104 / 12%);
      border-radius: var(--radius-sm);
    }
  }
}
</style>
