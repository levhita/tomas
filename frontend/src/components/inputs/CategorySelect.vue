<template>
  <select
    :value="modelValue"
    @change="onChange"
    class="form-select"
  >
    <option value="">Select category</option>
    <template v-for="category in filteredCategories" :key="category.id">
      <option :value="category.id">
        {{ category.name }}
      </option>
      <template v-if="category.children?.length">
        <option v-for="child in category.children" :key="child.id" :value="child.id" class="child-category">
          &nbsp;&nbsp;&nbsp;{{ child.name }}
        </option>
      </template>
    </template>
  </select>
</template>

<script setup>
import { computed } from 'vue';
import { useCategoriesStore } from '../../stores/categories';

const props = defineProps({
  modelValue: {
    type: Number,
    default: null
  },
  type: {
    type: String,
    default: null, // 'expense', 'income', or null for all
    validator: (value) => value === null || ['expense', 'income'].includes(value)
  }
});

const emit = defineEmits(['update:modelValue']);

const categoriesStore = useCategoriesStore();

const filteredCategories = computed(() => {
  let categories = categoriesStore.categoryTree;

  if (props.type) {
    categories = categories.filter(category => category.type === props.type);
  }

  return categories;
});

function onChange(event) {
  const value = event.target.value;
  emit('update:modelValue', value === '' ? null : Number(value));
}
</script>