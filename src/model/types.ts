export type HintHighlight = 'path' | 'walls' | 'start' | 'goal'
export type Dir = 'N' | 'E' | 'S' | 'W'
export type Variable = 'A' | 'B'
export type ConditionAtom = 'clearAhead' | 'blockedAhead' | 'blockedLeft' | 'blockedRight'
export type Condition = { kind: 'atom'; atom: ConditionAtom } | { kind: 'not'; operand: Condition } | { kind: 'and' | 'or'; left: Condition; right: Condition }
export type CallArgument = { kind: 'number'; value: number } | { kind: 'A' }
export type ReturnValue = CallArgument | { kind: 'param' } | { kind: 'ahead' }
export type ValueCall = { fn: string; arg?: CallArgument }
export type EventSignal = '◇' | '○' | '△'
export type EventState = { cursor: number; queue: EventSignal[]; handler?: { onId: string; signal: EventSignal; serial: number }; doors: { a: boolean; b: boolean }; phase: 'idle' | 'arrival' | 'start' | 'end' | 'unconnected'; signal?: EventSignal }
export type Block =
  | { id: string; type: 'forward' | 'turnLeft' | 'turnRight' }
  | { id: string; type: 'on'; signal: EventSignal; body: Block[] }
  | { id: string; type: 'set'; variable: 'A'; value: number }
  | { id: string; type: 'change'; variable: 'A'; by: 1 | -1 }
  | { id: string; type: 'return'; value: ReturnValue }
  | { id: string; type: 'call'; fn: string; arg?: CallArgument }
  | ({ id: string; type: 'repeat'; body: Block[]; countCall?: ValueCall } & ({ count: number; countVariable?: undefined; countParam?: undefined } | { count?: number; countVariable: 'A'; countParam?: undefined } | { count?: number; countVariable?: undefined; countParam: true } | { count?: number; countVariable?: undefined; countParam?: undefined; countCall: ValueCall }))
  | { id: string; type: 'while'; condition: 'clearAhead' | Condition; body: Block[] }
  | { id: string; type: 'if'; condition: 'blockedAhead' | Condition; body: Block[]; else?: Block[] }
export type BlockType = Block['type']
export type Program = Block[]
export type FunctionDef = { id: string; icon: 'star' | 'moon'; param?: true; body: Block[] }
export type ProgramDocument = { main: Program; functions: FunctionDef[] }
export type ProgramInput = Program | ProgramDocument
export const programDocument = (input: ProgramInput): ProgramDocument => Array.isArray(input) ? { main: input, functions: [] } : input
export type Stage = {
  id: string; world: 'sketchbook' | 'train' | 'handheld'; title: string; goal: string; hints: { keys: [string, string]; highlight: HintHighlight }
  grid: string[]; variants?: string[][]; variantVariables?: { A: number }[]; startDir: Dir; maxBlocks?: number; starBlocks: number
  events?: true; signals?: string[][]; returns?: true; params?: true; palette?: BlockType[]
  initialFunctions?: FunctionDef[]; solutionFunctions?: FunctionDef[]
  initialProgram?: Program; solution: Program
}
export type Position = { x: number; y: number }
export type ReturnTrace = { callId: string; fn: string; serial: number; arg?: number; blockId: string; value: number; repeatId?: string; skippedIds: string[] }
export type Frame = { events?: EventState; returned?: ReturnTrace; sensorAhead?: number; variables?: { A: number }; variableChange?: { variable: 'A'; from: number; to: number }; call?: { callId: string; fn: string; arg?: number; serial: number }; pos: Position; dir: Dir; activeBlockId: string | null; loops?: { blockId: string; iteration: number; count?: number }[]; event?: 'move' | 'turn' | 'bump' | 'goal' | 'check'; check?: { blockId: string; condition: 'blockedAhead' | 'clearAhead' | Condition; result: boolean; atoms?: { atom: ConditionAtom; value: boolean; path: string[]; result: boolean }[] } }
export type RunResult = { whileLimitCall?: Frame['call']; whileLimitBlockId?: string; frames: Frame[]; result: 'success' | 'collision' | 'unfinished' | 'stepLimit' | 'variableRange' | 'missingReturn' }

export type RunAllResult = { results: RunResult[]; result: RunResult['result']; failedVariant: number | null }
