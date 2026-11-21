import { GridModel } from '../model/grid'
import type { Position, Stage } from '../model/types'
export function boardCells(stage: Stage, position?: Position) {
  const grid = GridModel.parseGrid(stage.grid)
  const robot = position ?? grid.start
  return { width: grid.width, cells: stage.grid.flatMap((row, y) => [...row].map((_, x) => ({
    key: GridModel.cellKey({ x, y }), wall: grid.walls.has(GridModel.cellKey({ x, y })),
    goal: x === grid.goal.x && y === grid.goal.y, occupied: x === robot.x && y === robot.y,
  }))) }
}
