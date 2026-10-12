import { useEffect, useRef } from 'react'

/**
 * ブラウザ標準の <dialog> を使った画面。開いている間は後ろの画面を操作できず、
 * Esc キーで閉じられ、閉じると元のボタンにキーボードの位置(フォーカス)が戻る。
 */
function Modal({ titleId, onClose, initialFocusRef, wide = false, children }) {
  const dialogRef = useRef(null)

  useEffect(() => {
    const dialog = dialogRef.current
    // 閉じたときに戻す場所。画面がページから取り除かれたあとに閉じる処理が動くと、
    // ブラウザは自動では戻さないため、自分で覚えて戻す
    const previous = document.activeElement
    dialog.showModal()
    initialFocusRef?.current?.focus()
    return () => {
      if (dialog.open) dialog.close()
      if (previous?.isConnected) previous.focus()
    }
  }, [initialFocusRef])

  const handleCancel = (event) => {
    event.preventDefault()
    onClose()
  }

  return (
    <dialog
      ref={dialogRef}
      className={`dialog${wide ? ' dialog--wide' : ''}`}
      aria-labelledby={titleId}
      onCancel={handleCancel}
    >
      {children}
    </dialog>
  )
}

export default Modal
