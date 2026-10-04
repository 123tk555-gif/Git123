import Column from './Column.jsx'

function Board({ columns }) {
  return (
    <div className="board">
      {columns.map((column) => (
        <Column key={column.status} {...column} />
      ))}
    </div>
  )
}

export default Board
