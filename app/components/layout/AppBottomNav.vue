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

    <button
      type="button"
      :class="['bottom-nav-item', { 'bottom-nav-item--active': isMoreActive }]"
      @click="moreOpen = true"
    >
      <IconDots :size="22" stroke-width="1.75" />
      <span>Lainnya</span>
    </button>
  </nav>

  <Teleport to="body">
    <div v-if="moreOpen" class="more-backdrop" @click="moreOpen = false" />
    <div v-if="moreOpen" class="more-sheet" role="dialog" aria-label="Menu lainnya">
      <div class="more-handle" />
      <NuxtLink
        v-for="item in moreItems"
        :key="item.path"
        :to="item.path"
        class="more-item"
        @click="moreOpen = false"
      >
        <component :is="item.icon" :size="20" stroke-width="1.75" />
        <span>{{ item.label }}</span>
      </NuxtLink>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import {
  IconLayoutDashboard,
  IconReceipt2,
  IconPlus,
  IconTag,
  IconDots,
  IconChefHat,
  IconSalad,
  IconToolsKitchen2,
  IconSettings,
} from '@tabler/icons-vue'

const route = useRoute()
const moreOpen = ref(false)

const moreItems = [
  { path: '/menu', label: 'Menu', icon: IconChefHat },
  { path: '/ingredients', label: 'Bahan Baku', icon: IconSalad },
  { path: '/menu/categories', label: 'Kategori Menu', icon: IconToolsKitchen2 },
  { path: '/settings', label: 'Settings', icon: IconSettings },
]

const isTransactionsActive = computed(
  () => route.path === '/transactions' || route.path === '/transactions/new',
)

const isMoreActive = computed(() => moreItems.some((i) => route.path === i.path || route.path.startsWith(i.path + '/')))

// Close the sheet on route change
watch(() => route.path, () => { moreOpen.value = false })
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
  background: transparent;
  border: none;
  cursor: pointer;
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

.more-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.4);
  z-index: 110;
}

@media (min-width: 640px) {
  .more-backdrop,
  .more-sheet {
    display: none;
  }
}

.more-sheet {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 111;
  background: var(--color-bg);
  border-top-left-radius: var(--radius-md);
  border-top-right-radius: var(--radius-md);
  padding: 8px 12px calc(var(--bottomnav-height) + 12px);
  display: flex;
  flex-direction: column;
  gap: 2px;
  box-shadow: 0 -8px 24px rgba(0, 0, 0, 0.12);
}

.more-handle {
  width: 36px;
  height: 4px;
  border-radius: 999px;
  background: var(--color-border);
  margin: 4px auto 8px;
}

.more-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px 8px;
  color: var(--color-text);
  text-decoration: none;
  font-size: 15px;
  font-weight: 500;
  border-radius: var(--radius-sm);
}

.more-item:active {
  background: var(--color-bg-subtle);
}
</style>
