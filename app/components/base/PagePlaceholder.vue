<script setup lang="ts">
/** Platzhalter für Seiten, die in einer späteren Phase umgesetzt werden. */
const props = defineProps<{
  title: string
  eyebrow?: string
  lead: string
  phase: number
}>()

useSeoMeta({ title: props.title, robots: 'noindex' })
</script>

<template>
  <div class="page-placeholder">
    <PageHeader
      :title="title"
      :eyebrow="eyebrow"
      :lead="lead"
    />
    <section class="container">
      <EmptyState
        icon="sparkle"
        :title="`Diese Seite entsteht in Phase ${phase}`"
        description="Das Fundament steht – Inhalte und Funktionen folgen im Laufe der Entwicklung."
        :heading-level="2"
      >
        <BaseButton
          to="/"
          variant="secondary"
          icon-right="arrowRight"
        >
          Zur Startseite
        </BaseButton>
      </EmptyState>
    </section>
  </div>
</template>
