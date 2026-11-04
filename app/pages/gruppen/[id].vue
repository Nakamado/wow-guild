<script setup lang="ts">
import { findDungeon } from '#shared/data/dungeons'
import { getRole, roles } from '#shared/data/roles'
import { computeComposition } from '#shared/domain/composition'
import type { Participant } from '#shared/types'

const route = useRoute()
const id = computed(() => String(route.params.id))

const { isDemo } = useSiteConfig()
const { can } = useViewer()
const { status, getRun, memberById, characterById, myEntry, leaveRun, cancelRun } = useRuns()

const run = computed(() => getRun(id.value))
const dungeon = computed(() => (run.value ? findDungeon(run.value.dungeonSlug) : undefined))
const composition = computed(() => (run.value ? computeComposition(run.value) : null))
const mine = computed(() => (run.value ? myEntry(run.value) : null))

const canSeeMembers = computed(() => can('members:view'))
const canJoin = computed(() => can('runs:join'))
const canEdit = computed(() => (run.value ? can('runs:edit', { organizerId: run.value.organizerId }) : false))
const isOpen = computed(() => run.value?.status === 'open' && Date.parse(run.value.startsAt) > Date.now())

const signupOpen = ref(false)
const editOpen = ref(false)
const confirmCancelOpen = ref(false)
const notice = ref<{ tone: 'success' | 'error', text: string } | null>(null)

// Demo-Runs existieren nur im Browser – erst nach der Hydration ist klar, ob es die ID gibt
const hydrated = ref(false)
onMounted(() => (hydrated.value = true))
const notFound = computed(() => status.value === 'success' && !run.value && (hydrated.value || !id.value.startsWith('demo-run-')))

useSeoMeta({
  title: () => run.value?.title ?? dungeon.value?.name ?? 'Gruppe',
  robots: 'noindex',
})

const organizerName = computed(() => (run.value ? memberById.value.get(run.value.organizerId)?.displayName ?? null : null))

function describe(participant: Participant) {
  const member = memberById.value.get(participant.memberId)
  const character = characterById.value.get(participant.characterId)
  return { member, character }
}

const participantsByRole = computed(() =>
  roles
    .map(role => ({ role, entries: (run.value?.participants ?? []).filter(entry => entry.role === role.id) }))
    .filter(group => group.entries.length || (run.value?.capacity[group.role.id] ?? 0) > 0),
)

function onJoined(_placement: 'participant' | 'waitlist', message: string) {
  notice.value = { tone: 'success', text: message }
}

async function onLeave() {
  const result = await leaveRun(id.value)
  if (!result.ok) {
    notice.value = { tone: 'error', text: result.error.message }
    return
  }
  const promotedId = result.value.promotedMemberId
  const promotedName = promotedId ? memberById.value.get(promotedId)?.displayName : null
  notice.value = {
    tone: 'success',
    text: promotedName ? `Du hast dich abgemeldet. ${promotedName} rückt von der Warteliste nach.` : 'Du hast dich abgemeldet.',
  }
}

async function onCancel() {
  const result = await cancelRun(id.value)
  confirmCancelOpen.value = false
  notice.value = result.ok
    ? { tone: 'success', text: 'Die Gruppe wurde abgesagt. Alle Angemeldeten sehen das jetzt hier.' }
    : { tone: 'error', text: result.error.message }
}

function onSaved() {
  notice.value = { tone: 'success', text: 'Änderungen gespeichert.' }
}
</script>

