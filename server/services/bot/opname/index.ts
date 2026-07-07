import { serverSupabaseServiceRole } from '#supabase/server'
import type { H3Event, AppUser, BotSession } from '../types'
import type { OpnameContext } from '~~/server/repositories/botSessionRepository'
import { saveSession, clearSession } from '~~/server/repositories/botSessionRepository'
import { findCategoryByName } from '~~/server/repositories/categoryRepository'
import { getOrCreateAreaOpname } from '~~/server/services/stock-count-service'
import { sendMessage, editMessage } from '~~/server/services/telegramService'
import { todayIso } from '../utils'
import { opnameBaseContext } from './helpers'
import { showCurrentItem, listRemaining } from './present'
import { recordCurrent, skipCurrent } from './count'
import { handleJumpByName, applyJump } from './jump'
import { handleBulkCount } from './bulk'
import { startFinalize, doFinalize } from './finalize'

// Each command maps to an ingredient category (area). Resolved by name so it stays
// portable to staging (never hardcode the prod category UUIDs).
const AREAS: Record<'kitchen' | 'bar', { category_name: string; label: string }> = {
  kitchen: { category_name: 'Bahan Baku Kitchen', label: 'Kitchen' },
  bar: { category_name: 'Bahan Baku Bar', label: 'Bar' },
}

// ---------- command entry: /opname-kitchen, /opname-bar ----------

export async function startAreaOpname(
  event: H3Event,
  user: AppUser,
  session: BotSession,
  chatId: number,
  area: 'kitchen' | 'bar',
): Promise<void> {
  const client = serverSupabaseServiceRole(event)
  const cfg = AREAS[area]
  const category = await findCategoryByName(event, cfg.category_name, 'expense', client)
  if (!category) {
    await sendMessage(chatId, `⚠️ Kategori "${cfg.category_name}" tidak ditemukan. Cek kategori bahan di web app.`)
    return
  }

  const { id, resumed } = await getOrCreateAreaOpname(
    event,
    { created_by: user.id, category_id: category.id, count_date: todayIso() },
    client,
  )

  const opname: OpnameContext = {
    stock_count_id: id,
    category_id: category.id,
    area_label: cfg.label,
    cursor_item_id: null,
    pending_new: [],
  }
  session.state = 'AWAITING_OPNAME_COUNT'
  session.context = opnameBaseContext(opname)
  await saveSession(event, session)

  const intro = resumed
    ? `↩️ Lanjut opname <b>${cfg.label}</b> (sesi tersimpan).`
    : `🆕 Mulai opname <b>${cfg.label}</b>.`
  await sendMessage(chatId, intro)
  await showCurrentItem(event, session, chatId, client)
}

// ---------- text router (AWAITING_OPNAME_*) ----------

export async function handleOpnameText(
  event: H3Event,
  session: BotSession,
  chatId: number,
  text: string,
): Promise<void> {
  const ctx = session.context?.opname
  if (!ctx) {
    await clearSession(event, session.telegram_user_id)
    await sendMessage(chatId, 'Sesi opname hilang. Ketik /opname-kitchen atau /opname-bar.')
    return
  }
  const client = serverSupabaseServiceRole(event)
  const t = text.trim()
  const lower = t.toLowerCase()

  // Pause: draft (and its counted lines) persist in the DB → resumable later.
  if (lower === '/batal') {
    await clearSession(event, session.telegram_user_id)
    await sendMessage(
      chatId,
      `⏸ Opname ${ctx.area_label} dijeda. Hitungan tersimpan.\nKetik /opname-${ctx.area_label.toLowerCase()} untuk lanjut.`,
    )
    return
  }
  if (lower === '/selesai') {
    await startFinalize(event, session, chatId, client)
    return
  }

  // Guard the non-count states — those expect a button, not free text.
  if (session.state === 'AWAITING_OPNAME_PENDING') {
    await sendMessage(chatId, 'Pilih dulu: 🆕 catat temuan atau ✖️ bukan (tombol di atas).')
    return
  }
  if (session.state === 'AWAITING_OPNAME_JUMP') {
    await sendMessage(chatId, 'Pilih bahan dari tombol di atas, atau ❌ Batal.')
    return
  }
  if (session.state === 'AWAITING_OPNAME_FINALIZE') {
    await sendMessage(chatId, 'Pilih: ✅ finalisasi atau ↩️ lanjut hitung (tombol di atas).')
    return
  }

  // AWAITING_OPNAME_COUNT
  if (lower === 'skip' || lower === '/skip') {
    await skipCurrent(event, session, chatId, client)
    return
  }
  if (lower === 'sisa' || lower === '/sisa') {
    await listRemaining(event, session, chatId, client)
    return
  }
  // Multi-line message → bulk: each line "nama jumlah" set at once.
  if (t.includes('\n')) {
    await handleBulkCount(event, session, chatId, client, t)
    return
  }
  // Number-leading → a physical count for the current item.
  if (/^\d/.test(t)) {
    await recordCurrent(event, session, chatId, client, t)
    return
  }
  // Otherwise → jump/correct by name (or capture a pending find).
  await handleJumpByName(event, session, chatId, client, t)
}

