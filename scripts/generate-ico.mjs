/**
 * 将 PNG 图标转换为有效的多尺寸 ICO 格式
 * 用法：node scripts/generate-ico.mjs
 */
import { readFileSync, writeFileSync } from 'node:fs'
import sharp from 'sharp'

const INPUT = 'resources/icon.png'
const OUTPUT = 'resources/icon.ico'
const SIZES = [16, 32, 48, 256]

async function main() {
  const pngBuf = readFileSync(INPUT)

  // 为每个尺寸生成 PNG
  const images = []
  for (const size of SIZES) {
    const resized = await sharp(pngBuf).resize(size, size).png().toBuffer()
    images.push({ width: size === 256 ? 0 : size, height: size === 256 ? 0 : size, data: resized })
  }

  // 构建 ICO
  const headerSize = 6
  const dirEntrySize = 16
  const count = images.length
  const imgOffset = headerSize + dirEntrySize * count

  let offset = imgOffset
  const dirEntries = []
  for (const img of images) {
    dirEntries.push({ width: img.width, height: img.height, size: img.data.length, offset })
    offset += img.data.length
  }

  const buf = Buffer.alloc(offset)
  let pos = 0

  // Header
  buf.writeUInt16LE(0, pos); pos += 2
  buf.writeUInt16LE(1, pos); pos += 2
  buf.writeUInt16LE(count, pos); pos += 2

  // Directory entries
  for (const e of dirEntries) {
    buf.writeUInt8(e.width, pos); pos += 1
    buf.writeUInt8(e.height, pos); pos += 1
    buf.writeUInt8(0, pos); pos += 1
    buf.writeUInt8(0, pos); pos += 1
    buf.writeUInt16LE(1, pos); pos += 2
    buf.writeUInt16LE(32, pos); pos += 2
    buf.writeUInt32LE(e.size, pos); pos += 4
    buf.writeUInt32LE(e.offset, pos); pos += 4
  }

  // Image data
  for (const img of images) {
    img.data.copy(buf, pos)
    pos += img.data.length
  }

  writeFileSync(OUTPUT, buf)
  console.log(`Generated ${OUTPUT} (${(buf.length / 1024).toFixed(1)} KB) with sizes: ${SIZES.join(', ')}`)
}

main().catch(err => { console.error(err); process.exit(1) })