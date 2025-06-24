<template>
  <main>
    <router-view />
    <!-- Global confirmation dialog component -->
    <ConfirmDialog v-model="isConfirmVisible" :title="confirmTitle" :message="confirmMessage"
      :confirm-text="confirmButtonText" :cancel-text="cancelButtonText" :confirm-button-variant="confirmButtonVariant"
      @confirm="handleConfirm" @cancel="handleCancel" />
  </main>
</template>

<script setup>
import { useRoute } from 'vue-router';
import ConfirmDialog from './components/dialogs/ConfirmDialog.vue';
import { useConfirm } from './composables/useConfirm';

const route = useRoute();

// Initialize the confirmation dialog
const {
  isVisible: isConfirmVisible,
  title: confirmTitle,
  message: confirmMessage,
  confirmText: confirmButtonText,
  cancelText: cancelButtonText,
  confirmButtonVariant: confirmButtonVariant,
  handleConfirm,
  handleCancel
} = useConfirm();
</script>
