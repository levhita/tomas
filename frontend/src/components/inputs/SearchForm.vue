<template>
    <div class="mb-4">
        <div class="row g-2">
            <!-- Search Input -->
            <div class="col-12 col-md-6">
                <div class="form-floating">
                    <input 
                        type="text" 
                        class="form-control bg-body-tertiary text-light-emphasis" 
                        :id="searchInputId" 
                        :placeholder="placeholder" 
                        :value="modelValue"
                        @input="$emit('update:modelValue', $event.target.value)"
                    >
                    <label :for="searchInputId" class="text-light-emphasis">
                        <i class="bi bi-search me-1"></i>
                        {{ placeholder }}
                    </label>
                </div>
            </div>
            
            <!-- Date Range Filter (Future Implementation) -->
            <!-- <div v-if="showDateRange" class="col-12 col-md-6">
                <div class="row g-2">
                    <div class="col-6">
                        <div class="form-floating">
                            <input 
                                type="date" 
                                class="form-control bg-body-tertiary text-light-emphasis" 
                                :id="startDateId"
                                :value="startDate"
                                @input="$emit('update:startDate', $event.target.value)"
                            >
                            <label :for="startDateId" class="text-light-emphasis">
                                <i class="bi bi-calendar me-1"></i>
                                Start Date
                            </label>
                        </div>
                    </div>
                    <div class="col-6">
                        <div class="form-floating">
                            <input 
                                type="date" 
                                class="form-control bg-body-tertiary text-light-emphasis" 
                                :id="endDateId"
                                :value="endDate"
                                @input="$emit('update:endDate', $event.target.value)"
                            >
                            <label :for="endDateId" class="text-light-emphasis">
                                <i class="bi bi-calendar me-1"></i>
                                End Date
                            </label>
                        </div>
                    </div>
                </div>
            </div> -->
        </div>
        
        <!-- Active Filters Display -->
        <div v-if="hasActiveFilters" class="mt-2">
            <div class="d-flex flex-wrap gap-2">
                <!-- Clear Search Button -->
                <button 
                    v-if="modelValue && modelValue.trim()" 
                    type="button" 
                    class="btn btn-outline-secondary btn-sm"
                    @click="clearSearch"
                >
                    <i class="bi bi-x-circle me-1"></i>
                    Clear 
                </button>
                
                <!-- Clear Date Range Button
                <button 
                    v-if="showDateRange && (startDate || endDate)" 
                    type="button" 
                    class="btn btn-outline-secondary btn-sm"
                    @click="clearDateRange"
                >
                    <i class="bi bi-x-circle me-1"></i>
                    Clear Dates
                </button> -->
                
                <!-- Clear All Button -->
                <!-- <button 
                    v-if="hasMultipleActiveFilters" 
                    type="button" 
                    class="btn btn-outline-danger btn-sm"
                    @click="clearAllFilters"
                >
                    <i class="bi bi-x-circle me-1"></i>
                    Clear All
                </button> -->
            </div>
        </div>
    </div>
</template>

<script setup>
import { computed } from 'vue';

// Props
const props = defineProps({
    modelValue: {
        type: String,
        default: ''
    },
    placeholder: {
        type: String,
        default: 'Search by description...'
    },
    // showDateRange: {
    //     type: Boolean,
    //     default: false
    // },
    // startDate: {
    //     type: String,
    //     default: ''
    // },
    // endDate: {
    //     type: String,
    //     default: ''
    // },
    searchInputId: {
        type: String,
        default: 'searchInput'
    }
});

// Emits
const emit = defineEmits([
    'update:modelValue',
    // 'update:startDate', 
    // 'update:endDate',
    'clear-search',
    // 'clear-date-range',
    'clear-all'
]);

// Computed properties
// const startDateId = computed(() => `${props.searchInputId}StartDate`);
// const endDateId = computed(() => `${props.searchInputId}EndDate`);

const hasActiveFilters = computed(() => {
    return (props.modelValue && props.modelValue.trim()) 
    // || 
        //    (props.showDateRange && (props.startDate || props.endDate));
});

const hasMultipleActiveFilters = computed(() => {
    const hasSearch = props.modelValue && props.modelValue.trim();
    // const hasDateRange = props.showDateRange && (props.startDate || props.endDate);
    return hasSearch 
    // && hasDateRange;
});

// Methods
function clearSearch() {
    emit('update:modelValue', '');
    emit('clear-search');
}

// function clearDateRange() {
//     emit('update:startDate', '');
//     emit('update:endDate', '');
//     emit('clear-date-range');
// }

function clearAllFilters() {
    clearSearch();
    // clearDateRange();
    emit('clear-all');
}
</script>
