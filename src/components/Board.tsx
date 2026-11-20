import { cellKey, parseGrid } from '../engine/grid'
import type { Dir, Position, Stage } from '../engine/types'

const directions: Record<Dir, string> = { N: '북쪽', E: '동쪽', S: '남쪽', W: '서쪽' }
const arrows: Record<Dir, string> = { N: '▲', E: '▶', S: '▼', W: '◀' }

type BoardProps = { stage: Stage; position?: Position; direction?: Dir }

export function Board({ stage, position, direction = stage.startDir }: BoardProps) {
  const grid = parseGrid(stage.grid)
  const robot = position ?? grid.start
  return (
    <div className="board" role="img" aria-label={`${stage.title} 지도, 로봇 ${directions[direction]} 방향`} style={{ gridTemplateColumns: `repeat(${grid.width}, 1fr)` }}>
      {stage.grid.flatMap((row, y) => [...row].map((_, x) => {
        const key = cellKey({ x, y })
        const wall = grid.walls.has(key)
        const goal = x === grid.goal.x && y === grid.goal.y
        const occupied = x === robot.x && y === robot.y
        return <div className={`board-cell${wall ? ' board-wall' : ''}${goal ? ' board-goal' : ''}`} key={key}>
          {goal && <span aria-hidden="true">★</span>}
          {occupied && <span className="board-robot" aria-hidden="true">{arrows[direction]}</span>}
        </div>
      }))}
    </div>
  )
}
