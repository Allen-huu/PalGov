/** MySQL 连接、建表和数据库绑定管理。连接配置是启动数据库连接所需的引导信息，业务数据不再写入本地 JSON。 */
import { app } from 'electron'
import { readFile, writeFile, mkdir } from 'node:fs/promises'
import { join } from 'node:path'
import mysql, { Pool, RowDataPacket } from 'mysql2/promise'

export interface MySqlConfig {
  host: string
  port: number
  user: string
  password: string
  database: string
  ssl: boolean
}

const CONFIG_FILE = 'mysql-config.json'
let pool: Pool | null = null
let activeConfig: MySqlConfig | null = null

function configPath(): string {
  return join(app.getPath('userData'), CONFIG_FILE)
}

export async function getMySqlConfig(): Promise<MySqlConfig | null> {
  if (activeConfig) return { ...activeConfig }
  try {
    const raw = await readFile(configPath(), 'utf8')
    activeConfig = JSON.parse(raw) as MySqlConfig
    return { ...activeConfig }
  } catch {
    return null
  }
}

async function saveConfig(config: MySqlConfig): Promise<void> {
  await mkdir(app.getPath('userData'), { recursive: true })
  await writeFile(configPath(), JSON.stringify(config, null, 2), 'utf8')
  activeConfig = { ...config }
}

export async function getMySqlPool(): Promise<Pool | null> {
  if (pool) return pool
  const config = await getMySqlConfig()
  if (!config) return null
  try {
    pool = await createPool(config)
    await ensureSchema(pool)
    return pool
  } catch {
    pool?.end().catch(() => undefined)
    pool = null
    return null
  }
}

async function createPool(config: MySqlConfig): Promise<Pool> {
  const bootstrap = await mysql.createConnection({
    host: config.host,
    port: config.port,
    user: config.user,
    password: config.password,
    ssl: config.ssl ? {} : undefined
  })
  await bootstrap.query(`CREATE DATABASE IF NOT EXISTS \`${escapeIdentifier(config.database)}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`)
  await bootstrap.end()
  return mysql.createPool({
    host: config.host,
    port: config.port,
    user: config.user,
    password: config.password,
    database: config.database,
    ssl: config.ssl ? {} : undefined,
    waitForConnections: true,
    connectionLimit: 5,
    queueLimit: 0,
    charset: 'utf8mb4'
  })
}

