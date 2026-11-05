<script setup lang="ts">
/**
 * PLATZHALTER-Emblem: eigene, neutrale Form (Mondsichel, Blüte, Tropfen).
 * Wird ersetzt, sobald Miinyu ein offizielles Logo freigibt – kein offizielles Branding.
 */
const { guild } = useSiteConfig()
</script>

<template>
  <NuxtLink
    to="/"
    class="app-logo"
  >
    <svg
      class="app-logo__emblem"
      viewBox="0 0 48 48"
      aria-hidden="true"
      focusable="false"
    >
      <defs>
        <radialGradient
          id="app-logo-glow"
          cx="50%"
          cy="45%"
          r="55%"
        >
          <stop
            offset="0%"
            stop-color="#8fd3ff"
            stop-opacity="0.45"
          />
          <stop
            offset="100%"
            stop-color="#8fd3ff"
            stop-opacity="0"
          />
        </radialGradient>
      </defs>
      <circle
        cx="24"
        cy="24"
        r="23"
        fill="url(#app-logo-glow)"
      />
      <circle
        cx="24"
        cy="24"
        r="21"
        fill="none"
        stroke="currentColor"
        stroke-opacity="0.35"
      />
      <!-- Mondsichel -->
      <path
        d="M30 10a14 14 0 1 0 8 23 11 11 0 1 1-8-23z"
        fill="none"
        stroke="currentColor"
        stroke-width="1.5"
      />
      <!-- Blüte -->
      <g
        transform="translate(21 26)"
        fill="#f3c4dd"
      >
        <circle r="1.6" />
        <ellipse
          cy="-3.4"
          rx="1.7"
          ry="2.6"
        />
        <ellipse
          cy="-3.4"
          rx="1.7"
          ry="2.6"
          transform="rotate(72)"
        />
        <ellipse
          cy="-3.4"
          rx="1.7"
          ry="2.6"
          transform="rotate(144)"
        />
        <ellipse
          cy="-3.4"
          rx="1.7"
          ry="2.6"
          transform="rotate(216)"
        />
        <ellipse
          cy="-3.4"
          rx="1.7"
          ry="2.6"
          transform="rotate(288)"
        />
      </g>
      <!-- Tropfen -->
      <path
        d="M33 30c0 2-1.4 3.4-3 3.4S27 32 27 30c0-1.8 3-5.4 3-5.4s3 3.6 3 5.4z"
        fill="#8fd3ff"
      />
    </svg>
    <span class="app-logo__text">
      <span class="app-logo__name">{{ guild.name }}</span>
      <span class="app-logo__tagline">WoW: Forever</span>
      <span class="visually-hidden">, zur Startseite</span>
    </span>
  </NuxtLink>
</template>

<style scoped lang="scss">
.app-logo {
  display: inline-flex;
  gap: var(--space-3);
  align-items: center;
  color: var(--color-frost);
  text-decoration: none;

  @include focus-ring(4px);

  &:hover {
    color: var(--color-frost);
  }

  &__emblem {
    width: 2.5rem;
    height: 2.5rem;
    color: var(--color-frost);
    transition: filter var(--duration-base) var(--ease-out);
  }

  &:hover &__emblem {
    filter: drop-shadow(0 0 8px var(--color-accent-glow));
  }

  &__text {
    display: flex;
    flex-direction: column;
    line-height: 1.1;
  }

  &__name {
    font-family: var(--font-display);
    font-size: var(--text-md);
    font-weight: var(--font-weight-semibold);
    letter-spacing: 0.04em;
  }

  &__tagline {
    font-family: var(--font-serif);
    font-size: var(--text-sm);
    font-style: italic;
    color: var(--color-accent);
  }
}
</style>
