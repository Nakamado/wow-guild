<script setup lang="ts">
/**
 * Vorläufige Startseite (Phase 1). Der cinematische Hero und die Dashboard-Sektionen
 * folgen in Phase 3 – hier wird bereits das Designsystem im Einsatz gezeigt.
 */
const { guild, twitch } = useSiteConfig()

useSeoMeta({
  title: 'Start',
  description: `Community- und Gildenwebseite für Miinyus WoW: Forever Gilde (${guild.factionLabel}).`,
})

const upcoming = [
  {
    title: 'Dungeon-Finder',
    text: 'Passende Dungeons für deinen Charakter finden und Gruppen mit klarer Rollenverteilung planen.',
    to: '/dungeons',
  },
  {
    title: 'Eventkalender',
    text: 'Discord-Events und Raid-Termine an einem Ort – mit freien Plätzen auf einen Blick.',
    to: '/kalender',
  },
  {
    title: 'Mitglieder',
    text: 'Wer spielt was? Hauptcharaktere, Twinks und Rollen der Gildenmitglieder.',
    to: '/mitglieder',
  },
]
</script>

<template>
  <div class="home-page">
    <section
      class="home-page__intro"
      aria-labelledby="home-title"
    >
      <div class="home-page__intro-inner container">
        <p class="home-page__eyebrow">
          Miinyus Community · WoW: Forever
        </p>
        <h1
          id="home-title"
          class="home-page__title"
        >
          {{ guild.name }}
        </h1>
        <p class="home-page__lead">
          Gemeinsam durch Azeroth – entspannt, hilfsbereit und mit viel Herz.
          Hier entsteht die Heimat unserer Gilde.
        </p>
        <dl class="home-page__facts">
          <div class="home-page__fact">
            <dt>Fraktion</dt>
            <dd>{{ guild.factionLabel }}</dd>
          </div>
          <div class="home-page__fact">
            <dt>Realm</dt>
            <dd>{{ guild.realm }}</dd>
          </div>
          <div class="home-page__fact">
            <dt>Status</dt>
            <dd>Im Aufbau</dd>
          </div>
        </dl>
        <div class="home-page__actions">
          <BaseButton
            :href="guild.discordInvite"
            external
            size="lg"
            icon-left="chat"
          >
            Discord beitreten
          </BaseButton>
          <BaseButton
            :href="twitch.url"
            external
            size="lg"
            variant="secondary"
            icon-left="broadcast"
          >
            Zu Miinyus Twitch
          </BaseButton>
        </div>
      </div>
    </section>

    <section
      class="section"
      aria-labelledby="home-upcoming-title"
    >
      <div class="container">
        <div class="section__header">
          <p class="section__eyebrow">
            Bald verfügbar
          </p>
          <h2
            id="home-upcoming-title"
            class="section__title"
          >
            Was dich hier erwartet
          </h2>
        </div>
        <ul
          class="home-page__grid"
          role="list"
        >
          <BaseCard
            v-for="item in upcoming"
            :key="item.to"
            as="li"
            variant="interactive"
            class="home-page__card"
          >
            <template #header>
              <h3 class="home-page__card-title">
                <NuxtLink
                  :to="item.to"
                  class="home-page__card-link"
                >{{ item.title }}</NuxtLink>
              </h3>
              <BaseIcon
                name="arrowRight"
                class="home-page__card-icon"
              />
            </template>
            <p>{{ item.text }}</p>
          </BaseCard>
        </ul>
      </div>
    </section>
  </div>
</template>

<style scoped lang="scss">
.home-page {
  &__intro {
    position: relative;
    padding-block: var(--space-20) var(--space-16);
    overflow: hidden;
    text-align: center;

    &::before {
      position: absolute;
      inset: 0;
      z-index: -1;
      pointer-events: none;
      content: '';
      background:
        radial-gradient(ellipse 45% 60% at 50% 30%, rgb(143 211 255 / 14%), transparent 70%),
        radial-gradient(circle at 80% 60%, var(--color-lantern-glow), transparent 28%);

      // Weich nach unten ausblenden, damit keine harte Kante am Sektionsende entsteht.
      mask-image: linear-gradient(180deg, #000 60%, transparent 100%);
    }
  }

  &__intro-inner {
    display: flex;
    flex-direction: column;
    gap: var(--space-6);
    align-items: center;
  }

  &__eyebrow {
    font-family: var(--font-serif);
    font-size: var(--text-lg);
    font-style: italic;
    color: var(--color-accent);
  }

  &__title {
    font-size: var(--text-hero);
    text-transform: uppercase;
    letter-spacing: var(--letter-spacing-caps);
    text-shadow: 0 0 40px var(--color-accent-glow);
  }

  &__lead {
    max-width: 52ch;
    font-size: var(--text-md);
    color: var(--color-text-muted);
  }

  &__facts {
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-3);
    justify-content: center;
  }

  &__fact {
    display: flex;
    gap: var(--space-2);
    align-items: baseline;
    padding: var(--space-2) var(--space-4);
    font-size: var(--text-sm);
    background: rgb(18 27 58 / 60%);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-pill);

    dt {
      color: var(--color-text-subtle);
    }

    dd {
      margin: 0;
      font-weight: var(--font-weight-semibold);
      color: var(--color-frost);
    }
  }

  &__actions {
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-4);
    justify-content: center;
    margin-top: var(--space-2);
  }

  &__grid {
    display: grid;
    gap: var(--space-6);

    @include mq('md') {
      grid-template-columns: repeat(3, 1fr);
    }
  }

  &__card-title {
    font-size: var(--text-lg);
  }

  // Ganze Karte klickbar, Link bleibt semantisch im Titel.
  &__card-link {
    color: inherit;
    text-decoration: none;

    &::after {
      position: absolute;
      inset: 0;
      content: '';
      border-radius: var(--radius-lg);
    }

    &:hover {
      color: var(--color-frost);
    }
  }

  &__card-icon {
    color: var(--color-accent);
    transition: transform var(--duration-base) var(--ease-out);
  }

  &__card:hover &__card-icon {
    transform: translateX(4px);
  }
}
</style>
