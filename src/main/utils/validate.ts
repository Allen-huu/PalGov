import { TaskInput, PetSkin } from '@shared/types'

const MAX_TITLE_LENGTH = 200
const MAX_NOTE_LENGTH = 1000
const MAX_API_KEY_LENGTH = 200

export function validateTaskInput(input: unknown): TaskInput | null {
  if (!input || typeof input !== 'object') return null
  const obj = input as Record<string, unknown>

  const title = obj.title
  if (typeof title !== 'string') return null
  const trimmedTitle = title.trim()
  if (trimmedTitle.length === 0 || trimmedTitle.length > MAX_TITLE_LENGTH) return null

  const note = obj.note
  if (note !== undefined) {
    if (typeof note !== 'string') return null
    if (note.length > MAX_NOTE_LENGTH) return null
  }

  const dueAt = obj.dueAt
  if (dueAt !== undefined) {
    if (typeof dueAt !== 'number' || dueAt < 0) return null
  }

  const date = obj.date
  if (date !== undefined) {
    if (typeof date !== 'string') return null
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return null
  }

  return { title: trimmedTitle, note, dueAt, date }
}

export function validateTaskUpdate(
  input: unknown
): { id: string; patch: Record<string, unknown> } | null {
  if (!input || typeof input !== 'object') return null
  const obj = input as Record<string, unknown>

  const id = obj.id
  if (typeof id !== 'string' || !id) return null

  const patch = obj.patch
  if (!patch || typeof patch !== 'object') return null
  const patchObj = patch as Record<string, unknown>

  const allowedFields = ['title', 'note', 'dueAt', 'done']
  const filteredPatch: Record<string, unknown> = {}

  for (const key of allowedFields) {
    if (key in patchObj) {
      const value = patchObj[key]

      if (key === 'title') {
        if (typeof value !== 'string') return null
        const trimmed = value.trim()
        if (trimmed.length === 0 || trimmed.length > MAX_TITLE_LENGTH) return null
        filteredPatch[key] = trimmed
      } else if (key === 'note') {
        if (value !== undefined) {
          if (typeof value !== 'string') return null
          if (value.length > MAX_NOTE_LENGTH) return null
        }
        filteredPatch[key] = value
      } else if (key === 'dueAt') {
        if (value !== undefined) {
          if (typeof value !== 'number' || value < 0) return null
        }
        filteredPatch[key] = value
      } else if (key === 'done') {
        if (typeof value !== 'boolean') return null
        filteredPatch[key] = value
      }
    }
  }

  return { id, patch: filteredPatch }
}

export function validateSettingsPatch(
  input: unknown
): Record<string, unknown> | null {
  if (!input || typeof input !== 'object') return null
  const obj = input as Record<string, unknown>

  const allowedFields = [
    'petSkin',
    'alwaysOnTop',
    'enableNotify',
    'notifySound',
    'autoStart',
    'petPosition',
    'aiApiKey',
    'aiEnabled'
  ]

  const filtered: Record<string, unknown> = {}

  for (const key of allowedFields) {
    if (key in obj) {
      const value = obj[key]

      if (key === 'petSkin') {
        const validSkins: PetSkin[] = ['cat', 'dog', 'robot']
        if (!validSkins.includes(value as PetSkin)) return null
        filtered[key] = value
      } else if (key === 'alwaysOnTop' || key === 'enableNotify' || key === 'notifySound' || key === 'autoStart' || key === 'aiEnabled') {
        if (typeof value !== 'boolean') return null
        filtered[key] = value
      } else if (key === 'petPosition') {
        if (value === undefined || value === null) {
          filtered[key] = value
        } else {
          if (typeof value !== 'object') return null
          const pos = value as Record<string, unknown>
          if (typeof pos.x !== 'number' || typeof pos.y !== 'number') return null
          filtered[key] = { x: pos.x, y: pos.y }
        }
      } else if (key === 'aiApiKey') {
        if (typeof value !== 'string') return null
        if (value.length > MAX_API_KEY_LENGTH) return null
        filtered[key] = value
      }
    }
  }

  return filtered
}

export function validateChatInput(input: unknown): { prompt: string; context?: string } | null {
  if (!input || typeof input !== 'object') return null
  const obj = input as Record<string, unknown>

  const prompt = obj.prompt
  if (typeof prompt !== 'string') return null
  const trimmedPrompt = prompt.trim()
  if (trimmedPrompt.length === 0 || trimmedPrompt.length > 4000) return null

  const context = obj.context
  if (context !== undefined) {
    if (typeof context !== 'string') return null
    if (context.length > 2000) return null
  }

  return { prompt: trimmedPrompt, context }
}
