import { ChatRequest, ChatResponse, Settings } from '@shared/types'
import { getSettings, setSettings } from './storeService'

const MAX_RETRIES = 2
const TIMEOUT_MS = 30000

export async function chatWithAI(request: ChatRequest): Promise<ChatResponse> {
  const settings = await getSettings()

  if (!settings.aiApiKey) {
    return { content: '', error: '请先在设置中配置 AI API Key' }
  }

  if (!settings.aiEnabled) {
    return { content: '', error: 'AI 服务未启用' }
  }

  const prompt = request.prompt.trim()
  if (!prompt) {
    return { content: '', error: '请输入有效的问题' }
  }

  const messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }> = []

  if (request.context) {
    messages.push({ role: 'system', content: request.context })
  }

  messages.push({ role: 'user', content: prompt })

  let lastError: Error | null = null

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      const response = await fetch(`${settings.aiBaseUrl.replace(/\/$/, '')}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${settings.aiApiKey}`
        },
        body: JSON.stringify({
          model: settings.aiModel,
          messages,
          temperature: settings.aiTemperature,
          max_tokens: 2000
        }),
        signal: AbortSignal.timeout(TIMEOUT_MS)
      })

      if (!response.ok) {
        const errorText = await response.text()
        if (response.status === 401) {
          return { content: '', error: 'API Key 无效，请检查后重试' }
        }
        if (response.status === 429) {
          lastError = new Error('请求过于频繁，请稍后重试')
          continue
        }
        if (response.status >= 500) {
          lastError = new Error(`服务器错误 (${response.status})，重试中...`)
          continue
        }
        return { content: '', error: `请求失败 (${response.status}): ${errorText}` }
      }

      const data = (await response.json()) as {
        choices: Array<{ message: { content: string } }>
        error?: { message: string }
      }

      if (data.error) {
        return { content: '', error: data.error.message }
      }

      const content = data.choices?.[0]?.message?.content ?? ''
      return { content: content.trim() }
    } catch (err) {
      lastError = err instanceof Error ? err : new Error('未知错误')

      if (attempt < MAX_RETRIES) {
        await new Promise((resolve) => setTimeout(resolve, 1000 * (attempt + 1)))
      }
    }
  }

  return { content: '', error: lastError?.message ?? '请求失败，请检查网络连接' }
}

export async function setApiKey(apiKey: string): Promise<Settings> {
  const trimmed = apiKey.trim()
  return setSettings({ aiApiKey: trimmed, aiEnabled: !!trimmed })
}

export async function getAIStatus(): Promise<{ enabled: boolean; hasKey: boolean }> {
  const settings = await getSettings()
  return {
    enabled: settings.aiEnabled,
    hasKey: !!settings.aiApiKey
  }
}

export async function testConnection(): Promise<{ ok: boolean; message: string }> {
  const settings = await getSettings()
  if (!settings.aiApiKey) {
    return { ok: false, message: 'API Key 未配置' }
  }

  try {
    const response = await fetch(`${settings.aiBaseUrl.replace(/\/$/, '')}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${settings.aiApiKey}`
      },
      body: JSON.stringify({
        model: settings.aiModel,
        messages: [{ role: 'user', content: 'ping' }],
        max_tokens: 10
      }),
      signal: AbortSignal.timeout(TIMEOUT_MS)
    })

    if (response.ok) {
      return { ok: true, message: '连接成功' }
    }

    if (response.status === 401) {
      return { ok: false, message: 'API Key 无效' }
    }

    return { ok: false, message: `连接失败 (${response.status})` }
  } catch {
    return { ok: false, message: '网络连接失败' }
  }
}
