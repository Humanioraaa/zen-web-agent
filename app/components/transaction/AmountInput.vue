<template>
  <div class="amount-input" :class="{ 'amount-input--disabled': disabled }">
    <span class="amount-prefix">Rp</span>
    <input
      :value="display"
      type="text"
      inputmode="numeric"
      class="amount-field"
      placeholder="0"
      :disabled="disabled"
      @input="onInput"
    />
  </div>
</template>

<script setup lang="ts">
const model = defineModel<number>({ default: 0 })
defineProps<{ disabled?: boolean }>()

const thousands = new Intl.NumberFormat('id-ID')

function format(n: number): string {
  return n ? thousands.format(n) : ''
}

const display = ref(format(model.value))

function onInput(e: Event) {
  const raw = (e.target as HTMLInputElement).value.replace(/\D/g, '')
  const num = raw ? Number(raw) : 0
  model.value = num
  display.value = format(num)
}

// keep display in sync when model is reset/changed externally (e.g. type switch)
watch(model, (val) => {
  if (Number(display.value.replace(/\D/g, '') || 0) !== val) {
    display.value = format(val)
  }
})
</script>

<style scoped>
.amount-input {
  display: flex;
  align-items: center;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  overflow: hidden;
  transition: border-color 0.15s;
}

.amount-input:focus-within {
  border-color: var(--color-text);
}

.amount-input--disabled {
  opacity: 0.5;
}

.amount-prefix {
  padding: 12px 10px 12px 14px;
  font-size: 16px;
  color: var(--color-text-subtle);
  background: var(--color-bg-subtle);
  border-right: 1px solid var(--color-border);
  user-select: none;
}

.amount-field {
  flex: 1;
  width: 100%;
  padding: 12px 14px;
  font-size: 20px;
  font-weight: 700;
  color: var(--color-text);
  border: none;
  outline: none;
  background: var(--color-bg);
}

.amount-field:disabled {
  cursor: not-allowed;
}
</style>
