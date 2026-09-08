/**
 * 宠物对话服务：统一处理主动聊天、健康提醒和其他桌面事件。
 * 所有内容都通过同一个对话通道发给宠物窗口，避免旧式气泡提醒分散在各个服务里。
 */
import { IPC_CHANNELS } from '../config/constants'
import { getPetWindow } from '../windows/petWindow'
import { chatWithAI } from './aiService'
import { getAllTasks, getSettings, getThoughts } from './storeService'

export type DialogueKind = 'casual' | 'drink' | 'stand' | 'task' | 'bili'

const MIN_RANDOM_DELAY = 8 * 60_000
const MAX_RANDOM_DELAY = 18 * 60_000

let dialogueTimer: ReturnType<typeof setTimeout> | null = null
let generating = false

const FALLBACKS: Record<DialogueKind, string[]> = {
  casual: ['我刚刚想到你了，今天也慢慢来就好。', '忙了一会儿啦，记得给自己留一点喘气的时间。', '我在这里陪你，想到什么都可以记下来。'],
  drink: ['忙到现在啦，先喝几口水再继续吧。', '噜噜提醒一下，补点水，脑袋会舒服很多。', '看到你专心这么久，去喝口水再回来嘛。'],
  stand: ['坐了有一会儿啦，起来走两步，活动一下肩膀吧。', '我们站起来伸个懒腰，身体会谢谢你的。', '别一直坐着嘛，陪我走动一小会儿。'],
  task: ['有件事到时间啦，我们一起把它处理掉吧。', '刚刚那件安排到点了，别让它在心里挂着。', '提醒你一下，这件事可以开始啦。'],
  bili: ['你关注的 UP 主刚刚有新动态，要不要去看看？', '我发现你关注的人更新了，给你递来一条新消息。', '有新的动态到啦，感兴趣的话可以去逛逛。']
}

function pickFallback(kind: DialogueKind): string {
  const messages = FALLBACKS[kind]
  return messages[Math.floor(Math.random() * messages.length)]
}

function shorten(value: string, length = 72): string {
  const text = value.replace(/\s+/g, ' ').trim()
  return text.length > length ? `${text.slice(0, length)}…` : text
}

function cleanDialogue(content: string): string {
  const firstLine = content
    .replace(/```[\s\S]*?```/g, '')
    .split(/\r?\n/)
    .map((line) => line.trim())
    .find(Boolean) ?? ''
  return firstLine
    .replace(/^(噜噜|宠物|回复|答复)[：:]\s*/i, '')
    .replace(/^["“”'‘’]+|["“”'‘’]+$/g, '')
    .trim()
    .slice(0, 58)
}

async function buildReference(): Promise<string> {
  try {
    const [tasks, thoughts] = await Promise.all([getAllTasks(), getThoughts()])
    const taskLines = tasks
      .filter((task) => !task.done)
      .slice(0, 6)
      .map((task) => `- 备忘：${shorten(task.title, 46)}`)
    const thoughtLines = thoughts
      .filter((thought) => thought.summary || thought.rawText)
      .slice(0, 6)
      .map((thought) => `- 念头：${shorten(thought.summary || thought.rawText, 58)}`)
    return [...taskLines, ...thoughtLines].join('\n') || '目前还没有可引用的备忘或念头。'
  } catch {
    return '暂时无法读取备忘和念头，请只进行自然的简短问候。'
  }
}

function deliverDialogue(message: string): void {
  const pet = getPetWindow()
  if (!pet || pet.isDestroyed()) return

  const send = () => {
    if (pet.isDestroyed()) return
    pet.webContents.send(IPC_CHANNELS.PET_DIALOGUE, message)
  }

  if (pet.webContents.isLoading()) pet.webContents.once('did-finish-load', send)
  else send()
}

function promptFor(kind: DialogueKind, detail?: string): string {
  if (kind === 'drink') return '请把下面这次喝水提醒改写成一句温柔、口语化、像朋友一样的中文。要明确提醒对方喝几口水，不能说教。'
  if (kind === 'stand') return '请把下面这次久坐提醒改写成一句温柔、口语化、像朋友一样的中文。要明确提醒对方站起来活动一下，不能说教。'
  if (kind === 'task') return `请用一句自然的口语提醒用户处理这件备忘：${shorten(detail ?? '', 70)}`
  if (kind === 'bili') return `请用一句自然的口语告诉用户关注的 UP 主有新动态。UP 主：${shorten(detail ?? '', 40)}`
  return '请结合用户最近的备忘和念头，像一只桌面宠物一样主动说一句自然的中文。可以是问候、轻微关心或对近期内容的回应，不要凭空编造用户经历。'
}

/** 生成并发送一句宠物对话。返回 false 表示本次没有发送。 */
export async function sendPetDialogue(kind: DialogueKind, detail?: string): Promise<boolean> {
  if (generating) return false
  generating = true
  try {
    const settings = await getSettings()
    const reference = kind === 'casual' || kind === 'task' ? await buildReference() : ''
    const context = [
      '你是桌面宠物水豚“噜噜”，正在和用户说话。',
      '只输出一句中文口语，长度控制在 12 到 42 个字，像熟悉的朋友随口说话。',
      '必须从宠物视角表达，不要使用标题、列表、Markdown、引号或“作为 AI”等措辞。',
      '语气温暖、轻松、具体，不要夸张卖萌，不要连续使用 emoji。',
      reference ? `用户最近记录：\n${reference}` : '',
      settings.aiSendTaskContext ? '' : '不要提及用户的备忘内容。'
    ].filter(Boolean).join('\n')
    const response = await chatWithAI({ prompt: promptFor(kind, detail), context })
    const message = cleanDialogue(response.content) || pickFallback(kind)
    deliverDialogue(message)
    return true
  } catch (error) {
    console.warn('[dialogue] generation failed:', error)
    deliverDialogue(pickFallback(kind))
    return true
  } finally {
    generating = false
  }
}

function scheduleNextDialogue(): void {
  const delay = MIN_RANDOM_DELAY + Math.random() * (MAX_RANDOM_DELAY - MIN_RANDOM_DELAY)
  dialogueTimer = setTimeout(() => {
    void sendPetDialogue('casual').finally(scheduleNextDialogue)
  }, delay)
}

/** 启动随机主动对话。 */
export function startDialogueService(): void {
  stopDialogueService()
  scheduleNextDialogue()
}

/** 停止随机主动对话。 */
export function stopDialogueService(): void {
  if (dialogueTimer) {
    clearTimeout(dialogueTimer)
    dialogueTimer = null
  }
}
