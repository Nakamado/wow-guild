<script setup lang="ts">
import type { NuxtError } from '#app'

const props = defineProps<{ error: NuxtError }>()

const isNotFound = computed(() => props.error.statusCode === 404)

useSeoMeta({ title: isNotFound.value ? 'Seite nicht gefunden' : 'Fehler', robots: 'noindex' })

function goHome() {
  clearError({ redirect: '/' })
}
</script>

<template>
  <NuxtLayout>
    <div class="error-page container container--narrow">
      <p class="error-page__code">
        {{ error.statusCode }}
      </p>
      <h1 class="error-page__title">
        {{ isNotFound ? 'Dieser Pfad führt ins Nichts' : 'Ein Zauber ist fehlgeschlagen' }}
      </h1>
      <p class="error-page__text">
        {{
          isNotFound
            ? 'Die gesuchte Seite existiert nicht (mehr). Vielleicht hilft dir die Navigation weiter.'
            : 'Beim Laden der Seite ist ein unerwarteter Fehler aufgetreten. Bitte versuche es später erneut.'
        }}
      </p>
      <BaseButton
        icon-right="arrowRight"
        @click="goHome"
      >
        Zur Startseite
      </BaseButton>
    </div>
  </NuxtLayout>
</template>

<style scoped lang="scss">
.error-page {
  display: flex;
  flex-direction: column;
  gap: var(--space-5);
  align-items: center;
  padding-block: var(--space-24);
  text-align: center;

  &__code {
    font-family: var(--font-display);
    font-size: var(--text-hero);
    line-height: 1;
    color: transparent;
    background: linear-gradient(180deg, var(--color-frost), var(--color-accent-strong));
    background-clip: text;
    filter: drop-shadow(0 0 24px var(--color-accent-glow));
  }

  &__title {
    font-size: var(--text-2xl);
  }

  &__text {
    max-width: 48ch;
    color: var(--color-text-muted);
  }
}
</style>
