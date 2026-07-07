<template>
  <span :class="['co-badge', `co-badge--${status}`]">{{ label(status) }}</span>
</template>

<script setup lang="ts">
import type { CustomOrderStatus } from '~/types/custom-order'

defineProps<{ status: CustomOrderStatus }>()
const { label } = useCustomOrderStatus()
</script>

<style scoped>
.co-badge {
  font-size: 11px;
  font-weight: 600;
  padding: 3px 8px;
  border-radius: 999px;
  white-space: nowrap;
}
.co-badge--quote {
  background: var(--color-bg-subtle);
  color: var(--color-text-subtle);
}
.co-badge--confirmed {
  background: #dbeafe;
  color: #1e40af;
}
.co-badge--in_progress {
  background: #fef3c7;
  color: #92400e;
}
.co-badge--done {
  background: var(--color-success-bg, #dcfce7);
  color: var(--color-success, #166534);
}
.co-badge--cancelled {
  background: #fee2e2;
  color: #991b1b;
}
</style>
