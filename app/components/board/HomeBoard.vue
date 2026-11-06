<script setup lang="ts">
import type { BoardNote } from '#shared/types'

/**
 * Schwarzes Brett auf der Startseite: Aushänge der Admins („Was braucht die Gilde gerade?“).
 * Nur für Gildenmitglieder; ohne aktive Aushänge unsichtbar – Admins sehen dann nur „Aushang hinzufügen“.
 */
const { notes, canView, canManage, remove } = useBoard()

const dialogOpen = ref(false)
const editing = ref<BoardNote | null>(null)
const confirmingId = ref<string | null>(null)
const errorMessage = ref<string | null>(null)

const visible = computed(() => canView.value && (notes.value.length > 0 || canManage.value))
const hasDemo = computed(() => notes.value.some(note => note.isDemo))

function openDialog(note: BoardNote | null) {
  editing.value = note
  dialogOpen.value = true
}

async function confirmRemove(note: BoardNote) {
  if (confirmingId.value !== note.id) {
    confirmingId.value = note.id
    return
  }
  confirmingId.value = null
  const result = await remove(note.id)
  errorMessage.value = result.ok ? null : result.error.message
}

const until = (day: string) => formatDate(`${day}T12:00:00Z`)
</script>

<template>
  <section
    v-if="visible"
    class="home-board container"
    aria-labelledby="home-board-title"
  >
    <header class="home-board__header">
      <h2
        id="home-board-title"
        class="home-board__title"
      >
        <BaseIcon
          name="pin"
          :size="22"
        />
        Schwarzes Brett
      </h2>
      <BaseButton
        v-if="canManage"
        size="sm"
        variant="secondary"
        icon-left="plus"
        @click="openDialog(null)"
      >
        Aushang hinzufügen
      </BaseButton>
    </header>

    <p
      v-if="hasDemo"
      class="home-board__demo"
    >
      Beispieldaten: Die Aushänge sind fiktiv.
    </p>

    <ul
      v-if="notes.length"
      class="home-board__list"
      role="list"
    >
      <li
        v-for="note in notes"
        :key="note.id"
        class="home-board__note"
      >
        <h3 class="home-board__note-title">
          {{ note.title }}
        </h3>
        <p
          v-if="note.text"
          class="home-board__note-text"
        >
          {{ note.text }}
        </p>
        <p class="home-board__meta">
          <span>Ausgehängt am {{ formatDate(note.createdAt) }}</span>
          <span v-if="note.expiresOn">· bis {{ until(note.expiresOn) }}</span>
        </p>
        <div
          v-if="canManage"
          class="home-board__actions"
        >
          <BaseButton
            size="sm"
            variant="ghost"
            icon-left="edit"
            class="home-board__action"
            @click="openDialog(note)"
          >
            Bearbeiten<span class="visually-hidden">: {{ note.title }}</span>
          </BaseButton>
          <BaseButton
            size="sm"
            variant="ghost"
            icon-left="trash"
            class="home-board__action"
            @click="confirmRemove(note)"
          >
            {{ confirmingId === note.id ? 'Wirklich entfernen?' : 'Entfernen' }}<span class="visually-hidden">: {{ note.title }}</span>
          </BaseButton>
        </div>
      </li>
    </ul>
    <p
      v-else
      class="home-board__empty"
    >
      Gerade hängt nichts aus – Mitglieder sehen das Brett erst, wenn du etwas aushängst.
    </p>

    <p
      v-if="errorMessage"
      class="home-board__error"
      role="alert"
    >
      {{ errorMessage }}
    </p>

    <BoardNoteDialog
      v-if="canManage"
      v-model:open="dialogOpen"
      :note="editing"
    />
  </section>
</template>

<style scoped lang="scss">
.home-board {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
  padding-block: var(--space-10, var(--space-8)) 0;

  &__header {
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-4);
    align-items: center;
    justify-content: space-between;
  }

  &__title {
    display: inline-flex;
    gap: var(--space-3);
    align-items: center;
    font-size: var(--text-xl);

    :deep(svg) { color: var(--color-lantern); }
  }

  &__demo {
    font-size: var(--text-sm);
    color: var(--color-lantern);
  }

  &__list {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(17rem, 1fr));
    gap: var(--space-5);
    padding: 0;
    margin: 0;
    list-style: none;
  }

  // Aushang wie ein angehefteter Zettel: warmer Rand, kleiner Pin oben
  &__note {
    position: relative;
    display: flex;
    flex-direction: column;
    gap: var(--space-2);
    padding: var(--space-5);
    background:
      linear-gradient(180deg, rgb(245 183 104 / 6%), transparent 60%),
      var(--color-surface);
    border: 1px solid rgb(245 183 104 / 30%);
    border-radius: var(--radius-md);

    &::before {
      position: absolute;
      top: calc(var(--space-2) * -1);
      left: 50%;
      width: 0.75rem;
      height: 0.75rem;
      content: '';
      background: var(--color-lantern);
      border-radius: 50%;
      box-shadow: 0 2px 6px rgb(0 0 0 / 50%);
      transform: translateX(-50%);
    }
  }

  &__note-title {
    font-family: var(--font-sans);
    font-size: var(--text-base);
    font-weight: var(--font-weight-semibold);
    color: var(--color-text);
    letter-spacing: 0;
    text-transform: none;
  }

  &__note-text {
    font-size: var(--text-sm);
    color: var(--color-text-muted);
    white-space: pre-line;
  }

  &__meta {
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-1);
    margin-top: auto;
    font-size: var(--text-xs);
    color: var(--color-text-subtle);
  }

  &__actions {
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-1);
    margin: var(--space-1) calc(var(--space-3) * -1) 0;
  }

  // kleine Textbuttons: gut lesbare Schrift statt Zierschrift
  &__action {
    padding-inline: var(--space-3);
    font-family: var(--font-sans);
    font-size: var(--text-sm);
    font-style: normal;
    letter-spacing: 0;
  }

  &__empty {
    font-size: var(--text-sm);
    color: var(--color-text-subtle);
  }

  &__error {
    font-size: var(--text-sm);
    color: var(--color-danger);
  }
}
</style>
