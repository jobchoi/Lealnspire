export type HintHighlight = 'path' | 'walls' | 'start' | 'goal'
export type Dir = 'N' | 'E' | 'S' | 'W'
export type Block =
  | { id: string; type: 'forward' | 'turnLeft' | 'turnRight' }
  | { id: string; type: 'call'; fn: string }
  | { id: string; type: 'repeat'; count: number; body: Block[] }
  | { id: string; type: 'while'; condition: 'clearAhead'; body: Block[] }
  | { id: string; type: 'if'; condition: 'blockedAhead'; body: Block[]; else?: Block[] }
export type BlockType = Block['type']
export type Program = Block[]
export type FunctionDef = { id: string; icon: 'star' | 'moon'; body: Block[] }
export type ProgramDocument = { main: Program; functions: FunctionDef[] }
export type ProgramInput = Program | ProgramDocument
export const programDocument = (input: ProgramInput): ProgramDocument => Array.isArray(input) ? { main: input, functions: [] } : input
export type Stage = {
  id: string; world: 'sketchbook' | 'train' | 'handheld'; title: string; goal: string; hints: { keys: [string, string]; highlight: HintHighlight }
  grid: string[]; variants?: string[][]; startDir: Dir; maxBlocks?: number; starBlocks: number
  palette?: BlockType[]
  initialProgram?: Program; solution: Program
}
export type Position = { x: number; y: number }
export type Frame = { call?: { callId: string; fn: string }; pos: Position; dir: Dir; activeBlockId: string | null; loops?: { blockId: string; iteration: number; count?: number }[]; event?: 'move' | 'turn' | 'bump' | 'goal' | 'check'; check?: { blockId: string; condition: 'blockedAhead' | 'clearAhead'; result: boolean } }
export type RunResult = { whileLimitCall?: Frame['call']; whileLimitBlockId?: string; frames: Frame[]; result: 'success' | 'collision' | 'unfinished' | 'stepLimit' }

export type RunAllResult = { results: RunResult[]; result: RunResult['result']; failedVariant: number | null }
