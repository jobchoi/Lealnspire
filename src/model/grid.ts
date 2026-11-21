import type { Position } from './types'

export type Grid = { width: number; height: number; walls: Set<string>; start: Position; goal: Position }
export const cellKey = (pos: Position): string => `${pos.x},${pos.y}`

export class GridModel {
  static parseGrid(rows: string[]): Grid {
    if (!rows.length || !rows[0].length || rows.some(row => row.length !== rows[0].length)) throw new Error('Invalid grid dimensions')
    const walls = new Set<string>()
    let start: Position | undefined
    let goal: Position | undefined
    rows.forEach((row, y) => [...row].forEach((cell, x) => {
      const pos = { x, y }
      if (cell === '#') walls.add(cellKey(pos))
      else if (cell === 'S') { if (start) throw new Error('Duplicate start'); start = pos }
      else if (cell === 'G') { if (goal) throw new Error('Duplicate goal'); goal = pos }
      else if (cell !== '.' && cell !== ' ') throw new Error('Unknown grid cell')
    }))
    if (!start || !goal) throw new Error('Grid requires a start and goal')
    return { width: rows[0].length, height: rows.length, walls, start, goal }
  }
  static cellKey = cellKey
}
export const parseGrid = GridModel.parseGrid
