<script setup>
import Navigation from './components/Navigation.vue'

</script>

<template>
  <Navigation />
  <main :style="{ height: 'calc(100vh - 56px)' }">
    <RouterView />
  </main>
</template>

<style scoped></style>
