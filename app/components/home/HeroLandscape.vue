<script setup lang="ts">
/**
 * Cinematische Nachtlandschaft für den Hero – vollständig eigenes SVG, keine fremden Assets.
 * Ebenen (hinten → vorne) verschieben sich per `--hero-scroll` unterschiedlich schnell (Parallax).
 * PLATZHALTER für Miinyus Artwork: Sobald eine Illustration freigegeben ist, kann sie diese
 * Komponente ersetzen; Laternen und Blüten können als Overlay bleiben.
 */
const W = 1600
const H = 900

const far = { seed: 7, width: W, height: H, baseY: 560, amplitude: 230, peaks: 7 }
const mid = { seed: 21, width: W, height: H, baseY: 650, amplitude: 160, peaks: 9 }

const farRidge = ridgePath(far)
const farSnow = snowcapPath(far)
const midRidge = ridgePath(mid)
const forestBack = forestPath(5, W, H, 735, 55)
const forestFront = forestPath(11, W, H, 815, 45)
const stars = createStars(3, 140, W, 520)

const lanterns = createDrifters(42, 9, { minSize: 10, maxSize: 20, minDuration: 26, maxDuration: 44 })
const petals = createDrifters(77, 14, { minSize: 8, maxSize: 14, minDuration: 14, maxDuration: 24 })

// Beleuchtete Fenster der Burg [x, y, w, h]
const windows: [number, number, number, number][] = [
  [990, 322, 6, 11], [990, 352, 6, 11], [917, 372, 5, 9], [1064, 352, 6, 10],
  [1064, 380, 6, 10], [944, 438, 5, 8], [1012, 440, 5, 8], [1040, 440, 5, 8],
]
const battlements = Array.from({ length: 11 }, (_, index) => 900 + index * 18)
</script>

