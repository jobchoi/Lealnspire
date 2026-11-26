import type { HintHighlight, Position, Stage } from './types'

export type Grid = { width: number; height: number; walls: Set<string>; doors: Map<string, 'a' | 'b'>; start: Position; goal: Position }
export const cellKey = (pos: Position): string => `${pos.x},${pos.y}`

export class GridModel {
  static parseGrid(rows: string[]): Grid {
    if (!rows.length || !rows[0].length || rows.some(row => row.length !== rows[0].length)) throw new Error('Invalid grid dimensions')
    const walls = new Set<string>()
    const doors = new Map<string, 'a' | 'b'>()
    let start: Position | undefined
    let goal: Position | undefined
    rows.forEach((row, y) => [...row].forEach((cell, x) => {
      const pos = { x, y }
      if (cell === '#') walls.add(cellKey(pos))
      else if (cell === 'a' || cell === 'b') doors.set(cellKey(pos), cell)
      else if (cell === 'S') { if (start) throw new Error('Duplicate start'); start = pos }
      else if (cell === 'G') { if (goal) throw new Error('Duplicate goal'); goal = pos }
      else if (cell !== '.' && cell !== ' ') throw new Error('Unknown grid cell')
    }))
    if (!start || !goal) throw new Error('Grid requires a start and goal')
    return { width: rows[0].length, height: rows.length, walls, doors, start, goal }
  }
  static cellKey = cellKey
}
export const parseGrid = GridModel.parseGrid

// Highlight the original map, independently of playback position.
export function hintCells(stage: Stage, highlight: HintHighlight): Set<string> {
  const grid = GridModel.parseGrid(stage.grid)
  return new Set(stage.grid.flatMap((row, y) => [...row].flatMap((_, x) => {
    const key = cellKey({ x, y })
    const start = key === cellKey(grid.start)
    const include = highlight === 'path' ? !grid.walls.has(key) && !start
      : highlight === 'walls' ? grid.walls.has(key)
      : highlight === 'start' ? start : key === cellKey(grid.goal)
    return include ? [key] : []
  })))
}
