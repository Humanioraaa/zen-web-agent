import { GoogleGenerativeAI } from '@google/generative-ai'
import { serverSupabaseServiceRole } from '#supabase/server'
import type { H3Event } from 'h3'

export type GeminiErrorKind = 'network' | 'parse' | 'rate_limit' | 'unknown_error'

export interface GeminiParseResult {
  type: 'expense' | 'income' | 'transfer' | 'query' | 'unknown' | 'error'
  amount: number | null
  wallet: string | null
  wallet_to: string | null
  category: string | null
  item: string | null
  confidence: 'high' | 'low'
  errorKind?: GeminiErrorKind
}

function buildSystemPrompt(
  walletNames: string[],
  expenseCategories: string[],
  incomeCategories: string[],
): string {
  return `You are a financial transaction parser for Zen Coffee, a coffee shop in Indonesia.
Extract transaction information from the user's message and return a JSON object.

Available wallets: ${walletNames.join(', ')}
Available expense categories: ${expenseCategories.join(', ')}
Available income categories: ${incomeCategories.join(', ')}

Rules:
- Amount can be written as: 15k = 15000, 150rb = 150000, 1jt = 1000000
- If wallet is not mentioned, set wallet to null
- If category is not mentioned, make your best guess based on the item name
- "susu", "kopi", "sirup", "cup", "sedotan" → Bahan Baku Bar
- "gula", "tepung", "mentega" → Bahan Baku Kitchen
- "listrik", "air", "internet", "sewa" → Operasional
- If message is a question about balance or summary, return type: "query"
- If message cannot be understood, return type: "unknown"
- Category matching is case-insensitive: "bahan baku bar" = "Bahan Baku Bar"

IMPORTANT — Item name normalization:
Always normalize item names to a single canonical Indonesian form. Synonyms, abbreviations, and mixed-language terms for the same product MUST return the same item string:
- milk, susu → "susu"
- evap, evaporasi, susu evaporasi → "susu evaporasi"
- gula pasir, gula → "gula"
- kopi, coffee → "kopi"
- sedotan, straw → "sedotan"
- cup, gelas → "cup"
- mentega, butter → "mentega"
- tepung, flour → "tepung"
- es, ice → "es"
Use consistent lowercase for the "item" field. If two different spellings or languages refer to the same product, always return the same canonical item name.

Return ONLY a valid JSON object, no explanation.

Response format:
{
  "type": "expense" | "income" | "transfer" | "query" | "unknown",
  "amount": number | null,
  "wallet": "${walletNames[0]}" | "${walletNames[1]}" | ... | null,
  "wallet_to": "${walletNames[0]}" | "${walletNames[1]}" | ... | null,
  "category": string | null,
  "item": string | null,
  "confidence": "high" | "low"
}`
}

async function loadDynamicPromptData(event: H3Event) {
  const client = serverSupabaseServiceRole(event)

  const [walletsResult, categoriesResult] = await Promise.all([
    client.from('wallets').select('name').eq('is_active', true).order('name'),
    client.from('categories').select('name, type').order('name'),
  ])

  const walletNames = (walletsResult.data ?? []).map(w => w.name)
  const expenseCategories = (categoriesResult.data ?? [])
    .filter(c => c.type === 'expense')
    .map(c => c.name)
  const incomeCategories = (categoriesResult.data ?? [])
    .filter(c => c.type === 'income')
    .map(c => c.name)

  return { walletNames, expenseCategories, incomeCategories }
}

function extractJson(text: string): string {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/)
  if (fenced?.[1]) return fenced[1].trim()
  return text.trim()
}

const VALID_TYPES = ['expense', 'income', 'transfer', 'query', 'unknown'] as const
const MAX_RETRIES = 1

function errorResult(kind: GeminiErrorKind): GeminiParseResult {
  return { type: 'error', amount: null, wallet: null, wallet_to: null, category: null, item: null, confidence: 'low', errorKind: kind }
}

function isRateLimitError(error: unknown): boolean {
  if (error instanceof Error && error.message.includes('429')) return true
  if (typeof error === 'object' && error !== null && 'status' in error && (error as { status: number }).status === 429) return true
  return false
}

async function callGemini(
  model: ReturnType<GoogleGenerativeAI['getGenerativeModel']>,
  systemPrompt: string,
  text: string,
): Promise<GeminiParseResult> {
  const result = await model.generateContent({
    systemInstruction: systemPrompt,
    contents: [{ role: 'user', parts: [{ text }] }],
  })

  const responseText = result.response.text()
  const json = extractJson(responseText)
  const parsed = JSON.parse(json) as GeminiParseResult

  if (!parsed.type || !VALID_TYPES.includes(parsed.type as typeof VALID_TYPES[number])) {
    return { type: 'unknown', amount: null, wallet: null, wallet_to: null, category: null, item: null, confidence: 'low' }
  }

  return parsed
}

export async function parseTransaction(event: H3Event, text: string): Promise<GeminiParseResult> {
  const config = useRuntimeConfig()
  const genAI = new GoogleGenerativeAI(config.geminiApiKey)
  const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' })

  const { walletNames, expenseCategories, incomeCategories } = await loadDynamicPromptData(event)
  const systemPrompt = buildSystemPrompt(walletNames, expenseCategories, incomeCategories)

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      return await callGemini(model, systemPrompt, text)
    } catch (error) {
      if (isRateLimitError(error)) {
        console.error('Gemini rate limit hit')
        return errorResult('rate_limit')
      }

      const isLastAttempt = attempt === MAX_RETRIES
      if (isLastAttempt) {
        console.error('Gemini parse error (final attempt):', error)
        if (error instanceof SyntaxError) return errorResult('parse')
        if (error instanceof TypeError || (error instanceof Error && error.message.includes('fetch'))) return errorResult('network')
        return errorResult('unknown_error')
      }

      console.warn(`Gemini attempt ${attempt + 1} failed, retrying...`)
    }
  }

  return errorResult('unknown_error')
}
