import { SORT_LABELS } from '../labels.js'
import TaskCard from './TaskCard.jsx'

function Column({ status, label, sort, tasks, onAdd, onEdit, onDelete, onSortChange }) {
  const headingId = `column-${status}`
  const sortId = `sort-${status}`

  return (
    <section className="column" aria-labelledby={headingId}>
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
