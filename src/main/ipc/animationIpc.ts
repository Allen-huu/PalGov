/**
 * 动画相关 IPC handler
 */
import { ipcMain, protocol } from 'electron'
import { readFileSync, existsSync } from 'node:fs'
import { join } from 'node:path'
import { app } from 'electron'
import { IPC_CHANNELS } from '../config/constants'
import { getFrameUrls, getAllAnimations } from '../services/animationService'

/**
 * 注册自定义协议 pet:// 用于安全地提供帧文件
 * URL 格式: pet://frames/<skin>/<state>/<frameIndex>
 */
export function registerAnimationProtocol(): void {
  if (!protocol.isProtocolRegistered('pet')) {
    protocol.registerFileProtocol('pet', (request, callback) => {
      const url = request.url.replace('pet://frames/', '')
      const parts = url.split('/')
      if (parts.length < 3) {
        callback({ statusCode: 404, data: 'Not Found' })
        return
      }

      const [skin, state, frameIdx] = parts
      const idx = parseInt(frameIdx, 10)

      const frameUrls = getFrameUrls(skin, state)
      if (!frameUrls.length || isNaN(idx) || idx >= frameUrls.length) {
        callback({ statusCode: 404, data: 'Frame Not Found' })
        return
      }

      const filePath = frameUrls[idx]
      if (!filePath || !existsSync(filePath)) {
        callback({ statusCode: 404, data: 'File Not Found' })
        return
      }

      callback({ path: filePath })
    })
  }
}

/**
 * 注册动画 IPC
 */
export function registerAnimationIpc(): void {
  ipcMain.handle(
    IPC_CHANNELS.ANIMATION_GET_FRAMES,
    async (_evt, args: { skin: string; state: string }) => {
      const frameUrls = getFrameUrls(args.skin, args.state)
      return {
        skin: args.skin,
        state: args.state,
        frameCount: frameUrls.length,
        /** 通过 pet:// 协议访问的帧 URL 列表 */
        frames: frameUrls.map((_, i) => `pet://frames/${args.skin}/${args.state}/${i}`)
      }
    }
  )

  ipcMain.handle(IPC_CHANNELS.ANIMATION_LIST_SKINS, async () => {
    const animations = getAllAnimations()
    const skinMap = new Map<string, string[]>()
    for (const a of animations) {
      if (!skinMap.has(a.skin)) skinMap.set(a.skin, [])
      skinMap.get(a.skin)!.push(a.state)
    }
    return Array.from(skinMap.entries()).map(([skin, states]) => ({
      skin,
      states: states.sort()
    }))
  })
}
