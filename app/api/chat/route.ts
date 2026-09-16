import { NextRequest } from 'next/server'
import { buildChatSystemPrompt, buildInitialBriefPrompt } from '@/lib/prompts'

export const runtime = 'nodejs'
export const maxDuration = 60

interface ChatMessage {
  role: 'user' | 'assistant' | 'system'
  content: string
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const {
      messages,
      idea,
      location,
      isInitialBrief = false,
      apiKey: clientApiKey,
      groqModel: clientModel,
    } = body as {
      messages: ChatMessage[]
      idea: {
        id: string
        title: string
        category: string
        localProblem: string
        softwareSketch: string
        hardwareSketch: string
        bomPreview: string[]
        suggestedResources: string[]
      }
      location: {
        label: string
        country: string
        resources: Array<{ name: string; type: string; distance: number }>
      }
      isInitialBrief?: boolean
      apiKey?: string
      groqModel?: string
    }

    // ── Resolve API key ────────────────────────────────────────────────
    const apiKey = process.env.GROQ_API_KEY || clientApiKey || ''
    const baseUrl = 'https://api.groq.com/openai/v1'
    const model = process.env.GROQ_MODEL || clientModel || 'llama-3.3-70b-versatile'

    if (!apiKey) {
      // Return a helpful message instructing user to add API key
      const encoder = new TextEncoder()
      const stream = new ReadableStream({
        start(controller) {
          const msg = `## 🔑 Groq API Key Required\n\nTo get AI-generated build plans and chat assistance, please add your Groq API key.\n\n**Steps:**\n1. Click the **Settings** button (⚙️) in the top navigation bar\n2. Enter your Groq API key (starts with \'gsk_\')\n3. Choose a Groq model (Llama 3.3 70B recommended)\n4. Click Save and try again\n\n**Get a free Groq API key:**\n- [Groq Console](https://console.groq.com) — Free tier with blazing fast inference\n\n*Your API key is stored locally in your browser and never sent to our servers.*`
          const data = `data: ${JSON.stringify({ content: msg })}\n\n`
          controller.enqueue(encoder.encode(data))
          controller.enqueue(encoder.encode('data: [DONE]\n\n'))
          controller.close()
        },
      })

      return new Response(stream, {
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          Connection: 'keep-alive',
        },
      })
    }

    // ── Build message array ──────────────────────────────────────────────────
    const systemPrompt = buildChatSystemPrompt({ idea, location })

    const llmMessages: ChatMessage[] = [{ role: 'system', content: systemPrompt }]

    if (isInitialBrief) {
      llmMessages.push({
        role: 'user',
        content: buildInitialBriefPrompt(idea.title),
      })
    } else {
      // Append conversation history (skip any existing system messages)
      llmMessages.push(...messages.filter((m) => m.role !== 'system'))
    }

    // ── Stream from LLM ──────────────────────────────────────────────────────
    const llmRes = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: llmMessages,
        temperature: 0.7,
        max_tokens: 4096,
        stream: true,
      }),
      signal: AbortSignal.timeout(55000),
    })

    if (!llmRes.ok) {
      const errText = await llmRes.text()
      console.error('[chat] LLM error:', errText)
      
      const encoder = new TextEncoder()
      const stream = new ReadableStream({
        start(controller) {
          let errorMsg = `## ❌ LLM Error\n\n`
          if (llmRes.status === 401) {
            errorMsg += `**Invalid API key.** Please check your API key in Settings.\n\nError: ${errText}`
          } else if (llmRes.status === 429) {
            errorMsg += `**Rate limit exceeded.** Please wait a moment and try again.\n\nError: ${errText}`
          } else {
            errorMsg += `An error occurred (${llmRes.status}): ${errText}`
          }
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ content: errorMsg })}\n\n`))
          controller.enqueue(encoder.encode('data: [DONE]\n\n'))
          controller.close()
        },
      })

      return new Response(stream, {
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          Connection: 'keep-alive',
        },
      })
    }

    // ── Pass-through SSE stream ──────────────────────────────────────────────
    const encoder = new TextEncoder()
    const decoder = new TextDecoder()

    const stream = new ReadableStream({
      async start(controller) {
        const reader = llmRes.body?.getReader()
        if (!reader) {
          controller.close()
          return
        }

        let buffer = ''
        try {
          while (true) {
            const { done, value } = await reader.read()
            if (done) break

            buffer += decoder.decode(value, { stream: true })
            const lines = buffer.split('\n')
            buffer = lines.pop() || ''

            for (const line of lines) {
              const trimmed = line.trim()
              if (!trimmed || trimmed === 'data: [DONE]') {
                if (trimmed === 'data: [DONE]') {
                  controller.enqueue(encoder.encode('data: [DONE]\n\n'))
                }
                continue
              }

              if (trimmed.startsWith('data: ')) {
                try {
                  const json = JSON.parse(trimmed.slice(6))
                  const delta = json.choices?.[0]?.delta?.content
                  if (delta) {
                    controller.enqueue(
                      encoder.encode(`data: ${JSON.stringify({ content: delta })}\n\n`)
                    )
                  }
                } catch {
                  // ignore malformed chunks
                }
              }
            }
          }
        } finally {
          reader.releaseLock()
          controller.close()
        }
      },
    })

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
        'X-Accel-Buffering': 'no',
      },
    })
  } catch (err) {
    console.error('[chat] route error:', err)
    return new Response(`data: ${JSON.stringify({ error: String(err) })}\n\ndata: [DONE]\n\n`, {
      status: 200, // Keep 200 for SSE
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
      },
    })
  }
}
