import { SORT_LABELS } from '../labels.js'
import TaskCard from './TaskCard.jsx'

function Column({ status, label, sort, tasks, onAdd, onEdit, onDelete }) {
  const headingId = `column-${status}`

  return (
    <section className="column" aria-labelledby={headingId}>
      <div className="column__header">
        <h2 id={headingId} className="column__title">
          {label}
          <span className="column__count">{tasks.length}件</span>
        </h2>
        <p className="column__sort">並び順: {SORT_LABELS[sort]}</p>
      </div>
      <button type="button" className="button button--add" onClick={() => onAdd(status)}>
        ＋ カードを追加<span className="visually-hidden">({label})</span>
      </button>
      {tasks.length === 0 ? (
        <p className="column__empty">カードはありません</p>
      ) : (
        <ul className="column__list">
          {tasks.map((task) => (
            <li key={task.id}>
              <TaskCard task={task} onEdit={onEdit} onDelete={onDelete} />
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

export default Column
