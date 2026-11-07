<script setup lang="ts">
import { guildContent } from '~~/content/guild'

const accountDeleted = computed(() => useRoute().query.konto === 'geloescht')

const { guild, twitch } = useSiteConfig()

useSeoMeta({
  title: 'Start',
  description: `${guildContent.tagline} Gilde der ${guild.factionLabel} in WoW: Forever.`,
  ogTitle: `${guild.name} – Miinyus Gilde für WoW: Forever`,
  ogDescription: guildContent.tagline,
})

const { can } = useViewer()
const canViewMembers = computed(() => can('members:view'))
const requestFetch = useRequestFetch()

const [{ data: guildData }, { data: clips }, { data: streamers }] = await Promise.all([
  useFetch('/api/guild', { key: 'guild' }),
  useFetch('/api/twitch/clips', { key: 'home-clips', query: { period: '30d', sort: 'popular', limit: 3 } }),
  useFetch('/api/twitch/streamers', { key: 'streamers' }),
])

// Gleiche Quelle wie der Kalender – inklusive lokaler Demo-Änderungen
const calendar = useCalendar()
const eventsStatus = calendar.status
const refreshEvents = calendar.refresh
const events = computed(() => calendar.filterEvents(calendar.events.value, { upcomingOnly: true, includeCancelled: true }).slice(0, 5))

const { data: members } = await useAsyncData(
  'home-members',
  () => (canViewMembers.value ? requestFetch('/api/members') : Promise.resolve(null)),
  { watch: [canViewMembers] },
)
const memberPreview = computed(() => members.value?.slice(0, 8) ?? [])
</script>

<template>
  <div class="home">
    <HeroSection />

    <p
      v-if="accountDeleted"
      class="home__deleted container"
      role="status"
    >
      Dein Konto wurde gelöscht. Mit einem neuen Discord-Login kannst du dich jederzeit wieder registrieren.
    </p>

    <HomeBoard />

    <section
      class="home__intro container"
      aria-labelledby="home-intro-title"
    >
      <div class="home__intro-text">
        <h2
          id="home-intro-title"
          class="home__intro-title"
        >
          {{ guildContent.tagline }}
        </h2>
        <p
          v-for="(paragraph, index) in guildContent.intro"
          :key="index"
          class="home__intro-paragraph"
        >
          {{ paragraph }}
        </p>
        <BaseButton
          to="/gilde"
          variant="secondary"
          class="home__intro-link"
        >
          Mehr über die Gilde
        </BaseButton>
      </div>
      <BaseCard
        as="aside"
        variant="ornate"
        padding="lg"
        class="home__stats"
        aria-label="Gilde in Zahlen"
      >
        <GuildStats
          v-if="guildData"
          :stats="guildData.stats"
        />
        <LoadingSkeleton
          v-else
          :lines="5"
          label="Statistiken werden geladen …"
        />
      </BaseCard>
    </section>

    <div class="home__columns container">
      <section
        class="home__events"
        aria-labelledby="home-events-title"
      >
        <header class="home__section-header">
          <h2
            id="home-events-title"
            class="home__section-title"
          >
            Nächste Termine
          </h2>
          <NuxtLink
            to="/kalender"
            class="home__more"
          >Zum Kalender</NuxtLink>
        </header>
        <ErrorState
          v-if="eventsStatus === 'error'"
          @retry="refreshEvents()"
        />
        <ul
          v-else-if="events?.length"
          class="home__event-list"
          role="list"
        >
          <li
            v-for="event in events"
            :key="event.id"
          >
            <EventListItem :event="event" />
          </li>
        </ul>
        <EmptyState
          v-else
          icon="calendar"
          title="Gerade ist nichts geplant"
          description="Erstelle im Dungeon-Finder eine Gruppe – sie erscheint dann hier."
        >
          <BaseButton
            to="/dungeons"
            size="sm"
          >
            Gruppe erstellen
          </BaseButton>
        </EmptyState>
      </section>

      <section
        class="home__members"
        aria-labelledby="home-members-title"
      >
        <header class="home__section-header">
          <h2
            id="home-members-title"
            class="home__section-title"
          >
            Mitglieder
          </h2>
          <NuxtLink
            v-if="canViewMembers"
            to="/mitglieder"
            class="home__more"
          >Alle Mitglieder</NuxtLink>
        </header>
        <ul
          v-if="canViewMembers && memberPreview.length"
          class="home__member-list"
          role="list"
        >
          <li
            v-for="member in memberPreview"
            :key="member.id"
          >
            <NuxtLink
              :to="`/mitglieder/${member.id}`"
              class="home__member"
            >
              <MemberAvatar
                :name="member.displayName"
                :src="member.avatarUrl"
                size="sm"
              />
              <span class="home__member-name">{{ member.displayName }}</span>
              <ClassBadge
                v-if="member.characters[0]"
                :class-id="member.characters[0].classId"
              />
            </NuxtLink>
          </li>
        </ul>
        <MembersLocked
          v-else-if="!canViewMembers"
          compact
        />
      </section>
    </div>

    <section
      v-if="clips?.length"
      class="home__clips container"
      aria-labelledby="home-clips-title"
    >
      <header class="home__section-header">
        <h2
          id="home-clips-title"
          class="home__section-title"
        >
          Beliebte Clips
        </h2>
        <NuxtLink
          to="/clips"
          class="home__more"
        >Alle Clips</NuxtLink>
      </header>
      <ul
        class="home__clip-grid"
        role="list"
      >
        <li
          v-for="clip in clips"
          :key="clip.id"
        >
          <TwitchClipCard :clip="clip" />
        </li>
      </ul>
    </section>

    <section
      v-if="streamers?.length"
      class="home__streamers container"
      aria-labelledby="home-streamers-title"
    >
      <header class="home__section-header">
        <h2
          id="home-streamers-title"
          class="home__section-title"
        >
          Streamer aus der Gilde
        </h2>
        <NuxtLink
          to="/streamer"
          class="home__more"
        >Alle Streamer</NuxtLink>
      </header>
      <ul
        class="home__streamer-grid"
        role="list"
      >
        <li
          v-for="streamer in streamers"
          :key="streamer.id"
        >
          <StreamerCard :streamer="streamer" />
        </li>
      </ul>
    </section>

    <section
      class="home__join container"
      aria-labelledby="home-join-title"
    >
      <div class="home__join-inner">
        <h2
          id="home-join-title"
          class="home__join-title"
        >
          Lust mitzuspielen?
        </h2>
        <p class="home__join-text">
          Komm auf Miinyus Discord und frag nach der Rolle „WoW Forever“. Danach kannst du dich hier mit Discord anmelden
          und Gruppen beitreten.
        </p>
        <div class="home__join-actions">
          <BaseButton
            :href="guild.discordInvite"
            external
            size="lg"
            icon-left="chat"
          >
            Discord beitreten
          </BaseButton>
          <BaseButton
            :href="twitch.url"
            external
            size="lg"
            variant="ghost"
            icon-left="broadcast"
          >
            Miinyu auf Twitch
          </BaseButton>
        </div>
      </div>
    </section>
  </div>
