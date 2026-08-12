/**
 * 资源路径解析工具
 * 优先加载 .png，不存在时回退到 .svg，再回退到空字符串（组件内用 inline SVG）
 */

/** 缓存探测结果，避免重复请求 */
const resolvedCache = new Map<string, string | null>()

/** 探测资源是否存在，返回可用的 URL（png > svg > null） */
export async function resolveAsset(skin: string, state: string, frame: number): Promise<string | null> {
  const key = `${skin}/${state}-${frame}`
  if (resolvedCache.has(key)) return resolvedCache.get(key)

  const base = import.meta.env.BASE_URL || './'
  const pngUrl = `${base}assets/pets/${skin}/${state}-${frame}.png`
  const svgUrl = `${base}assets/pets/${skin}/${state}-${frame}.svg`

  for (const url of [pngUrl, svgUrl]) {
    try {
      const res = await fetch(url, { method: 'HEAD' })
      if (res.ok) {
        resolvedCache.set(key, url)
        return url
      }
    } catch {
      // 继续尝试下一个
    }
  }

  resolvedCache.set(key, null)
  return null
}

/** 获取资源 URL（同步，仅用于已缓存的资源） */
export function getAssetUrl(skin: string, state: string, frame: number): string | null {
  const key = `${skin}/${state}-${frame}`
  return resolvedCache.get(key) ?? null
}

/** 预加载某个皮肤的所有帧（idle/happy/alert） */
export async function preloadSkin(skin: string): Promise<void> {
  const states: Array<{ name: string; frames: number }> = [
    { name: 'idle', frames: 4 },
    { name: 'happy', frames: 6 },
    { name: 'alert', frames: 4 }
  ]
  const tasks: Promise<void>[] = []
  for (const s of states) {
    for (let i = 0; i < s.frames; i++) {
      tasks.push(
        resolveAsset(skin, s.name, i).then(() => {})
      )
    }
  }
  await Promise.all(tasks)
}
