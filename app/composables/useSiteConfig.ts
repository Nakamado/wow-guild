/**
 * Öffentliche, konfigurierbare Seitenwerte (Gildenname, Regelsatz, Discord-Link …).
 * Quelle: runtimeConfig.public → überschreibbar per NUXT_PUBLIC_* Umgebungsvariablen.
 */
export function useSiteConfig() {
  const config = useRuntimeConfig().public

  const factionLabels: Record<string, string> = {
    alliance: 'Allianz',
    horde: 'Horde',
  }

  return {
    isDemo: Boolean(config.demoMode),
    siteUrl: config.siteUrl,
    guild: {
      ...config.guild,
      factionLabel: factionLabels[config.guild.faction] ?? config.guild.faction,
    },
    twitch: {
      ...config.twitch,
      url: `https://www.twitch.tv/${config.twitch.channel}`,
    },
  }
}
