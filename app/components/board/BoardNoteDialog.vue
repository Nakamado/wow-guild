<script setup lang="ts">
import type { BoardNote } from '#shared/types'

/** Aushang anlegen oder bearbeiten (nur Admins) */
const open = defineModel<boolean>('open', { default: false })
const props = defineProps<{ note?: BoardNote | null }>()

const { isDemo } = useSiteConfig()
const { save } = useBoard()

const ids = { title: useId(), text: useId(), expires: useId(), error: useId() }
const form = reactive({ title: '', text: '', expiresOn: '' })
const errorMessage = ref<string | null>(null)
const saving = ref(false)
const isEdit = computed(() => Boolean(props.note))

watch(open, (isOpen) => {
  if (!isOpen) return
  errorMessage.value = null
  form.title = props.note?.title ?? ''
  form.text = props.note?.text ?? ''
  form.expiresOn = props.note?.expiresOn ?? ''
}, { immediate: true })

async function submit() {
  saving.value = true
  const result = await save({ ...form }, props.note?.id)
  saving.value = false
  if (!result.ok) {
    errorMessage.value = result.error.message
    return
  }
  open.value = false
}
</script>

<template>
  <BaseDialog
    v-model:open="open"
    :title="isEdit ? 'Aushang bearbeiten' : 'Neuer Aushang'"
    description="Kurz und knapp: Was braucht die Gilde gerade? Sichtbar für alle Gildenmitglieder auf der Startseite."
  >
    <form
      :id="`${ids.error}-form`"
      class="board-form"
      novalidate
      @submit.prevent="submit"
    >
      <div class="board-form__field">
        <label
          :for="ids.title"
          class="board-form__label"
        >Titel</label>
        <input
          :id="ids.title"
          v-model="form.title"
          type="text"
          maxlength="80"
          required
          class="board-form__input"
          placeholder="z. B. 100 Fische für den ersten Raid"
          :aria-describedby="errorMessage ? ids.error : undefined"
        >
      </div>
      <div class="board-form__field">
        <label
          :for="ids.text"
          class="board-form__label"
        >Details <span class="board-form__optional">(optional)</span></label>
        <textarea
          :id="ids.text"
          v-model="form.text"
          rows="3"
          maxlength="400"
          class="board-form__input board-form__input--textarea"
          placeholder="Wer, was, bis wann – und bei wem man sich meldet"
        />
        <p class="board-form__hint">
          {{ form.text.length }}/400 Zeichen
        </p>
      </div>
      <div class="board-form__field">
        <label
          :for="ids.expires"
          class="board-form__label"
        >Sichtbar bis <span class="board-form__optional">(optional)</span></label>
        <input
          :id="ids.expires"
          v-model="form.expiresOn"
          type="date"
          class="board-form__input board-form__input--date"
        >
        <p class="board-form__hint">
          Danach verschwindet der Aushang automatisch. Ohne Datum bleibt er, bis du ihn entfernst.
        </p>
      </div>
      <p
        v-if="errorMessage"
        :id="ids.error"
        class="board-form__error"
        role="alert"
      >
        {{ errorMessage }}
      </p>
      <p
        v-if="isDemo"
        class="board-form__hint"
      >
        Demo: Der Aushang gilt nur in diesem Browser-Tab.
      </p>
    </form>

    <template #actions="{ close }">
      <BaseButton
        variant="ghost"
        @click="close"
      >
        Abbrechen
      </BaseButton>
      <BaseButton
        type="submit"
        :form="`${ids.error}-form`"
        :loading="saving"
      >
        {{ isEdit ? 'Änderungen speichern' : 'Aushängen' }}
      </BaseButton>
    </template>
  </BaseDialog>
</template>

<style scoped lang="scss">
.board-form {
  display: flex;
  flex-direction: column;
  gap: var(--space-5);

  &__field {
    display: flex;
    flex-direction: column;
    gap: var(--space-2);
  }

  &__label {
    font-size: var(--text-sm);
    font-weight: var(--font-weight-medium);
    color: var(--color-text);
  }

  &__optional {
    font-weight: var(--font-weight-regular);
    color: var(--color-text-subtle);
  }

  &__input {
    width: 100%;
    min-height: 2.75rem;
    padding: var(--space-2) var(--space-3);
    color: var(--color-text);
    background: var(--color-bg);
    border: 1px solid var(--color-border-strong);
    border-radius: var(--radius-md);
    color-scheme: dark;

    @include focus-ring(2px);

    &--textarea { resize: vertical; }

    &--date { max-width: 14rem; }
  }

  &__hint {
    font-size: var(--text-xs);
    color: var(--color-text-muted);
  }

  &__error {
    padding: var(--space-3) var(--space-4);
    font-size: var(--text-sm);
    color: var(--color-danger);
    background: rgb(255 138 138 / 8%);
    border: 1px solid rgb(255 138 138 / 30%);
    border-radius: var(--radius-md);
  }
}
</style>
