<template>
  <div class="settings-page">
    <h1 class="page-heading">Settings</h1>

    <SettingsProfile :user="me" :pending="mePending" @saved="refreshAll" />
    <SettingsTeam :users="users" :me-id="me?.id ?? null" :pending="usersPending" />
    <SettingsWallets />

    <section class="card">
      <h2 class="card-title">Bot Settings</h2>
      <ul class="info-list">
        <li class="info-item">
          PIN threshold: Transaksi di atas Rp500.000 memerlukan konfirmasi PIN
        </li>
        <li class="info-item">Reminder harian: Aktif pukul 18:00 WIB</li>
        <li class="info-item">
          Untuk mengubah konfigurasi bot, edit file .env lalu redeploy.
        </li>
      </ul>
    </section>

    <SettingsBackup />

    <section class="card">
      <button type="button" class="btn btn--danger-outline" @click="logout">
        <IconLogout :size="18" />
        <span>Keluar</span>
      </button>
    </section>
  </div>
</template>

<script setup lang="ts">
import { IconLogout } from '@tabler/icons-vue'
import type { UserProfile } from '~/composables/useCurrentUser'

const { logout } = useLogout()

const { data: meData, pending: mePending, refresh: refreshMe } = await useFetch<{ data: UserProfile }>('/api/auth/me')
const me = computed(() => meData.value?.data ?? null)

const { data: usersData, pending: usersPending, refresh: refreshUsers } =
  await useFetch<{ data: UserProfile[] }>('/api/users')
const users = computed(() => usersData.value?.data ?? [])

async function refreshAll() {
  await Promise.all([refreshMe(), refreshUsers()])
}
</script>

<style scoped>
.settings-page {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  max-width: 560px;
  padding-top: 0.5rem;
}

.page-heading {
  display: none;
  font-size: 22px;
  font-weight: 700;
  color: var(--color-text);
}

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

.info-list {
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.info-item {
  font-size: 13px;
  line-height: 1.5;
  color: var(--color-text-subtle);
  padding: 10px 12px;
  background: var(--color-bg-subtle);
  border-radius: var(--radius-sm);
}

.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 10px 16px;
  border-radius: var(--radius-sm);
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  border: 1px solid transparent;
  flex-shrink: 0;
  transition: opacity 0.15s, background 0.15s, color 0.15s;
}

.btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn--danger-outline {
  width: 100%;
  background: transparent;
  border-color: var(--color-border);
  color: var(--color-danger);
}

.btn--danger-outline:hover {
  background: var(--color-bg-subtle);
}

@media (min-width: 640px) {
  .page-heading {
    display: block;
  }
}
</style>
