<script setup lang="ts">
/**
 * 2-Klick-Lösung: Twitch wird erst nach ausdrücklicher Zustimmung geladen.
 * Die Zustimmung gilt für die aktuelle Sitzung.
 * Twitch verlangt den Parameter `parent` mit der eigenen Domain.
 */
const props = defineProps<{
  src: string
  title: string
  thumbnail?: string | null
}>()

const consent = useState('twitch-embed-consent', () => false)
const { siteUrl } = useSiteConfig()

const embedSrc = computed(() => {
  const url = new URL(props.src)
  const parent = import.meta.client ? window.location.hostname : new URL(siteUrl).hostname
  url.searchParams.set('parent', parent)
  return url.toString()
})
</script>

<template>
  <div class="consent-embed">
    <iframe
      v-if="consent"
      :src="embedSrc"
      :title="title"
      class="consent-embed__frame"
      allowfullscreen
      loading="lazy"
    />
    <div
      v-else
      class="consent-embed__gate"
    >
      <NuxtImg
        v-if="thumbnail"
        :src="thumbnail"
        alt=""
        class="consent-embed__thumb"
        loading="lazy"
      />
      <div class="consent-embed__notice">
        <p>Beim Abspielen werden Daten an Twitch übertragen.</p>
        <BaseButton
          size="sm"
          icon-left="play"
          @click="consent = true"
        >
          Twitch-Inhalte laden
        </BaseButton>
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
.consent-embed {
  position: relative;
  width: 100%;
  height: 100%;

  &__frame {
    width: 100%;
    height: 100%;
    border: 0;
  }

  &__gate {
    position: relative;
    display: grid;
    place-items: center;
    height: 100%;
  }

  &__thumb {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    object-fit: cover;
    opacity: 0.35;
  }

  &__notice {
    position: relative;
    display: flex;
    flex-direction: column;
    gap: var(--space-3);
    align-items: center;
    max-width: 24ch;
    padding: var(--space-4);
    font-size: var(--text-xs);
    color: var(--color-text);
    text-align: center;
  }
}
</style>
