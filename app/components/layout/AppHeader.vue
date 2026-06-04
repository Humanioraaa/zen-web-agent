<template>
  <header class="app-header">
    <span class="app-header-title">{{ pageTitle }}</span>
  </header>
</template>

<script setup lang="ts">
const route = useRoute()

const titleMap: Record<string, string> = {
  '/dashboard': 'Dashboard',
  '/transactions': 'Transaksi',
  '/transactions/new': 'Tambah Transaksi',
  '/categories': 'Kategori',
  '/settings': 'Settings',
}

const pageTitle = computed(() => titleMap[route.path] ?? 'Zen Coffee')
</script>

<style scoped>
.app-header {
  height: var(--header-height);
  display: flex;
  align-items: center;
  padding: 0 16px;
  border-bottom: 1px solid var(--color-border);
  background: var(--color-bg);
  position: sticky;
  top: 0;
  z-index: 50;
}

@media (min-width: 640px) {
  .app-header {
    display: none;
  }
}

.app-header-title {
  font-size: 17px;
  font-weight: 600;
  color: var(--color-text);
}
</style>
