/**
 * B站动态跟踪服务：轮询已关注 UP 主的动态，发现新动态时
 * 系统通知 + 宠物对话提醒 + 推送给渲染进程刷新页面
 *
 * 请求层要点：
 * - 动态接口 (feed/space) 需要 WBI 签名（w_rid + wts），否则返回 412 风控页
 * - 请求需携带 buvid3/buvid4 指纹 Cookie（finger/spi 接口免登录获取，进程内复用）
 * - 用户在设置中填写的 Cookie 优先，缺 buvid3 时自动合并指纹
 */
import { Notification, shell, BrowserWindow } from 'electron'
import { createHash } from 'node:crypto'
import { IPC_CHANNELS } from '../config/constants'
import { getSettings, getBiliUps, saveBiliUp, removeBiliUp, mergeBiliDynamics } from './storeService'
import { BiliAddResult, BiliUp, BiliDynamic } from '@shared/types'
import { sendPetDialogue } from './dialogueService'

const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36'

const REQUEST_TIMEOUT_MS = 15_000
/** 历史回填天数（展示最近几天内的动态） */
const BILI_HISTORY_DAYS = 3
/** 单次回填最多翻页数 */
const MAX_PAGES = 8
/** WBI mixin key 缓存有效期 */
const MIXIN_KEY_TTL_MS = 60 * 60_000

/** WBI mixin key 混淆表（与B站网页端一致） */
const WBI_MIXIN_TAB = [
  46, 47, 18, 2, 53, 8, 23, 32, 15, 50, 10, 31, 58, 3, 45, 35, 27, 43, 5, 49,
  33, 9, 42, 19, 29, 28, 14, 39, 12, 38, 41, 13, 37, 48, 7, 16, 24, 55, 40,
  61, 26, 17, 0, 1, 60, 51, 30, 4, 22, 25, 54, 21, 56, 59, 6, 63, 57, 62, 11,
  36, 20, 34, 44, 52
]

/** B站动态接口返回的原始条目（仅取需要的字段） */
interface RawDynamicItem {
  id_str: string
  type: string
  modules: {
    module_author: { name: string; mid: number; pub_ts: number }
    module_dynamic: {
      desc?: { text?: string }
      major?: {
        archive?: { title?: string }
        article?: { title?: string }
        draw?: unknown
        common?: { title?: string }
      }
    }
  }
}

/** 进程内缓存的指纹 Cookie（buvid3/buvid4） */
let cachedBuvid: string | null = null
/** 进程内缓存的 WBI mixin key */
let cachedMixinKey: { key: string; ts: number } | null = null
/** 最近一次拉取失败的原因（暴露给页面展示） */
let lastError: string | null = null
/** 最近一次轮询完成时间（毫秒） */
let lastPollAt: number | null = null
/** 下次轮询预计时间（毫秒） */
let nextPollAt: number | null = null

function buildHeaders(mid: number, cookie: string): Record<string, string> {
  const headers: Record<string, string> = {
    'User-Agent': USER_AGENT,
    Referer: `https://space.bilibili.com/${mid}/dynamic`,
    Origin: 'https://space.bilibili.com',
    Accept: 'application/json, text/plain, */*',
    'Accept-Language': 'zh-CN,zh;q=0.9'
  }
  if (cookie) headers['Cookie'] = cookie
  return headers
}

/** 获取（并缓存）指纹 Cookie，绕过 412 风控 */
async function ensureBuvid(): Promise<string> {
  if (cachedBuvid) return cachedBuvid
  try {
    const res = await fetch('https://api.bilibili.com/x/frontend/finger/spi', {
      headers: { 'User-Agent': USER_AGENT, Accept: 'application/json' },
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS)
    })
    const data = (await res.json()) as { code: number; data?: { b_3?: string; b_4?: string } }
    if (data.code === 0 && data.data?.b_3 && data.data?.b_4) {
      cachedBuvid = `buvid3=${data.data.b_3}; buvid4=${data.data.b_4}`
    }
  } catch {
    // 指纹获取失败时退化为无 Cookie
  }
  return cachedBuvid ?? ''
}

