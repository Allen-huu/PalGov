/**
 * 日期工具函数
 */

/** 获取今日日期 YYYY-MM-DD */
export function getTodayDate(): string {
  const d = new Date()
  return formatDate(d)
}

/** 格式化日期为 YYYY-MM-DD */
export function formatDate(d: Date): string {
  const yyyy = d.getFullYear()
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `${yyyy}-${mm}-${dd}`
}

/** 格式化时间为 HH:mm */
export function formatTime(ts: number): string {
  const d = new Date(ts)
  const hh = String(d.getHours()).padStart(2, '0')
  const mm = String(d.getMinutes()).padStart(2, '0')
  return `${hh}:${mm}`
}

/** 中文日期：8月11日 周一 */
export function formatDateChinese(d: Date = new Date()): string {
  const weekMap = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']
  return `${d.getMonth() + 1}月${d.getDate()}日 ${weekMap[d.getDay()]}`
}