function escapeIdentifier(value: string): string {
  return value.replace(/`/g, '``')
}

export async function ensureSchema(target: Pool): Promise<void> {
  const statements = [
    `CREATE TABLE IF NOT EXISTS app_settings (id TINYINT PRIMARY KEY, payload JSON NOT NULL, updated_at BIGINT NOT NULL) ENGINE=InnoDB`,
    `CREATE TABLE IF NOT EXISTS tasks (id VARCHAR(64) PRIMARY KEY, title VARCHAR(500) NOT NULL, note TEXT NULL, due_at BIGINT NULL, done BOOLEAN NOT NULL DEFAULT FALSE, notified BOOLEAN NOT NULL DEFAULT FALSE, created_at BIGINT NOT NULL, updated_at BIGINT NOT NULL, task_date DATE NOT NULL, INDEX idx_tasks_date (task_date), INDEX idx_tasks_due (due_at)) ENGINE=InnoDB`,
    `CREATE TABLE IF NOT EXISTS thoughts (id VARCHAR(64) PRIMARY KEY, raw_text TEXT NOT NULL, summary TEXT NULL, topics JSON NULL, related_ids JSON NULL, relations JSON NULL, source_name VARCHAR(255) NULL, ai_status VARCHAR(20) NOT NULL DEFAULT 'pending', created_at BIGINT NOT NULL, updated_at BIGINT NOT NULL, archived BOOLEAN NOT NULL DEFAULT FALSE, INDEX idx_thoughts_updated (updated_at)) ENGINE=InnoDB`,
    `CREATE TABLE IF NOT EXISTS question_banks (file_name VARCHAR(190) PRIMARY KEY, name VARCHAR(255) NOT NULL, description TEXT NULL, payload JSON NOT NULL, created_at BIGINT NOT NULL, updated_at BIGINT NOT NULL) ENGINE=InnoDB`,
    `CREATE TABLE IF NOT EXISTS quiz_progress (bank_file_name VARCHAR(190) PRIMARY KEY, payload JSON NOT NULL, updated_at BIGINT NOT NULL) ENGINE=InnoDB`,
    `CREATE TABLE IF NOT EXISTS wrong_questions (id VARCHAR(300) PRIMARY KEY, bank_file_name VARCHAR(190) NOT NULL, payload JSON NOT NULL, next_review_at BIGINT NOT NULL, updated_at BIGINT NOT NULL, INDEX idx_wrong_review (next_review_at)) ENGINE=InnoDB`,
    `CREATE TABLE IF NOT EXISTS bili_ups (mid BIGINT PRIMARY KEY, name VARCHAR(255) NOT NULL, avatar TEXT NULL, last_dynamic_id VARCHAR(100) NULL, added_at BIGINT NOT NULL) ENGINE=InnoDB`,
    `CREATE TABLE IF NOT EXISTS bili_dynamics (id VARCHAR(100) PRIMARY KEY, mid BIGINT NOT NULL, up_name VARCHAR(255) NOT NULL, up_avatar TEXT NULL, type VARCHAR(80) NOT NULL, text TEXT NOT NULL, url TEXT NOT NULL, pub_ts BIGINT NOT NULL, fetched_at BIGINT NOT NULL, INDEX idx_bili_pub (pub_ts)) ENGINE=InnoDB`
  ]
  for (const statement of statements) await target.query(statement)
  for (const statement of [
    'ALTER TABLE thoughts ADD COLUMN topics JSON NULL',
    'ALTER TABLE thoughts ADD COLUMN related_ids JSON NULL',
    'ALTER TABLE thoughts ADD COLUMN relations JSON NULL',
    'ALTER TABLE thoughts ADD COLUMN source_name VARCHAR(255) NULL'
  ]) {
    try { await target.query(statement) } catch { /* 已存在时忽略 */ }
  }
}

export async function testAndBindMySql(config: MySqlConfig): Promise<{ ok: boolean; message: string }> {
  const normalized = { ...config, port: Number(config.port) || 3306, database: config.database.trim() }
  if (!normalized.host || !normalized.user || !normalized.database) return { ok: false, message: '请填写主机、用户名和数据库名' }
  let next: Pool | null = null
  try {
    next = await createPool(normalized)
    await ensureSchema(next)
    if (pool) await pool.end()
    pool = next
    await saveConfig(normalized)
    return { ok: true, message: 'MySQL 已连接并完成建表' }
  } catch (error) {
    await next?.end().catch(() => undefined)
    return { ok: false, message: error instanceof Error ? error.message : 'MySQL 连接失败' }
  }
}

export async function unbindMySql(): Promise<void> {
  await pool?.end().catch(() => undefined)
  pool = null
  activeConfig = null
  try { await import('node:fs/promises').then(({ unlink }) => unlink(configPath())) } catch { /* already unbound */ }
}

export async function getMySqlStatus(): Promise<{ bound: boolean; connected: boolean; database?: string }> {
  const config = await getMySqlConfig()
  const target = await getMySqlPool()
  return { bound: !!config, connected: !!target, database: config?.database }
}

export async function queryOne<T extends RowDataPacket[]>(sql: string, params: unknown[] = []): Promise<T[0] | null> {
  const target = await getMySqlPool()
  if (!target) return null
  const [rows] = await target.query<T>(sql, params)
  return rows[0] ?? null
}

export async function queryRows<T extends RowDataPacket[]>(sql: string, params: unknown[] = []): Promise<T> {
  const target = await getMySqlPool()
  if (!target) return [] as unknown as T
  const [rows] = await target.query<T>(sql, params)
  return rows
}

export async function execute(sql: string, params: unknown[] = []): Promise<void> {
  const target = await getMySqlPool()
  if (target) await target.execute(sql, params as any[])
}
