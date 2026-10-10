import { useEffect, useState } from 'react'
import { changeColumnSort, fetchColumnSort, fetchTasks } from './api.js'
import Board from './components/Board.jsx'
import DeleteDialog from './components/DeleteDialog.jsx'
import TaskDialog from './components/TaskDialog.jsx'
import { SORT_LABELS, STATUSES } from './labels.js'

async function loadColumns() {
  return Promise.all(
    STATUSES.map(async ({ key, label }) => {
      const sort = await fetchColumnSort(key)
      const tasks = await fetchTasks(key, sort)
      return { status: key, label, sort, tasks }
    }),
  )
}

function categoriesOf(columns) {
  const names = columns.flatMap((column) => column.tasks.map((task) => task.category)).filter(Boolean)
  return [...new Set(names)].sort()
}

function App() {
  const [phase, setPhase] = useState('loading')
  const [columns, setColumns] = useState([])
  const [reloadCount, setReloadCount] = useState(0)
  // null / { type: 'add', status } / { type: 'edit', task } / { type: 'delete', task }
  const [dialog, setDialog] = useState(null)
  // { text, isError }。追加・更新・削除・並び順の変更の結果を画面の上に出す
  const [notice, setNotice] = useState(null)

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

  const reload = () => setReloadCount((count) => count + 1)

  const retry = () => {
    setPhase('loading')
    reload()
  }

  const closeDialog = () => setDialog(null)

  const handleDone = (message) => {
    setDialog(null)
    setNotice({ text: message, isError: false })
    reload()
  }

  // 選んだ並び順はすぐメニューに反映し、保存できたらカードを並べ直す。失敗したら元に戻す
  const handleSortChange = async (status, sort) => {
    const label = STATUSES.find((s) => s.key === status).label
    setColumns((current) => current.map((column) => (column.status === status ? { ...column, sort } : column)))
    try {
      await changeColumnSort(status, sort)
      setNotice({ text: `「${label}」の並び順を「${SORT_LABELS[sort]}」にしました`, isError: false })
    } catch (error) {
      setNotice({ text: `並び順を変更できませんでした。${error.message}`, isError: true })
    }
    reload()
  }

  return (
    <>
      <header className="app-header">
        <h1>トレロ風タスク管理アプリ</h1>
      </header>
      <main className="app-main">
        <p className={`notice${notice ? '' : ' notice--empty'}${notice?.isError ? ' notice--error' : ''}`} role="status">
          {notice?.isError && <strong>エラー: </strong>}
          {notice?.text}
        </p>
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
        {phase === 'ready' && (
          <Board
            columns={columns}
            onAdd={(status) => setDialog({ type: 'add', status })}
            onEdit={(task) => setDialog({ type: 'edit', task })}
            onDelete={(task) => setDialog({ type: 'delete', task })}
            onSortChange={handleSortChange}
          />
        )}
      </main>

      {(dialog?.type === 'add' || dialog?.type === 'edit') && (
        <TaskDialog
          task={dialog.task}
          initialStatus={dialog.status}
          categories={categoriesOf(columns)}
          onClose={closeDialog}
          onSaved={handleDone}
        />
      )}
      {dialog?.type === 'delete' && <DeleteDialog task={dialog.task} onClose={closeDialog} onDeleted={handleDone} />}
    </>
  )
}

export default App
