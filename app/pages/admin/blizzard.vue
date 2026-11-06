<script setup lang="ts">
import type { ProbeReport } from '#shared/types/blizzard-probe'

/**
 * Blizzard-API-Probe (Schritt 0, docs/ADDON-PLAN.md) – nur für die Gildenleitung.
 * Zeigt, welche WoW-Forever-Endpunkte antworten. Es wird nichts gespeichert.
 */
useSeoMeta({ title: 'Blizzard-API-Probe', robots: 'noindex' })

type Report = ProbeReport & { battlenet: { battletag: string | null, expiresAt: string, valid: boolean } | null }

const { can } = useViewer()
const { isDemo } = useSiteConfig()
const route = useRoute()
const allowed = computed(() => can('admin:tools'))

const report = ref<Report | null>(null)
const running = ref(false)
const error = ref<string | null>(null)
const copied = ref(false)
const failedLink = computed(() => route.query.battlenet === 'fehlgeschlagen')

const resultLabels: Record<string, string> = { ok: 'OK', missing: '404', forbidden: 'gesperrt', error: 'Fehler', skipped: 'übersprungen' }

async function run() {
  running.value = true
  error.value = null
  try {
    report.value = await $fetch<Report>('/api/admin/blizzard-probe')
  }
  catch (err) {
    error.value = (err as { data?: { message?: string } }).data?.message ?? 'Die Probe ist fehlgeschlagen.'
  }
  finally {
    running.value = false
  }
}

function connect() {
  return navigateTo('/auth/battlenet', { external: true })
}

async function disconnect() {
  await $fetch('/api/admin/battlenet', { method: 'DELETE' })
  await run()
}

async function copy() {
  if (!report.value) return
  await navigator.clipboard.writeText(JSON.stringify(report.value, null, 2))
  copied.value = true
  setTimeout(() => (copied.value = false), 2000)
}
</script>

<template>
  <div class="probe-page">
    <PageHeader
      eyebrow="Gildenleitung"
      title="Blizzard-API-Probe"
      lead="Prüft, welche Daten die Blizzard-API für WoW: Forever liefert. Es wird nichts gespeichert."
    />

    <div class="probe-page__body container">
      <MembersLocked v-if="!allowed" />
      <BaseCard v-else-if="isDemo">
        Die Probe funktioniert nur im Live-Betrieb (NUXT_PUBLIC_DEMO_MODE=false).
      </BaseCard>

      <template v-else>
        <BaseCard class="probe-page__controls">
          <div class="probe-page__account">
            <strong>Battle.net:</strong>
            <span v-if="report?.battlenet?.valid">verbunden als {{ report.battlenet.battletag ?? 'unbekannt' }}</span>
            <span v-else-if="report?.battlenet">abgelaufen – bitte neu verbinden</span>
            <span v-else>nicht verbunden (nötig für „eigene Charaktere“)</span>
          </div>
          <p
            v-if="failedLink"
            class="probe-page__error"
            role="alert"
          >
            Die Battle.net-Verknüpfung ist fehlgeschlagen. Stimmt die Redirect-URL im Battle.net-Client?
          </p>
          <div class="probe-page__actions">
            <BaseButton
              :loading="running"
              @click="run"
            >
              Probe starten
            </BaseButton>
            <BaseButton
              variant="secondary"
              @click="connect"
            >
              Mit Battle.net verbinden
            </BaseButton>
            <BaseButton
              v-if="report?.battlenet"
              variant="ghost"
              @click="disconnect"
            >
              Battle.net trennen
            </BaseButton>
            <BaseButton
              v-if="report"
              variant="ghost"
              @click="copy"
            >
              {{ copied ? 'Kopiert!' : 'Ergebnis kopieren' }}
            </BaseButton>
          </div>
          <p
            v-if="error"
            class="probe-page__error"
            role="alert"
          >
            {{ error }}
          </p>
        </BaseCard>

        <template v-if="report">
          <section aria-labelledby="probe-checks">
            <h2
              id="probe-checks"
              class="probe-page__title"
            >
              Endpunkte
            </h2>
            <div class="probe-page__table-wrap">
              <table class="probe-page__table">
                <thead>
                  <tr>
                    <th scope="col">
                      Test
                    </th>
                    <th scope="col">
                      Ergebnis
                    </th>
                    <th scope="col">
                      Details
                    </th>
                  </tr>
                </thead>
                <tbody>
                  <tr
                    v-for="check in report.checks"
                    :key="check.id"
                  >
                    <td>
                      {{ check.label }}
                      <code
                        v-if="check.url"
                        class="probe-page__url"
                      >{{ check.url }}</code>
                    </td>
                    <td>
                      <span
                        class="probe-page__badge"
                        :class="`probe-page__badge--${check.result}`"
                      >
                        {{ resultLabels[check.result] }}<template v-if="check.status && check.result !== 'ok'"> ({{ check.status }})</template>
                      </span>
                    </td>
                    <td>
                      <p
                        v-if="check.note"
                        class="probe-page__note"
                      >
                        {{ check.note }}
                      </p>
                      <code
                        v-if="check.sample"
                        class="probe-page__fields"
                      >{{ check.sample }}</code>
                      <details v-if="check.fields.length">
                        <summary>{{ check.fields.length }} Felder</summary>
                        <code class="probe-page__fields">{{ check.fields.join(', ') }}</code>
                      </details>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>

          <section
            v-if="report.accountCharacters.length"
            aria-labelledby="probe-characters"
          >
            <h2
              id="probe-characters"
              class="probe-page__title"
            >
              Eigene Charaktere
            </h2>
            <div class="probe-page__table-wrap">
              <table class="probe-page__table">
                <thead>
                  <tr>
                    <th scope="col">
                      Name
                    </th><th scope="col">
                      Stufe
                    </th><th scope="col">
                      Klasse / Volk
                    </th><th scope="col">
                      Charakter-ID
                    </th><th scope="col">
                      Realm (versteckt)
                    </th><th scope="col">
                      Gilde
                    </th>
                  </tr>
                </thead>
                <tbody>
                  <tr
                    v-for="character in report.accountCharacters"
                    :key="`${character.characterId}-${character.name}`"
                  >
                    <td>{{ character.name }}</td>
                    <td>{{ character.level ?? '–' }}</td>
                    <td>{{ character.className ?? '?' }} / {{ character.raceName ?? '?' }}</td>
                    <td>{{ character.characterId ?? '–' }}</td>
                    <td>{{ character.realmId ?? '–' }} {{ character.realmSlug ? `(${character.realmSlug})` : '' }}</td>
                    <td>{{ character.guildName ?? '–' }}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>

          <section
            v-if="report.realms.length"
            aria-labelledby="probe-realms"
          >
            <h2
              id="probe-realms"
              class="probe-page__title"
            >
              Realms im Namespace {{ report.namespaces.dynamic }}
            </h2>
            <ul class="probe-page__realms">
              <li
                v-for="realm in report.realms"
                :key="realm.id"
              >
                <code>{{ realm.id }}</code> {{ realm.name }} <code>{{ realm.slug }}</code>
              </li>
            </ul>
          </section>

          <p class="probe-page__meta">
            Gilde: {{ report.guild.slug ?? 'unbekannt' }}{{ report.guild.memberCount !== null ? ` · ${report.guild.memberCount} Mitglieder` : '' }}
            · Static-Namespace: {{ report.namespaces.static ?? 'nicht gefunden' }}
            · Stand: {{ new Date(report.ranAt).toLocaleString('de-DE') }}
          </p>
        </template>
      </template>
    </div>
  </div>