<template>
  <div
    class="hero-landscape"
    aria-hidden="true"
  >
    <svg
      class="hero-landscape__svg"
      :viewBox="`0 0 ${W} ${H}`"
      preserveAspectRatio="xMidYMax slice"
      focusable="false"
    >
      <defs>
        <radialGradient
          id="hero-moon-glow"
          cx="50%"
          cy="50%"
          r="50%"
        >
          <stop
            offset="0%"
            stop-color="#cfe9ff"
            stop-opacity="0.55"
          />
          <stop
            offset="45%"
            stop-color="#8fd3ff"
            stop-opacity="0.14"
          />
          <stop
            offset="100%"
            stop-color="#8fd3ff"
            stop-opacity="0"
          />
        </radialGradient>
        <mask id="hero-moon-mask">
          <circle
            cx="1400"
            cy="165"
            r="58"
            fill="#fff"
          />
          <circle
            cx="1425"
            cy="148"
            r="52"
            fill="#000"
          />
        </mask>
        <linearGradient
          id="hero-far"
          x1="0"
          y1="0"
          x2="0"
          y2="1"
        >
          <stop
            offset="0%"
            stop-color="#2a3d72"
          />
          <stop
            offset="100%"
            stop-color="#16224a"
          />
        </linearGradient>
        <linearGradient
          id="hero-mid"
          x1="0"
          y1="0"
          x2="0"
          y2="1"
        >
          <stop
            offset="0%"
            stop-color="#182451"
          />
          <stop
            offset="100%"
            stop-color="#0e1636"
          />
        </linearGradient>
        <linearGradient
          id="hero-fog"
          x1="0"
          y1="0"
          x2="0"
          y2="1"
        >
          <stop
            offset="0%"
            stop-color="#b8d6ff"
            stop-opacity="0"
          />
          <stop
            offset="55%"
            stop-color="#b8d6ff"
            stop-opacity="0.16"
          />
          <stop
            offset="100%"
            stop-color="#b8d6ff"
            stop-opacity="0"
          />
        </linearGradient>
        <filter
          id="hero-glow"
          x="-200%"
          y="-200%"
          width="500%"
          height="500%"
        >
          <feGaussianBlur
            stdDeviation="4"
            result="blur"
          />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
        <filter
          id="hero-soft"
          x="-20%"
          y="-50%"
          width="140%"
          height="200%"
        >
          <feGaussianBlur stdDeviation="18" />
        </filter>
      </defs>

      <!-- Sterne -->
      <g class="hero-landscape__layer hero-landscape__layer--stars">
        <circle
          v-for="(star, index) in stars"
          :key="index"
          :cx="star.x"
          :cy="star.y"
          :r="star.r"
          class="hero-landscape__star"
          :class="{ 'hero-landscape__star--twinkle': star.twinkle }"
          :style="star.twinkle ? { animationDelay: `${star.delay}s` } : undefined"
        />
      </g>

      <!-- Mond -->
      <g class="hero-landscape__layer hero-landscape__layer--moon">
        <circle
          cx="1400"
          cy="165"
          r="220"
          fill="url(#hero-moon-glow)"
        />
        <rect
          x="1300"
          y="65"
          width="200"
          height="200"
          fill="#e8f2ff"
          mask="url(#hero-moon-mask)"
        />
      </g>

      <!-- Ferne Berge mit Schnee -->
      <g class="hero-landscape__layer hero-landscape__layer--far">
        <path
          :d="farRidge"
          fill="url(#hero-far)"
        />
        <path
          :d="farSnow"
          fill="#cfdcff"
          opacity="0.5"
        />
      </g>

      <!-- Nebel hinter der Burg -->
      <rect
        class="hero-landscape__fog"
        x="-100"
        y="520"
        width="1800"
        height="160"
        fill="url(#hero-fog)"
        filter="url(#hero-soft)"
      />

      <!-- Mittlere Berge -->
      <g class="hero-landscape__layer hero-landscape__layer--mid">
        <path
          :d="midRidge"
          fill="url(#hero-mid)"
        />
      </g>

      <!-- Klippe und Burg (nach rechts versetzt, damit der Titel frei bleibt) -->
      <g class="hero-landscape__layer hero-landscape__layer--castle">
        <g transform="translate(250 0)">
          <path
            d="M790 900 L822 720 L836 668 L860 626 L852 590 L872 552 L866 528 L888 498 L896 484 L1106 482 L1118 498 L1134 520 L1128 546 L1150 578 L1146 606 L1166 650 L1182 716 L1220 900 Z"
            fill="#0a1029"
          />
          <!-- Felskanten im Mondlicht -->
          <path
            d="M1106 482 L1118 498 L1134 520 L1128 546 L1150 578 L1146 606 L1166 650 L1182 716"
            fill="none"
            stroke="#9fd8ff"
            stroke-opacity="0.22"
            stroke-width="2"
          />
          <path
            d="M1060 520 L1088 560 L1080 600 M1010 560 L1030 610 M950 540 L930 590"
            fill="none"
            stroke="#9fd8ff"
            stroke-opacity="0.08"
            stroke-width="2"
          />
          <path
            d="M896 484 L1106 482"
            fill="none"
            stroke="#9fd8ff"
            stroke-opacity="0.16"
            stroke-width="1.5"
          />

          <g fill="#0f1838">
            <rect
              x="898"
              y="404"
              width="196"
              height="78"
            />
            <rect
              v-for="x in battlements"
              :key="x"
              :x="x"
              y="394"
              width="10"
              height="12"
            />
            <rect
              x="904"
              y="346"
              width="36"
              height="80"
            />
            <polygon points="898,348 922,292 946,348" />
            <rect
              x="964"
              y="300"
              width="62"
              height="110"
            />
            <polygon points="956,302 995,226 1034,302" />
            <rect
              x="1050"
              y="330"
              width="40"
              height="80"
            />
            <polygon points="1043,332 1070,268 1097,332" />
          </g>
          <!-- Mondlicht-Kanten -->
          <g
            fill="none"
            stroke="#bfe3ff"
            stroke-opacity="0.32"
            stroke-width="1.5"
          >
            <path d="M995 226 L1034 302 L1026 302 L1026 410" />
            <path d="M1070 268 L1097 332 L1090 332 L1090 404 L1094 404 L1094 482" />
            <path d="M922 292 L946 348 L940 348 L940 404" />
          </g>
          <!-- Turmspitze mit Wimpel -->
          <line
            x1="995"
            y1="226"
            x2="995"
            y2="196"
            stroke="#bfe3ff"
            stroke-opacity="0.5"
            stroke-width="1.5"
          />
          <path
            class="hero-landscape__flag"
            d="M995 198 L1018 204 L995 211 Z"
            fill="#8fd3ff"
          />
          <!-- Fenster -->
          <g filter="url(#hero-glow)">
            <rect
              v-for="([x, y, w, h], index) in windows"
              :key="index"
              :x="x"
              :y="y"
              :width="w"
              :height="h"
              rx="2"
              class="hero-landscape__window"
            />
          </g>
        </g>
      </g>

      <!-- Nebel vor der Burg -->
      <rect
        class="hero-landscape__fog hero-landscape__fog--front"
        x="-100"
        y="640"
        width="1800"
        height="150"
        fill="url(#hero-fog)"
        filter="url(#hero-soft)"
      />

      <!-- Wald -->
      <g class="hero-landscape__layer hero-landscape__layer--forest-back">
        <path
          :d="forestBack"
          fill="#0a1128"
        />
      </g>
      <g class="hero-landscape__layer hero-landscape__layer--forest-front">
        <path
          :d="forestFront"
          fill="#05081a"
        />
      </g>
    </svg>

    <!-- Aufsteigende Laternen -->
    <div class="hero-landscape__drifters">
      <span
        v-for="(lantern, index) in lanterns"
        :key="`l${index}`"
        class="hero-landscape__lantern"
        :style="{
          'left': `${lantern.left}%`,
          '--size': `${lantern.size}px`,
          '--duration': `${lantern.duration}s`,
          '--delay': `${lantern.delay}s`,
          '--sway': `${lantern.sway}px`,
        }"
      />
      <span
        v-for="(petal, index) in petals"
        :key="`p${index}`"
        class="hero-landscape__petal"
        :style="{
          'left': `${petal.left}%`,
          '--size': `${petal.size}px`,
          '--duration': `${petal.duration}s`,
          '--delay': `${petal.delay}s`,
          '--sway': `${petal.sway}px`,
        }"
      />
    </div>
  </div>
