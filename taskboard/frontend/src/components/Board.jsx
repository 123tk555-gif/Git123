import Column from './Column.jsx'

function Board({ columns, onAdd, onEdit, onDelete }) {
  return (
    <div className="board">
      {columns.map((column) => (
        <Column key={column.status} {...column} onAdd={onAdd} onEdit={onEdit} onDelete={onDelete} />
      ))}
    </div>
  )
}

export default Board