<template>
  <div class="group-page container">
    <BackLink
      to="/gruppen"
      class="group-page__back"
    >
      Alle Gruppen
    </BackLink>

    <EmptyState
      v-if="notFound"
      icon="calendar"
      title="Diese Gruppe gibt es nicht (mehr)"
      description="Vielleicht wurde sie gelöscht oder der Link ist veraltet."
      :heading-level="2"
    >
      <BaseButton
        to="/gruppen"
        size="sm"
        variant="secondary"
      >
        Zu allen Gruppen
      </BaseButton>
    </EmptyState>

    <LoadingSkeleton
      v-else-if="!run || !dungeon || !composition"
      variant="card"
    />

    <template v-else>
      <header class="group-page__header">
        <p
          v-if="run.title"
          class="group-page__dungeon"
        >
          <NuxtLink :to="`/dungeons/${dungeon.slug}`">{{ dungeon.name }}</NuxtLink>
        </p>
        <h1 class="group-page__title">
          {{ run.title ?? dungeon.name }}
        </h1>
        <p
          v-if="!run.title"
          class="group-page__dungeon-link"
        >
          <NuxtLink :to="`/dungeons/${dungeon.slug}`">Zum Dungeon</NuxtLink>
        </p>
        <p class="group-page__when">
          <time :datetime="run.startsAt">{{ formatDateTime(run.startsAt) }} Uhr</time>
        </p>
        <p
          v-if="run.status === 'cancelled'"
          class="group-page__status group-page__status--cancelled"
        >
          Abgesagt
        </p>
        <p
          v-else-if="run.status === 'completed'"
          class="group-page__status"
        >
          Abgeschlossen
        </p>
        <p
          v-else-if="composition.isFull"
          class="group-page__status"
        >
          Voll besetzt
        </p>
        <p
          v-else
          class="group-page__status group-page__status--open"
        >
          {{ composition.open }} {{ composition.open === 1 ? 'Platz' : 'Plätze' }} frei
        </p>
      </header>

      <p
        v-if="notice"
        class="group-page__notice"
        :class="`group-page__notice--${notice.tone}`"
        role="status"
      >
        {{ notice.text }}
      </p>

      <div class="group-page__layout">
        <div class="group-page__main">
          <section aria-labelledby="group-composition">
            <h2
              id="group-composition"
              class="group-page__section-title"
            >
              Besetzung
            </h2>
            <GroupComposition
              :run="run"
              variant="full"
            />
          </section>

          <section
            v-if="canSeeMembers"
            aria-labelledby="group-participants"
          >
            <h2
              id="group-participants"
              class="group-page__section-title"
            >
              Teilnehmer
            </h2>
            <div
              v-for="group in participantsByRole"
              :key="group.role.id"
              class="group-page__role-group"
            >
              <h3 class="group-page__role-title">
                <RoleBadge :role="group.role.id" />
                <span class="group-page__role-count">{{ group.entries.length }}/{{ run.capacity[group.role.id] }}</span>
              </h3>
              <ul
                v-if="group.entries.length"
                class="group-page__participants"
                role="list"
              >
                <li
                  v-for="entry in group.entries"
                  :key="entry.memberId"
                  class="group-page__participant"
                >
                  <MemberAvatar
                    :name="describe(entry).member?.displayName ?? '?'"
                    :src="describe(entry).member?.avatarUrl"
                    size="sm"
                  />
                  <span class="group-page__participant-name">
                    <NuxtLink
                      v-if="describe(entry).character"
                      :to="`/charaktere/${entry.characterId}`"
                    >{{ describe(entry).character?.name }}</NuxtLink>
                    <span class="group-page__participant-member">{{ describe(entry).member?.displayName }}</span>
                  </span>
                  <ClassBadge
                    v-if="describe(entry).character"
                    :class-id="describe(entry).character!.classId"
                  />
                  <span
                    v-if="describe(entry).character"
                    class="group-page__participant-level"
                  >Stufe {{ describe(entry).character?.level }}</span>
                </li>
              </ul>
              <p
                v-else
                class="group-page__empty"
              >
                Noch niemand
              </p>
            </div>

            <div
              v-if="run.waitlist.length"
              class="group-page__role-group"
            >
              <h3 class="group-page__role-title">
                Warteliste
              </h3>
              <ol class="group-page__participants">
                <li
                  v-for="entry in run.waitlist"
                  :key="entry.memberId"
                  class="group-page__participant"
                >
                  <MemberAvatar
                    :name="describe(entry).member?.displayName ?? '?'"
                    size="sm"
                  />
                  <span class="group-page__participant-name">
                    {{ describe(entry).character?.name }}
                    <span class="group-page__participant-member">{{ describe(entry).member?.displayName }}</span>
                  </span>
                  <span class="group-page__participant-level">{{ getRole(entry.role).name }}</span>
                </li>
              </ol>
            </div>
          </section>
          <p
            v-else
            class="group-page__privacy"
          >
            Wer teilnimmt, sehen nur Gildenmitglieder.
          </p>

          <section
            v-if="run.description"
            aria-labelledby="group-description"
          >
            <h2
              id="group-description"
              class="group-page__section-title"
            >
              Infos der Organisation
            </h2>
            <p class="group-page__description">
              {{ run.description }}
            </p>
          </section>
        </div>

        <aside
          class="group-page__aside"
          aria-label="Aktionen"
        >
          <BaseCard variant="ornate">
            <div class="group-page__actions">
              <template v-if="canJoin && isOpen">
                <template v-if="mine">
                  <p class="group-page__mine">
                    {{ mine.placement === 'participant' ? 'Du bist dabei als' : 'Du stehst auf der Warteliste als' }}
                    <strong>{{ getRole(mine.role).name }}</strong>.
                  </p>
                  <BaseButton
                    variant="secondary"
                    block
                    @click="onLeave"
                  >
                    {{ mine.placement === 'participant' ? 'Abmelden' : 'Von der Warteliste nehmen' }}
                  </BaseButton>
                </template>
                <BaseButton
                  v-else
                  block
                  @click="signupOpen = true"
                >
                  {{ composition.isFull && run.waitlistEnabled ? 'Auf die Warteliste' : 'Gruppe beitreten' }}
                </BaseButton>
              </template>
              <SignInHint
                v-else-if="!canJoin && isOpen"
                action="beizutreten"
              />
              <p
                v-else-if="!isOpen"
                class="group-page__closed"
              >
                Für diese Gruppe sind keine Anmeldungen mehr möglich.
              </p>

              <template v-if="canEdit && run.status === 'open'">
                <BaseButton
                  variant="ghost"
                  block
                  @click="editOpen = true"
                >
                  Bearbeiten
                </BaseButton>
                <BaseButton
                  variant="ghost"
                  block
                  @click="confirmCancelOpen = true"
                >
                  Gruppe absagen
                </BaseButton>
              </template>
            </div>

            <template #footer>
              <dl class="group-page__meta">
                <div v-if="organizerName">
                  <dt>Organisation</dt>
                  <dd>{{ organizerName }}</dd>
                </div>
                <div>
                  <dt>Warteliste</dt>
                  <dd>{{ run.waitlistEnabled ? 'erlaubt' : 'nicht erlaubt' }}</dd>
                </div>
              </dl>
            </template>
          </BaseCard>
          <p
            v-if="isDemo"
            class="group-page__demo"
          >
            Demo: Änderungen gelten nur in diesem Browser-Tab.
          </p>
        </aside>
      </div>

      <GroupSignupDialog
        v-model:open="signupOpen"
        :run="run"
        :dungeon="dungeon"
        @joined="onJoined"
      />
      <GroupFormDialog
        v-model:open="editOpen"
        :run="run"
        @saved="onSaved"
      />
      <BaseDialog
        v-model:open="confirmCancelOpen"
        title="Gruppe absagen?"
        description="Die Gruppe bleibt sichtbar, ist aber als abgesagt markiert. Das lässt sich nicht rückgängig machen."
        size="sm"
      >
        <template #actions="{ close }">
          <BaseButton
            variant="ghost"
            @click="close"
          >
            Nicht absagen
          </BaseButton>
          <BaseButton
            variant="lantern"
            @click="onCancel"
          >
            Gruppe absagen
          </BaseButton>
        </template>
      </BaseDialog>
    </template>
  </div>
