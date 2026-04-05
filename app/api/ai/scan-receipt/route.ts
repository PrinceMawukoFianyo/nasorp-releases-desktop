// app/api/ai/scan-receipt/route.ts
// Primary: OpenAI GPT-4o
// Fallback: Google Gemini (free tier)
// Automatically switches to Gemini if OpenAI fails, times out, or has no credits.

import { NextRequest, NextResponse } from "next/server"

// ── OpenAI ────────────────────────────────────────────────────────────────────
async function callOpenAI(messages: any[]): Promise<string> {
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) throw new Error("OPENAI_API_KEY not set")

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 30000) // 30s timeout

  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method:  "POST",
      headers: {
        "Content-Type":  "application/json",
        "Authorization": `Bearer ${apiKey}`,
      },
      signal: controller.signal,
      body: JSON.stringify({
        model:       "gpt-4o",
        max_tokens:  4096,   // raised from 1500 — fixes truncated JSON
        temperature: 0,
        messages,
      }),
    })

    if (!response.ok) {
      const err = await response.json().catch(() => ({}))
      throw new Error(err?.error?.message ?? `OpenAI error ${response.status}`)
    }

    const data = await response.json()
    const text = data.choices?.[0]?.message?.content ?? ""
    if (!text) throw new Error("OpenAI returned empty response")
    return text

  } finally {
    clearTimeout(timeout)
  }
}

// ── Google Gemini ─────────────────────────────────────────────────────────────
async function callGemini(messages: any[]): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) throw new Error("GEMINI_API_KEY not set")

  // Convert OpenAI message format → Gemini format
  const parts: any[] = []

  for (const msg of messages) {
    if (!Array.isArray(msg.content)) {
      parts.push({ text: msg.content })
      continue
    }

    for (const block of msg.content) {
      if (block.type === "text") {
        parts.push({ text: block.text })
      } else if (block.type === "image_url" && block.image_url?.url) {
        // Convert data URL → Gemini inline image
        const dataUrl: string = block.image_url.url
        const [meta, base64Data] = dataUrl.split(",")
        const mimeType = meta.replace("data:", "").replace(";base64", "")
        parts.push({
          inlineData: {
            mimeType,
            data: base64Data,
          },
        })
      }
    }
  }

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 30000)

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
      {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        signal:  controller.signal,
        body: JSON.stringify({
          contents: [{ role: "user", parts }],
          generationConfig: {
            temperature:     0,
            maxOutputTokens: 4096,
          },
        }),
      }
    )

    if (!response.ok) {
      const err = await response.json().catch(() => ({}))
      throw new Error(err?.error?.message ?? `Gemini error ${response.status}`)
    }

    const data = await response.json()
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text ?? ""
    if (!text) throw new Error("Gemini returned empty response")
    return text

  } finally {
    clearTimeout(timeout)
  }
}

// ── JSON extractor (robust) ───────────────────────────────────────────────────
function extractJSON(raw: string): any {
  let cleaned = raw
    .replace(/```json\s*/gi, "")
    .replace(/```\s*/g, "")
    .trim()

  const start = cleaned.indexOf("{")
  const end   = cleaned.lastIndexOf("}")
  if (start === -1 || end === -1 || end <= start) {
    throw new Error("No valid JSON object found in response")
  }
  cleaned = cleaned.slice(start, end + 1)

  try {
    return JSON.parse(cleaned)
  } catch {
    // Fix common issues: trailing commas, unquoted values
    const fixed = cleaned
      .replace(/,\s*}/g, "}")
      .replace(/,\s*]/g, "]")
      .replace(/:\s*undefined/g, ": null")
    return JSON.parse(fixed)
  }
}

// ── Main handler ──────────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const messages: any[] = body.messages ?? []

    let rawText  = ""
    let provider = ""
    let lastError = ""

    // ── Try OpenAI first ──────────────────────────────────────────────────
    if (process.env.OPENAI_API_KEY) {
      try {
        console.log("[scan-receipt] Trying OpenAI...")
        rawText  = await callOpenAI(messages)
        provider = "openai"
        console.log("[scan-receipt] OpenAI succeeded")
      } catch (err: any) {
        lastError = err?.message ?? "OpenAI failed"
        console.warn("[scan-receipt] OpenAI failed:", lastError, "→ falling back to Gemini")
      }
    } else {
      console.log("[scan-receipt] No OpenAI key — skipping to Gemini")
    }

    // ── Fallback to Gemini ────────────────────────────────────────────────
    if (!rawText && process.env.GEMINI_API_KEY) {
      try {
        console.log("[scan-receipt] Trying Gemini...")
        rawText  = await callGemini(messages)
        provider = "gemini"
        console.log("[scan-receipt] Gemini succeeded")
      } catch (err: any) {
        lastError = err?.message ?? "Gemini failed"
        console.error("[scan-receipt] Gemini also failed:", lastError)
      }
    }

    // ── Both failed ───────────────────────────────────────────────────────
    if (!rawText) {
      return NextResponse.json(
        { error: `All AI providers failed. Last error: ${lastError}` },
        { status: 502 }
      )
    }

    // ── Parse and validate JSON ───────────────────────────────────────────
    let parsed: any
    try {
      parsed = extractJSON(rawText)
    } catch (err: any) {
      console.error("[scan-receipt] JSON parse failed:", err.message)
      console.error("[scan-receipt] Raw response:", rawText.slice(0, 500))
      return NextResponse.json(
        { error: "Could not parse receipt data. Please try a clearer image or use Paste Text instead." },
        { status: 422 }
      )
    }

    // Ensure lineItems always exists
    if (!parsed.lineItems) parsed.lineItems = []

    // ── Return in OpenAI shape so receipt-scanner.tsx needs no changes ────
    return NextResponse.json({
      provider,
      choices: [
        {
          message: {
            role:    "assistant",
            content: JSON.stringify(parsed),
          },
        },
      ],
    })

  } catch (err: any) {
    console.error("[scan-receipt] Unexpected error:", err)
    return NextResponse.json(
      { error: err?.message ?? "Internal server error" },
      { status: 500 }
    )
  }
}