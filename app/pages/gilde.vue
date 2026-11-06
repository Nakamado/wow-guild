<script setup lang="ts">
import { guildContent } from '~~/content/guild'

const { guild } = useSiteConfig()

useSeoMeta({
  title: 'Die Gilde',
  description: guildContent.tagline,
})

const { data: guildData } = await useFetch('/api/guild', { key: 'guild' })
const { data: milestones } = await useFetch('/api/chronicle', { key: 'chronicle', default: () => [] })

const focus = [
  { title: 'PvE', text: guildContent.focus.pve },
  { title: 'Dungeons', text: guildContent.focus.dungeons },
  { title: 'Raids', text: guildContent.focus.raids },
]
</script>

<template>
  <div class="guild-page">
    <PageHeader
      title="Die Gilde"
      :lead="guildContent.tagline"
    >
      <BaseButton
        :href="guild.discordInvite"
        external
        icon-left="chat"
      >
        Discord beitreten
      </BaseButton>
    </PageHeader>

    <div class="guild-page__body container">
      <p
        v-if="guildContent.isDraft"
        class="guild-page__draft"
      >
        Entwurf: Diese Texte sind Platzhalter, bis die Gildenleitung eigene Formulierungen liefert.
      </p>

      <section
        class="guild-page__intro"
        aria-labelledby="guild-about"
      >
        <div class="guild-page__prose">
          <h2
            id="guild-about"
            class="guild-page__title"
          >
            Wer wir sind
          </h2>
          <p
            v-for="(paragraph, index) in guildContent.intro"
            :key="index"
          >
            {{ paragraph }}
          </p>
        </div>
        <dl class="guild-page__facts">
          <div class="guild-page__fact">
            <dt>Fraktion</dt>
            <dd>{{ guild.factionLabel }}</dd>
          </div>
          <div class="guild-page__fact">
            <dt>Regelsatz</dt>
            <dd>{{ guild.realm }}</dd>
          </div>
          <div class="guild-page__fact">
            <dt>Spiel</dt>
            <dd>World of Warcraft: Forever</dd>
          </div>
          <div class="guild-page__fact">
            <dt>Mitglied wird man</dt>
            <dd>über die Discord-Rolle „WoW Forever“</dd>
          </div>
        </dl>
      </section>

      <section aria-labelledby="guild-values">
        <h2
          id="guild-values"
          class="guild-page__title"
        >
          Was uns wichtig ist
        </h2>
        <ul
          class="guild-page__values"
          role="list"
        >
          <li
            v-for="value in guildContent.values"
            :key="value.title"
            class="guild-page__value"
          >
            <h3 class="guild-page__value-title">
              {{ value.title }}
            </h3>
            <p>{{ value.text }}</p>
          </li>
        </ul>
      </section>

      <section
        class="guild-page__split"
        aria-labelledby="guild-activities"
      >
        <div>
          <h2
            id="guild-activities"
            class="guild-page__title"
          >
            Was wir zusammen machen
          </h2>
          <ul
            class="guild-page__list"
            role="list"
          >
            <li
              v-for="activity in guildContent.activities"
              :key="activity.title"
              class="guild-page__list-item"
            >
              <h3 class="guild-page__list-title">
                {{ activity.title }}
              </h3>
              <p>{{ activity.text }}</p>
            </li>
          </ul>
        </div>
        <div>
          <h2 class="guild-page__title">
            Schwerpunkt
          </h2>
          <dl class="guild-page__focus">
            <div
              v-for="entry in focus"
              :key="entry.title"
              class="guild-page__focus-item"
            >
              <dt>{{ entry.title }}</dt>
              <dd>{{ entry.text }}</dd>
            </div>
          </dl>
        </div>
      </section>

      <section
        class="guild-page__split"
        aria-labelledby="guild-stats"
      >
        <div>
          <h2
            id="guild-stats"
            class="guild-page__title"
          >
            Gilde in Zahlen
          </h2>
          <BaseCard
            variant="ornate"
            padding="lg"
          >
            <GuildStats
              v-if="guildData"
              :stats="guildData.stats"
            />
            <LoadingSkeleton
              v-else
              :lines="5"
            />
          </BaseCard>
        </div>
        <div>
          <h2 class="guild-page__title">
            Ansprechpartner
          </h2>
          <ul
            class="guild-page__contacts"
            role="list"
          >
            <li
              v-for="contact in guildContent.contacts"
              :key="contact.role"
              class="guild-page__contact"
            >
              <span class="guild-page__contact-role">{{ contact.role }}</span>
              <a
                v-if="contact.discordUserId"
                class="guild-page__contact-name guild-page__contact-name--link"
                :href="`https://discord.com/users/${contact.discordUserId}`"
                target="_blank"
                rel="noopener noreferrer"
              >
                {{ contact.name }}
                <span class="visually-hidden">(Discord-Profil, öffnet in neuem Tab)</span>
              </a>
              <span
                v-else
                class="guild-page__contact-name"
                :class="{ 'guild-page__contact-name--placeholder': contact.isPlaceholder }"
              >
                {{ contact.name }}
              </span>
            </li>
          </ul>
          <p class="guild-page__hint">
            Am schnellsten erreichst du uns im Discord.
          </p>
        </div>
      </section>

      <section
        id="chronik"
        class="guild-page__chronicle"
        aria-labelledby="guild-chronicle"
      >
        <header class="guild-page__chronicle-header">
          <h2
            id="guild-chronicle"
            class="guild-page__title"
          >
            Unsere Geschichte
          </h2>
          <p class="guild-page__chronicle-lead">
            Gemeinsam schreiben wir Gildengeschichte.
          </p>
        </header>
        <GuildChronicle :milestones="milestones ?? []" />
      </section>
    </div>
  </div>