/** 获取（并缓存）WBI mixin key */
async function getMixinKey(cookie: string): Promise<string | null> {
  if (cachedMixinKey && Date.now() - cachedMixinKey.ts < MIXIN_KEY_TTL_MS) {
    return cachedMixinKey.key
  }
  try {
    const res = await fetch('https://api.bilibili.com/x/web-interface/nav', {
      headers: {
        'User-Agent': USER_AGENT,
        Referer: 'https://www.bilibili.com/',
        Accept: 'application/json',
        ...(cookie ? { Cookie: cookie } : {})
      },
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS)
    })
    const data = (await res.json()) as {
      data?: { wbi_img?: { img_url?: string; sub_url?: string } }
    }
    const img = data.data?.wbi_img?.img_url?.split('/').pop()?.split('.')[0]
    const sub = data.data?.wbi_img?.sub_url?.split('/').pop()?.split('.')[0]
    if (img && sub) {
      const raw = img + sub
      const key = WBI_MIXIN_TAB.map((n) => raw[n]).join('').slice(0, 32)
      cachedMixinKey = { key, ts: Date.now() }
      return key
    }
  } catch {
    // 签名 key 获取失败时退化为不签名
  }
  return null
}

/** WBI 签名：参数排序 + wts + md5(w_rid) */
function wbiSign(params: Record<string, string | number>, mixinKey: string): string {
  const p: Record<string, string | number> = { ...params, wts: Math.round(Date.now() / 1000) }
  const query = Object.keys(p)
    .sort()
    .map((k) => `${k}=${encodeURIComponent(String(p[k]))}`)
    .join('&')
  const wRid = createHash('md5').update(query + mixinKey).digest('hex')
  return `${query}&w_rid=${wRid}`
}

/** 合并用户 Cookie 与指纹 Cookie（用户 Cookie 已含 buvid3 时直接使用） */
async function effectiveCookie(userCookie?: string): Promise<string> {
  const buvid = await ensureBuvid()
  const user = userCookie?.trim()
  if (!user) return buvid
  if (/buvid3\s*=/.test(user)) return user
  return buvid ? `${user}; ${buvid}` : user
}

/**
 * 通用 GET 请求：签名（可选）+ 412/HTML 风控自动换指纹重试一次
 * @param signed 是否需要 WBI 签名（feed/space 接口需要）
 */
async function biliGetJson<T>(
  path: string,
  params: Record<string, string | number>,
  mid: number,
  userCookie: string | undefined,
  signed: boolean
): Promise<T> {
  let blocked = false
  for (let attempt = 0; attempt < 2; attempt++) {
    const cookie = await effectiveCookie(userCookie)
    const headers = buildHeaders(mid, cookie)

    let url = `https://api.bilibili.com${path}`
    if (signed) {
      const mk = await getMixinKey(cookie)
      url += mk ? `?${wbiSign(params, mk)}` : `?${new URLSearchParams(params as Record<string, string>).toString()}`
    } else {
      url += `?${new URLSearchParams(params as Record<string, string>).toString()}`
    }

    const res = await fetch(url, { headers, signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS) })
    const ctype = res.headers.get('content-type') ?? ''
    if (res.status === 412 || ctype.includes('text/html')) {
      blocked = true
      // 丢弃指纹重新获取后重试一次
      cachedBuvid = null
      continue
    }
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    try {
      return (await res.json()) as T
    } catch {
      throw new Error('响应格式异常（可能被风控拦截）')
    }
  }
  throw new Error(
    blocked
      ? '请求被B站风控拦截，可稍后重试或在设置中填写浏览器 Cookie'
      : '请求B站接口失败，请检查网络'
  )
}

