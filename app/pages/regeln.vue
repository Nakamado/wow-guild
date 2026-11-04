<script setup lang="ts">
import { rulesContent } from '~~/content/rules'

useSeoMeta({
  title: 'Gildenregeln',
  description: rulesContent.intro,
})
</script>

<template>
  <div class="rules-page">
    <PageHeader
      title="Gildenregeln"
      :lead="rulesContent.intro"
      narrow
    />

    <div class="rules-page__body container container--narrow">
      <div
        v-if="rulesContent.isExample"
        class="rules-page__example"
        role="note"
      >
        <BaseIcon
          name="info"
          class="rules-page__example-icon"
        />
        <p>
          <strong>Beispielregeln.</strong> Die offiziellen Regeln legt Miinyu mit der Gildenleitung fest – bis dahin
          zeigen wir hier einen Vorschlag.
        </p>
      </div>

      <nav
        class="rules-page__toc"
        aria-label="Abschnitte"
      >
        <a
          v-for="section in rulesContent.sections"
          :key="section.id"
          :href="`#${section.id}`"
          class="rules-page__toc-link"
        >
          {{ section.title }}
        </a>
      </nav>

      <section
        v-for="(section, sectionIndex) in rulesContent.sections"
        :id="section.id"
        :key="section.id"
        class="rules-page__section"
        :aria-labelledby="`${section.id}-title`"
      >
        <h2
          :id="`${section.id}-title`"
          class="rules-page__title"
        >
          {{ section.title }}
        </h2>
        <ol class="rules-page__rules">
          <li
            v-for="(rule, ruleIndex) in section.rules"
            :key="ruleIndex"
            class="rules-page__rule"
          >
            <span
              class="rules-page__number"
              aria-hidden="true"
            >{{ sectionIndex + 1 }}.{{ ruleIndex + 1 }}</span>
            <span>{{ rule }}</span>
          </li>
        </ol>
      </section>

      <p class="rules-page__updated">
        Stand: <time :datetime="rulesContent.updatedAt">{{ formatDate(rulesContent.updatedAt) }}</time>
      </p>
    </div>
  </div>
</template>

<style scoped lang="scss">
.rules-page {
  &__body {
    display: flex;
    flex-direction: column;
    gap: var(--space-12);
  }

  &__example {
    display: flex;
    gap: var(--space-3);
    padding: var(--space-4) var(--space-5);
    font-size: var(--text-sm);
    color: var(--color-text-muted);
    background: rgb(245 183 104 / 8%);
    border: 1px solid rgb(245 183 104 / 30%);
    border-radius: var(--radius-md);

    strong {
      color: var(--color-lantern);
    }
  }

  &__example-icon {
    margin-top: 2px;
    color: var(--color-lantern);
  }

  &__toc {
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-2) var(--space-5);
    font-size: var(--text-sm);
  }

  &__toc-link {
    color: var(--color-text-muted);

    &:hover {
      color: var(--color-frost);
    }
  }

  &__section {
    scroll-margin-top: calc(var(--header-height) + var(--space-6));
  }

  &__title {
    margin-bottom: var(--space-5);
    font-size: var(--text-xl);
  }

  &__rules {
    display: flex;
    flex-direction: column;
    gap: var(--space-4);
    padding: 0;
    list-style: none;
  }

  &__rule {
    display: grid;
    grid-template-columns: 3rem 1fr;
    gap: var(--space-3);
    font-size: var(--text-md);
    color: var(--color-text-muted);
  }

  &__number {
    padding-top: 0.15em;
    font-family: var(--font-serif);
    font-style: italic;
    color: var(--color-accent);
    font-variant-numeric: tabular-nums;
  }

  &__updated {
    font-size: var(--text-sm);
    color: var(--color-text-subtle);
  }
}
</style>
