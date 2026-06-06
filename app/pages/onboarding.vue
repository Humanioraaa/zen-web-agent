<template>
  <div class="onboarding-page">
    <div class="onboarding-card">

      <!-- Step 1: Welcome -->
      <template v-if="step === 1">
        <div class="onboarding-icon">
          <IconCoffee :size="40" stroke-width="1.5" />
        </div>
        <h1 class="onboarding-title">Selamat datang di Zen Coffee</h1>
        <p class="onboarding-desc">
          Sebelum mulai, masukkan saldo awal untuk setiap wallet.
          Ini bisa diubah nanti di Settings.
        </p>
        <button class="primary-btn" @click="step = 2">Mulai Setup</button>
        <button class="ghost-btn" :disabled="isSubmitting" @click="handleSkip">Lewati</button>
      </template>

      <!-- Step 2: Balance form -->
      <template v-else>
        <h2 class="form-title">Saldo Awal Wallet</h2>
        <p class="onboarding-desc">Masukkan saldo saat ini. Biarkan 0 jika belum tahu.</p>

        <div class="wallet-fields">
          <div v-for="wallet in wallets" :key="wallet.id" class="field">
            <label class="field-label" :for="`wallet-${wallet.id}`">{{ wallet.name }}</label>
            <div class="field-input-wrapper">
              <span class="field-prefix">Rp</span>
              <input
                :id="`wallet-${wallet.id}`"
                v-model.number="balances[wallet.id]"
                type="number"
                min="0"
                step="1000"
                class="field-input"
                placeholder="0"
                :disabled="isSubmitting"
              />
            </div>
          </div>
        </div>

        <p v-if="errorMessage" class="error-message">{{ errorMessage }}</p>

        <button class="primary-btn" :disabled="isSubmitting" @click="handleSubmit">
          <IconLoader2 v-if="isSubmitting" :size="18" class="spin" />
          <span>{{ isSubmitting ? 'Menyimpan...' : 'Selesai' }}</span>
        </button>
        <button class="ghost-btn" :disabled="isSubmitting" @click="handleSkip">Lewati</button>
      </template>

    </div>
  </div>
</template>

<script setup lang="ts">
import { IconCoffee, IconLoader2 } from '@tabler/icons-vue'

definePageMeta({ layout: false })

const step = ref(1)
const isSubmitting = ref(false)
const errorMessage = ref('')

import type { Wallet } from '~/types/models'
const wallets = ref<Wallet[]>([])
const balances = ref<Record<string, number>>({})

onMounted(async () => {
  try {
    const response = await $fetch<{ data: Wallet[] }>('/api/wallets')
    wallets.value = response.data
    for (const wallet of response.data) {
      balances.value[wallet.id] = 0
    }
  } catch {
    errorMessage.value = 'Gagal memuat data wallet. Coba refresh halaman.'
  }
})

async function handleSubmit() {
  isSubmitting.value = true
  errorMessage.value = ''

  try {
    const payload = Object.entries(balances.value).map(([wallet_id, amount]) => ({
      wallet_id,
      amount: Number(amount) || 0,
    }))

    await $fetch('/api/wallets/opening-balances', {
      method: 'POST',
      body: { balances: payload },
    })

    await $fetch('/api/users/onboarding-complete', { method: 'POST' })
    await navigateTo('/dashboard')
  } catch {
    isSubmitting.value = false
    errorMessage.value = 'Gagal menyimpan. Coba lagi.'
  }
}

async function handleSkip() {
  isSubmitting.value = true
  try {
    await $fetch('/api/users/onboarding-complete', { method: 'POST' })
    await navigateTo('/dashboard')
  } catch {
    isSubmitting.value = false
    errorMessage.value = 'Terjadi kesalahan. Coba lagi.'
  }
}
</script>

<style scoped>
.onboarding-page {
  min-height: 100dvh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--color-bg-subtle);
  padding: 1.5rem 1rem;
}

.onboarding-card {
  width: 100%;
  max-width: 420px;
  background: var(--color-bg);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  padding: 2rem;
  display: flex;
  flex-direction: column;
  gap: 1rem;
  text-align: center;
}

.onboarding-icon {
  color: var(--color-text);
  margin-bottom: 0.25rem;
}

.onboarding-title {
  font-size: 20px;
  font-weight: 700;
  color: var(--color-text);
}

.form-title {
  font-size: 18px;
  font-weight: 700;
  color: var(--color-text);
  text-align: left;
}

.onboarding-desc {
  font-size: 14px;
  color: var(--color-text-subtle);
  line-height: 1.6;
  text-align: left;
}

.wallet-fields {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  text-align: left;
}

.field {
  display: flex;
  flex-direction: column;
  gap: 5px;
}

.field-label {
  font-size: 14px;
  font-weight: 500;
  color: var(--color-text);
}

.field-input-wrapper {
  display: flex;
  align-items: center;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  overflow: hidden;
  transition: border-color 0.15s;
}

.field-input-wrapper:focus-within {
  border-color: var(--color-text);
}

.field-prefix {
  padding: 10px 10px 10px 12px;
  font-size: 14px;
  color: var(--color-text-subtle);
  background: var(--color-bg-subtle);
  border-right: 1px solid var(--color-border);
  user-select: none;
}

.field-input {
  flex: 1;
  padding: 10px 12px;
  font-size: 15px;
  color: var(--color-text);
  border: none;
  outline: none;
  background: var(--color-bg);
  width: 100%;
}

.field-input:disabled {
  opacity: 0.5;
}

.error-message {
  font-size: 14px;
  color: var(--color-danger);
  background: var(--color-danger-bg);
  border: 1px solid var(--color-danger-border);
  border-radius: var(--radius-sm);
  padding: 10px 12px;
  text-align: left;
}

.primary-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 11px;
  background: var(--color-text);
  color: #ffffff;
  border: none;
  border-radius: var(--radius-sm);
  font-size: 15px;
  font-weight: 600;
  cursor: pointer;
  transition: opacity 0.15s;
  width: 100%;
}

.primary-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.ghost-btn {
  padding: 10px;
  background: transparent;
  color: var(--color-text-subtle);
  border: none;
  font-size: 14px;
  cursor: pointer;
  transition: color 0.15s;
  width: 100%;
}

.ghost-btn:hover {
  color: var(--color-text);
}

.ghost-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

</style>
