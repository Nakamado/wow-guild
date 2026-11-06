<script setup lang="ts">
import type { Character, CommunityMember } from '#shared/types'

const route = useRoute()
const id = computed(() => String(route.params.id))

const { can } = useViewer()
const canView = computed(() => can('members:view'))

const { data: member, status, refresh, notFound } = await useProtectedFetch<CommunityMember & { characters: Character[] }>(
  `member-${id.value}`,
  `/api/members/${encodeURIComponent(id.value)}`,
  canView,
)

useSeoMeta({ title: () => member.value?.displayName ?? 'Mitglied', robots: 'noindex' })
</script>

<template>
  <div class="member-page container">
    <BackLink
      to="/mitglieder"
      class="member-page__back"
    >
      Alle Mitglieder
    </BackLink>

    <MembersLocked v-if="!canView" />

    <EmptyState
      v-else-if="notFound"
      icon="users"
      title="Dieses Mitglied gibt es nicht (mehr)"
      description="Vielleicht hat es die Gilde verlassen oder der Link ist veraltet."
      :heading-level="2"
    >
      <BaseButton
        to="/mitglieder"
        size="sm"
        variant="secondary"
      >
        Zur Mitgliederliste
      </BaseButton>
    </EmptyState>

    <ErrorState
      v-else-if="status === 'error'"
      @retry="refresh()"
    />

    <LoadingSkeleton
      v-else-if="!member"
      variant="card"
    />

    <template v-else>
      <header class="member-page__header">
        <MemberAvatar
          :name="member.displayName"
          :src="member.avatarUrl"
          size="lg"
        />
        <div class="member-page__identity">
          <h1 class="member-page__name">
            {{ member.displayName }}
          </h1>
          <p
            v-if="member.isAdmin"
            class="member-page__tag"
          >
            Admin
          </p>
          <div
            v-if="member.preferredRoles.length"
            class="member-page__roles"
          >
            <span class="member-page__roles-label">Spielt am liebsten</span>
            <RoleBadge
              v-for="role in member.preferredRoles"
              :key="role"
              :role="role"
            />
          </div>
          <a
            v-if="member.profileUrl"
            :href="member.profileUrl"
            target="_blank"
            rel="noopener noreferrer"
            class="member-page__discord"
          >
            Discord-Profil öffnen<span class="visually-hidden"> (öffnet in neuem Tab)</span>
          </a>
        </div>
      </header>

      <section aria-labelledby="member-characters">
        <h2
          id="member-characters"
          class="member-page__title"
        >
          Charaktere
        </h2>
        <ul
          v-if="member.characters.length"
          class="member-page__characters"
          role="list"
        >
          <li
            v-for="character in member.characters"
            :key="character.id"
          >
            <CharacterCard :character="character" />
          </li>
        </ul>
        <EmptyState
          v-else
          title="Noch kein Charakter hinterlegt"
          description="Sobald sich dieses Mitglied anmeldet, trägt es seinen Hauptcharakter ein."
        />
      </section>
    </template>
  </div>
</template>

<style scoped lang="scss">
.member-page {
  display: flex;
  flex-direction: column;
  gap: var(--space-10);
  padding-block: var(--space-10) 0;

  &__back {
    align-self: flex-start;
  }

  &__header {
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-6);
    align-items: center;
  }

  &__identity {
    display: flex;
    flex-direction: column;
    gap: var(--space-2);
  }

  &__name {
    font-size: var(--text-3xl);
  }

  &__tag {
    font-size: var(--text-sm);
    color: var(--color-accent);
  }

  &__roles {
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-3);
    align-items: center;
  }

  &__roles-label {
    font-size: var(--text-sm);
    color: var(--color-text-muted);
  }

  &__discord {
    font-size: var(--text-sm);
  }

  &__title {
    margin-bottom: var(--space-5);
    font-size: var(--text-xl);
  }

  &__characters {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(17rem, 1fr));
    gap: var(--space-4);
  }
}
</style>