// ---------- callbacks (opn_*) ----------

export async function handleOpnameCallback(
  event: H3Event,
  session: BotSession,
  chatId: number,
  data: string,
  messageId: number,
): Promise<void> {
  const ctx = session.context?.opname
  const client = serverSupabaseServiceRole(event)
  if (!ctx) {
    await editMessage(chatId, messageId, 'Sesi opname hilang. Ketik /opname-kitchen atau /opname-bar.')
    return
  }

  if (data === 'opn_pending_yes' && session.state === 'AWAITING_OPNAME_PENDING') {
    const nm = ctx.pending_name
    if (nm) ctx.pending_new.push({ name: nm, qty: ctx.pending_qty ?? null })
    ctx.pending_name = undefined
    ctx.pending_qty = null
    session.state = 'AWAITING_OPNAME_COUNT'
    await saveSession(event, session)
    await editMessage(chatId, messageId, `🆕 "${nm ?? '-'}" dicatat sebagai temuan (belum jadi bahan).`)
    await showCurrentItem(event, session, chatId, client)
    return
  }
  if (data === 'opn_pending_no' && session.state === 'AWAITING_OPNAME_PENDING') {
    ctx.pending_name = undefined
    ctx.pending_qty = null
    session.state = 'AWAITING_OPNAME_COUNT'
    await saveSession(event, session)
    await editMessage(chatId, messageId, '✖️ Oke, diabaikan.')
    await showCurrentItem(event, session, chatId, client)
    return
  }

  if (data === 'opn_jump_none' && session.state === 'AWAITING_OPNAME_JUMP') {
    ctx.jump_qty_text = null
    ctx.jump_candidates = undefined
    session.state = 'AWAITING_OPNAME_COUNT'
    await saveSession(event, session)
    await editMessage(chatId, messageId, '❌ Dibatalkan.')
    await showCurrentItem(event, session, chatId, client)
    return
  }
  if (data.startsWith('opnjump_') && session.state === 'AWAITING_OPNAME_JUMP') {
    const ingId = data.replace('opnjump_', '')
    const qtyText = ctx.jump_qty_text ?? null
    ctx.jump_qty_text = null
    ctx.jump_candidates = undefined
    await saveSession(event, session)
    await editMessage(chatId, messageId, '➡️ Oke.')
    await applyJump(event, session, chatId, client, ingId, qtyText)
    return
  }

  if (data === 'opn_finalize_yes' && session.state === 'AWAITING_OPNAME_FINALIZE') {
    await editMessage(chatId, messageId, '⏳ Memfinalisasi…')
    await doFinalize(event, session, chatId, client)
    return
  }
  if (data === 'opn_finalize_no' && session.state === 'AWAITING_OPNAME_FINALIZE') {
    session.state = 'AWAITING_OPNAME_COUNT'
    await saveSession(event, session)
    await editMessage(chatId, messageId, '↩️ Lanjut menghitung.')
    await showCurrentItem(event, session, chatId, client)
    return
  }
}
