import { useEffect, useRef, useState } from 'react'
import { fetchHistory } from '../api.js'
import { formatDateTime } from '../dateTime.js'
import { HISTORY_ACTION_LABELS } from '../labels.js'
import Modal from './Modal.jsx'

const LIMIT = 100

/** 操作履歴の一覧(新しい順) */
function HistoryDialog({ onClose }) {
  const closeRef = useRef(null)
  const [state, setState] = useState({ phase: 'loading', entries: [] })

  useEffect(() => {
    let cancelled = false
    fetchHistory(LIMIT).then(
      (entries) => !cancelled && setState({ phase: 'ready', entries }),
      (error) => !cancelled && setState({ phase: 'error', entries: [], message: error.message }),
    )
    return () => {
      cancelled = true
    }
  }, [])

  return (
    <Modal titleId="history-dialog-title" onClose={onClose} initialFocusRef={closeRef} wide>
      <div className="dialog__form">
        <div className="dialog__header">
          <h2 id="history-dialog-title" className="dialog__title">
            操作履歴
          </h2>
          <button ref={closeRef} type="button" className="button button--secondary" onClick={onClose}>
            閉じる
          </button>
        </div>
        <p className="dialog__lead">新しい順に、最大{LIMIT}件を表示しています。</p>

        {state.phase === 'loading' && <p role="status">読み込み中です…</p>}
        {state.phase === 'error' && (
          <p className="form-error" role="alert">
            操作履歴を読み込めませんでした。{state.message}
          </p>
        )}
        {state.phase === 'ready' && state.entries.length === 0 && <p>まだ操作履歴はありません。</p>}
        {state.phase === 'ready' && state.entries.length > 0 && (
          <ol className="history-list">
            {state.entries.map((entry) => (
              <li key={entry.id} className="history-item">
                <p className="history-item__head">
                  <span className={`history-action history-action--${entry.action.toLowerCase()}`}>
                    {HISTORY_ACTION_LABELS[entry.action]}
                  </span>
                  <span className="history-item__time">{formatDateTime(entry.occurredAt)}</span>
                </p>
                <p className="history-item__title">「{entry.taskTitle}」</p>
                <p className="history-item__detail">{entry.detail}</p>
              </li>
            ))}
          </ol>
        )}
      </div>
    </Modal>
  )
}

export default HistoryDialog
