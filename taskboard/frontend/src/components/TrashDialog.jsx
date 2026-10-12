import { useRef, useState } from 'react'
import { emptyTrash, purgeTask, restoreTask } from '../api.js'
import { daysUntil, formatDateTime } from '../dateTime.js'
import { STATUSES } from '../labels.js'
import Modal from './Modal.jsx'

const labelOf = (status) => STATUSES.find((s) => s.key === status)?.label ?? status

/**
 * ゴミ箱の中身。元に戻す・完全に削除・ゴミ箱を空にする。
 * 完全に削除は元に戻せないので、押すとその場で確認を出す(二段階)。
 * 結果は画面の中に出す(開いている間は、後ろの画面のお知らせが読み上げられないため)。
 */
function TrashDialog({ trash, onClose, onChanged }) {
  const closeRef = useRef(null)
  // null / { type: 'purge', id } / { type: 'empty' }
  const [confirming, setConfirming] = useState(null)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState(null)

  const run = async (action, successText) => {
    setBusy(true)
    setMessage(null)
    try {
      await action()
      setMessage({ text: successText, isError: false })
      onChanged(successText)
    } catch (error) {
      setMessage({ text: error.message, isError: true })
    }
    setBusy(false)
    setConfirming(null)
    closeRef.current?.focus()
  }

  const items = trash?.items ?? []
  const retentionDays = trash?.retentionDays ?? 30

  return (
    <Modal titleId="trash-dialog-title" onClose={onClose} initialFocusRef={closeRef} wide>
      <div className="dialog__form">
        <div className="dialog__header">
          <h2 id="trash-dialog-title" className="dialog__title">
            ゴミ箱({items.length}件)
          </h2>
          <button ref={closeRef} type="button" className="button button--secondary" onClick={onClose}>
            閉じる
          </button>
        </div>
        <p className="dialog__lead">
          ゴミ箱のカードは、入れてから{retentionDays}日たつと自動で完全に削除されます。それまでは元に戻せます。
        </p>

        <p className={`notice${message ? '' : ' notice--empty'}${message?.isError ? ' notice--error' : ''}`} role="status">
          {message?.isError && <strong>エラー: </strong>}
          {message?.text}
        </p>

        {items.length === 0 ? (
          <p className="column__empty">ゴミ箱は空です</p>
        ) : (
          <>
            <div className="trash-empty">
              {confirming?.type === 'empty' ? (
                <div className="confirm-box">
                  <p>
                    <strong>ゴミ箱の{items.length}件をすべて完全に削除します。元に戻せません。</strong>
                  </p>
                  <div className="dialog__actions">
                    <button
                      type="button"
                      className="button button--danger"
                      disabled={busy}
                      onClick={() => run(emptyTrash, `ゴミ箱を空にしました(${items.length}件を完全に削除)`)}
                    >
                      すべて完全に削除する
                    </button>
                    <button type="button" className="button button--secondary" onClick={() => setConfirming(null)}>
                      やめる
                    </button>
                  </div>
                </div>
              ) : (
                <button type="button" className="button button--danger-outline" onClick={() => setConfirming({ type: 'empty' })}>
                  ゴミ箱を空にする
                </button>
              )}
            </div>

            <ul className="trash-list">
              {items.map(({ task, deletedAt, purgeAt }) => {
                const days = daysUntil(purgeAt)
                const isConfirming = confirming?.type === 'purge' && confirming.id === task.id
                return (
                  <li key={task.id} className={`trash-item card--${task.color.toLowerCase()}`}>
                    <h3 className="trash-item__title">{task.title}</h3>
                    <dl className="card__meta">
                      <div>
                        <dt>元の列</dt>
                        <dd>{labelOf(task.status)}</dd>
                      </div>
                      <div>
                        <dt>削除</dt>
                        <dd>{formatDateTime(deletedAt)}</dd>
                      </div>
                      <div>
                        <dt>自動削除</dt>
                        <dd>
                          <strong>{days > 0 ? `あと${days}日で完全に削除` : 'まもなく完全に削除'}</strong>
                        </dd>
                      </div>
                    </dl>
                    {isConfirming ? (
                      <div className="confirm-box">
                        <p>
                          <strong>「{task.title}」を完全に削除します。元に戻せません。</strong>
                        </p>
                        <div className="dialog__actions">
                          <button
                            type="button"
                            className="button button--danger"
                            disabled={busy}
                            onClick={() => run(() => purgeTask(task.id), `「${task.title}」を完全に削除しました`)}
                          >
                            完全に削除する
                          </button>
                          <button type="button" className="button button--secondary" onClick={() => setConfirming(null)}>
                            やめる
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="card__actions">
                        <button
                          type="button"
                          className="button button--small"
                          disabled={busy}
                          onClick={() =>
                            run(() => restoreTask(task.id), `「${task.title}」を「${labelOf(task.status)}」に戻しました`)
                          }
                        >
                          元に戻す<span className="visually-hidden">: {task.title}</span>
                        </button>
                        <button
                          type="button"
                          className="button button--danger-outline button--small"
                          onClick={() => setConfirming({ type: 'purge', id: task.id })}
                        >
                          完全に削除<span className="visually-hidden">: {task.title}</span>
                        </button>
                      </div>
                    )}
                  </li>
                )
              })}
            </ul>
          </>
        )}
      </div>
    </Modal>
  )
}

export default TrashDialog