</template>

<style scoped lang="scss">
.home {
  &__deleted {
    padding: var(--space-3) var(--space-4);
    margin-top: var(--space-6);
    font-size: var(--text-sm);
    color: var(--color-success);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-md);
  }

  display: flex;
  flex-direction: column;
  gap: var(--section-gap);

  &__intro {
    display: grid;
    gap: var(--space-12);
    align-items: start;
    margin-top: calc(var(--section-gap) * -0.25);

    @include mq('lg') {
      grid-template-columns: 1.1fr 1fr;
      gap: var(--space-16);
    }
  }

  &__intro-text {
    display: flex;
    flex-direction: column;
    gap: var(--space-5);
    max-width: 38rem;
  }

  &__intro-title {
    font-family: var(--font-serif);
    font-size: var(--text-2xl);
    font-style: italic;
    font-weight: var(--font-weight-medium);
    line-height: var(--line-height-snug);
    letter-spacing: 0;
  }

  &__intro-paragraph {
    font-size: var(--text-md);
    color: var(--color-text-muted);
  }

  &__intro-link {
    align-self: flex-start;
    margin-top: var(--space-2);
  }

  &__columns {
    display: grid;
    gap: var(--space-16);

    @include mq('lg') {
      grid-template-columns: 3fr 2fr;
    }
  }

  &__section-header {
    display: flex;
    gap: var(--space-4);
    align-items: baseline;
    justify-content: space-between;
    margin-bottom: var(--space-6);
  }

  &__section-title {
    font-size: var(--text-xl);
  }

  &__more {
    font-size: var(--text-sm);
    white-space: nowrap;
  }

  &__event-list {
    border-top: 1px solid var(--color-border);
  }

  &__member-list {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(13rem, 1fr));
    gap: var(--space-2);
  }

  &__member {
    display: grid;
    grid-template-columns: auto 1fr;
    gap: 0 var(--space-3);
    align-items: center;
    padding: var(--space-2) var(--space-3);
    color: var(--color-text);
    text-decoration: none;
    border-radius: var(--radius-md);

    .class-badge {
      grid-column: 2;
      justify-self: start;
    }

    &:hover {
      color: var(--color-frost);
      background: rgb(150 190 255 / 6%);
    }
  }

  &__member-name {
    font-weight: var(--font-weight-medium);
  }

  &__clip-grid,
  &__streamer-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(17rem, 1fr));
    gap: var(--space-6);
  }

  &__join {
    margin-bottom: calc(var(--section-gap) * -0.5);
  }

  &__join-inner {
    position: relative;
    display: flex;
    flex-direction: column;
    gap: var(--space-5);
    align-items: flex-start;
    padding: var(--space-12) var(--space-8);
    overflow: hidden;
    background:
      radial-gradient(ellipse 60% 120% at 100% 100%, var(--color-lantern-glow), transparent 60%),
      radial-gradient(ellipse 50% 100% at 0% 0%, rgb(143 211 255 / 12%), transparent 60%),
      var(--color-surface);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-xl);

    @include mq('md') {
      padding: var(--space-16);
    }
  }

  &__join-title {
    font-size: var(--text-2xl);
  }

  &__join-text {
    max-width: 52ch;
    font-size: var(--text-md);
    color: var(--color-text-muted);
  }

  &__join-actions {
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-3);
  }
}
</style>
