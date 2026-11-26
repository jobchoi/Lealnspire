export type HintHighlight = 'path' | 'walls' | 'start' | 'goal'
export type Dir = 'N' | 'E' | 'S' | 'W'
export type Variable = 'A' | 'B'
export type ConditionAtom = 'clearAhead' | 'blockedAhead' | 'aIsZero'
export type Condition = { kind: 'atom'; atom: ConditionAtom } | { kind: 'not'; operand: Condition } | { kind: 'and' | 'or'; left: Condition; right: Condition }
export type Block =
  | { id: string; type: 'forward' | 'turnLeft' | 'turnRight' }
  | { id: string; type: 'set'; variable: 'A'; value: number }
  | { id: string; type: 'change'; variable: 'A'; by: 1 | -1 }
  | { id: string; type: 'call'; fn: string }
  | ({ id: string; type: 'repeat'; body: Block[] } & ({ count: number; countVariable?: 'A' } | { count?: number; countVariable: 'A' }))
  | { id: string; type: 'while'; condition: 'clearAhead' | Condition; body: Block[] }
  | { id: string; type: 'if'; condition: 'blockedAhead' | Condition; body: Block[]; else?: Block[] }
export type BlockType = Block['type']
export type Program = Block[]
export type FunctionDef = { id: string; icon: 'star' | 'moon'; body: Block[] }
export type ProgramDocument = { main: Program; functions: FunctionDef[] }
export type ProgramInput = Program | ProgramDocument
export const programDocument = (input: ProgramInput): ProgramDocument => Array.isArray(input) ? { main: input, functions: [] } : input
export type Stage = {
  id: string; world: 'sketchbook' | 'train' | 'handheld'; title: string; goal: string; hints: { keys: [string, string]; highlight: HintHighlight }
  grid: string[]; variants?: string[][]; variantVariables?: { A: number }[]; startDir: Dir; maxBlocks?: number; starBlocks: number
  palette?: BlockType[]
  initialFunctions?: FunctionDef[]; solutionFunctions?: FunctionDef[]
  initialProgram?: Program; solution: Program
}
export type Position = { x: number; y: number }
export type Frame = { variables?: { A: number }; variableChange?: { variable: 'A'; from: number; to: number }; call?: { callId: string; fn: string }; pos: Position; dir: Dir; activeBlockId: string | null; loops?: { blockId: string; iteration: number; count?: number }[]; event?: 'move' | 'turn' | 'bump' | 'goal' | 'check'; check?: { blockId: string; condition: 'blockedAhead' | 'clearAhead' | Condition; result: boolean; atoms?: { atom: ConditionAtom; value: boolean; path: string[]; result: boolean }[] } }
export type RunResult = { whileLimitCall?: Frame['call']; whileLimitBlockId?: string; frames: Frame[]; result: 'success' | 'collision' | 'unfinished' | 'stepLimit' | 'variableRange' }

export type RunAllResult = { results: RunResult[]; result: RunResult['result']; failedVariant: number | null }