</template>

<style scoped lang="scss">
.group-page {
  display: flex;
  flex-direction: column;
  gap: var(--space-8);
  padding-block: var(--space-10) 0;

  &__back {
    align-self: flex-start;
  }

  &__header {
    display: flex;
    flex-direction: column;
    gap: var(--space-2);
  }

  &__dungeon {
    font-family: var(--font-serif);
    font-size: var(--text-lg);
    font-style: italic;
  }

  &__title {
    font-size: var(--text-3xl);
  }

  &__dungeon-link {
    font-size: var(--text-sm);
  }

  &__when {
    font-size: var(--text-md);
    color: var(--color-text);
  }

  &__status {
    font-weight: var(--font-weight-semibold);
    color: var(--color-text-muted);

    &--open { color: var(--color-success); }
    &--cancelled { color: var(--color-danger); }
  }

  &__notice {
    padding: var(--space-3) var(--space-4);
    border-radius: var(--radius-md);

    &--success {
      color: var(--color-success);
      background: rgb(126 226 168 / 8%);
      border: 1px solid rgb(126 226 168 / 25%);
    }

    &--error {
      color: var(--color-danger);
      background: rgb(255 138 138 / 8%);
      border: 1px solid rgb(255 138 138 / 25%);
    }
  }

  &__layout {
    display: grid;
    gap: var(--space-10);

    @include mq('lg') {
      grid-template-columns: 2fr 1fr;
      align-items: start;
    }
  }

  &__main {
    display: flex;
    flex-direction: column;
    gap: var(--space-10);
  }

  &__section-title {
    margin-bottom: var(--space-4);
    font-size: var(--text-xl);
  }

  &__role-group {
    padding: var(--space-4) 0;
    border-top: 1px solid var(--color-border);
  }

  &__role-title {
    display: flex;
    gap: var(--space-3);
    align-items: center;
    margin-bottom: var(--space-3);
    font-family: var(--font-sans);
    font-size: var(--text-sm);
    letter-spacing: 0;
  }

  &__role-count {
    color: var(--color-text-muted);
  }

  &__participants {
    display: flex;
    flex-direction: column;
    gap: var(--space-2);
    padding: 0;
    list-style: none;
  }

  &__participant {
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-3);
    align-items: center;
  }

  &__participant-name {
    display: flex;
    flex-direction: column;
    min-width: 8rem;
    line-height: 1.3;
  }

  &__participant-member {
    font-size: var(--text-xs);
    color: var(--color-text-muted);
  }

  &__participant-level {
    font-size: var(--text-sm);
    color: var(--color-text-muted);
  }

  &__empty,
  &__privacy,
  &__closed {
    font-size: var(--text-sm);
    color: var(--color-text-subtle);
  }

  &__description {
    max-width: 65ch;
    color: var(--color-text-muted);
    white-space: pre-line;
  }

  &__aside {
    display: flex;
    flex-direction: column;
    gap: var(--space-3);

    @include mq('lg') {
      position: sticky;
      top: calc(var(--header-height) + var(--space-6));
    }
  }

  &__actions {
    display: flex;
    flex-direction: column;
    gap: var(--space-3);
  }

  &__mine {
    color: var(--color-text);
  }

  &__meta {
    display: flex;
    flex-direction: column;
    gap: var(--space-2);
    width: 100%;
    margin: 0;
    font-size: var(--text-sm);

    div {
      display: flex;
      justify-content: space-between;
    }

    dt {
      color: var(--color-text-muted);
    }

    dd {
      margin: 0;
      color: var(--color-text);
    }
  }

  &__demo {
    font-size: var(--text-xs);
    color: var(--color-lantern);
  }
}
</style>
