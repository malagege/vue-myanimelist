/**
 * 動畫資料更新指令：npm run data:update
 *
 * - 季度選單由本地規則產生（預設起點 2019-10，可用 --start=YYYY-MM 或 DATA_START_SEASON 覆寫）
 * - 每季只抓 ACGNTaiwan JSON，正規化 + schema 驗證後以暫存檔寫入 public/data
 * - 單季失敗會列出來源、季度與原因；保留上次成功資料，不以空資料覆蓋
 * - 最新季度無資料、選單為空或輸出不合法時以非零狀態結束
 */

import { mkdirSync, writeFileSync, renameSync, existsSync, rmSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  generateSeasonIds,
  acgnUrlOf,
  normalizeSeasonData,
  assertSeasonOutput,
  buildSeasonMenu,
} from './lib.mjs'

const __dirname = dirname(fileURLToPath(import.meta.url))
const DATA_DIR = join(__dirname, '../../public/data')
const SEASONS_DIR = join(DATA_DIR, 'seasons')

const DEFAULT_START = '2019-10'
const FETCH_TIMEOUT_MS = 30_000

function resolveStartSeason() {
  const argStart = process.argv.find((arg) => arg.startsWith('--start='))
  if (argStart) return argStart.slice('--start='.length)
  return process.env.DATA_START_SEASON || DEFAULT_START
}

function atomicWriteJson(filePath, data) {
  const tmpPath = `${filePath}.tmp`
  writeFileSync(tmpPath, JSON.stringify(data))
  try {
    renameSync(tmpPath, filePath)
  } catch (e) {
    rmSync(tmpPath, { force: true })
    throw e
  }
}

async function fetchSeasonJson(url) {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS)
  try {
    const res = await fetch(url, { signal: controller.signal })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    return await res.json()
  } finally {
    clearTimeout(timer)
  }
}

async function main() {
  const startSeason = resolveStartSeason()
  const seasonIds = generateSeasonIds(startSeason, new Date())
  console.log(`季度選單：${seasonIds.length} 季（${seasonIds[seasonIds.length - 1]} ~ ${seasonIds[0]}）`)

  mkdirSync(SEASONS_DIR, { recursive: true })

  const failures = []
  const availableSeasonIds = []

  for (const seasonId of seasonIds) {
    const url = acgnUrlOf(seasonId)
    const filePath = join(SEASONS_DIR, `${seasonId}.json`)
    try {
      const raw = await fetchSeasonJson(url)
      const { items, warnings } = normalizeSeasonData(raw, seasonId)
      warnings.forEach((w) => console.warn(`  ⚠ ${w}`))
      assertSeasonOutput(items, seasonId)
      atomicWriteJson(filePath, items)
      availableSeasonIds.push(seasonId)
      console.log(`  ✓ ${seasonId}：${items.length} 筆`)
    } catch (e) {
      const reason = e instanceof Error ? e.message : String(e)
      failures.push({ seasonId, source: url, reason })
      if (existsSync(filePath)) {
        // 保留上次成功資料，不以失敗結果覆蓋
        availableSeasonIds.push(seasonId)
        console.error(`  ✗ ${seasonId}：${reason}（沿用上次成功資料）`)
      } else {
        console.error(`  ✗ ${seasonId}：${reason}（無既有資料，自選單排除）`)
      }
    }
  }

  const problems = []
  if (availableSeasonIds.length === 0) {
    problems.push('沒有任何季度有可用資料，季度選單為空')
  }
  const latestSeasonId = seasonIds[0]
  if (!availableSeasonIds.includes(latestSeasonId)) {
    problems.push(`最新季度 ${latestSeasonId} 沒有可用資料`)
  }

  if (availableSeasonIds.length > 0) {
    atomicWriteJson(join(DATA_DIR, 'seasons.json'), buildSeasonMenu(availableSeasonIds))
    console.log(`seasons.json：${availableSeasonIds.length} 季`)
  }

  if (failures.length > 0) {
    console.error('\n更新失敗的季度：')
    for (const f of failures) {
      console.error(`  - 季度 ${f.seasonId}｜來源 ${f.source}｜原因：${f.reason}`)
    }
  }

  if (problems.length > 0) {
    console.error('\n更新中止，避免部署空站：')
    problems.forEach((p) => console.error(`  - ${p}`))
    process.exitCode = 1
    return
  }

  console.log(`\n完成：${availableSeasonIds.length}/${seasonIds.length} 季可用，失敗 ${failures.length} 季`)
}

main().catch((e) => {
  console.error('資料更新發生未預期錯誤：', e)
  process.exitCode = 1
})
