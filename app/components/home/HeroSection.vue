<script setup lang="ts">
const { guild } = useSiteConfig()

const heroRef = ref<HTMLElement | null>(null)
let frame = 0

function update() {
  frame = 0
  const hero = heroRef.value
  if (!hero) return
  const scrolled = Math.min(window.scrollY, hero.offsetHeight)
  hero.style.setProperty('--hero-scroll', String(Math.round(scrolled)))
}

function onScroll() {
  if (!frame) frame = requestAnimationFrame(update)
}

onMounted(() => {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
  update()
  window.addEventListener('scroll', onScroll, { passive: true })
})

onBeforeUnmount(() => {
  window.removeEventListener('scroll', onScroll)
  if (frame) cancelAnimationFrame(frame)
})
</script>

<template>
  <section
    ref="heroRef"
    class="hero"
    aria-labelledby="hero-title"
  >
    <HeroLandscape class="hero__landscape" />

    <div class="hero__content container">
      <TwitchLiveIndicator class="hero__live" />

      <h1
        id="hero-title"
        class="hero__title"
      >
        {{ guild.name }}
      </h1>

      <p class="hero__subtitle">
        Miinyus Gilde für World of Warcraft: Forever
      </p>

      <dl class="hero__facts">
        <div class="hero__fact">
          <dt>Fraktion</dt>
          <dd>{{ guild.factionLabel }}</dd>
        </div>
        <div class="hero__fact">
          <dt>Realm</dt>
          <dd>{{ guild.realm }}</dd>
        </div>
      </dl>

      <div class="hero__actions">
        <BaseButton
          :href="guild.discordInvite"
          external
          size="lg"
          icon-left="chat"
        >
          Discord beitreten
        </BaseButton>
        <BaseButton
          to="/dungeons"
          size="lg"
          variant="secondary"
        >
          Gruppe finden
        </BaseButton>
      </div>
    </div>

    <p class="hero__credit">
      Illustration: Platzhalter, bis Miinyus Artwork freigegeben ist
    </p>
  </section>
</template>

<style scoped lang="scss">
.hero {
  position: relative;
  display: flex;
  align-items: flex-end;
  min-height: min(88svh, 52rem);
  overflow: hidden;
  isolation: isolate;

  @include mq('md') {
    min-height: min(calc(100svh - var(--header-height) - 2.5rem), 56rem);
  }

  // Übergang in die Seitenfläche
  &::after {
    position: absolute;
    inset: auto 0 0;
    z-index: 1;
    height: 30%;
    pointer-events: none;
    content: '';
    background: linear-gradient(180deg, transparent, var(--color-bg));
  }

  &__landscape {
    z-index: 0;
  }

  // Lesbarkeit des Textes über der Landschaft (vor allem mobil, wo die Burg hinter dem Text liegt)
  &::before {
    position: absolute;
    inset: 0;
    z-index: 1;
    pointer-events: none;
    content: '';
    background: linear-gradient(90deg, rgb(5 8 22 / 55%) 0%, rgb(5 8 22 / 20%) 55%, transparent 80%);

    @include mq('lg') {
      background: linear-gradient(90deg, rgb(5 8 22 / 35%) 0%, transparent 50%);
    }
  }

  &__content {
    position: relative;
    z-index: 2;
    display: flex;
    flex-direction: column;
    gap: var(--space-5);
    align-items: flex-start;
    padding-block: var(--space-24) var(--space-16);
    transform: translate3d(0, calc(var(--hero-scroll, 0) * 0.35px), 0);

    @include mq('md') {
      padding-block-end: var(--space-20);
    }
  }

  &__title {
    max-width: 14ch;
    font-size: clamp(3rem, 1.4rem + 7vw, 7.5rem);
    font-weight: var(--font-weight-semibold);
    line-height: 0.95;
    color: #f3f7ff;
    text-wrap: balance;
    letter-spacing: 0.01em;
    text-shadow:
      0 0 32px rgb(143 211 255 / 35%),
      0 2px 0 rgb(4 6 15 / 60%);

    @include motion-safe {
      animation: hero-reveal 1.6s var(--ease-out) both;
    }
  }

  &__subtitle {
    max-width: 30ch;
    font-family: var(--font-serif);
    font-size: clamp(1.375rem, 1.1rem + 1.2vw, 2rem);
    font-style: italic;
    line-height: var(--line-height-snug);
    color: var(--color-frost);

    @include motion-safe {
      animation: hero-reveal 1.6s var(--ease-out) 0.25s both;
    }
  }

  &__facts {
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-2) var(--space-6);
    margin: 0;
    font-size: var(--text-sm);
  }

  &__fact {
    display: flex;
    gap: var(--space-2);

    dt {
      color: var(--color-text-muted);
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
    gap: var(--space-3);
    margin-top: var(--space-2);
  }

  &__credit {
    position: absolute;
    right: var(--container-padding);
    bottom: var(--space-3);
    z-index: 2;
    font-size: var(--text-xs);
    color: var(--color-text-subtle);
  }
}

@keyframes hero-reveal {
  from {
    opacity: 0;
    filter: blur(6px);
    transform: translateY(12px);
  }
}
</style>
