<template>
  <div class="app-shell">
    <LayoutAppSidebar />
    <div class="app-content">
      <LayoutAppHeader />
      <main class="app-main">
        <slot />
      </main>
    </div>
    <LayoutAppBottomNav />
  </div>
</template>

<style scoped>
.app-shell {
  display: flex;
  min-height: 100dvh;
}

.app-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-width: 0;
  padding-bottom: var(--bottomnav-height);
}

.app-main {
  flex: 1;
  padding: 1rem;
}

@media (min-width: 640px) {
  .app-content {
    margin-left: var(--sidebar-width);
    padding-bottom: 0;
  }
}
</style>
