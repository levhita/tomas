<template>
  <div class="split-view">
    <div class="split-view-left">
      <Monthly />
    </div>
    <div class="split-view-right">
      <Calendar />
    </div>
  </div>
</template>

<script setup>
import Calendar from '../components/Calendar.vue'
import Monthly from '../components/Monthly.vue'
</script>