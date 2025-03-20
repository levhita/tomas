<template>
  <Navigation v-if="showNavigation" />
  <main class="container-fluid">
    <router-view />
  </main>
</template>

<script setup>
import { computed } from 'vue';
import { useRoute } from 'vue-router';
import Navigation from './components/Navigation.vue';

const route = useRoute();
const showNavigation = computed(() => route.path !== '/login');
</script>
