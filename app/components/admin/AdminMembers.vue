<script setup lang="ts">
interface AdminMember {
  id: string
  displayName: string
  avatarUrl: string | null
  role: 'superadmin' | 'admin' | 'member'
  isGuildMember: boolean
  characterCount: number
  registeredAt: string
  lastLoginAt: string
}

const { viewer } = useViewer()
const { data, error, status, refresh } = await useFetch<{ canManageRoles: boolean, members: AdminMember[] }>('/api/admin/members', { key: 'admin-members' })

const roleLabels = { superadmin: 'Hauptadmin', admin: 'Admin', member: 'Mitglied' } as const
const search = ref('')
const members = computed(() => {
  const term = search.value.trim().toLocaleLowerCase('de-DE')
  return (data.value?.members ?? []).filter(member => !term || member.displayName.toLocaleLowerCase('de-DE').includes(term))
})

const pending = ref<{ member: AdminMember, role: 'admin' | 'member' } | null>(null)
const saving = ref(false)
const notice = ref<{ tone: 'success' | 'error', text: string } | null>(null)
const dialogOpen = computed({
  get: () => pending.value !== null,
  set: (value) => {
    if (!value) pending.value = null
  },
})

const canChange = (member: AdminMember) => Boolean(data.value?.canManageRoles) && member.role !== 'superadmin' && member.id !== viewer.value.memberId

async function confirmChange() {
  const change = pending.value
  if (!change) return
  saving.value = true
  try {
    await $fetch(`/api/admin/members/${change.member.id}/role`, { method: 'PATCH', body: { role: change.role } })
    notice.value = { tone: 'success', text: change.role === 'admin' ? `${change.member.displayName} ist jetzt Admin.` : `${change.member.displayName} ist jetzt wieder Mitglied.` }
    await refresh()
  }
  catch (changeError) {
    notice.value = { tone: 'error', text: apiErrorMessage(changeError) }
  }
  finally {
    saving.value = false
    pending.value = null
  }
}
</script>