/** 解析用户输入：支持 UID、空间链接、b23.tv 短链（跟随重定向） */
export async function parseBiliInput(input: string): Promise<number | null> {
  const s = input.trim()
  if (!s) return null
  if (/^\d+$/.test(s)) return Number(s)

  const spaceMatch = s.match(/space\.bilibili\.com\/(\d+)/)
  if (spaceMatch) return Number(spaceMatch[1])

  if (/b23\.tv\//.test(s)) {
    try {
      const res = await fetch(s.startsWith('http') ? s : `https://${s}`, {
        redirect: 'follow',
        headers: { 'User-Agent': USER_AGENT },
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS)
      })
      const finalUrl = res.url
      const m = finalUrl.match(/space\.bilibili\.com\/(\d+)/)
      return m ? Number(m[1]) : null
    } catch {
      return null
    }
  }
  return null
}

/** 获取 UP 主昵称与头像 */
async function fetchUserInfo(
  mid: number,
  cookie: string | undefined
): Promise<{ name: string; avatar?: string }> {
  const data = await biliGetJson<{ code: number; message: string; data?: { card?: { name?: string; face?: string } } }>(
    '/x/web-interface/card',
    { mid },
    mid,
    cookie,
    false
  )
  if (data.code !== 0 || !data.data?.card?.name) {
    throw new Error(data.message || `获取用户信息失败 (${data.code})`)
  }
  // 图床 http 协议在渲染进程可能被拦截，统一转 https
  const avatar = data.data.card.face
    ?.replace(/^http:\/\//, 'https://')
    .replace(/^\/\//, 'https://')
  return { name: data.data.card.name, avatar }
}

/** 获取 UP 主动态单页（最新在前），返回条目与下一页 offset */
async function fetchDynamicsPage(
  mid: number,
  cookie: string | undefined,
  offset?: string
): Promise<{ items: RawDynamicItem[]; nextOffset?: string }> {
  const params: Record<string, string | number> = { host_mid: mid }
  if (offset) params.offset = offset
  const data = await biliGetJson<{
    code: number
    message: string
    data?: { items?: RawDynamicItem[]; offset?: string }
  }>('/x/polymer/web-dynamic/v1/feed/space', params, mid, cookie, true)

  if (data.code !== 0) {
    if (data.code === -352 || data.code === -404 || data.code === -412) {
      throw new Error('请求被B站拦截，可在设置中填写浏览器 Cookie 后重试')
    }
    throw new Error(data.message || `获取动态失败 (${data.code})`)
  }
  return { items: data.data?.items ?? [], nextOffset: data.data?.offset || undefined }
}

/** 翻页拉取最近 N 天的动态（至少包含第一页最新动态） */
async function fetchRecentDynamics(
  mid: number,
  cookie: string | undefined,
  days: number
): Promise<RawDynamicItem[]> {
  const cutoffTs = Math.floor(Date.now() / 1000) - days * 86_400
  const all: RawDynamicItem[] = []
  let offset: string | undefined
  for (let page = 0; page < MAX_PAGES; page++) {
    const { items, nextOffset } = await fetchDynamicsPage(mid, cookie, offset)
    if (items.length === 0) break
    all.push(...items)
    // 最早一条已早于时间窗口，无需继续翻页
    const oldestTs = items[items.length - 1].modules.module_author.pub_ts ?? 0
    if (!nextOffset || oldestTs < cutoffTs) break
    offset = nextOffset
    await new Promise((r) => setTimeout(r, 300))
  }
  return all
}

/** 将原始动态条目转为摘要结构 */
function toDynamic(up: BiliUp, it: RawDynamicItem): BiliDynamic {
  const mod = it.modules.module_dynamic
  let text = mod.desc?.text?.trim() ?? ''
  const major = mod.major

  if (major?.archive?.title) {
    text = `【视频】${major.archive.title}`
  } else if (major?.article?.title) {
    text = `【专栏】${major.article.title}`
  } else if (major?.draw) {
    text = text ? `【图文】${text}` : '【图文】发布了图片动态'
  } else if (major?.common?.title) {
    text = `【动态】${major.common.title}`
  } else if (it.type === 'DYNAMIC_TYPE_LIVE_RCMD') {
    text = text ? `【直播】${text}` : '【直播】直播开播啦'
  } else if (it.type === 'DYNAMIC_TYPE_FORWARD') {
    text = `【转发】${text}`
  } else if (!text) {
    text = '发布了新动态'
  }

  text = text.replace(/\s+/g, ' ').slice(0, 140)

  return {
    id: it.id_str,
    mid: up.mid,
    upName: up.name,
    upAvatar: up.avatar,
    type: it.type,
    text,
    url: `https://t.bilibili.com/${it.id_str}`,
    pubTs: it.modules.module_author.pub_ts || Math.floor(Date.now() / 1000),
    fetchedAt: Date.now()
  }
}

/** 添加关注：解析输入 → 拉取用户信息 → 回填最近 3 天历史（不通知） */
export async function addBiliUp(input: string): Promise<BiliAddResult> {
  const mid = await parseBiliInput(input)
  if (mid === null || mid <= 0) {
    return { ok: false, message: '无法识别，请输入 UID 或空间链接（space.bilibili.com/xxx）' }
  }

  const settings = await getSettings()
  const existing = (await getBiliUps()).find((u) => u.mid === mid)
  if (existing) {
    return { ok: false, message: `已关注过「${existing.name}」`, up: existing }
  }

  let name = `UID ${mid}`
  let avatar: string | undefined
  try {
    const info = await fetchUserInfo(mid, settings.biliCookie)
    name = info.name
    avatar = info.avatar
  } catch (err) {
    lastError = err instanceof Error ? err.message : '获取用户信息失败'
    return { ok: false, message: lastError }
  }

  const up: BiliUp = { mid, name, avatar, addedAt: Date.now() }

  // 记录当前最新动态为基准，同时回填最近 3 天历史供页面展示（不通知）
  try {
    const items = await fetchRecentDynamics(mid, settings.biliCookie, BILI_HISTORY_DAYS)
    if (items.length > 0) {
      up.lastDynamicId = items[0].id_str
      await mergeBiliDynamics(items.map((it) => toDynamic(up, it)))
    }
  } catch (err) {
    // 拉取动态失败不影响添加，后续轮询会重试
    console.warn('[bili] 回填历史动态失败:', err instanceof Error ? err.message : err)
  }

  await saveBiliUp(up)
  lastError = null
  return { ok: true, message: `已关注「${name}」`, up }
}

/** 删除关注 */
export async function removeBiliUpByMid(mid: number): Promise<boolean> {
  return removeBiliUp(mid)
}

/** 供页面展示的轮询状态 */
export function getBiliStatus(): {
  lastError: string | null
  lastPollAt: number | null
  nextPollAt: number | null
} {
  return { lastError, lastPollAt, nextPollAt }
}

function sendSystemNotification(d: BiliDynamic, silent: boolean): void {
  const notif = new Notification({
    title: `📢 ${d.upName} 发布了新动态`,
    body: d.text,
    silent
  })
  notif.on('click', () => {
    shell.openExternal(d.url)
  })
  notif.show()
}

let timer: ReturnType<typeof setInterval> | null = null
let polling = false

/**
 * 单次轮询：遍历所有 UP 主，找出新动态并通知
 * deep=true 时翻页回填最近 3 天历史（应用启动/手动刷新时使用，不重复通知）
 */
async function pollOnce(deep = false): Promise<void> {
  if (polling) return
  polling = true
  try {
    const settings = await getSettings()
    const ups = await getBiliUps()
    if (ups.length === 0) return

    const fresh: BiliDynamic[] = []
    const errors: string[] = []
    let listChanged = false

    for (const up of ups) {
      try {
        const fetchFor = () =>
          deep || !up.lastDynamicId
            ? fetchRecentDynamics(up.mid, settings.biliCookie, BILI_HISTORY_DAYS)
            : fetchDynamicsPage(up.mid, settings.biliCookie).then((r) => r.items)

        let items = await fetchFor()
        if (items.length === 0) {
          // 新指纹首次请求可能返回空列表（预热机制），延迟后重试一次
          await new Promise((r) => setTimeout(r, 1500))
          items = await fetchFor()
        }

        if (items.length === 0) {
          // UP 主目前没有任何动态：以 '0' 为基准，之后的新动态都能被检测到
          if (!up.lastDynamicId) await saveBiliUp({ ...up, lastDynamicId: '0' })
        } else if (!up.lastDynamicId) {
          // 首次见到该 UP：回填最近 3 天历史作为初始列表（不通知）
          await saveBiliUp({ ...up, lastDynamicId: items[0].id_str })
          await mergeBiliDynamics(items.map((it) => toDynamic(up, it)))
          listChanged = true
        } else {
          const newer = items.filter((it) => {
            try {
              return BigInt(it.id_str) > BigInt(up.lastDynamicId!)
            } catch {
              return false
            }
          })

          // 深度刷新时无论有无新动态都全量合并，补齐离线期间的历史缺口
          if (deep) {
            await mergeBiliDynamics(items.map((it) => toDynamic(up, it)))
            listChanged = true
          }

          if (newer.length > 0) {
            await saveBiliUp({ ...up, lastDynamicId: items[0].id_str })
            // 按发布时间正序通知（旧→新）
            newer.sort((a, b) => a.modules.module_author.pub_ts - b.modules.module_author.pub_ts)
            for (const it of newer) {
              fresh.push(toDynamic(up, it))
            }
          }
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : '未知错误'
        errors.push(`${up.name}: ${msg}`)
        console.warn(`[bili] 拉取 ${up.name}(${up.mid}) 动态失败:`, msg)
      }
      // 避免请求过密触发风控
      await new Promise((r) => setTimeout(r, 500))
    }

    if (fresh.length > 0) {
      await mergeBiliDynamics(fresh)

      if (settings.biliNotify) {
        for (const d of fresh) {
          sendSystemNotification(d, !settings.notifySound)
        }
      }
      // B 站动态也进入统一的宠物对话区。
      void sendPetDialogue('bili', fresh[0].upName)
    }

    if (fresh.length > 0 || listChanged) {
      // 推送所有窗口（动态页监听后刷新列表）
      BrowserWindow.getAllWindows().forEach((win) => {
        if (!win.isDestroyed()) {
          win.webContents.send(IPC_CHANNELS.BILI_UPDATE, fresh)
        }
      })
    }
    // 全部 UP 主都拉取成功才算无错
    lastError = errors.length > 0 ? errors.join('；') : null
  } finally {
    lastPollAt = Date.now()
    polling = false
  }
}

/** 启动轮询（根据设置） */
export async function startBiliPolling(): Promise<void> {
  stopBiliPolling()
  const settings = await getSettings()
  if (!settings.biliEnabled) return
  const sec = Math.max(15, settings.biliIntervalSec || 30)

  // 启动时先深度回填一次最近 3 天历史，之后常规轮询只取第一页
  pollOnce(true).catch((err) => console.error('[bili] poll failed:', err))
  timer = setInterval(() => {
    pollOnce().catch((err) => console.error('[bili] poll failed:', err))
  }, sec * 1000)
  nextPollAt = Date.now() + sec * 1000
}

/** 停止轮询 */
export function stopBiliPolling(): void {
  if (timer) {
    clearInterval(timer)
    timer = null
  }
  nextPollAt = null
}

/** 手动立即刷新一次（深度：回填最近 3 天） */
export async function refreshBiliNow(): Promise<void> {
  await pollOnce(true)
}