</template>

<style scoped lang="scss">
.probe-page {
  &__body {
    display: flex;
    flex-direction: column;
    gap: var(--space-8);
    padding-block: var(--space-8) var(--space-16);
  }

  &__controls {
    display: flex;
    flex-direction: column;
    gap: var(--space-4);
  }

  &__actions {
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-3);
  }

  &__error {
    font-size: var(--text-sm);
    color: var(--color-danger);
  }

  &__title {
    margin-bottom: var(--space-4);
    font-size: var(--text-xl);
  }

  &__table-wrap {
    overflow-x: auto;
    border: 1px solid var(--color-border);
    border-radius: var(--radius-md);
  }

  &__table {
    width: 100%;
    font-size: var(--text-sm);
    border-collapse: collapse;

    th,
    td {
      padding: var(--space-3);
      text-align: left;
      vertical-align: top;
      border-bottom: 1px solid var(--color-border);
    }

    th {
      font-weight: var(--font-weight-medium);
      color: var(--color-text-muted);
    }
  }

  &__url,
  &__fields {
    display: block;
    margin-top: var(--space-1);
    font-size: var(--text-xs);
    color: var(--color-text-muted);
    overflow-wrap: anywhere;
  }

  &__note {
    color: var(--color-text-muted);
  }

  &__badge {
    display: inline-block;
    padding: var(--space-1) var(--space-2);
    font-size: var(--text-xs);
    white-space: nowrap;
    border: 1px solid var(--color-border-strong);
    border-radius: var(--radius-pill);

    &--ok {
      color: var(--color-success);
    }

    &--missing,
    &--forbidden,
    &--error {
      color: var(--color-danger);
    }

    &--skipped {
      color: var(--color-text-subtle);
    }
  }

  &__realms {
    display: grid;
    gap: var(--space-1);
    padding: 0;
    font-size: var(--text-sm);
    list-style: none;
  }

  &__meta {
    font-size: var(--text-xs);
    color: var(--color-text-subtle);
  }
}
</style>
