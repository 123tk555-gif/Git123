import Column from './Column.jsx'

function Board({ columns, ...handlers }) {
  return (
    <div className="board">
      {columns.map((column) => (
        <Column key={column.status} {...column} {...handlers} />
      ))}
    </div>
  )
}

export default Board