<template>
  <section
    class="admin-members"
    aria-labelledby="admin-members-title"
  >
    <header class="admin-members__header">
      <h2
        id="admin-members-title"
        class="admin-members__title"
      >
        Registrierte Mitglieder
      </h2>
      <label class="admin-members__search">
        <span class="visually-hidden">Nach Namen suchen</span>
        <input
          v-model="search"
          type="search"
          placeholder="Name suchen"
          class="admin-members__input"
        >
      </label>
    </header>
    <p
      v-if="data && !data.canManageRoles"
      class="admin-members__hint"
    >
      Admins ernennt und zurückstufen kann nur der Hauptadmin.
    </p>

    <p
      v-if="notice"
      class="admin-members__notice"
      :class="`admin-members__notice--${notice.tone}`"
      role="status"
    >
      {{ notice.text }}
    </p>

    <ErrorState
      v-if="error"
      :message="apiErrorMessage(error)"
    />
    <LoadingSkeleton
      v-else-if="status === 'pending'"
      :lines="5"
    />
    <div
      v-else
      class="admin-members__scroll"
      role="region"
      aria-label="Mitgliederliste"
      tabindex="0"
    >
      <table class="admin-members__table">
        <thead>
          <tr>
            <th scope="col">
              Mitglied
            </th>
            <th scope="col">
              Charaktere
            </th>
            <th scope="col">
              Rolle
            </th>
            <th scope="col">
              Registriert
            </th>
            <th scope="col">
              Letzter Login
            </th>
            <th scope="col">
              <span class="visually-hidden">Aktionen</span>
            </th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="member in members"
            :key="member.id"
          >
            <th
              scope="row"
              class="admin-members__name"
            >
              <MemberAvatar
                :name="member.displayName"
                :src="member.avatarUrl"
                size="sm"
              />
              <span>
                {{ member.displayName }}
                <span
                  v-if="!member.isGuildMember && member.role === 'member'"
                  class="admin-members__muted"
                >ohne Gildenrolle</span>
              </span>
            </th>
            <td>{{ member.characterCount }}</td>
            <td>
              <span
                class="admin-members__role"
                :class="`admin-members__role--${member.role}`"
              >{{ roleLabels[member.role] }}</span>
            </td>
            <td><time :datetime="member.registeredAt">{{ formatDate(member.registeredAt) }}</time></td>
            <td><time :datetime="member.lastLoginAt">{{ formatDate(member.lastLoginAt) }}</time></td>
            <td class="admin-members__action">
              <BaseButton
                v-if="canChange(member)"
                size="sm"
                :variant="member.role === 'admin' ? 'ghost' : 'secondary'"
                @click="pending = { member, role: member.role === 'admin' ? 'member' : 'admin' }"
              >
                {{ member.role === 'admin' ? 'Zurückstufen' : 'Zum Admin ernennen' }}
                <span class="visually-hidden">: {{ member.displayName }}</span>
              </BaseButton>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <BaseDialog
      v-model:open="dialogOpen"
      size="sm"
      :title="pending?.role === 'admin' ? 'Zum Admin ernennen?' : 'Zum Mitglied zurückstufen?'"
      :description="pending?.role === 'admin'
        ? `${pending?.member.displayName} kann danach Aushänge verwalten, Gruppen moderieren und den Adminbereich sehen.`
        : `${pending?.member.displayName} verliert die Adminrechte auf der Webseite.`"
    >
      <template #actions="{ close }">
        <BaseButton
          variant="ghost"
          @click="close"
        >
          Abbrechen
        </BaseButton>
        <BaseButton
          :loading="saving"
          @click="confirmChange"
        >
          {{ pending?.role === 'admin' ? 'Ernennen' : 'Zurückstufen' }}
        </BaseButton>
      </template>
    </BaseDialog>
  </section>
</template>

<style scoped lang="scss">
.admin-members {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);

  &__header {
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-3);
    align-items: center;
    justify-content: space-between;
  }

  &__title {
    font-size: var(--text-xl);
  }

  &__input {
    min-height: 2.75rem;
    padding: var(--space-2) var(--space-3);
    color: var(--color-text);
    background: var(--color-bg);
    border: 1px solid var(--color-border-strong);
    border-radius: var(--radius-md);
    color-scheme: dark;

    @include focus-ring(2px);
  }

  &__hint,
  &__muted {
    font-size: var(--text-sm);
    color: var(--color-text-muted);
  }

  &__muted {
    display: block;
    font-size: var(--text-xs);
    font-weight: 400;
  }

  &__scroll {
    overflow-x: auto;

    @include focus-ring(2px);
  }

  &__table {
    width: 100%;
    min-width: 44rem;
    font-size: var(--text-sm);
    border-collapse: collapse;

    th,
    td {
      padding: var(--space-3) var(--space-3);
      text-align: left;
      vertical-align: middle;
      border-bottom: 1px solid var(--color-border);
    }

    thead th {
      font-size: var(--text-xs);
      font-weight: var(--font-weight-semibold);
      color: var(--color-text-muted);
      text-transform: uppercase;
      letter-spacing: 0.04em;
    }
  }

  &__name {
    display: flex;
    gap: var(--space-3);
    align-items: center;
    font-weight: var(--font-weight-semibold);
    color: var(--color-text);
  }

  &__role {
    color: var(--color-text-muted);

    &--admin {
      color: var(--color-accent);
    }

    &--superadmin {
      color: var(--color-lantern);
    }
  }

  &__action {
    text-align: right;
  }

  &__notice {
    padding: var(--space-3) var(--space-4);
    font-size: var(--text-sm);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-md);

    &--success {
      color: var(--color-success);
    }

    &--error {
      color: var(--color-danger);
    }
  }
}
</style>
