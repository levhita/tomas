<template>
  <main>
    <router-view />
    <!-- Global confirmation dialog component -->
    <ConfirmDialog v-model="isConfirmVisible" :title="confirmTitle" :message="confirmMessage"
      :confirm-text="confirmButtonText" :cancel-text="cancelButtonText" :confirm-button-variant="confirmButtonVariant"
      @confirm="handleConfirm" @cancel="handleCancel" />
    <!-- Global toast notification component -->
    <ToastNotification ref="toastComponent" />
  </main>
</template>

<script setup>
import { onMounted, ref } from 'vue';
import { useRoute } from 'vue-router';
import ConfirmDialog from './components/dialogs/ConfirmDialog.vue';
import ToastNotification from './components/notifications/ToastNotification.vue';
import { useConfirm } from './composables/useConfirm';
import { useToast } from './composables/useToast';

const route = useRoute();
const toastComponent = ref(null);

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

// Initialize the toast system
const { registerToastComponent } = useToast();

onMounted(() => {
  registerToastComponent(toastComponent.value);
});
</script>
