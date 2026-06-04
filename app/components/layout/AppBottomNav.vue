<template>
  <nav class="bottom-nav">
    <NuxtLink
      to="/dashboard"
      :class="['bottom-nav-item', { 'bottom-nav-item--active': route.path === '/dashboard' }]"
    >
      <IconLayoutDashboard :size="22" stroke-width="1.75" />
      <span>Dashboard</span>
    </NuxtLink>

    <NuxtLink
      to="/transactions"
      :class="['bottom-nav-item', { 'bottom-nav-item--active': isTransactionsActive }]"
    >
      <IconReceipt2 :size="22" stroke-width="1.75" />
      <span>Transaksi</span>
    </NuxtLink>

    <NuxtLink to="/transactions/new" class="bottom-nav-fab" aria-label="Tambah transaksi">
      <IconPlus :size="24" stroke-width="2" />
    </NuxtLink>

    <NuxtLink
      to="/categories"
      :class="['bottom-nav-item', { 'bottom-nav-item--active': route.path === '/categories' }]"
    >
      <IconTag :size="22" stroke-width="1.75" />
      <span>Kategori</span>
    </NuxtLink>

    <NuxtLink
      to="/settings"
      :class="['bottom-nav-item', { 'bottom-nav-item--active': route.path === '/settings' }]"
    >
      <IconSettings :size="22" stroke-width="1.75" />
      <span>Settings</span>
    </NuxtLink>
  </nav>
</template>

<script setup lang="ts">
import {
  IconLayoutDashboard,
  IconReceipt2,
  IconPlus,
  IconTag,
  IconSettings,
} from '@tabler/icons-vue'

const route = useRoute()

const isTransactionsActive = computed(
  () => route.path === '/transactions' || route.path === '/transactions/new',
)
</script>

<style scoped>
.bottom-nav {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  height: var(--bottomnav-height);
  background: var(--color-bottomnav-bg);
  border-top: 1px solid var(--color-border);
  display: flex;
  align-items: center;
  justify-content: space-around;
  z-index: 100;
}

@media (min-width: 640px) {
  .bottom-nav {
    display: none;
  }
}

.bottom-nav-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 3px;
  flex: 1;
  color: var(--color-bottomnav-text);
  text-decoration: none;
  font-size: 10px;
  font-weight: 500;
  padding: 8px 0;
  transition: color 0.15s;
}

.bottom-nav-item--active {
  color: var(--color-bottomnav-text-active);
}

.bottom-nav-fab {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 48px;
  height: 48px;
  border-radius: 50%;
  background: var(--color-fab-bg);
  color: var(--color-fab-text);
  text-decoration: none;
  flex-shrink: 0;
  margin-bottom: 4px;
  transition: opacity 0.15s;
}

.bottom-nav-fab:active {
  opacity: 0.8;
}
</style>
