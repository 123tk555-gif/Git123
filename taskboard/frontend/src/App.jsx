import { useEffect, useRef, useState } from 'react'
import { changeColumnSort, fetchAppInfo, fetchColumnSort, fetchTasks, fetchTrash, moveTask } from './api.js'
import Board from './components/Board.jsx'
import DeleteDialog from './components/DeleteDialog.jsx'
import HistoryDialog from './components/HistoryDialog.jsx'
import TaskDialog from './components/TaskDialog.jsx'
import TrashDialog from './components/TrashDialog.jsx'
import { SORT_LABELS, STATUSES } from './labels.js'
import { useToday } from './useToday.js'

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
  // ゴミ箱の中身 { retentionDays, items }
  const [trash, setTrash] = useState(null)
  // { demo, resetLabel, maxTasks }
  const [appInfo, setAppInfo] = useState(null)
  // null / { type: 'add', status } / { type: 'edit', task } / { type: 'delete', task } / { type: 'history' } / { type: 'trash' }
  const [dialog, setDialog] = useState(null)
  // { text, isError }。追加・更新・削除・並び順の変更の結果を画面の上に出す
  const [notice, setNotice] = useState(null)
  // ドラッグ中のカード
  const [dragging, setDragging] = useState(null)
  // 並べ直した画面で、キーボードの位置を移すボタンの目印(data-focus)。前から順に、押せるものへ移す
  // 例: 「上へ」のあとは ["up-12", "down-12"]、削除のあとは ["add-TODO"]
  const focusAfterReload = useRef(null)
  const today = useToday()

  useEffect(() => {
    const keys = focusAfterReload.current
    if (!keys) return
    focusAfterReload.current = null
    keys
      .map((key) => document.querySelector(`[data-focus="${key}"]`))
      .find((button) => button && !button.disabled)
      ?.focus()
  }, [columns])

  useEffect(() => {
    let cancelled = false
    Promise.all([loadColumns(), fetchTrash(), fetchAppInfo()]).then(
      ([loaded, loadedTrash, loadedInfo]) => {
        if (cancelled) return
        setColumns(loaded)
        setTrash(loadedTrash)
        setAppInfo(loadedInfo)
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

  // 押した「削除」ボタンはカードと一緒に消えるので、同じ列の「カードを追加」にキーボードの位置を移す
  const handleDeleted = (message) => {
    focusAfterReload.current = [`add-${dialog.task.status}`]
    handleDone(message)
  }

  // ゴミ箱の画面は開いたまま、ボードとゴミ箱の中身を読み直す
  const handleTrashChanged = (message) => {
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

  const labelOf = (status) => STATUSES.find((s) => s.key === status).label

  const saveMove = async (task, status, index, message) => {
    try {
      await moveTask(task.id, status, index)
      setNotice({ text: message, isError: false })
    } catch (error) {
      setNotice({ text: `カードを移動できませんでした。${error.message}`, isError: true })
    }
    reload()
  }

  // 「上へ」「下へ」ボタン(手動の列だけ)。delta は -1 か 1
  const handleMoveStep = (task, delta) => {
    const column = columns.find((c) => c.status === task.status)
    const index = column.tasks.findIndex((t) => t.id === task.id)
    const pressed = delta < 0 ? 'up' : 'down'
    const other = delta < 0 ? 'down' : 'up'
    focusAfterReload.current = [`${pressed}-${task.id}`, `${other}-${task.id}`]
    saveMove(task, task.status, index + delta, `「${task.title}」を1つ${delta < 0 ? '上' : '下'}へ移動しました`)
  }

  // ドロップされたとき。index は手動の列なら入る位置、手動以外の列なら null
  const handleDropTask = (task, status, index) => {
    setDragging(null)
    const column = columns.find((c) => c.status === status)
    if (task.status === status) {
      if (index === null) {
        setNotice({
          text: `「${column.label}」は「${SORT_LABELS[column.sort]}」で並んでいるため、この列の中では並べ替えできません。並べ替えるには、並び順を「手動」にしてください。`,
          isError: false,
        })
        return
      }
      // 位置はドラッグ中のカードを除いた並びで数えるので、元の位置と同じなら何もしない
      if (index === column.tasks.findIndex((t) => t.id === task.id)) return
      saveMove(task, status, index, `「${task.title}」の位置を変更しました`)
      return
    }
    const note = index === null ? `(この列は「${SORT_LABELS[column.sort]}」で並んでいます)` : ''
    saveMove(task, status, index ?? column.tasks.length, `「${task.title}」を「${labelOf(status)}」に移動しました${note}`)
  }

  return (
    <>
      <header className="app-header">
        <h1>トレロ風タスク管理アプリ</h1>
        <nav className="app-header__nav" aria-label="ボードの外の画面">
          <button type="button" className="header-button" onClick={() => setDialog({ type: 'history' })}>
            操作履歴
          </button>
          <button type="button" className="header-button" onClick={() => setDialog({ type: 'trash' })}>
            ゴミ箱({trash?.items.length ?? 0}件)
          </button>
        </nav>
      </header>
      <main className="app-main">
        <p className={`notice${notice ? '' : ' notice--empty'}${notice?.isError ? ' notice--error' : ''}`} role="status">
          {notice?.isError && <strong>エラー: </strong>}
          {notice?.text}
        </p>
        {appInfo?.demo && (
          <div className="demo-banner" role="note" aria-label="体験版のお知らせ">
            <p>
              どなたでも自由に試せます。入力した内容は{appInfo.resetLabel}に、すべて最初の状態(テストデータ)に戻ります。
              {appInfo.maxTasks > 0 && `カードは最大${appInfo.maxTasks}枚(ゴミ箱を含む)までです。`}
              個人情報や大切な内容は入力しないでください。
            </p>
          </div>
        )}
        {phase === 'ready' && (
          <p className="help">
            カードはマウスでドラッグして、別の列や好きな位置へ移動できます。キーボードでは「上へ」「下へ」ボタンと、「編集」の「状態」で移動できます。
          </p>
        )}
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
            dragging={dragging}
            onDragStart={setDragging}
            onDragEnd={() => setDragging(null)}
            onDropTask={handleDropTask}
            onMoveStep={handleMoveStep}
            today={today}
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
      {dialog?.type === 'delete' && (
        <DeleteDialog
          task={dialog.task}
          retentionDays={trash?.retentionDays ?? 30}
          onClose={closeDialog}
          onDeleted={handleDeleted}
        />
      )}
      {dialog?.type === 'history' && <HistoryDialog onClose={closeDialog} />}
      {dialog?.type === 'trash' && <TrashDialog trash={trash} onClose={closeDialog} onChanged={handleTrashChanged} />}
    </>
  )
}

export default App
