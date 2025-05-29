<template>
  <div class="general-layout">
    <GeneralNavbar />
    <div class="general-content">
      <slot></slot>
    </div>
  </div>
</template>

<script setup>
import GeneralNavbar from '../components/GeneralNavbar.vue';
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