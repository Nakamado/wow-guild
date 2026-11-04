<script setup lang="ts">
/**
 * Interne Übersicht des Designsystems (nicht verlinkt, noindex).
 * Dient zur visuellen Prüfung von Tokens und Basiskomponenten.
 */
useSeoMeta({ title: 'Styleguide', robots: 'noindex, nofollow' })

const dialogOpen = ref(false)
const loading = ref(false)

const colors = [
  'bg', 'surface', 'surface-raised', 'accent', 'accent-strong', 'frost', 'blossom', 'lantern',
  'success', 'warning', 'danger', 'live',
]
const classes = ['warrior', 'paladin', 'hunter', 'rogue', 'priest', 'shaman', 'mage', 'warlock', 'druid']

function simulateLoading() {
  loading.value = true
  setTimeout(() => (loading.value = false), 1500)
}
</script>

<template>
  <div class="styleguide">
    <PageHeader
      title="Styleguide"
      eyebrow="Designsystem"
      lead="Tokens und Basiskomponenten im Überblick. Diese Seite ist nur für die Entwicklung gedacht."
    />

    <div class="styleguide__body container">
      <section
        class="styleguide__section"
        aria-labelledby="sg-colors"
      >
        <h2
          id="sg-colors"
          class="styleguide__title"
        >
          Farben
        </h2>
        <ul
          class="styleguide__swatches"
          role="list"
        >
          <li
            v-for="color in colors"
            :key="color"
            class="styleguide__swatch"
          >
            <span
              class="styleguide__chip"
              :style="{ background: `var(--color-${color})` }"
            />
            <code>--color-{{ color }}</code>
          </li>
        </ul>
        <h3 class="styleguide__subtitle">
          Klassenfarben
        </h3>
        <ul
          class="styleguide__swatches"
          role="list"
        >
          <li
            v-for="slug in classes"
            :key="slug"
            class="styleguide__swatch"
          >
            <span
              class="styleguide__chip"
              :style="{ background: `var(--color-class-${slug})` }"
            />
            <code>{{ slug }}</code>
          </li>
        </ul>
      </section>

      <section
        class="styleguide__section"
        aria-labelledby="sg-type"
      >
        <h2
          id="sg-type"
          class="styleguide__title"
        >
          Typografie
        </h2>
        <p class="styleguide__display">
          Cinzel · Display
        </p>
        <p class="styleguide__serif">
          Cormorant Garamond · Akzente
        </p>
        <p>Inter · Fließtext. Gemeinsam durch Azeroth – entspannt, hilfsbereit und mit viel Herz.</p>
      </section>

      <section
        class="styleguide__section"
        aria-labelledby="sg-buttons"
      >
        <h2
          id="sg-buttons"
          class="styleguide__title"
        >
          Buttons
        </h2>
        <div class="styleguide__row">
          <BaseButton icon-left="chat">
            Primary
          </BaseButton>
          <BaseButton variant="secondary">
            Secondary
          </BaseButton>
          <BaseButton variant="ghost">
            Ghost
          </BaseButton>
          <BaseButton
            variant="lantern"
            icon-right="arrowRight"
          >
            Lantern
          </BaseButton>
          <BaseButton
            :loading="loading"
            @click="simulateLoading"
          >
            Laden simulieren
          </BaseButton>
          <BaseButton disabled>
            Deaktiviert
          </BaseButton>
        </div>
        <div class="styleguide__row">
          <BaseButton size="sm">
            Klein
          </BaseButton>
          <BaseButton>Mittel</BaseButton>
          <BaseButton size="lg">
            Groß
          </BaseButton>
        </div>
      </section>

      <section
        class="styleguide__section"
        aria-labelledby="sg-cards"
      >
        <h2
          id="sg-cards"
          class="styleguide__title"
        >
          Cards
        </h2>
        <div class="styleguide__grid">
          <BaseCard>
            <template #header>
              <h3>Default</h3>
            </template>
            Ruhige Kartenfläche für Dashboard-Inhalte.
          </BaseCard>
          <BaseCard variant="ornate">
            <template #header>
              <h3>Ornate</h3>
            </template>
            Mit feinen Frost-Ornamenten an den Ecken.
            <template #footer>
              <BaseButton
                size="sm"
                variant="secondary"
              >
                Aktion
              </BaseButton>
            </template>
          </BaseCard>
          <BaseCard variant="interactive">
            <template #header>
              <h3>Interactive</h3>
            </template>
            Mit Hover- und Fokuszustand.
          </BaseCard>
        </div>
      </section>

      <section
        class="styleguide__section"
        aria-labelledby="sg-states"
      >
        <h2
          id="sg-states"
          class="styleguide__title"
        >
          Zustände
        </h2>
        <div class="styleguide__grid">
          <LoadingSkeleton variant="card" />
          <LoadingSkeleton />
          <EmptyState
            title="Noch keine Gruppen"
            description="Für diesen Dungeon ist gerade nichts geplant."
          >
            <BaseButton size="sm">
              Gruppe erstellen
            </BaseButton>
          </EmptyState>
        </div>
        <ErrorState />
      </section>

      <section
        class="styleguide__section"
        aria-labelledby="sg-dialog"
      >
        <h2
          id="sg-dialog"
          class="styleguide__title"
        >
          Dialog
        </h2>
        <div class="styleguide__row">
          <BaseButton
            variant="secondary"
            @click="dialogOpen = true"
          >
            Dialog öffnen
          </BaseButton>
        </div>
        <BaseDialog
          v-model:open="dialogOpen"
          title="Gruppe beitreten"
          description="Wähle Charakter und Rolle für diesen Run."
        >
          <p>Hier folgt in Phase 4 das Anmeldeformular.</p>
          <template #actions="{ close }">
            <BaseButton
              variant="ghost"
              @click="close"
            >
              Abbrechen
            </BaseButton>
            <BaseButton @click="close">
              Beitreten
            </BaseButton>
          </template>
        </BaseDialog>
      </section>
    </div>
  </div>
</template>

<style scoped lang="scss">
.styleguide {
  &__body {
    display: flex;
    flex-direction: column;
    gap: var(--space-16);
  }

  &__section {
    display: flex;
    flex-direction: column;
    gap: var(--space-6);
  }

  &__title {
    font-size: var(--text-xl);
  }

  &__subtitle {
    font-size: var(--text-lg);
  }

  &__swatches {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(11rem, 1fr));
    gap: var(--space-4);
  }

  &__swatch {
    display: flex;
    gap: var(--space-3);
    align-items: center;
    font-size: var(--text-sm);
  }

  &__chip {
    width: 2.5rem;
    height: 2.5rem;
    border: 1px solid var(--color-border-strong);
    border-radius: var(--radius-md);
  }

  &__display {
    font-family: var(--font-display);
    font-size: var(--text-2xl);
    color: var(--color-frost);
  }

  &__serif {
    font-family: var(--font-serif);
    font-size: var(--text-xl);
    font-style: italic;
    color: var(--color-accent);
  }

  &__row {
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-3);
    align-items: center;
  }

  &__grid {
    display: grid;
    gap: var(--space-6);

    @include mq('md') {
      grid-template-columns: repeat(3, 1fr);
    }
  }
}
</style>
