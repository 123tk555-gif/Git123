import { useEffect, useState } from 'react'
import { startOfToday } from './dueDate.js'

/**
 * 今日の日付(0時0分)。開いたままでも日付が変わると更新し、「今日まで」「期限切れ」の表示を合わせる。
 * 0時を過ぎたとき、別の画面からこの画面に戻ったとき(スリープからの復帰を含む)に確かめ直す。
 */
export function useToday() {
  const [today, setToday] = useState(() => startOfToday())

  useEffect(() => {
    const refresh = () => {
      setToday((current) => {
        const now = startOfToday()
        return now.getTime() === current.getTime() ? current : now
      })
    }
    const nextMidnight = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1)
    const timer = setTimeout(refresh, nextMidnight.getTime() - Date.now() + 1000)
    const handleVisible = () => {
      if (document.visibilityState === 'visible') refresh()
    }
    document.addEventListener('visibilitychange', handleVisible)
    window.addEventListener('focus', refresh)
    return () => {
      clearTimeout(timer)
      document.removeEventListener('visibilitychange', handleVisible)
      window.removeEventListener('focus', refresh)
    }
  }, [today])

  return today
}
