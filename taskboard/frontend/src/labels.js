export const STATUSES = [
  { key: 'TODO', label: '未着手' },
  { key: 'IN_PROGRESS', label: '進行中' },
  { key: 'DONE', label: '完了' },
]

export const PRIORITY_LABELS = {
  HIGH: '高',
  MEDIUM: '中',
  LOW: '低',
}

export const SORT_LABELS = {
  MANUAL: '手動',
  DUE_DATE: '期限が近い順',
  PRIORITY: '優先度が高い順',
  CATEGORY: 'カテゴリ順',
}

export const HISTORY_ACTION_LABELS = {
  CREATED: '追加',
  UPDATED: '編集',
  MOVED: '移動',
  DELETED: 'ゴミ箱へ',
  RESTORED: '元に戻す',
  PURGED: '完全に削除',
}

export const COLOR_NAMES = {
  WHITE: '白',
  YELLOW: '黄',
  GREEN: '緑',
  BLUE: '青',
  PINK: 'ピンク',
  ORANGE: 'オレンジ',
}
