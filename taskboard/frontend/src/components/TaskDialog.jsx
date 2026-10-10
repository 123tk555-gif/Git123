import { useRef, useState } from 'react'
import { createTask, updateTask } from '../api.js'
import { COLOR_NAMES, PRIORITY_LABELS, STATUSES } from '../labels.js'
import Modal from './Modal.jsx'

function initialForm(task, status) {
  if (task) {
    return {
      title: task.title,
      status: task.status,
      dueDate: task.dueDate ?? '',
      priority: task.priority,
      category: task.category ?? '',
      color: task.color,
    }
  }
  return { title: '', status, dueDate: '', priority: 'MEDIUM', category: '', color: 'WHITE' }
}

function FieldError({ id, message }) {
  if (!message) return null
  return (
    <p id={id} className="field-error">
      {message}
    </p>
  )
}

/** カードの追加と編集で共通の入力画面。task があれば編集、なければ initialStatus の列に追加する。 */
function TaskDialog({ task, initialStatus, categories, onClose, onSaved }) {
  const isEdit = Boolean(task)
  const titleRef = useRef(null)
  const [form, setForm] = useState(() => initialForm(task, initialStatus))
  const [fieldErrors, setFieldErrors] = useState({})
  const [formError, setFormError] = useState(null)
  const [saving, setSaving] = useState(false)

  // 入力し直した項目のエラーは、その場で消す
  const update = (name) => (event) => {
    const { value } = event.target
    setForm((current) => ({ ...current, [name]: value }))
    setFieldErrors((current) => {
      if (!current[name]) return current
      const next = { ...current }
      delete next[name]
      return next
    })
    setFormError(null)
  }

  async function handleSubmit(event) {
    event.preventDefault()
    if (form.title.trim() === '') {
      setFieldErrors({ title: '内容を入力してください' })
      setFormError('入力内容に誤りがあります。赤い文字の説明を見て直してください。')
      titleRef.current.focus()
      return
    }
    setSaving(true)
    setFieldErrors({})
    setFormError(null)
    const payload = { ...form, dueDate: form.dueDate || null }
    try {
      const saved = isEdit ? await updateTask(task.id, payload) : await createTask(payload)
      onSaved(`「${saved.title}」を${isEdit ? '更新' : '追加'}しました`)
    } catch (error) {
      setFieldErrors(Object.fromEntries(error.fieldErrors?.map((e) => [e.field, e.message]) ?? []))
      setFormError(error.message)
      setSaving(false)
    }
  }

  const heading = isEdit ? 'カードを編集' : 'カードを追加'
  const invalid = (name) => (fieldErrors[name] ? { 'aria-invalid': true, 'aria-describedby': `${name}-error` } : {})

  return (
    <Modal titleId="task-dialog-title" onClose={onClose} initialFocusRef={titleRef}>
      <form className="dialog__form" onSubmit={handleSubmit} noValidate>
        <h2 id="task-dialog-title" className="dialog__title">
          {heading}
        </h2>

        {formError && (
          <p className="form-error" role="alert">
            {formError}
          </p>
        )}

        <div className="field">
          <label htmlFor="task-title" className="field__label">
            内容 <span className="field__required">(必須)</span>
          </label>
          <input
            ref={titleRef}
            id="task-title"
            type="text"
            className="field__input"
            value={form.title}
            onChange={update('title')}
            maxLength={200}
            {...invalid('title')}
          />
          <FieldError id="title-error" message={fieldErrors.title} />
        </div>

        <div className="field">
          <label htmlFor="task-status" className="field__label">
            状態
          </label>
          <select id="task-status" className="field__input" value={form.status} onChange={update('status')}>
            {STATUSES.map(({ key, label }) => (
              <option key={key} value={key}>
                {label}
              </option>
            ))}
          </select>
        </div>

        <div className="field">
          <label htmlFor="task-due" className="field__label">
            期限 <span className="field__hint">(空のままなら期限なし)</span>
          </label>
          <div className="field__row">
            <input
              id="task-due"
              type="date"
              className="field__input field__input--date"
              value={form.dueDate}
              onChange={update('dueDate')}
              {...invalid('dueDate')}
            />
            {form.dueDate && (
              <button
                type="button"
                className="button button--secondary"
                onClick={() => setForm((current) => ({ ...current, dueDate: '' }))}
              >
                期限を消す
              </button>
            )}
          </div>
          <FieldError id="dueDate-error" message={fieldErrors.dueDate} />
        </div>

        <fieldset className="field">
          <legend className="field__label">優先度</legend>
          <div className="choices">
            {Object.entries(PRIORITY_LABELS).map(([value, label]) => (
              <label key={value} className="choice">
                <input
                  type="radio"
                  name="priority"
                  value={value}
                  checked={form.priority === value}
                  onChange={update('priority')}
                />
                {label}
              </label>
            ))}
          </div>
        </fieldset>

        <div className="field">
          <label htmlFor="task-category" className="field__label">
            カテゴリ <span className="field__hint">(自由に入力。空のままならカテゴリなし)</span>
          </label>
          <input
            id="task-category"
            type="text"
            className="field__input"
            list="category-options"
            value={form.category}
            onChange={update('category')}
            maxLength={50}
            {...invalid('category')}
          />
          <datalist id="category-options">
            {categories.map((category) => (
              <option key={category} value={category} />
            ))}
          </datalist>
          <FieldError id="category-error" message={fieldErrors.category} />
        </div>

        <fieldset className="field">
          <legend className="field__label">色</legend>
          <div className="choices">
            {Object.entries(COLOR_NAMES).map(([value, name]) => (
              <label key={value} className="choice">
                <input
                  type="radio"
                  name="color"
                  value={value}
                  checked={form.color === value}
                  onChange={update('color')}
                />
                <span className={`swatch card--${value.toLowerCase()}`} aria-hidden="true" />
                {name}
              </label>
            ))}
          </div>
        </fieldset>

        <div className="dialog__actions">
          <button type="submit" className="button" disabled={saving}>
            {saving ? '保存中…' : isEdit ? '変更を保存する' : '追加する'}
          </button>
          <button type="button" className="button button--secondary" onClick={onClose}>
            キャンセル
          </button>
        </div>
      </form>
    </Modal>
  )
}

export default TaskDialog
