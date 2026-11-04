<script setup lang="ts">
const { guild, twitch } = useSiteConfig()
const year = new Date().getFullYear()
</script>

<template>
  <footer class="app-footer">
    <div
      class="app-footer__ornament"
      aria-hidden="true"
    >
      <span class="app-footer__ornament-line" />
      <span class="app-footer__ornament-gem" />
      <span class="app-footer__ornament-line" />
    </div>

    <div class="app-footer__inner container">
      <div class="app-footer__brand">
        <AppLogo />
        <p class="app-footer__about">
          Community-Seite der WoW:&nbsp;Forever-Gilde aus Miinyus Community.
          Wir spielen {{ guild.factionLabel }} auf {{ guild.realm }}.
        </p>
      </div>

      <nav
        class="app-footer__nav"
        aria-label="Fußzeilennavigation"
      >
        <p class="app-footer__heading">
          Entdecken
        </p>
        <ul
          class="app-footer__list"
          role="list"
        >
          <li
            v-for="item in mainNavigation.slice(1)"
            :key="item.to"
          >
            <NuxtLink
              :to="item.to"
              class="app-footer__link"
            >{{ item.label }}</NuxtLink>
          </li>
        </ul>
      </nav>

      <div class="app-footer__nav">
        <p class="app-footer__heading">
          Community
        </p>
        <ul
          class="app-footer__list"
          role="list"
        >
          <li>
            <a
              :href="guild.discordInvite"
              class="app-footer__link"
              target="_blank"
              rel="noopener noreferrer"
            >
              Discord <span class="visually-hidden">(öffnet in neuem Tab)</span>
            </a>
          </li>
          <li>
            <a
              :href="twitch.url"
              class="app-footer__link"
              target="_blank"
              rel="noopener noreferrer"
            >
              Twitch <span class="visually-hidden">(öffnet in neuem Tab)</span>
            </a>
          </li>
          <li>
            <NuxtLink
              to="/streamer"
              class="app-footer__link"
            >Streamer aus der Gilde</NuxtLink>
          </li>
        </ul>
      </div>
    </div>

    <div class="container">
      <div class="app-footer__bottom">
        <p class="app-footer__legal-note">
          © {{ year }} Fanprojekt der Community. World of Warcraft ist eine Marke von Blizzard
          Entertainment, Inc. Diese Seite steht in keiner Verbindung zu Blizzard Entertainment.
        </p>
        <ul
          class="app-footer__legal"
          role="list"
        >
          <li
            v-for="item in legalNavigation"
            :key="item.to"
          >
            <NuxtLink
              :to="item.to"
              class="app-footer__link"
            >{{ item.label }}</NuxtLink>
          </li>
        </ul>
      </div>
    </div>
  </footer>
</template>

<style scoped lang="scss">
.app-footer {
  padding-block: 0 var(--space-8);
  margin-top: var(--section-gap);
  background: linear-gradient(180deg, transparent, var(--color-bg-deep) 40%);

  &__ornament {
    display: flex;
    gap: var(--space-4);
    align-items: center;
    max-width: var(--container-max);
    padding-inline: var(--container-padding);
    margin: 0 auto var(--space-12);
  }

  &__ornament-line {
    flex: 1;
    height: 1px;
    background: linear-gradient(90deg, transparent, var(--color-ornament), transparent);
  }

  &__ornament-gem {
    width: 0.625rem;
    height: 0.625rem;
    background: var(--color-accent);
    box-shadow: 0 0 12px var(--color-accent-glow);
    transform: rotate(45deg);
  }

  &__inner {
    display: grid;
    gap: var(--space-10);

    @include mq('md') {
      grid-template-columns: 2fr 1fr 1fr;
    }
  }

  &__brand {
    display: flex;
    flex-direction: column;
    gap: var(--space-4);
  }

  &__about {
    max-width: 36ch;
    font-size: var(--text-sm);
    color: var(--color-text-muted);
  }

  &__nav {
    display: flex;
    flex-direction: column;
    gap: var(--space-3);
  }

  &__heading {
    font-family: var(--font-display);
    font-size: var(--text-sm);
    color: var(--color-frost);
    text-transform: uppercase;
    letter-spacing: var(--letter-spacing-wide);
  }

  &__list {
    display: flex;
    flex-direction: column;
    gap: var(--space-2);
  }

  &__link {
    font-size: var(--text-sm);
    color: var(--color-text-muted);
    text-decoration: none;

    &:hover {
      color: var(--color-frost);
      text-decoration: underline;
    }
  }

  &__bottom {
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-4);
    align-items: center;
    justify-content: space-between;
    padding-top: var(--space-6);
    margin-top: var(--space-10);
    border-top: 1px solid var(--color-border);
  }

  &__legal-note {
    max-width: 70ch;
    font-size: var(--text-xs);
    color: var(--color-text-subtle);
  }

  &__legal {
    display: flex;
    gap: var(--space-4);
  }
}
</style>
