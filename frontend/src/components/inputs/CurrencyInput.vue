<template>
  <input type="text" :value="editing ? currentValue : formattedValue" class="form-control" @input="handleInput"
    @focus="handleFocus" @blur="handleBlur" @keydown.enter.prevent="handleEnter" ref="input"
    placeholder="Enter amount or math expression" />
</template>

<script setup>
import { ref, computed, nextTick } from 'vue'

const props = defineProps({
  modelValue: {
    type: Number,
    default: 0
  }
})

const emit = defineEmits(['update:modelValue'])
const input = ref(null)
const editing = ref(false)
const currentValue = ref('')

const formattedValue = computed(() => {
  const value = Math.abs(props.modelValue)
  return value.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  })
})

function handleInput(event) {
  currentValue.value = event.target.value
}

function handleFocus() {
  editing.value = true
  currentValue.value = props.modelValue.toString()
}

function evaluate() {
  editing.value = false
  let expression = currentValue.value
    .replace(/[^\d.+\-*/()]/g, '')

  try {
    const result = evaluateExpression(expression)
    if (!isNaN(result)) {
      emit('update:modelValue', result)
    }
  } catch (error) {
    const numberValue = parseFloat(expression)
    if (!isNaN(numberValue)) {
      emit('update:modelValue', numberValue)
    }
  }
}

function handleBlur(event) {
  evaluate()
}

function evaluateExpression(expr) {
  if (!/^[\d.+\-*/()]+$/.test(expr)) {
    throw new Error('Invalid characters in expression')
  }

  const result = new Function(`return ${expr}`)()
  return Math.round(result * 100) / 100
}

function selectAll() {
  input.value?.select()
}

function handleEnter(event) {
  // First prevent default to handle evaluation
  event.preventDefault()
  evaluate()

  // Find the closest form and submit it
  nextTick(() => {
    const form = event.target.closest('form')
    if (form) {
      form.requestSubmit()
    }
  })
}

defineExpose({
  selectAll
})
</script>