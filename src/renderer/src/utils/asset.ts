/**
 * 动画资源加载工具
 * 通过 IPC 获取解压后的帧列表，支持逐帧播放
 */

export interface AnimationData {
  skin: string
  state: string
  frameCount: number
  /** 帧 URL 列表（通过 pet:// 协议访问） */
  frames: string[]
}

/** 动画帧缓存，避免重复 IPC 请求 */
const frameCache = new Map<string, AnimationData>()

/** 正在加载的 Promise 缓存，避免并发重复请求 */
const loadingPromises = new Map<string, Promise<AnimationData>>()

/**
 * 加载指定皮肤和状态的帧数据
 */
export function loadAnimation(skin: string, state: string): Promise<AnimationData> {
  const key = `${skin}/${state}`

  if (frameCache.has(key)) {
    return Promise.resolve(frameCache.get(key)!)
  }

  if (loadingPromises.has(key)) {
    return loadingPromises.get(key)!
  }

  const promise = window.pet.animation.getFrames(skin, state).then((data) => {
    const anim: AnimationData = {
      skin: data.skin,
      state: data.state,
      frameCount: data.frameCount,
      frames: data.frames
    }
    frameCache.set(key, anim)
    loadingPromises.delete(key)
    return anim
  })

  loadingPromises.set(key, promise)
  return promise
}

/**
 * 预加载某个皮肤的所有状态动画
 */
export async function preloadAnimation(
  skin: string,
  states: string[] = ['idle', 'happy', 'alert']
): Promise<void> {
  await Promise.all(states.map((state) => loadAnimation(skin, state)))
}

/**
 * 清除缓存（用于切换皮肤或热更新）
 */
export function clearAnimationCache(): void {
  frameCache.clear()
  loadingPromises.clear()
}
