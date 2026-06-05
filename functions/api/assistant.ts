// Cloudflare Pages Function: /api/assistant
// Backend for the admin AI assistant, using Google Gemini API.
// The Gemini API key lives ONLY here, as a Cloudflare secret env var
// (Pages project → Settings → Environment variables → GEMINI_API_KEY).
//
// The client (src/admin/pages/Assistant.tsx) speaks the Anthropic message/block
// shape. We translate that to/from Gemini's generateContent format so the React
// side stays backend-agnostic.
//
//   client → { messages, context }   (Anthropic blocks)
//   we return → { content: [...Anthropic-blocks], stop_reason }

interface Env {
  GEMINI_API_KEY: string
  GEMINI_MODEL?: string
}

/* ---- Anthropic-shaped blocks (what the client sends/expects) ---- */
type Block =
  | { type: 'text'; text: string }
  | { type: 'thinking'; thinking?: string }
  | { type: 'tool_use'; id: string; name: string; input: any }
  | { type: 'tool_result'; tool_use_id: string; content: any; is_error?: boolean }
type ApiMessage = { role: 'user' | 'assistant'; content: string | Block[] }

/* ---- Gemini types ---- */
type GeminiPart =
  | { text: string }
  | { functionCall: { name: string; args: Record<string, any> } }
  | { functionResponse: { name: string; response: Record<string, any> } }

type GeminiContent = {
  role: 'user' | 'model'
  parts: GeminiPart[]
}

// ---- Static brand system prompt (no dates / volatile data here) ----
const BRAND_SYSTEM = `You are the AI operations assistant built into the admin dashboard of PilotGear EG, an Egyptian e-commerce brand selling aviation-themed accessories (mainly keychains) plus a few home & desk pieces. You speak directly to the store owner (Amir) inside his private admin panel.

# Who you serve
The owner is a non-developer running the shop. Be concrete, practical, and decisive. Give real numbers and clear next steps, not vague generalities. You are an expert e-commerce operator, merchandiser, and direct-response marketer.

# The brand (know this cold)
- PilotGear EG: aviation lifestyle brand for everyone who loves the sky (pilots, aspiring pilots, gift buyers) across Egypt.
- Navy + gold identity. Premium but accessible.
- Payment: Cash on Delivery only. Shipping flat 70 EGP, free over 800 EGP. Currency: EGP.
- Two collections: "Keychains" and "Home & Desk".
- Catalog is ~10 keychains (mostly 260 EGP, compare-at 320) plus an Airbus A320 desk lamp and flight instrument coasters.
- Best sellers: Pilot Keychain and Remove Before Flight.
- Real reviews only; the brand never invents ratings or "X happy customers".

# Hard content rules (never break these in anything you write)
- NO em dashes anywhere. Use commas, colons, or hyphens.
- NO fake marketing: never invent star ratings, review counts, or fake testimonials/social proof.
- Messaging targets all aviation lovers, not only pilots.
- Egyptian market, COD mindset, prices in EGP.

# What you can DO
You have one tool, apply_inventory_changes, to edit product data: stock, price, cost, and compareAtPrice. Use the exact product_id values from the PRODUCTS list in the live context.
- The owner has confirm-before-apply enabled: your tool call is shown to him as a proposed change and he approves it before it takes effect. So state precisely what you intend (which product, which field, old value to new value).
- For bulk requests ("set all keychains to 50 stock", "raise every cost by X"), emit one apply_inventory_changes call containing all the individual changes.
- Only touch data the owner asked about, unless he explicitly asks you to decide. When proposing a change, briefly say why.
- You cannot create/delete products, change images, or edit pages from here. If asked, tell him which admin page to use (Products, Page Builder, Settings).

# Marketing / CVR / sales advice
When asked for advice, ground every recommendation in the ACTUAL numbers in the live context (conversion rate, funnel drop-off, AOV, top products, low stock, recent orders). Point to the specific metric, say what it implies, and give a concrete action. Prioritize the highest-leverage move first. You may draft copy (product descriptions, announcements, reply messages, ad angles) following the brand content rules above.

# Style
Be concise and skimmable. Use short paragraphs and tight bullet lists. Lead with the answer or the action, then the reasoning. Do not narrate routine steps. When you propose a data change, keep the explanation to a sentence or two; the confirmation card already shows the exact change.`

