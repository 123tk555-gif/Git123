const WEEKDAYS = ['日', '月', '火', '水', '木', '金', '土']
const DAY_MS = 24 * 60 * 60 * 1000

/** "2026-10-11T06:30:00Z" → "2026年10月11日(日) 15:30"(この PC の時刻で表示) */
export function formatDateTime(iso) {
  if (!iso) return 'なし'
  const d = new Date(iso)
  const hh = String(d.getHours()).padStart(2, '0')
  const mm = String(d.getMinutes()).padStart(2, '0')
  return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日(${WEEKDAYS[d.getDay()]}) ${hh}:${mm}`
}

/** 自動で完全に削除されるまでの残り日数(切り上げ。過ぎていれば 0) */
export function daysUntil(iso, now = new Date()) {
  return Math.max(0, Math.ceil((new Date(iso).getTime() - now.getTime()) / DAY_MS))
}
