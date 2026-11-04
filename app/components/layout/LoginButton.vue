<script setup lang="ts">
/** „Mit Discord anmelden“ – nur live und nur, wenn der Login eingerichtet ist. */
withDefaults(defineProps<{ size?: 'sm' | 'md' | 'lg', block?: boolean, label?: string }>(), {
  size: 'md',
  block: false,
  label: 'Mit Discord anmelden',
})
const { loginAvailable, login } = useViewer()
</script>

<template>
  <BaseButton
    v-if="loginAvailable"
    :size="size"
    :block="block"
    icon-left="login"
    @click="login()"
  >
    {{ label }}
  </BaseButton>
</template>
