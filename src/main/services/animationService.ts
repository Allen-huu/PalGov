/**
 * 动画资源管理服务
 * - 扫描 resources/pets/ 下的 ZIP 动画包
 * - 解压到 userData/pets/ 目录
 * - 提供帧列表供渲染进程播放
 */
import { app } from 'electron'
import { readdirSync, readFileSync, mkdirSync, writeFileSync, existsSync, readdir } from 'node:fs'
import { join, basename, dirname, extname } from 'node:path'
import { inflateSync } from 'node:zlib'

/** 解压后的帧信息 */
export interface AnimationFrames {
  skin: string
  state: string
  /** 帧文件路径列表（按文件名排序） */
  frames: string[]
  /** 帧数 */
  frameCount: number
}

/** 缓存已解压的动画：key = "skin/state" */
const frameCache = new Map<string, AnimationFrames>()

/** 已解压的 ZIP 文件签名，避免重复解压 */
const resolvedZips = new Set<string>()

/**
 * 解压单个 ZIP 缓冲区，返回 { filename: data } 映射
 * 支持存储（method 0）和 deflate（method 8）压缩
 */
function parseZip(zipBuffer: Buffer): Map<string, Buffer> {
  const files = new Map<string, Buffer>()

  let eocdOffset = -1
  const searchLimit = Math.min(65557, zipBuffer.length - 22)
  for (let i = zipBuffer.length - 22; i >= zipBuffer.length - searchLimit; i--) {
    if (zipBuffer.readUInt32LE(i) === 0x06054b50) {
      eocdOffset = i
      break
    }
  }
  if (eocdOffset === -1) throw new Error('无效的 ZIP 文件')

  const totalEntries = zipBuffer.readUInt16LE(eocdOffset + 10)
  const centralDirOffset = zipBuffer.readUInt32LE(eocdOffset + 16)

  let cursor = centralDirOffset
  for (let i = 0; i < totalEntries; i++) {
    if (cursor + 46 > zipBuffer.length) break
    if (zipBuffer.readUInt32LE(cursor) !== 0x02014b50) break

    const compMethod = zipBuffer.readUInt16LE(cursor + 10)
    const compSize = zipBuffer.readUInt32LE(cursor + 20)
    const uncompSize = zipBuffer.readUInt32LE(cursor + 24)
    const fnLen = zipBuffer.readUInt16LE(cursor + 28)
    const exLen = zipBuffer.readUInt16LE(cursor + 30)
    const cmLen = zipBuffer.readUInt16LE(cursor + 32)
    const localOffset = zipBuffer.readUInt32LE(cursor + 42)
    const fileName = zipBuffer.slice(cursor + 46, cursor + 46 + fnLen).toString('utf-8')

    if (localOffset > 0 && !fileName.endsWith('/')) {
      const localFnLen = zipBuffer.readUInt16LE(localOffset + 26)
      const localExLen = zipBuffer.readUInt16LE(localOffset + 28)
      const dataStart = localOffset + 30 + localFnLen + localExLen
      const rawData = zipBuffer.slice(dataStart, dataStart + compSize)

      let data: Buffer
      if (compMethod === 0) {
        data = rawData
      } else if (compMethod === 8) {
        data = inflateSync(rawData)
      } else {
        cursor += 46 + fnLen + exLen + cmLen
        continue
      }
      files.set(fileName, data)
    }

    cursor += 46 + fnLen + exLen + cmLen
  }

  return files
}

/**
 * 扫描 resources/pets/ 并解压所有 ZIP 动画包
 * 目录结构约定：
 *   resources/pets/<skin>/<state>.zip
 *   例如：resources/pets/cat/idle.zip
 *   ZIP 内包含 9 张图片（文件名任意，按名称排序播放）
 */
export async function extractAllAnimations(): Promise<void> {
  const resourcesPath = getResourcesPath()
  const petsDir = join(resourcesPath, 'pets')

  if (!existsSync(petsDir)) return

  const skins = readdirSync(petsDir, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => d.name)

  const extractionTasks: Promise<void>[] = []

  for (const skin of skins) {
    const skinDir = join(petsDir, skin)
    const zipFiles = readdirSync(skinDir)
      .filter((f) => extname(f).toLowerCase() === '.zip')

    for (const zipFile of zipFiles) {
      extractionTasks.push(extractOneAnimation(skin, zipFile))
    }
  }

  await Promise.all(extractionTasks)
}

/** 获取 resources 目录路径（开发模式和打包模式均可用） */
function getResourcesPath(): string {
  // 打包后 process.reservedPathForResources 可能不可用，使用 app.isPackaged 判断
  if (app.isPackaged) {
    return join(process.resourcesPath, 'resources')
  }
  return join(app.getAppPath(), 'resources')
}

/**
 * 解压单个 ZIP 动画包
 */
async function extractOneAnimation(skin: string, zipFileName: string): Promise<void> {
  const stateName = basename(zipFileName, extname(zipFileName))
  const cacheKey = `${skin}/${stateName}`
  const zipPath = join(getResourcesPath(), 'pets', skin, zipFileName)

  if (!existsSync(zipPath)) return

  // 读取 ZIP 并解析
  const zipBuffer = readFileSync(zipPath)
  const extracted = parseZip(zipBuffer)

  // 目标目录
  const extractDir = join(app.getPath('userData'), 'pets', skin, stateName)
  mkdirSync(extractDir, { recursive: true })

  // 解压每个文件
  const frameNames: string[] = []
  for (const [fileName, data] of extracted) {
    const safeName = basename(fileName)
    const targetPath = join(extractDir, safeName)
    writeFileSync(targetPath, data)
    frameNames.push(safeName)
  }

  // 按文件名排序（frame_01, frame_02, ... 或 1, 2, ...）
  frameNames.sort((a, b) => {
    const aNum = parseInt(a.replace(/[^0-9]/g, ''), 10)
    const bNum = parseInt(b.replace(/[^0-9]/g, ''), 10)
    if (!isNaN(aNum) && !isNaN(bNum)) return aNum - bNum
    return a.localeCompare(b)
  })

  const framePaths = frameNames.map((name) => join(extractDir, name))

  frameCache.set(cacheKey, {
    skin,
    state: stateName,
    frames: framePaths,
    frameCount: framePaths.length
  })

  resolvedZips.add(cacheKey)
}

/**
 * 获取指定皮肤和状态的帧列表
 */
export function getAnimationFrames(skin: string, state: string): AnimationFrames | null {
  return frameCache.get(`${skin}/${state}`) ?? null
}

/**
 * 获取所有已解压的动画信息
 */
export function getAllAnimations(): AnimationFrames[] {
  return Array.from(frameCache.values())
}

/**
 * 获取 userData/pets/ 下的帧文件路径（供 IPC 返回给 renderer）
 */
export function getFrameUrls(skin: string, state: string): string[] {
  const entry = frameCache.get(`${skin}/${state}`)
  if (!entry) return []
  return entry.frames
}
