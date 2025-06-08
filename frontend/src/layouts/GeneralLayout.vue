<template>
  <div class="general-layout">
    <GeneralNavbar />
    <div class="general-content">
      <slot></slot>
    </div>
  </div>
</template>

<script setup>
import { onMounted } from 'vue';
import GeneralNavbar from '../components/GeneralNavbar.vue';

// Set the page title when this layout is mounted
onMounted(() => {
  document.title = 'Tomás - Purrfect Budgets';
});
</script>

<style scoped>
.general-layout {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
}

.general-content {
  flex: 1;
}
</style>