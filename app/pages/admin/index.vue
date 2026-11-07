<script setup lang="ts">
/**
 * Adminbereich: Übersicht und Mitglieder für Admins; Rollenvergabe, Ranglistenfreigaben und
 * Aktivitätsprotokoll nur für den Hauptadmin. Verbindlich prüft jede Aktion der Server.
 */
useSeoMeta({ title: 'Adminbereich', robots: 'noindex' })

const { can } = useViewer()
const { isDemo } = useSiteConfig()
const route = useRoute()
const router = useRouter()

type Section = 'uebersicht' | 'mitglieder' | 'freigaben' | 'protokoll'
const sections = computed(() => [
  { id: 'uebersicht' as const, label: 'Übersicht', visible: true },
  { id: 'mitglieder' as const, label: 'Mitglieder', visible: true },
  { id: 'freigaben' as const, label: 'Ranglistenfreigaben', visible: can('leaderboard:grant') },
  { id: 'protokoll' as const, label: 'Protokoll', visible: can('activity:view') },
].filter(section => section.visible))

const active = computed<Section>(() => {
  const wanted = String(route.query.bereich ?? '')
  return sections.value.find(section => section.id === wanted)?.id ?? 'uebersicht'
})

function select(id: Section) {
  router.replace({ query: { ...route.query, bereich: id === 'uebersicht' ? undefined : id } })
}
</script>

<template>
  <div class="admin-page">
    <PageHeader
      title="Adminbereich"
      lead="Mitglieder, Rollen und Ranglistenfreigaben verwalten."
    />

    <div class="admin-page__body container">
      <BaseCard v-if="!can('admin:area')">
        <EmptyState
          icon="lock"
          title="Kein Zugriff"
          description="Dieser Bereich ist Admins vorbehalten."
        />
      </BaseCard>

      <BaseCard v-else-if="isDemo">
        <EmptyState
          icon="info"
          title="Nur auf der echten Seite"
          description="Der Adminbereich arbeitet mit echten Konten und ist im Demo-Modus nicht verfügbar."
        />
      </BaseCard>

      <template v-else>
        <div
          class="admin-page__tabs"
          role="group"
          aria-label="Bereich wählen"
        >
          <button
            v-for="section in sections"
            :key="section.id"
            type="button"
            class="admin-page__tab"
            :aria-pressed="active === section.id"
            @click="select(section.id)"
          >
            {{ section.label }}
          </button>
          <NuxtLink
            v-if="can('admin:tools')"
            to="/admin/blizzard"
            class="admin-page__tool-link"
          >
            Blizzard-API-Probe
          </NuxtLink>
        </div>

        <AdminOverview v-if="active === 'uebersicht'" />
        <AdminMembers v-else-if="active === 'mitglieder'" />
        <AdminGrants v-else-if="active === 'freigaben'" />
        <AdminActivity v-else-if="active === 'protokoll'" />
      </template>
    </div>
  </div>
</template>

<style scoped lang="scss">
.admin-page {
  &__body {
    display: flex;
    flex-direction: column;
    gap: var(--space-6);
    padding-block: var(--space-8) var(--space-16);
  }

  &__tabs {
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-2);
    align-items: center;
  }

  &__tab {
    min-height: 2.75rem;
    padding: var(--space-2) var(--space-4);
    font-size: var(--text-sm);
    font-weight: var(--font-weight-medium);
    color: var(--color-text-muted);
    background: var(--color-surface);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-md);
    cursor: pointer;

    @include focus-ring(2px);

    &:hover {
      color: var(--color-text);
    }

    &[aria-pressed='true'] {
      color: var(--color-text);
      border-color: var(--color-accent);
      box-shadow: inset 0 -2px 0 var(--color-accent);
    }
  }

  &__tool-link {
    margin-left: auto;
    font-size: var(--text-sm);
    color: var(--color-text-muted);
  }
}
</style>
