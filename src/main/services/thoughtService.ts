import { randomUUID } from 'node:crypto'
import { basename } from 'node:path'
import { readFile } from 'node:fs/promises'
import { Thought, ThoughtRelation } from '@shared/types'
import { chatWithAI } from './aiService'
import { getThoughts, saveThought } from './storeService'

export async function listThoughts(): Promise<Thought[]> {
  return getThoughts()
}

export async function createThought(rawText: string): Promise<Thought> {
  const now = Date.now()
  const thought: Thought = { id: randomUUID(), rawText: rawText.trim(), topics: [], relatedIds: [], relations: [], aiStatus: 'pending', createdAt: now, updatedAt: now, archived: false }
  return saveThought(thought)
}

export async function summarizeThought(id: string): Promise<Thought | null> {
  const thought = (await getThoughts(true)).find((item) => item.id === id)
  if (!thought) return null
  const processing = await saveThought({ ...thought, aiStatus: 'processing', updatedAt: Date.now() })
  const result = await chatWithAI({
    prompt: `请分析下面的工作念头，只返回严格 JSON，不要 Markdown：{"summary":"不超过80字的简洁、可执行想法","topics":["最多3个主题词"]}。不要添加原文没有的事实。\n\n原始记录：\n${processing.rawText}`
  })
  const parsed = parseAiJson(result.content)
  const next: Thought = {
    ...processing,
    summary: parsed?.summary || result.content || result.error || '暂时无法解析，请稍后重试',
    topics: parsed?.topics ?? processing.topics ?? [],
    aiStatus: result.content ? 'ready' : 'failed',
    updatedAt: Date.now()
  }
  const saved = await saveThought(next)
  return connectRelatedThoughts(saved)
}

function parseAiJson(content?: string): { summary: string; topics: string[] } | null {
  if (!content) return null
  try {
    const match = content.match(/\{[\s\S]*\}/)
    const value = JSON.parse(match?.[0] ?? content) as { summary?: string; topics?: unknown }
    return { summary: String(value.summary ?? ''), topics: Array.isArray(value.topics) ? value.topics.map(String).slice(0, 3) : [] }
  } catch { return null }
}

async function connectRelatedThoughts(current: Thought): Promise<Thought> {
  const others = (await getThoughts()).filter((item) => item.id !== current.id && item.summary).slice(0, 40)
  if (others.length === 0) return saveThought({ ...current, relatedIds: [], relations: [], updatedAt: Date.now() })
  let relations: ThoughtRelation[] = []
  try {
    const result = await chatWithAI({ prompt: `判断当前念头与候选念头是否存在明确、实质的关系。只有共同目标、同一项目、因果依赖、互相补充或明显的上下游关系才算相关；仅仅共享一个宽泛词语不要连接。只返回严格 JSON 数组：[{"thoughtId":"候选ID","reason":"不超过35字，说明具体关联","confidence":0.0}]。confidence 必须在0到1之间，只返回 confidence >= 0.75 的关系，最多3条，没有足够证据返回[]。\n当前念头：${current.summary}\n主题：${(current.topics ?? []).join('、')}\n\n候选念头：\n${others.map((item) => `${item.id}: ${item.summary}（主题：${(item.topics ?? []).join('、')}）`).join('\n')}` })
    const match = result.content?.match(/\[[\s\S]*\]/)
    const parsed = match ? JSON.parse(match[0]) : []
    if (Array.isArray(parsed)) {
      relations = parsed.map((item): ThoughtRelation | null => {
        const target = others.find((other) => other.id === item?.thoughtId)
        const confidence = Number(item?.confidence)
        const reason = typeof item?.reason === 'string' ? item.reason.trim() : ''
        if (!target || !reason || !Number.isFinite(confidence) || confidence < 0.75) return null
        return { thoughtId: target.id, summary: target.summary ?? target.rawText.slice(0, 80), reason, confidence }
      }).filter((item): item is ThoughtRelation => !!item).slice(0, 3)
    }
  } catch { relations = [] }
  const relatedIds = relations.map((relation) => relation.thoughtId)
  const updated = await saveThought({ ...current, relatedIds, relations, updatedAt: Date.now() })
  for (const other of others) {
    const relation = relations.find((item) => item.thoughtId === other.id)
    const nextRelations = (other.relations ?? []).filter((item) => item.thoughtId !== current.id)
    if (relation) nextRelations.push({ thoughtId: current.id, summary: current.summary ?? current.rawText.slice(0, 80), reason: relation.reason, confidence: relation.confidence })
    await saveThought({ ...other, relatedIds: nextRelations.map((item) => item.thoughtId), relations: nextRelations })
  }
  return updated
}

export async function importThoughtFile(filePath: string): Promise<Thought[]> {
  const text = await readFile(filePath, 'utf8')
  const chunks = text.split(/\n\s*\n+/).map((item) => item.trim()).filter(Boolean).flatMap((item) => item.match(/[\s\S]{1,900}/g) ?? [])
  const sourceName = basename(filePath)
  const created = await Promise.all(chunks.slice(0, 30).map(async (chunk) => saveThought({ ...(await createThought(chunk)), sourceName })))
  const summarized = await Promise.all(created.map((item) => summarizeThought(item.id)))
  return summarized.filter((item): item is Thought => !!item)
}

export async function archiveThought(id: string): Promise<Thought | null> {
  const thought = (await getThoughts(true)).find((item) => item.id === id)
  if (!thought) return null
  return saveThought({ ...thought, archived: true, updatedAt: Date.now() })
}
