<template>
  <aside class="sidebar">
    <div class="sidebar-brand">
      <IconCoffee :size="22" stroke-width="1.75" />
      <span>Zen Coffee</span>
    </div>

    <nav class="sidebar-nav">
      <NuxtLink
        v-for="item in navItems"
        :key="item.path"
        :to="item.path"
        :class="['nav-item', { 'nav-item--active': isActive(item.path) }]"
      >
        <component :is="item.icon" :size="20" stroke-width="1.75" />
        <span>{{ item.label }}</span>
      </NuxtLink>
    </nav>

    <div class="sidebar-footer">
      <button class="nav-item" @click="logout">
        <IconLogout :size="20" stroke-width="1.75" />
        <span>Logout</span>
      </button>
    </div>
  </aside>
</template>

<script setup lang="ts">
import {
  IconCoffee,
  IconLayoutDashboard,
  IconReceipt2,
  IconTag,
  IconSettings,
  IconLogout,
} from '@tabler/icons-vue'

const navItems = [
  { path: '/dashboard', label: 'Dashboard', icon: IconLayoutDashboard },
  { path: '/transactions', label: 'Transaksi', icon: IconReceipt2 },
  { path: '/categories', label: 'Kategori', icon: IconTag },
  { path: '/settings', label: 'Settings', icon: IconSettings },
]

const route = useRoute()

function isActive(path: string): boolean {
  if (path === '/dashboard') return route.path === path
  return route.path === path || route.path.startsWith(path + '/')
}

async function logout() {
  const supabase = useSupabaseClient()
  await supabase.auth.signOut()
  await navigateTo('/login')
}
</script>

<style scoped>
.sidebar {
  position: fixed;
  top: 0;
  left: 0;
  height: 100dvh;
  width: var(--sidebar-width);
  background: var(--color-sidebar-bg);
  display: none;
  flex-direction: column;
  z-index: 100;
}

@media (min-width: 640px) {
  .sidebar {
    display: flex;
  }
}

.sidebar-brand {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 20px 16px;
  color: var(--color-sidebar-text-active);
  font-weight: 600;
  font-size: 15px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
}

.sidebar-nav {
  flex: 1;
  padding: 12px 8px;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.nav-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  border-radius: var(--radius-sm);
  color: var(--color-sidebar-text);
  font-size: 14px;
  font-weight: 500;
  text-decoration: none;
  background: transparent;
  border: none;
  cursor: pointer;
  width: 100%;
  transition: background 0.15s, color 0.15s;
}

.nav-item:hover {
  background: var(--color-sidebar-item-active);
  color: var(--color-sidebar-text-active);
}

.nav-item--active {
  background: var(--color-sidebar-item-active);
  color: var(--color-sidebar-text-active);
}

.sidebar-footer {
  padding: 8px;
  border-top: 1px solid rgba(255, 255, 255, 0.06);
}
</style>
