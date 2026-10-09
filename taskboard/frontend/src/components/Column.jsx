import { SORT_LABELS } from '../labels.js'
import TaskCard from './TaskCard.jsx'

function Column({ status, label, sort, tasks }) {
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
      {tasks.length === 0 ? (
        <p className="column__empty">カードはありません</p>
      ) : (
        <ul className="column__list">
          {tasks.map((task) => (
            <li key={task.id}>
              <TaskCard task={task} />
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

export default Column
