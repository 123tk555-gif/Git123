import { useEffect, useState } from 'react'
import { fetchColumnSort, fetchTasks } from './api.js'
import Board from './components/Board.jsx'
import { STATUSES } from './labels.js'

async function loadColumns() {
  return Promise.all(
    STATUSES.map(async ({ key, label }) => {
      const sort = await fetchColumnSort(key)
      const tasks = await fetchTasks(key, sort)
      return { status: key, label, sort, tasks }
    }),
  )
}

function App() {
  const [phase, setPhase] = useState('loading')
  const [columns, setColumns] = useState([])
  const [reloadCount, setReloadCount] = useState(0)

  useEffect(() => {
    let cancelled = false
    loadColumns().then(
      (loaded) => {
        if (cancelled) return
        setColumns(loaded)
        setPhase('ready')
      },
      () => {
        if (!cancelled) setPhase('error')
      },
    )
    return () => {
      cancelled = true
    }
  }, [reloadCount])

  const retry = () => {
    setPhase('loading')
    setReloadCount((count) => count + 1)
  }

  return (
    <>
      <header className="app-header">
        <h1>トレロ風タスク管理アプリ</h1>
      </header>
      <main className="app-main">
        {phase === 'loading' && (
          <p className="status-message" role="status">
            読み込み中です…
          </p>
        )}
        {phase === 'error' && (
          <div className="error-message" role="alert">
            <p className="error-message__title">タスクを読み込めませんでした。</p>
            <p>
              サーバー(Spring Boot)とデータベース(Docker)が起動しているか確認してから、下のボタンを押してください。
            </p>
            <button type="button" className="button" onClick={retry}>
              もう一度読み込む
            </button>
          </div>
        )}
        {phase === 'ready' && <Board columns={columns} />}
      </main>
    </>
  )
}

export default App
