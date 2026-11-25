export type HintHighlight = 'path' | 'walls' | 'start' | 'goal'
export type Dir = 'N' | 'E' | 'S' | 'W'
export type Block =
  | { id: string; type: 'forward' | 'turnLeft' | 'turnRight' }
  | { id: string; type: 'repeat'; count: number; body: Block[] }
  | { id: string; type: 'if'; condition: 'blockedAhead'; body: Block[] }
export type Program = Block[]
export type Stage = {
  id: string; world: 'sketchbook' | 'train' | 'handheld'; title: string; goal: string; hints: { keys: [string, string]; highlight: HintHighlight }
  grid: string[]; variants?: string[][]; startDir: Dir; maxBlocks?: number; starBlocks: number
  initialProgram?: Program; solution: Program
}
export type Position = { x: number; y: number }
export type Frame = { pos: Position; dir: Dir; activeBlockId: string | null; loops?: { blockId: string; iteration: number; count: number }[]; event?: 'move' | 'turn' | 'bump' | 'goal' | 'check'; check?: { blockId: string; condition: 'blockedAhead'; result: boolean } }
export type RunResult = { frames: Frame[]; result: 'success' | 'collision' | 'unfinished' | 'stepLimit' }

export type RunAllResult = { results: RunResult[]; result: RunResult['result']; failedVariant: number | null }