</template>

<style scoped lang="scss">
.guild-page__chronicle {
  max-width: 48rem;
  scroll-margin-top: var(--space-16);
}

.guild-page__chronicle-header {
  margin-bottom: var(--space-6);
}

.guild-page__chronicle-lead {
  font-style: italic;
  color: var(--color-text-muted);
}

.guild-page {
  &__body {
    display: flex;
    flex-direction: column;
    gap: var(--space-20);
  }

  &__draft {
    align-self: flex-start;
    padding: var(--space-2) var(--space-4);
    font-size: var(--text-sm);
    color: var(--color-lantern);
    background: rgb(245 183 104 / 8%);
    border: 1px solid rgb(245 183 104 / 30%);
    border-radius: var(--radius-md);
  }

  &__title {
    margin-bottom: var(--space-6);
    font-size: var(--text-xl);
  }

  &__intro {
    display: grid;
    gap: var(--space-10);

    @include mq('lg') {
      grid-template-columns: 3fr 2fr;
      gap: var(--space-16);
    }
  }

  &__prose {
    display: flex;
    flex-direction: column;
    gap: var(--space-4);
    max-width: 62ch;
    font-size: var(--text-md);
    color: var(--color-text-muted);
  }

  &__prose &__title {
    margin-bottom: var(--space-2);
  }

  &__facts {
    display: flex;
    flex-direction: column;
    margin: 0;
    border-top: 1px solid var(--color-border);
  }

  &__fact {
    display: grid;
    grid-template-columns: 10rem 1fr;
    gap: var(--space-4);
    padding: var(--space-4) 0;
    border-bottom: 1px solid var(--color-border);

    dt {
      color: var(--color-text-muted);
    }

    dd {
      margin: 0;
      color: var(--color-frost);
    }
  }

  &__values {
    display: grid;
    gap: var(--space-8);

    @include mq('md') {
      grid-template-columns: repeat(3, 1fr);
    }
  }

  &__value {
    padding-left: var(--space-5);
    color: var(--color-text-muted);
    border-left: 2px solid var(--color-accent);
  }

  &__value-title {
    margin-bottom: var(--space-2);
    font-family: var(--font-serif);
    font-size: var(--text-lg);
    font-style: italic;
    color: var(--color-frost);
    letter-spacing: 0;
  }

  &__split {
    display: grid;
    gap: var(--space-16);

    @include mq('lg') {
      grid-template-columns: 1fr 1fr;
    }
  }

  &__list {
    display: flex;
    flex-direction: column;
    gap: var(--space-6);
  }

  &__list-item {
    color: var(--color-text-muted);
  }

  &__list-title {
    margin-bottom: var(--space-1);
    font-family: var(--font-sans);
    font-size: var(--text-base);
    font-weight: var(--font-weight-semibold);
    color: var(--color-text);
    letter-spacing: 0;
  }

  &__focus {
    display: flex;
    flex-direction: column;
    gap: var(--space-5);
    margin: 0;
  }

  &__focus-item {
    dt {
      font-weight: var(--font-weight-semibold);
      color: var(--color-text);
    }

    dd {
      margin: var(--space-1) 0 0;
      color: var(--color-text-muted);
    }
  }

  &__contacts {
    border-top: 1px solid var(--color-border);
  }

  &__contact {
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-1) var(--space-4);
    justify-content: space-between;
    padding: var(--space-4) 0;
    border-bottom: 1px solid var(--color-border);
  }

  &__contact-role {
    color: var(--color-text-muted);
  }

  &__contact-name {
    font-weight: var(--font-weight-semibold);
    color: var(--color-frost);

    &--link {
      text-decoration: underline;
      text-decoration-color: rgb(255 255 255 / 25%);
      text-underline-offset: 3px;

      @include focus-ring(2px);

      &:hover { text-decoration-color: currentcolor; }
    }

    &--placeholder {
      font-weight: var(--font-weight-regular);
      font-style: italic;
      color: var(--color-text-subtle);
    }
  }

  &__hint {
    margin-top: var(--space-4);
    font-size: var(--text-sm);
    color: var(--color-text-muted);
  }
}
</style>
