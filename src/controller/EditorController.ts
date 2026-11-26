import { hasBody, blockAt, listAt } from '../model/editor'
import { Observable } from './Observable'
import { MAX_PROGRAM_BLOCKS, normalizeLogicProgram, normalizeLogicCondition, FunctionProgram, Program as ProgramModel } from '../model/program'
import type { Block, Program, ProgramDocument, FunctionDef, Condition } from '../model/types'
export class EditorController extends Observable<{ selectedId: string | null; targetId: string | null; addedId: string | null }> {
  paramsEnabled = false
  logicEnabled = false
  functionId: string | undefined
  functionTarget = false
  get addingToFunction() { return !!this.functionId && (this.functionTarget || !!this.targetPath) }
  get editProgram(): Program { return this.functions.find(fn => fn.id === this.functionId)?.body ?? this.program }
  private targetReturns: { id: string; targetId: string | null; targetElse: boolean; functionTarget: boolean }[] = []
  targetElse = false
  program: Program = []
  functions: FunctionDef[] = []
  onDocumentChange: (doc: ProgramDocument) => void = () => {}
  get doc(): ProgramDocument { return { main: this.program, functions: this.functions } }
  configureDocument(doc: ProgramDocument, onChange: (doc: ProgramDocument) => void, locked: boolean, maxBlocks?: number) {
    this.functions = structuredClone(doc.functions)
    this.onDocumentChange = onChange
    this.configure(doc.main, main => onChange({ main, functions: this.functions }), locked, maxBlocks)
  }
  private changeDocument(model: FunctionProgram) {
    const doc = model.toDocument()
    if (model.count() > this.limit) return
    this.functions = doc.functions
    this.reconcile(doc.main)
    this.onDocumentChange(doc)
  }
  createFunction = () => {
    if (!this.prepareEdit()) return
    const model = new FunctionProgram(this.doc).createFunction()
    const created = model.toDocument().functions.find(fn => !this.functions.some(existing => existing.id === fn.id))
    if (!created) return
    this.functionId = created.id
    this.functionTarget = true
    this.targetElse = false
    this.update({ selectedId: null, targetId: null, addedId: null })
    this.changeDocument(model)
  }
  toggleParameter = (id: string) => { if (this.paramsEnabled && this.prepareEdit()) this.changeDocument(new FunctionProgram(this.doc).setParameter(id, !this.functions.find(fn => fn.id === id)?.param)) }
  setCallArgument = (arg: import('../model/types').CallArgument) => { if (this.selectedPath && this.selectedBlock?.type === 'call' && this.prepareEdit()) this.change(ProgramModel.setCallArgument(this.editProgram, this.selectedPath, arg)) }
  removeFunction = (id: string) => { if (this.prepareEdit()) this.changeDocument(new FunctionProgram(this.doc).removeFunction(id)) }
  editFunction = (id: string, edit: (body: Program) => Program) => { if (this.prepareEdit()) this.changeDocument(new FunctionProgram(this.doc).edit(edit, id)) }
  locked = false
  maxBlocks?: number
  onChange: (program: Program) => void = () => {}
  private beforeEdit: () => void
  private undoControls?: { undo: () => void; available: () => boolean }
  constructor(beforeEdit: () => void = () => {}, undoControls?: { undo: () => void; available: () => boolean }) {
    super({ selectedId: null, targetId: null, addedId: null })
    this.beforeEdit = beforeEdit
    this.undoControls = undoControls
  }
  private prepareEdit() {
    if (this.locked) return false
    this.beforeEdit()
    return true
  }
  configure(program: Program, onChange: (program: Program) => void, locked: boolean, maxBlocks?: number, logicEnabled = this.logicEnabled, paramsEnabled = this.paramsEnabled) {
    this.paramsEnabled = paramsEnabled
    this.logicEnabled = logicEnabled
    this.program = this.logicEnabled ? normalizeLogicProgram(program) : program; this.onChange = onChange; this.locked = locked; this.maxBlocks = maxBlocks
  }
  get canUndo() { return !this.locked && (this.undoControls?.available() ?? false) }
  undo = () => { if (this.canUndo) this.undoControls?.undo() }
  reconcile(program: Program) {
    if (this.functionId && !this.functions.some(fn => fn.id === this.functionId)) { this.functionId = undefined; this.functionTarget = false }
    const model = new ProgramModel(this.functionId ? this.editProgram : program)
    const targetPath = this.state.targetId ? model.find(this.state.targetId) : undefined
    const target = targetPath ? blockAt(this.functionId ? this.editProgram : program, targetPath) : undefined
    const validTarget = target && hasBody(target) && (!this.targetElse || target.type === 'if' && target.else !== undefined)
    if (!validTarget) this.targetElse = false
    this.program = program
    this.update({
      selectedId: this.state.selectedId && model.find(this.state.selectedId) ? this.state.selectedId : null,
      targetId: validTarget ? this.state.targetId : null,
      addedId: null,
    })
  }
  get selectedPath() { return this.state.selectedId ? new ProgramModel(this.editProgram).find(this.state.selectedId) : undefined }
  get targetPath() { return this.state.targetId ? new ProgramModel(this.editProgram).find(this.state.targetId) : undefined }
  get selectedBlock() { return this.selectedPath ? blockAt(this.editProgram, this.selectedPath) : undefined }
  get total() { return new FunctionProgram(this.doc).count() }
  get limit() { return Math.min(this.maxBlocks ?? MAX_PROGRAM_BLOCKS, MAX_PROGRAM_BLOCKS) }
  get atLimit() { return this.total >= this.limit }
  get siblings() { return this.selectedPath ? listAt(this.editProgram, this.selectedPath.slice(0, -1)) : undefined }
  private change(next: Program, functionId: string | null | undefined = this.functionId) {
    if (this.locked) return
    const selectedId = this.state.selectedId && new ProgramModel(next).find(this.state.selectedId) ? this.state.selectedId : null
    const targetId = this.state.targetId && new ProgramModel(next).find(this.state.targetId) ? this.state.targetId : null
    if (functionId) this.functions = this.functions.map(fn => fn.id === functionId ? { ...fn, body: next } : fn)
    else this.program = next
    this.update({ ...this.state, selectedId, targetId })
    if (functionId) this.onDocumentChange(this.doc)
    else this.onChange(next)
  }
  select = (id: string) => {
    if (!this.prepareEdit()) return
    const selectedId = this.state.selectedId === id ? null : id
    if (!selectedId) { this.targetReturns = []; this.targetElse = false }
    this.update({ ...this.state, selectedId, targetId: selectedId ? this.state.targetId : null })
  }
  reveal = (id: string | null, fn?: string) => {
    if (this.locked) return
    this.targetReturns = []
    this.functionId = fn
    this.functionTarget = false
    const selectedId = id && new ProgramModel(this.editProgram).find(id) ? id : null
    this.update({ selectedId, targetId: null, addedId: selectedId })
  }
  acknowledgeAdded = () => { if (this.state.addedId) this.update({ ...this.state, addedId: null }) }
  clear = () => { if (this.prepareEdit()) { this.targetReturns = []; this.functionId = undefined; this.functionTarget = false; this.targetElse = false; this.update({ ...this.state, selectedId: null, targetId: null }) } }
  toggleTarget = (alternative = false) => {
    if (this.locked || !this.selectedBlock || !hasBody(this.selectedBlock) || !this.prepareEdit()) return
    const leaving = this.targetElse === alternative && this.state.targetId === this.state.selectedId
    if (leaving) {
      const previous = this.targetReturns.pop()
      this.targetElse = previous?.targetElse ?? false
      this.functionTarget = previous?.functionTarget ?? false
      this.update({ ...this.state, targetId: previous?.targetId ?? null })
    } else {
      // Switching between branches of the same block keeps its original return point.
      if (this.targetReturns.at(-1)?.id !== this.state.selectedId) {
        this.targetReturns.push({ id: this.state.selectedId!, targetId: this.state.targetId, targetElse: this.targetElse, functionTarget: this.functionTarget })
      }
      this.targetElse = alternative
      this.update({ ...this.state, targetId: this.state.selectedId })
    }
  }
  chooseFunction = (id?: string) => {
    if (!this.prepareEdit()) return
    this.targetReturns = []
    this.functionId = id
    this.functionTarget = !!id
    this.targetElse = false
    this.update({ selectedId: null, targetId: null, addedId: null })
  }
  selectFunctionBlock = (fn: string | undefined, id: string) => {
    if (this.locked) return
    if (this.functionId !== fn) {
      this.chooseFunction(fn)
      this.functionTarget = false
    }
    this.select(id)
  }
  add = (type: Block['type'], fn = this.functions[0]?.id) => {
    if (this.locked || this.atLimit || !this.prepareEdit()) return
    if (type === 'call' && this.addingToFunction) return
    const block = new FunctionProgram(this.doc).create(type, fn)
    if (this.logicEnabled && (block.type === 'if' || block.type === 'while')) {
      const atom = { kind: 'atom' as const, atom: 'blockedAhead' as const }
      block.condition = block.type === 'if' ? atom : { kind: 'not', operand: atom }
    }
    if (type === 'call' && !this.functions.length) return
    const functionId = this.addingToFunction ? this.functionId : undefined
    const program = functionId ? this.editProgram : this.program
    const targetPath = this.targetPath
    const leavingFunction = !!this.functionId && !functionId
    this.functionId = functionId
    if (!functionId) this.functionTarget = false
    this.update({ selectedId: leavingFunction ? null : this.state.selectedId, targetId: leavingFunction ? null : this.state.targetId, addedId: block.id })
    this.change(new ProgramModel(program).add(block, targetPath ? [...targetPath, ...(this.targetElse ? [-1] : [])] : []).toBlocks(), functionId ?? null)
  }
  move = (direction: 'up' | 'down') => { if (this.selectedPath && this.prepareEdit()) this.change(new ProgramModel(this.editProgram).move(this.selectedPath, direction).toBlocks()) }
  remove = () => { if (this.selectedPath && this.prepareEdit()) this.change(new ProgramModel(this.editProgram).remove(this.selectedPath).toBlocks()) }
  toggleElse = () => { if (this.selectedPath && this.selectedBlock?.type === 'if' && this.prepareEdit()) { this.targetElse = false; this.change(ProgramModel.setElse(this.editProgram, this.selectedPath, !this.selectedBlock.else)) } }
  setVariableValue = (value: number) => { if (this.selectedPath && this.selectedBlock?.type === 'set' && this.prepareEdit()) this.change(ProgramModel.setVariableValue(this.editProgram, this.selectedPath, value)) }
  toggleChange = () => { if (this.selectedPath && this.selectedBlock?.type === 'change' && this.prepareEdit()) this.change(ProgramModel.toggleChange(this.editProgram, this.selectedPath)) }
  toggleRepeatSource = () => { if (this.selectedPath && this.selectedBlock?.type === 'repeat' && this.prepareEdit()) this.change(ProgramModel.setRepeatSource(this.editProgram, this.selectedPath, this.selectedBlock.countParam ? 'number' : this.selectedBlock.countVariable ? this.paramsEnabled && this.functions.find(fn => fn.id === this.functionId)?.param ? 'param' : 'number' : 'A')) }
  setCondition = (condition: Condition) => {
    if (!this.selectedPath || !this.prepareEdit()) return
    const next = structuredClone(this.editProgram)
    const block = blockAt(next, this.selectedPath)
    if (block?.type === 'if' || block?.type === 'while') { block.condition = this.logicEnabled ? normalizeLogicCondition(condition) : condition; this.change(next) }
  }
  setCount = (count: number) => { if (this.selectedPath && this.prepareEdit()) this.change(new ProgramModel(this.editProgram).setCount(this.selectedPath, count).toBlocks()) }
}