</template>

<style scoped lang="scss">
.hero-landscape {
  position: absolute;
  inset: 0;
  overflow: hidden;
  container-type: size;
  background:
    radial-gradient(ellipse 70% 55% at 78% 22%, rgb(143 211 255 / 12%), transparent 70%),
    linear-gradient(180deg, #050816 0%, #0a1230 45%, #15214a 75%, #0c1330 100%);

  // Volle Höhe; auf schmalen Screens breiter als der Viewport und rechtsbündig,
  // damit Burg und Mond sichtbar bleiben (rein per CSS, kein Layout-Sprung).
  &__svg {
    position: absolute;
    right: 0;
    bottom: 0;
    width: max(100cqw, 177.78cqh);
    max-width: none;
    height: 100%;
  }

  // Parallax: --hero-scroll wird vom Hero gesetzt (px gescrollt, nur ohne reduced motion)
  &__layer {
    transform: translate3d(0, calc(var(--hero-scroll, 0) * var(--depth, 0) * 1px), 0);
    will-change: transform;

    &--stars { --depth: 0.5; }
    &--moon { --depth: 0.42; }
    &--far { --depth: 0.34; }
    &--mid { --depth: 0.24; }
    &--castle { --depth: 0.18; }
    &--forest-back { --depth: 0.1; }
    &--forest-front { --depth: 0; }
  }

  &__star {
    fill: #e3edff;
    opacity: 0.75;

    &--twinkle {
      @include motion-safe {
        animation: hero-twinkle 5s ease-in-out infinite;
      }
    }
  }

  &__window {
    fill: var(--color-lantern);
  }

  &__fog {
    @include motion-safe {
      animation: hero-fog 30s ease-in-out infinite alternate;
    }

    &--front {
      animation-duration: 38s;
      animation-direction: alternate-reverse;
    }
  }

  &__flag {
    transform-box: fill-box;
    transform-origin: left center;

    @include motion-safe {
      animation: hero-flag 3.5s ease-in-out infinite;
    }
  }

  &__drifters {
    position: absolute;
    inset: 0;
    pointer-events: none;

    @include reduced-motion {
      display: none;
    }
  }

  &__lantern {
    position: absolute;
    bottom: -40px;
    width: var(--size);
    height: calc(var(--size) * 1.3);
    background: radial-gradient(ellipse at 50% 60%, #ffe2b0 0%, var(--color-lantern) 45%, #c9762f 100%);
    border-radius: 40% 40% 30% 30%;
    box-shadow: 0 0 calc(var(--size) * 1.4) calc(var(--size) * 0.3) var(--color-lantern-glow);
    opacity: 0;
    animation: hero-lantern var(--duration) linear var(--delay) infinite;
  }

  &__petal {
    position: absolute;
    top: -20px;
    width: var(--size);
    height: calc(var(--size) * 0.7);
    background: linear-gradient(135deg, #ffe6f1, var(--color-blossom));
    border-radius: 80% 0;
    opacity: 0;
    animation: hero-petal var(--duration) linear var(--delay) infinite;
  }
}

@keyframes hero-twinkle {
  0%,
  100% {
    opacity: 0.25;
  }

  50% {
    opacity: 1;
  }
}

@keyframes hero-fog {
  from {
    transform: translateX(-60px);
  }

  to {
    transform: translateX(60px);
  }
}

@keyframes hero-flag {
  0%,
  100% {
    transform: scaleX(1) skewY(0deg);
  }

  50% {
    transform: scaleX(0.82) skewY(-6deg);
  }
}

@keyframes hero-lantern {
  0% {
    opacity: 0;
    transform: translate3d(0, 0, 0);
  }

  8% {
    opacity: 0.9;
  }

  50% {
    transform: translate3d(var(--sway), -55vh, 0);
  }

  85% {
    opacity: 0.7;
  }

  100% {
    opacity: 0;
    transform: translate3d(0, -110vh, 0) scale(0.6);
  }
}

@keyframes hero-petal {
  0% {
    opacity: 0;
    transform: translate3d(0, 0, 0) rotate(0deg);
  }

  10% {
    opacity: 0.85;
  }

  100% {
    opacity: 0;
    transform: translate3d(calc(var(--sway) * 3), 105vh, 0) rotate(540deg);
  }
}
</style>
