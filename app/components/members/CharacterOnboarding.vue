<script setup lang="ts">
/**
 * Pflicht-Dialog nach dem ersten Login: Gildenmitglieder ohne Charakter tragen ihren
 * Hauptcharakter ein. „Später“ blendet ihn für diese Sitzung aus – ohne Charakter
 * ist aber keine Anmeldung zu Gruppen möglich.
 */
const STORAGE_KEY = 'wow-guild:onboarding-later'

const { mine, loaded, canManage } = useCharacters()
const { displayName } = useViewer()
const mounted = ref(false)
const later = ref(false)
const done = ref(false)

onMounted(() => {
  mounted.value = true
  try {
    later.value = sessionStorage.getItem(STORAGE_KEY) === '1'
  }
  catch {
    // ignorieren
  }
})

const needed = computed(() => mounted.value && canManage.value && loaded.value && mine.value.length === 0 && !later.value && !done.value)
const open = ref(false)
watch(needed, (value) => {
  open.value = value
}, { immediate: true })

function postpone(close: () => void) {
  later.value = true
  try {
    sessionStorage.setItem(STORAGE_KEY, '1')
  }
  catch {
    // ignorieren
  }
  close()
}

const greeting = computed(() => (displayName.value ? `Willkommen, ${displayName.value}!` : 'Willkommen in der Gilde!'))
</script>

<template>
  <CharacterFormDialog
    v-if="needed || open"
    v-model:open="open"
    :title="greeting"
    description="Trag deinen Hauptcharakter ein, damit andere sehen, mit wem sie spielen. Twinks kannst du später in den Einstellungen ergänzen."
    submit-label="Hauptcharakter speichern"
    :dismissible="false"
    @saved="done = true"
  >
    <template #secondary-action="{ close }">
      <BaseButton
        variant="ghost"
        @click="postpone(close)"
      >
        Später
      </BaseButton>
    </template>
  </CharacterFormDialog>
</template>
