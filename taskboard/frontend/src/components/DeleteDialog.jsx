import { useRef, useState } from 'react'
import { deleteTask } from '../api.js'
import Modal from './Modal.jsx'

/**
 * 削除の確認画面。すぐには消さずゴミ箱に移す。
 * 誤って押さないよう、最初は「やめる」ボタンにキーボードの位置を置く。
 */
function DeleteDialog({ task, retentionDays, onClose, onDeleted }) {
  const cancelRef = useRef(null)
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState(null)

  async function handleDelete() {
    setDeleting(true)
    setError(null)
    try {
      await deleteTask(task.id)
      onDeleted(`「${task.title}」をゴミ箱に移しました(画面上部の「ゴミ箱」から元に戻せます)`)
    } catch (e) {
      setError(e.message)
      setDeleting(false)
    }
  }

  return (
    <Modal titleId="delete-dialog-title" onClose={onClose} initialFocusRef={cancelRef}>
      <div className="dialog__form">
        <h2 id="delete-dialog-title" className="dialog__title">
          カードをゴミ箱に移しますか?
        </h2>
        <p>
          「<strong>{task.title}</strong>」をゴミ箱に移します。
          <br />
          ゴミ箱から元に戻せます。{retentionDays}日たつと自動で完全に削除されます。
        </p>
        {error && (
          <p className="form-error" role="alert">
            {error}
          </p>
        )}
        <div className="dialog__actions">
          <button type="button" className="button button--danger" onClick={handleDelete} disabled={deleting}>
            {deleting ? '移動中…' : 'ゴミ箱に移す'}
          </button>
          <button ref={cancelRef} type="button" className="button button--secondary" onClick={onClose}>
            やめる
          </button>
        </div>
      </div>
    </Modal>
  )
}

export default DeleteDialog
