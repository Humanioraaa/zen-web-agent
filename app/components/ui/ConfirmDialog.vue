<template>
  <Teleport to="body">
    <Transition name="dialog-fade">
      <div v-if="open" class="dialog-overlay" @click.self="onCancel">
        <div class="dialog" role="dialog" aria-modal="true">
          <h3 class="dialog-title">{{ title }}</h3>
          <p v-if="message" class="dialog-message">{{ message }}</p>
          <div class="dialog-actions">
            <button
              type="button"
              class="dialog-btn dialog-btn--cancel"
              :disabled="loading"
              @click="onCancel"
            >
              {{ cancelLabel }}
            </button>
            <button
              type="button"
              :class="['dialog-btn', danger ? 'dialog-btn--danger' : 'dialog-btn--primary']"
              :disabled="loading"
              @click="emit('confirm')"
            >
              <IconLoader2 v-if="loading" :size="16" class="spin" />
              <span>{{ confirmLabel }}</span>
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { IconLoader2 } from '@tabler/icons-vue'

const props = withDefaults(
  defineProps<{
    open: boolean
    title: string
    message?: string
    confirmLabel?: string
    cancelLabel?: string
    danger?: boolean
    loading?: boolean
  }>(),
  {
    message: '',
    confirmLabel: 'Konfirmasi',
    cancelLabel: 'Batal',
    danger: false,
    loading: false,
  },
)

const emit = defineEmits<{ confirm: []; cancel: [] }>()

function onCancel() {
  if (props.loading) return
  emit('cancel')
}
</script>

<style scoped>
.dialog-overlay {
  position: fixed;
  inset: 0;
  z-index: 1000;
  background: rgba(0, 0, 0, 0.45);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1rem;
}

.dialog {
  width: 100%;
  max-width: 360px;
  background: var(--color-bg);
  border-radius: var(--radius-md);
  padding: 1.5rem;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.dialog-title {
  font-size: 17px;
  font-weight: 700;
  color: var(--color-text);
}

.dialog-message {
  font-size: 14px;
  line-height: 1.6;
  color: var(--color-text-subtle);
}

.dialog-actions {
  display: flex;
  gap: 10px;
  margin-top: 0.5rem;
}

.dialog-btn {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 10px;
  border-radius: var(--radius-sm);
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  border: 1px solid transparent;
  transition: opacity 0.15s, border-color 0.15s, color 0.15s;
}

.dialog-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.dialog-btn--cancel {
  background: transparent;
  border-color: var(--color-border);
  color: var(--color-text-subtle);
}

.dialog-btn--cancel:hover:not(:disabled) {
  color: var(--color-text);
  border-color: var(--color-text);
}

.dialog-btn--primary {
  background: var(--color-text);
  color: #ffffff;
}

.dialog-btn--danger {
  background: #dc2626;
  color: #ffffff;
}

.spin {
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.dialog-fade-enter-active,
.dialog-fade-leave-active {
  transition: opacity 0.15s ease;
}

.dialog-fade-enter-from,
.dialog-fade-leave-to {
  opacity: 0;
}
</style>
