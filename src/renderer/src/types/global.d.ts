/**
 * 渲染进程访问 preload 暴露的 API 类型声明
 */
import type { PetApi } from '../../preload'

declare global {
  interface Window {
    pet: PetApi
  }
}

export {}
