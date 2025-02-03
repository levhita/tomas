<template>
  <select :value="modelValue" @change="$emit('update:modelValue', $event.target.value)" class="form-select">
    <option value="">Select category</option>
    <template v-for="category in categories" :key="category.id">
      <option :value="category.id">{{ category.name }}</option>
      <template v-if="category.children?.length">
        <option v-for="child in category.children" :key="child.id" :value="child.id" class="child-category">
          &nbsp; — {{ child.name }}
        </option>
      </template>
    </template>
  </select>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { useCategoriesStore } from '../../stores/categories';

const props = defineProps(['modelValue']);
const emit = defineEmits(['update:modelValue']);

const categoriesStore = useCategoriesStore();
const categories = ref([]);

onMounted(async () => {
  categories.value = categoriesStore.categoryTree;
});
</script>

<style scoped>
.child-category {
  padding-left: 1.5em;
}
</style>