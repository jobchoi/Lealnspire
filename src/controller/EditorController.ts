import { hasBody } from '../model/editor'
import { Observable } from './Observable'
import { MAX_PROGRAM_BLOCKS, Program as ProgramModel } from '../model/program'
import type { Block, Program } from '../model/types'
export class EditorController extends Observable<{ selectedId: string | null; targetId: string | null; addedId: string | null }> {
  program: Program = []
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
  configure(program: Program, onChange: (program: Program) => void, locked: boolean, maxBlocks?: number) {
    this.program = program; this.onChange = onChange; this.locked = locked; this.maxBlocks = maxBlocks
  }
  get canUndo() { return !this.locked && (this.undoControls?.available() ?? false) }
  undo = () => { if (this.canUndo) this.undoControls?.undo() }
  reconcile(program: Program) {
    const model = new ProgramModel(program)
    this.program = program
    this.update({
      selectedId: this.state.selectedId && model.find(this.state.selectedId) ? this.state.selectedId : null,
      targetId: this.state.targetId && model.find(this.state.targetId) ? this.state.targetId : null,
      addedId: null,
    })
  }
  get selectedPath() { return this.state.selectedId ? new ProgramModel(this.program).find(this.state.selectedId) : undefined }
  get targetPath() { return this.state.targetId ? new ProgramModel(this.program).find(this.state.targetId) : undefined }
  get selectedBlock() { return this.selectedPath?.reduce<Block | undefined>((block, index, depth) => (depth === 0 ? this.program : block && hasBody(block) ? block.body : [])[index], undefined) }
  get total() { return new ProgramModel(this.program).count() }
  get limit() { return Math.min(this.maxBlocks ?? MAX_PROGRAM_BLOCKS, MAX_PROGRAM_BLOCKS) }
  get atLimit() { return this.total >= this.limit }
  get siblings() { return this.selectedPath?.slice(0, -1).reduce<Program>((list, index) => hasBody(list[index]) ? list[index].body : [], this.program) }
  private change(next: Program) {
    if (this.locked) return
    const selectedId = this.state.selectedId && new ProgramModel(next).find(this.state.selectedId) ? this.state.selectedId : null
    const targetId = this.state.targetId && new ProgramModel(next).find(this.state.targetId) ? this.state.targetId : null
    this.program = next
    this.update({ ...this.state, selectedId, targetId })
    this.onChange(next)
  }
  select = (id: string) => {
    if (!this.prepareEdit()) return
    const selectedId = this.state.selectedId === id ? null : id
    this.update({ ...this.state, selectedId, targetId: selectedId ? this.state.targetId : null })
  }
  reveal = (id: string | null) => {
    if (this.locked) return
    const selectedId = id && new ProgramModel(this.program).find(id) ? id : null
    this.update({ selectedId, targetId: null, addedId: selectedId })
  }
  acknowledgeAdded = () => { if (this.state.addedId) this.update({ ...this.state, addedId: null }) }
  clear = () => { if (this.prepareEdit()) this.update({ ...this.state, selectedId: null, targetId: null }) }
  toggleTarget = () => { if (this.selectedBlock && hasBody(this.selectedBlock) && this.prepareEdit()) this.update({ ...this.state, targetId: this.state.targetId === this.state.selectedId ? null : this.state.selectedId }) }
  add = (type: Block['type']) => {
    if (this.locked || this.atLimit || !this.prepareEdit()) return
    const block = new ProgramModel(this.program).create(type)
    this.update({ ...this.state, addedId: block.id })
    this.change(new ProgramModel(this.program).add(block, this.targetPath ?? []).toBlocks())
  }
  move = (direction: 'up' | 'down') => { if (this.selectedPath && this.prepareEdit()) this.change(new ProgramModel(this.program).move(this.selectedPath, direction).toBlocks()) }
  remove = () => { if (this.selectedPath && this.prepareEdit()) this.change(new ProgramModel(this.program).remove(this.selectedPath).toBlocks()) }
  setCount = (count: number) => { if (this.selectedPath && this.prepareEdit()) this.change(new ProgramModel(this.program).setCount(this.selectedPath, count).toBlocks()) }
}
