<template>
  <nav>
    <ul>
      <li>
        <RouterLink to="/">Go to Home</RouterLink>
      </li>
      <li>
        <RouterLink to="/split">Split View</RouterLink>
      </li>
      <li>
        <RouterLink to="/calendar">Calendar</RouterLink>
      </li>
      <li>
        <RouterLink to="/monthly">Monthly</RouterLink>
      </li>
    </ul>
  </nav>
</template>

<script setup>
import { RouterLink } from 'vue-router'
</script>

<style scoped>
nav {
  padding: 1rem;
}
</style>