// ---- Tool schema in Gemini function_declarations format ----
const GEMINI_TOOLS = [
  {
    function_declarations: [
      {
        name: 'apply_inventory_changes',
        description:
          'Apply one or more changes to product fields in the live store. Each change targets a single product by its product_id (from the PRODUCTS list in the context) and sets exactly one field to a numeric value. Supports both bulk edits (many products in one call) and different values per product. Money fields (price, cost, compareAtPrice) are in EGP; stock is a unit count. The store owner confirms before changes apply.',
        parameters: {
          type: 'OBJECT',
          properties: {
            changes: {
              type: 'ARRAY',
              description: 'The list of field changes to apply.',
              items: {
                type: 'OBJECT',
                properties: {
                  product_id: { type: 'STRING', description: 'Exact product id from the PRODUCTS list' },
                  field: {
                    type: 'STRING',
                    enum: ['stock', 'price', 'cost', 'compareAtPrice'],
                    description: 'Which field to set',
                  },
                  value: { type: 'NUMBER', description: 'New value (EGP for money fields, units for stock)' },
                },
                required: ['product_id', 'field', 'value'],
              },
            },
          },
          required: ['changes'],
        },
      },
    ],
  },
]

const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { 'content-type': 'application/json' },
  })

/* ---- Anthropic messages -> Gemini contents ---- */
function toGeminiContents(messages: ApiMessage[]): GeminiContent[] {
  const out: GeminiContent[] = []

  for (const m of messages) {
    const role = m.role === 'assistant' ? 'model' : 'user'
    const parts: GeminiPart[] = []

    if (typeof m.content === 'string') {
      if (m.content.trim()) out.push({ role, parts: [{ text: m.content }] })
      continue
    }

    if (m.role === 'assistant') {
      for (const b of m.content) {
        if (b.type === 'text' && b.text.trim()) {
          parts.push({ text: b.text })
        } else if (b.type === 'tool_use') {
          parts.push({ functionCall: { name: b.name, args: b.input ?? {} } })
        }
        // thinking blocks dropped
      }
    } else {
      // user role: tool_result blocks -> functionResponse parts; text -> text parts
      for (const b of m.content) {
        if (b.type === 'text' && b.text.trim()) {
          parts.push({ text: b.text })
        } else if (b.type === 'tool_result') {
          const output = typeof b.content === 'string' ? b.content : JSON.stringify(b.content)
          parts.push({
            functionResponse: {
              name: 'apply_inventory_changes',
              response: { output },
            },
          })
        }
      }
    }

    if (parts.length > 0) out.push({ role, parts })
  }

  return out
}

/* ---- Gemini candidate -> Anthropic blocks ---- */
function fromGeminiCandidate(candidate: any): { content: Block[]; stop_reason: string } {
  const parts: any[] = candidate?.content?.parts ?? []
  const content: Block[] = []

  for (const part of parts) {
    if (part.text && part.text.trim()) {
      content.push({ type: 'text', text: part.text })
    } else if (part.functionCall) {
      content.push({
        type: 'tool_use',
        id: `call_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
        name: part.functionCall.name,
        input: part.functionCall.args ?? {},
      })
    }
  }

  if (content.length === 0) {
    content.push({ type: 'text', text: 'I did not get a response that time. Please try again.' })
  }

  const hasToolUse = content.some((b) => b.type === 'tool_use')
  return { content, stop_reason: hasToolUse ? 'tool_use' : 'end_turn' }
}

export const onRequestPost: PagesFunction<Env> = async (context) => {
  const { request, env } = context

  if (!env.GEMINI_API_KEY) {
    return json(
      { error: 'The AI assistant is not configured. Add GEMINI_API_KEY as a secret in the Cloudflare Pages project settings.' },
      500,
    )
  }

  let body: { messages?: unknown; context?: string }
  try {
    body = await request.json()
  } catch {
    return json({ error: 'Invalid request body.' }, 400)
  }

  const messages = body.messages
  if (!Array.isArray(messages) || messages.length === 0) {
    return json({ error: 'No messages provided.' }, 400)
  }

  const liveContext =
    typeof body.context === 'string' && body.context.trim()
      ? body.context
      : 'No live store data was provided for this request.'

  const model = env.GEMINI_MODEL || 'gemini-2.0-flash'

  const payload = {
    system_instruction: {
      parts: [{ text: `${BRAND_SYSTEM}\n\n# LIVE STORE DATA (current snapshot)\n${liveContext}` }],
    },
    contents: toGeminiContents(messages as ApiMessage[]),
    tools: GEMINI_TOOLS,
    tool_config: { function_calling_config: { mode: 'AUTO' } },
    generation_config: { temperature: 0.7, maxOutputTokens: 4096 },
  }

  let upstream: Response
  try {
    upstream = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${env.GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(payload),
      },
    )
  } catch {
    return json({ error: 'Could not reach the AI service. Check your connection and try again.' }, 502)
  }

  const data: any = await upstream.json()

  if (!upstream.ok || data.error) {
    const message =
      data?.error?.message || (typeof data?.error === 'string' ? data.error : 'The assistant could not respond.')
    return json({ error: message }, upstream.status === 200 ? 502 : upstream.status)
  }

  const candidate = data?.candidates?.[0]
  if (!candidate) {
    return json({ error: 'The assistant returned no response. Please try again.' }, 502)
  }

  return json(fromGeminiCandidate(candidate))
}
