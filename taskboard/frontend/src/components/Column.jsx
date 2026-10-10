import { useRef, useState } from 'react'
import { SORT_LABELS } from '../labels.js'
import TaskCard from './TaskCard.jsx'

function DropIndicator() {
  return <li className="drop-indicator" aria-hidden="true" />
}

function Column({
  status,
  label,
  sort,
  tasks,
  dragging,
  onAdd,
  onEdit,
  onDelete,
  onSortChange,
  onMoveStep,
  onDragStart,
  onDragEnd,
  onDropTask,
}) {
  const headingId = `column-${status}`
  const sortId = `sort-${status}`
  const isManual = sort === 'MANUAL'
  const listRef = useRef(null)
  // null: ドラッグ中のカードがこの列の上にない / 数値: 手動の列で入る位置 / -1: 手動以外の列の上にある
  const [dropIndex, setDropIndex] = useState(null)

  // マウスの高さから、ドラッグ中のカードを除いた並びの中での位置を求める
  const indexAt = (clientY) => {
    const items = [...(listRef.current?.querySelectorAll('li[data-task-id]') ?? [])].filter(
      (item) => Number(item.dataset.taskId) !== dragging.id,
    )
    const found = items.findIndex((item) => {
      const rect = item.getBoundingClientRect()
      return clientY < rect.top + rect.height / 2
    })
    return found === -1 ? items.length : found
  }

  const handleDragOver = (event) => {
    if (!dragging) return
    event.preventDefault()
    event.dataTransfer.dropEffect = 'move'
    const next = isManual ? indexAt(event.clientY) : -1
    if (next !== dropIndex) setDropIndex(next)
  }

  const handleDragLeave = (event) => {
    if (!event.currentTarget.contains(event.relatedTarget)) setDropIndex(null)
  }

  const handleDrop = (event) => {
    event.preventDefault()
    const index = dropIndex
    setDropIndex(null)
    if (dragging) onDropTask(dragging, status, isManual ? index : null)
  }

  const visibleCount = tasks.filter((task) => task.id !== dragging?.id).length
  let position = 0
  const items = []
  tasks.forEach((task, index) => {
    const isDragged = task.id === dragging?.id
    if (!isDragged) {
      if (isManual && dropIndex === position) items.push(<DropIndicator key="drop" />)
      position += 1
    }
    items.push(
      <li key={task.id} data-task-id={task.id}>
        <TaskCard
          task={task}
          isFirst={index === 0}
          isLast={index === tasks.length - 1}
          canReorder={isManual}
          isDragging={isDragged}
          onEdit={onEdit}
          onDelete={onDelete}
          onMoveStep={onMoveStep}
          onDragStart={onDragStart}
          onDragEnd={onDragEnd}
        />
      </li>,
    )
  })
  if (isManual && dropIndex === visibleCount) items.push(<DropIndicator key="drop" />)

  return (
    <section
      className={`column${dropIndex !== null ? ' column--drop-target' : ''}`}
      aria-labelledby={headingId}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <div className="column__header">
        <h2 id={headingId} className="column__title">
          {label}
          <span className="column__count">{tasks.length}件</span>
        </h2>
        <div className="column__sort">
          <label htmlFor={sortId}>
            並び順<span className="visually-hidden">({label})</span>
          </label>
          <select
            id={sortId}
            className="column__sort-select"
            value={sort}
            onChange={(event) => onSortChange(status, event.target.value)}
          >
            {Object.entries(SORT_LABELS).map(([value, text]) => (
              <option key={value} value={value}>
                {text}
              </option>
            ))}
          </select>
        </div>
        {!isManual && <p className="column__hint">この列の中で並べ替えるには、並び順を「手動」にしてください。</p>}
      </div>
      <button type="button" className="button button--add" onClick={() => onAdd(status)}>
        ＋ カードを追加<span className="visually-hidden">({label})</span>
      </button>
      {tasks.length === 0 && dropIndex === null ? (
        <p className="column__empty">カードはありません</p>
      ) : (
        <ul ref={listRef} className="column__list">
          {items}
        </ul>
      )}
    </section>
  )
}

export default Column
