<template>
  <main>
    <router-view />
  </main>
</template>

<script setup>
import { useRoute } from 'vue-router';
const route = useRoute();
</script>
