import { useEffect, useRef } from 'react'

/**
 * ブラウザ標準の <dialog> を使った画面。開いている間は後ろの画面を操作できず、
 * Esc キーで閉じられ、閉じると元のボタンにキーボードの位置(フォーカス)が戻る。
 */
function Modal({ titleId, onClose, initialFocusRef, children }) {
  const dialogRef = useRef(null)

  useEffect(() => {
    const dialog = dialogRef.current
    dialog.showModal()
    initialFocusRef?.current?.focus()
    return () => {
      if (dialog.open) dialog.close()
    }
  }, [initialFocusRef])

  const handleCancel = (event) => {
    event.preventDefault()
    onClose()
  }

  return (
    <dialog ref={dialogRef} className="dialog" aria-labelledby={titleId} onCancel={handleCancel}>
      {children}
    </dialog>
  )
}

export default Modal
