import { describeDue } from '../dueDate.js'
import { COLOR_NAMES, PRIORITY_LABELS } from '../labels.js'

function TaskCard({ task, isFirst, isLast, canReorder, isDragging, onEdit, onDelete, onMoveStep, onDragStart, onDragEnd }) {
  const due = describeDue(task.dueDate, task.status)

  const handleDragStart = (event) => {
    event.dataTransfer.effectAllowed = 'move'
    event.dataTransfer.setData('text/plain', String(task.id))
    onDragStart(task)
  }

  return (
    <article
      className={`card card--${task.color.toLowerCase()}${isDragging ? ' card--dragging' : ''}`}
      draggable
      onDragStart={handleDragStart}
      onDragEnd={onDragEnd}
    >
      <h3 className="card__title">{task.title}</h3>
      {due?.label && <p className={`card__alert card__alert--${due.state}`}>{due.label}</p>}
      <dl className="card__meta">
        <div>
          <dt>期限</dt>
          <dd>{due ? due.text : 'なし'}</dd>
        </div>
        <div>
          <dt>優先度</dt>
          <dd>
            <span className={`priority priority--${task.priority.toLowerCase()}`}>
              {PRIORITY_LABELS[task.priority]}
            </span>
          </dd>
        </div>
        <div>
          <dt>カテゴリ</dt>
          <dd>{task.category ?? 'なし'}</dd>
        </div>
        <div>
          <dt>色</dt>
          <dd>{COLOR_NAMES[task.color]}</dd>
        </div>
      </dl>
      <div className="card__actions">
        <button type="button" className="button button--secondary button--small" onClick={() => onEdit(task)}>
          編集<span className="visually-hidden">: {task.title}</span>
        </button>
        <button type="button" className="button button--danger-outline button--small" onClick={() => onDelete(task)}>
          削除<span className="visually-hidden">: {task.title}</span>
        </button>
        {canReorder && (
          <>
            <button
              type="button"
              className="button button--secondary button--small"
              data-focus={`up-${task.id}`}
              disabled={isFirst}
              onClick={() => onMoveStep(task, -1)}
            >
              ↑ 上へ<span className="visually-hidden">: {task.title}</span>
            </button>
            <button
              type="button"
              className="button button--secondary button--small"
              data-focus={`down-${task.id}`}
              disabled={isLast}
              onClick={() => onMoveStep(task, 1)}
            >
              ↓ 下へ<span className="visually-hidden">: {task.title}</span>
            </button>
          </>
        )}
      </div>
    </article>
  )
}

export default TaskCard
