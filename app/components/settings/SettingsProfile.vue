<template>
  <section class="card">
    <h2 class="card-title">Akun Saya</h2>

    <div v-if="pending" class="skeleton-block" />
    <template v-else-if="user">
      <div class="field">
        <span class="field-label">Nama</span>
        <span class="field-value">{{ user.name }}</span>
      </div>
      <div class="field">
        <span class="field-label">Email</span>
        <span class="field-value">{{ user.email }}</span>
      </div>

      <div class="field field--stack">
        <label class="field-label" for="tg-id">Telegram User ID</label>
        <p class="field-hint">
          ID numerik Telegram untuk input transaksi via bot. Kirim
          <code>/start</code> ke bot lalu salin ID yang dibalas.
        </p>
        <div class="inline-edit">
          <input
            id="tg-id"
            v-model="telegramInput"
            type="text"
            inputmode="numeric"
            class="text-input"
            placeholder="cth. 123456789"
            :disabled="saving"
          />
          <button
            type="button"
            class="btn btn--primary"
            :disabled="saving || !dirty"
            @click="save"
          >
            <IconLoader2 v-if="saving" :size="16" class="spin" />
            <span>Simpan</span>
          </button>
        </div>
      </div>
    </template>
  </section>
</template>

<script setup lang="ts">
import { IconLoader2 } from '@tabler/icons-vue'
import { useToast } from 'vue-toastification'
import type { UserProfile } from '~/composables/useCurrentUser'

const props = defineProps<{
  user: UserProfile | null
  pending: boolean
}>()

const emit = defineEmits<{
  saved: []
}>()

const toast = useToast()

const telegramInput = ref('')
watchEffect(() => {
  telegramInput.value = props.user?.telegram_user_id ?? ''
})

const saving = ref(false)
const dirty = computed(
  () => telegramInput.value.trim() !== (props.user?.telegram_user_id ?? ''),
)

async function save() {
  if (!props.user || !dirty.value) return
  saving.value = true
  try {
    await $fetch(`/api/users/${props.user.id}`, {
      method: 'PATCH',
      body: { telegram_user_id: telegramInput.value.trim() || null },
    })
    toast.success('Profil diperbarui')
    emit('saved')
  } catch {
    toast.error('Gagal memperbarui profil')
  } finally {
    saving.value = false
  }
}
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

.field {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.field--stack {
  flex-direction: column;
  align-items: stretch;
  gap: 6px;
}

.field-label {
  font-size: 13px;
  font-weight: 500;
  color: var(--color-text-subtle);
}

.field-value {
  font-size: 14px;
  font-weight: 500;
  color: var(--color-text);
  text-align: right;
  word-break: break-word;
}

.field-hint {
  font-size: 12px;
  color: var(--color-text-subtle);
  line-height: 1.5;
}

.field-hint code {
  background: var(--color-bg-subtle);
  border: 1px solid var(--color-border);
  border-radius: 4px;
  padding: 1px 5px;
  font-size: 11px;
}

.inline-edit {
  display: flex;
  gap: 8px;
}

.text-input {
  flex: 1;
  min-width: 0;
  padding: 10px 12px;
  font-size: 14px;
  color: var(--color-text);
  background: var(--color-bg);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  outline: none;
  transition: border-color 0.15s;
}

.text-input:focus {
  border-color: var(--color-text);
}

.text-input:disabled {
  opacity: 0.5;
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
  transition: opacity 0.15s, background 0.15s;
}

.btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn--primary {
  background: var(--color-text);
  color: #ffffff;
}

.skeleton-block {
  height: 64px;
  background: var(--color-bg-subtle);
  border-radius: var(--radius-sm);
  animation: pulse 1.5s ease-in-out infinite;
}
</style>
