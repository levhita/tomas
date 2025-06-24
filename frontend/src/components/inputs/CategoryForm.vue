<template>
  <div class="card border-0 bg-transparent">
    <div class="card-header bg-transparent border-0 px-0 py-2">
      <h6 class="card-title mb-0 d-flex justify-content-between align-items-center">
        <span>{{ title }}</span>
        <button type="button" class="btn btn-sm btn-outline-secondary" @click="$emit('cancel')" aria-label="Close form">
          <i class="bi bi-x"></i>
        </button>
      </h6>
    </div>
    <div class="card-body px-0">
      <form @submit.prevent="$emit('submit')">
        <div class="row">
          <div class="col-md-4">
            <div class="form-floating">
              <input type="text" class="form-control" :id="nameFieldId" v-model="form.name" required
                :disabled="isLoading" :placeholder="namePlaceholder">
              <label :for="nameFieldId">Name *</label>
            </div>
          </div>
          <div v-if="!isChildForm && !isEditingChildCategory" class="col-md-4">
            <div class="form-floating">
              <select class="form-select" :id="typeFieldId" v-model="form.type" :disabled="isLoading">
                <option value="expense">Expense</option>
                <option value="income">Income</option>
              </select>
              <label :for="typeFieldId">Type</label>
            </div>
          </div>
          <div v-if="mode !== 'add'" :class="(isChildForm || isEditingChildCategory) ? 'col-md-8' : 'col-md-4'">
            <div class="form-floating">
              <select class="form-select" :id="parentFieldId" v-model="form.parent_category_id"
                :disabled="isLoading || parentDisabled">
                <option value="">None (Root Category)</option>
                <option v-for="category in availableParentCategories" :key="category.id" :value="category.id">
                  {{ category.name }}
                </option>
              </select>
              <label :for="parentFieldId">Parent Category</label>
            </div>
          </div>
        </div>
        <div class="mt-3">
          <div class="form-floating">
            <textarea class="form-control" :id="descriptionFieldId" v-model="form.description" rows="2"
              :disabled="isLoading" placeholder="Optional description of this category..."></textarea>
            <label :for="descriptionFieldId">Description</label>
          </div>
        </div>
        <div class="mt-3">
          <button type="submit" class="btn btn-primary me-2" :disabled="isLoading || !form.name.trim()">
            <span v-if="isLoading" class="spinner-border spinner-border-sm me-2" role="status"
              aria-hidden="true"></span>
            {{ submitButtonText }}
          </button>
          <button type="button" class="btn btn-secondary" @click="$emit('cancel')" :disabled="isLoading">
            Cancel
          </button>
        </div>
      </form>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  form: {
    type: Object,
    required: true
  },
  isLoading: {
    type: Boolean,
    default: false
  },
  availableParentCategories: {
    type: Array,
    default: () => []
  },
  mode: {
    type: String,
    required: true,
    validator: value => ['add', 'edit', 'add-child'].includes(value)
  },
  parentCategory: {
    type: Object,
    default: null
  },
  editingCategory: {
    type: Object,
    default: null
  },
  parentDisabled: {
    type: Boolean,
    default: false
  }
})

defineEmits(['submit', 'cancel'])

// Computed properties for dynamic content
const isChildForm = computed(() => props.mode === 'add-child')
const isEditMode = computed(() => props.mode === 'edit')
const isEditingChildCategory = computed(() => props.mode === 'edit' && props.editingCategory?.parent_category_id)

const title = computed(() => {
  if (props.mode === 'add-child') {
    return `Add Child to "${props.parentCategory?.name}"`
  } else if (props.mode === 'edit') {
    return 'Edit Category'
  } else {
    return 'Add New Category'
  }
})

const submitButtonText = computed(() => {
  return isEditMode.value ? 'Update Category' : 'Add Category'
})

const namePlaceholder = computed(() => {
  if (isChildForm.value) {
    return 'e.g., Groceries, Fast Food'
  } else {
    return 'e.g., Food, Transportation, Entertainment'
  }
})

const typeDisplayValue = computed(() => {
  if (isChildForm.value && props.parentCategory) {
    return `${props.parentCategory.type === 'expense' ? 'Expense' : 'Income'} (inherited)`
  } else if (isEditMode.value) {
    return `${props.form.type === 'expense' ? 'Expense' : 'Income'} (inherited from parent)`
  }
  return ''
})

// Generate unique field IDs based on mode and category
const fieldIdSuffix = computed(() => {
  if (props.mode === 'add-child' && props.parentCategory) {
    return `Child-${props.parentCategory.id}`
  } else if (props.mode === 'edit' && props.editingCategory) {
    return `Edit-${props.editingCategory.id}`
  } else {
    return 'Add'
  }
})

const nameFieldId = computed(() => `categoryName-${fieldIdSuffix.value}`)
const typeFieldId = computed(() => `categoryType-${fieldIdSuffix.value}`)
const parentFieldId = computed(() => `categoryParent-${fieldIdSuffix.value}`)
const descriptionFieldId = computed(() => `categoryDescription-${fieldIdSuffix.value}`)
</script>
