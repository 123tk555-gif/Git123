const WEEKDAYS = ['日', '月', '火', '水', '木', '金', '土']
const DAY_MS = 24 * 60 * 60 * 1000

// "2026-10-05" を UTC ではなく、この PC の日付として読む(1日ずれるのを防ぐ)
function parseLocalDate(value) {
  const [year, month, day] = value.split('-').map(Number)
  return new Date(year, month - 1, day)
}

export function startOfToday(now = new Date()) {
  return new Date(now.getFullYear(), now.getMonth(), now.getDate())
}

/**
 * 期限の表示用の文字を作る。完了したタスクには「期限切れ」などの注意を出さない。
 * 戻り値: null(期限なし)または { text, state, label }
 */
export function describeDue(dueDate, status, today = startOfToday()) {
  if (!dueDate) return null
  const date = parseLocalDate(dueDate)
  const yearPart = date.getFullYear() === today.getFullYear() ? '' : `${date.getFullYear()}年`
  const text = `${yearPart}${date.getMonth() + 1}月${date.getDate()}日(${WEEKDAYS[date.getDay()]})`
  if (status === 'DONE') return { text, state: null, label: null }

  const days = Math.round((date - today) / DAY_MS)
  if (days < 0) return { text, state: 'overdue', label: `期限切れ(${-days}日過ぎ)` }
  if (days === 0) return { text, state: 'today', label: '今日まで' }
  if (days === 1) return { text, state: 'soon', label: '明日まで' }
  return { text, state: null, label: null }
}
