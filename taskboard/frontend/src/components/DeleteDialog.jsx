import { useRef, useState } from 'react'
import { deleteTask } from '../api.js'
import Modal from './Modal.jsx'

/** 削除の確認画面。誤って消さないよう、最初は「やめる」ボタンにキーボードの位置を置く。 */
function DeleteDialog({ task, onClose, onDeleted }) {
  const cancelRef = useRef(null)
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState(null)

  async function handleDelete() {
    setDeleting(true)
    setError(null)
    try {
      await deleteTask(task.id)
      onDeleted(`「${task.title}」を削除しました`)
    } catch (e) {
      setError(e.message)
      setDeleting(false)
    }
  }

  return (
    <Modal titleId="delete-dialog-title" onClose={onClose} initialFocusRef={cancelRef}>
      <div className="dialog__form">
        <h2 id="delete-dialog-title" className="dialog__title">
          カードを削除しますか?
        </h2>
        <p>
          「<strong>{task.title}</strong>」を削除します。
          <br />
          削除すると元に戻せません。
        </p>
        {error && (
          <p className="form-error" role="alert">
            {error}
          </p>
        )}
        <div className="dialog__actions">
          <button type="button" className="button button--danger" onClick={handleDelete} disabled={deleting}>
            {deleting ? '削除中…' : '削除する'}
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
