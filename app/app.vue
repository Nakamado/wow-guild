<script setup lang="ts">
// Canonical- und Open-Graph-URL immer auf der Hauptdomain (NUXT_PUBLIC_SITE_URL), egal über welche Adresse aufgerufen
const { siteUrl, guild } = useRuntimeConfig().public
const route = useRoute()
const canonical = computed(() => `${siteUrl.replace(/\/+$/, '')}${route.path === '/' ? '/' : route.path.replace(/\/+$/, '')}`)
useHead({ link: [{ rel: 'canonical', href: canonical }] })
useSeoMeta({ ogUrl: canonical, ogSiteName: guild.name, ogType: 'website', ogLocale: 'de_DE' })
</script>

<template>
  <NuxtRouteAnnouncer />
  <NuxtLayout>
    <NuxtPage />
  </NuxtLayout>
</template>
