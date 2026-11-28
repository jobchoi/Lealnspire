/** Factory rules v1 (provisional). Arrays are belt exit first / stack bottom first. */
export type Shape = '◆' | '○' | '△'
export type Pile = 'leaf' | 'moon' | 'sun'
export type Signal = '◇' | '○' | '△'
export type Box = { id: string; shape: Shape }
export type StartState = { belt: Box[]; piles: Record<Pile, Box[]> }
export type State = StartState & { held: Box | null; A: number }
export type Atom =
  | { kind: 'beltEmpty' | 'beltHasBoxes' | 'heldEmpty' | 'heldHasBox' | 'matchesTarget' }
  | { kind: 'pileEmpty' | 'pileHasBoxes' | 'pileFull'; pile: Pile }
  | { kind: 'heldShape'; shape: Shape }
  | { kind: 'pileShape'; pile: Pile; shape: Shape }
export type Condition = { kind: 'atom'; atom: Atom } | { kind: 'not'; operand: Condition } | { kind: 'and' | 'or'; left: Condition; right: Condition }
export type Argument = { kind: 'number'; value: number } | { kind: 'A' }
export type Value = Argument | { kind: 'param' } | { kind: 'beltCount' } | { kind: 'current' } | { kind: 'listAtA' } | { kind: 'listLength' } | { kind: 'pileCount'; pile: Pile }
export type ValueCall = { fn: string; arg?: Argument }
export type RepeatCount = { count: number; countVariable?: never; countParam?: never; countCall?: never; countSource?: never }
  | { count?: never; countVariable: 'A'; countParam?: never; countCall?: never; countSource?: never }
  | { count?: never; countVariable?: never; countParam: true; countCall?: never; countSource?: never }
  | { count?: never; countVariable?: never; countParam?: never; countCall: ValueCall; countSource?: never }
  | { count?: never; countVariable?: never; countParam?: never; countCall?: never; countSource: Exclude<Value, Argument | { kind: 'param' }> }
export type Block =
  | { id: string; type: 'takeBelt' }
  | { id: string; type: 'breakForEach' }
  | { id: string; type: 'takePile' | 'putPile'; pile: Pile }
  | ({ id: string; type: 'repeat'; body: Block[] } & RepeatCount)
  | { id: string; type: 'if'; condition: Condition; body: Block[]; else?: Block[] }
  | { id: string; type: 'while'; condition: Condition; body: Block[] }
  | { id: string; type: 'forEach'; direction?: 'front' | 'back'; body: Block[] }
  | { id: string; type: 'on'; signal: Signal; body: Block[] }
  | { id: string; type: 'set'; variable: 'A'; value: number }
  | { id: string; type: 'change'; variable: 'A'; by: 1 | -1 }
  | { id: string; type: 'call'; fn: string; arg?: Argument }
  | { id: string; type: 'return'; value: Exclude<Value, { kind: 'current' | 'listAtA' | 'listLength' }> }
export type FunctionDef = { id: string; icon: 'star' | 'moon'; param?: true; body: Block[] }
export type ProgramDocument = { main: Block[]; functions: FunctionDef[] }
export type RunInput = { start: StartState; program: ProgramDocument; orders: number[]; target: number; signals: Signal[] }
export type Context = {
  call?: { callId: string; fn: string; arg?: number }
  loops: { blockId: string; iteration: number; count?: number }[]
  lists: { blockId: string; index: number; value: number }[]
  signal?: { index: number; signal: Signal; handlerId?: string }
}
export type ErrorCode = 'heldOccupied' | 'beltEmpty' | 'pileEmpty' | 'heldEmpty' | 'pileFull' | 'variableRange' | 'missingReturn' | 'indexRange' | 'stepLimit'
export type RuntimeError = { code: ErrorCode; blockId: string; params: { place?: 'belt'; pile?: Pile; index?: number; length?: number }; context: Context }
export type Frame = { state: State; activeBlockId: string | null; context: Context; cost: number; event: 'initial' | 'operation' | 'check' | 'read' | 'loop' | 'signal' | 'unconnected' | 'end'; value?: number | boolean; error?: RuntimeError }
export type RunResult = { result: 'ended' | 'error' | 'stepLimit'; state: State; frames: Frame[]; cost: number; loopEntries: number; error?: RuntimeError }
