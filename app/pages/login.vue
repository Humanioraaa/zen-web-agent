<template>
  <div class="login-page">
    <div class="login-card">
      <div class="login-brand">
        <IconCoffee :size="32" stroke-width="1.5" />
        <h1>Zen Coffee</h1>
        <p>Masuk untuk melanjutkan</p>
      </div>

      <form class="login-form" @submit.prevent="handleLogin">
        <div class="field">
          <label class="field-label" for="email">Email</label>
          <input
            id="email"
            v-model="email"
            type="email"
            class="field-input"
            placeholder="nama@email.com"
            autocomplete="email"
            :disabled="isLoading"
            required
          />
        </div>

        <div class="field">
          <label class="field-label" for="password">Password</label>
          <input
            id="password"
            v-model="password"
            type="password"
            class="field-input"
            placeholder="••••••••"
            autocomplete="current-password"
            :disabled="isLoading"
            required
          />
        </div>

        <p v-if="errorMessage" class="error-message">{{ errorMessage }}</p>

        <button type="submit" class="submit-btn" :disabled="isLoading">
          <IconLoader2 v-if="isLoading" :size="18" class="spin" />
          <span>{{ isLoading ? 'Masuk...' : 'Masuk' }}</span>
        </button>
      </form>
    </div>
  </div>
</template>

<script setup lang="ts">
import { IconCoffee, IconLoader2 } from '@tabler/icons-vue'

definePageMeta({ layout: false })

const supabase = useSupabaseClient()
const user = useSupabaseUser()
const { fetchProfile } = useCurrentUser()

const email = ref('')
const password = ref('')
const isLoading = ref(false)
const errorMessage = ref('')

watchEffect(() => {
  if (user.value) navigateTo('/dashboard')
})

async function handleLogin() {
  errorMessage.value = ''
  isLoading.value = true

  const { error } = await supabase.auth.signInWithPassword({
    email: email.value,
    password: password.value,
  })

  if (error) {
    isLoading.value = false
    errorMessage.value = 'Email atau password salah'
    return
  }

  try {
    const profile = await fetchProfile()
    await navigateTo(profile.onboarding_completed ? '/dashboard' : '/onboarding')
  } catch {
    await navigateTo('/dashboard')
  }
}
</script>

<style scoped>
.login-page {
  min-height: 100dvh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--color-bg-subtle);
  padding: 1rem;
}

.login-card {
  width: 100%;
  max-width: 380px;
  background: var(--color-bg);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  padding: 2rem;
}

.login-brand {
  text-align: center;
  margin-bottom: 2rem;
  color: var(--color-text);
}

.login-brand h1 {
  font-size: 20px;
  font-weight: 700;
  margin: 10px 0 6px;
}

.login-brand p {
  font-size: 14px;
  color: var(--color-text-subtle);
}

.login-form {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.field {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.field-label {
  font-size: 14px;
  font-weight: 500;
  color: var(--color-text);
}

.field-input {
  padding: 10px 12px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  font-size: 15px;
  color: var(--color-text);
  background: var(--color-bg);
  outline: none;
  transition: border-color 0.15s;
  width: 100%;
}

.field-input:focus {
  border-color: var(--color-text);
}

.field-input:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.error-message {
  font-size: 14px;
  color: var(--color-danger);
  background: var(--color-danger-bg);
  border: 1px solid var(--color-danger-border);
  border-radius: var(--radius-sm);
  padding: 10px 12px;
}

.submit-btn {
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
  margin-top: 4px;
}

.submit-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

</style>
