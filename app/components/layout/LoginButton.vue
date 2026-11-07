<script setup lang="ts">
/** „Mit Discord anmelden“ – nur live und nur, wenn der Login eingerichtet ist. */
withDefaults(defineProps<{ size?: 'sm' | 'md' | 'lg', block?: boolean, label?: string, /** kurzer Hinweis zum Änderungsprotokoll unter dem Button */ notice?: boolean }>(), {
  size: 'md',
  block: false,
  label: 'Mit Discord anmelden',
  notice: false,
})
const { loginAvailable, login } = useViewer()
</script>

<template>
  <div
    v-if="loginAvailable && notice"
    class="login-button"
  >
    <BaseButton
      :size="size"
      :block="block"
      icon-left="login"
      @click="login()"
    >
      {{ label }}
    </BaseButton>
    <p class="login-button__notice">
      Zur Verwaltung der Webseite werden bestimmte Konto- und Charakteränderungen protokolliert. Mehr dazu in der
      <NuxtLink to="/datenschutz">Datenschutzerklärung</NuxtLink>.
    </p>
  </div>
  <BaseButton
    v-else-if="loginAvailable"
    :size="size"
    :block="block"
    icon-left="login"
    @click="login()"
  >
    {{ label }}
  </BaseButton>
</template>

<style scoped lang="scss">
.login-button {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
  align-items: center;
  max-width: 28rem;
  text-align: center;

  &__notice {
    font-size: var(--text-xs);
    color: var(--color-text-subtle);
  }
}
</style>
