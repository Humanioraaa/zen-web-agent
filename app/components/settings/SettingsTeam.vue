<template>
  <section class="card">
    <h2 class="card-title">Tim</h2>
    <div v-if="pending" class="skeleton-block" />
    <ul v-else class="team-list">
      <li v-for="u in users" :key="u.id" class="team-row">
        <span class="team-name">
          {{ u.name }}
          <span v-if="u.id === meId" class="badge">kamu</span>
        </span>
        <span :class="['tg-status', u.telegram_user_id ? 'tg-status--on' : 'tg-status--off']">
          <IconBrandTelegram :size="14" />
          {{ u.telegram_user_id ? 'Tersambung' : 'Belum' }}
        </span>
      </li>
    </ul>
  </section>
</template>

<script setup lang="ts">
import { IconBrandTelegram } from '@tabler/icons-vue'
import type { UserProfile } from '~/composables/useCurrentUser'

defineProps<{
  users: UserProfile[]
  meId: string | null
  pending: boolean
}>()
</script>

<style scoped>
.card {
  display: flex;
  flex-direction: column;
  gap: 14px;
  background: var(--color-bg);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  padding: 16px;
}

.card-title {
  font-size: 15px;
  font-weight: 700;
  color: var(--color-text);
}

.team-list {
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.team-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  padding: 10px 12px;
  background: var(--color-bg-subtle);
  border-radius: var(--radius-sm);
}

.team-name {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  font-weight: 500;
  color: var(--color-text);
}

.badge {
  font-size: 10px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.4px;
  color: var(--color-text-subtle);
  background: var(--color-bg);
  border: 1px solid var(--color-border);
  border-radius: 999px;
  padding: 2px 7px;
}

.tg-status {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  font-size: 12px;
  font-weight: 600;
}

.tg-status--on {
  color: var(--color-success);
}

.tg-status--off {
  color: var(--color-text-subtle);
}

.skeleton-block {
  height: 64px;
  background: var(--color-bg-subtle);
  border-radius: var(--radius-sm);
  animation: pulse 1.5s ease-in-out infinite;
}
</style>
