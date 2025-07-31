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

function stripLeadingZeros(str) {
  // Remove leading zeros but keep "0" if that's the only digit before decimal
  return str.replace(/^0+(\d)/, '$1')
}

function handleInput(event) {
  let value = event.target.value
  // Remove leading zeros unless it's "0." for decimals
  if (!/^0\./.test(value)) {
    value = stripLeadingZeros(value)
  }
  currentValue.value = value
}

function handleFocus() {
  editing.value = true
  currentValue.value = props.modelValue.toString()
}

function evaluate() {
  editing.value = false
  let expression = currentValue.value
    .replace(/[^\d.+\-*/()]/g, '')

  // Remove leading zeros unless it's "0." for decimals
  if (!/^0\./.test(expression)) {
    expression = stripLeadingZeros(expression)
  }

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