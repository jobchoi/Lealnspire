import { GridModel, hintCells } from '../model/grid'
import type { HintHighlight, Position, Stage } from '../model/types'
export function boardCells(stage: Stage, position?: Position, highlight?: HintHighlight) {
  const grid = GridModel.parseGrid(stage.grid)
  const highlighted = highlight ? hintCells(stage, highlight) : new Set<string>()
  const robot = position ?? grid.start
  return { width: grid.width, cells: stage.grid.flatMap((row, y) => [...row].map((_, x) => ({
    hint: highlighted.has(GridModel.cellKey({ x, y })), key: GridModel.cellKey({ x, y }), wall: grid.walls.has(GridModel.cellKey({ x, y })),
    goal: x === grid.goal.x && y === grid.goal.y, occupied: x === robot.x && y === robot.y,
  }))) }
}
