import { useEffect, useRef, useState } from 'react'
import { addBlock, countBlocks, deleteBlock, moveBlock, setRepeatCount, MAX_PROGRAM_BLOCKS } from '../engine/program'
import { createBlock, findBlockPath } from '../engine/editor'
import type { Block, Program } from '../engine/types'
import { BlockTiles } from './BlockTiles'
import { ko } from '../i18n/ko'

type EditorProps = { program: Program; onChange: (program: Program) => void; maxBlocks?: number; locked?: boolean; activeBlockId?: string | null }
const types: Block['type'][] = ['forward', 'turnLeft', 'turnRight', 'repeat']

export function Editor({ program, onChange, maxBlocks, locked = false, activeBlockId }: EditorProps) {
  const workspace = useRef<HTMLDivElement>(null)
  const addedId = useRef<string | null>(null)
  useEffect(() => {
    const targetId = activeBlockId ?? addedId.current
    if (!targetId || !workspace.current) return
    const area = workspace.current
    const block = Array.from(area.querySelectorAll<HTMLElement>('[data-block-id]')).find(node => node.dataset.blockId === targetId)
    if (block) {
      const outer = area.getBoundingClientRect(), inner = block.getBoundingClientRect()
      const visibleTop = outer.top + (area.parentElement?.classList.contains('has-selection') ? 58 : 0)
      if (inner.top < visibleTop || inner.height > outer.bottom - visibleTop) area.scrollTop += inner.top - visibleTop
      else if (inner.bottom > outer.bottom) area.scrollTop += inner.bottom - outer.bottom
    }
    addedId.current = null
  }, [program, activeBlockId])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const selectedPath = selectedId === null ? undefined : findBlockPath(program, selectedId)
  const total = countBlocks(program)
  const limit = Math.min(maxBlocks ?? MAX_PROGRAM_BLOCKS, MAX_PROGRAM_BLOCKS)
  const atLimit = total >= limit
  function change(next: Program) {
    if (locked) return
    if (selectedId !== null && !findBlockPath(next, selectedId)) setSelectedId(null)
    if (targetId !== null && !findBlockPath(next, targetId)) setTargetId(null)
    onChange(next)
  }
  const selectedBlock = selectedPath?.reduce<Block | undefined>((block, index, depth) => (depth === 0 ? program : block?.type === 'repeat' ? block.body : [])[index], undefined)
  const [targetId, setTargetId] = useState<string | null>(null)
  const targetPath = targetId ? findBlockPath(program, targetId) : undefined
  const label = (action: string) => ko.action(selectedPath!.map(i => i + 1).join('.'), ko.blocks[selectedBlock!.type], action)
  const siblings = selectedPath?.slice(0, -1).reduce<Program>((list, index) => {
    const block = list[index]
    return block.type === 'repeat' ? block.body : []
  }, program)
  return <section className="editor" aria-label={ko.editor}>
    <h2>{ko.editor}</h2>
    <div className="block-budget"><p aria-live="polite">{ko.total(total, limit)}</p>
    <span className="slot-dots" aria-hidden="true">{Array.from({ length: MAX_PROGRAM_BLOCKS }, (_, i) => <span key={i} className={i < total ? 'filled' : i >= limit ? 'unavailable' : ''}>{i < total ? '●' : '○'}</span>)}</span></div>
    <p className="insertion-status" aria-live="polite">{targetPath ? ko.target(targetPath.map(i => i + 1).join('.')) : ko.root}</p>
    <div className="palette" role="group" aria-label={ko.palette}>{types.map(type => <button type="button" key={type} className={`block-${type}`} aria-label={ko.blocks[type]} title={ko.blocks[type]} disabled={locked || atLimit} onClick={() => {
      if (!locked && !atLimit) {
        const block = createBlock(program, type)
        addedId.current = block.id
        change(addBlock(program, block, targetPath ?? []))
      }
    }}><span className="block-symbol" aria-hidden="true">{ko.icons[type]}</span><small>{ko.blocks[type]}</small></button>)}</div>
    {atLimit && <p role="status">{ko.limit}</p>}
    <h3>{ko.workspace}</h3>
    <div className={`workspace-shell${selectedBlock ? ' has-selection' : ''}`}>
    {selectedBlock && <div className="tile-toolbar" role="group" aria-label={ko.tools}>
      {selectedBlock && selectedPath ? <>
        <button disabled={locked || selectedPath.at(-1) === 0} aria-label={label(ko.before)} onClick={() => change(moveBlock(program, selectedPath, 'up'))}>◀</button>
        <button disabled={locked || selectedPath.at(-1) === siblings!.length - 1} aria-label={label(ko.after)} onClick={() => change(moveBlock(program, selectedPath, 'down'))}>▶</button>
        <button disabled={locked} aria-label={label(ko.remove)} onClick={() => { change(deleteBlock(program, selectedPath)); setSelectedId(null) }}>✕</button>
        {selectedBlock.type === 'repeat' && <>
          <button disabled={locked || selectedBlock.count <= 2} aria-label={label(ko.decrease)} onClick={() => change(setRepeatCount(program, selectedPath, selectedBlock.count - 1))}>−</button>
          <button disabled={locked || selectedBlock.count >= 10} aria-label={label(ko.increase)} onClick={() => change(setRepeatCount(program, selectedPath, selectedBlock.count + 1))}>+</button>
          <button disabled={locked} aria-pressed={targetId === selectedId} aria-label={label(targetId === selectedId ? ko.deselect : ko.select)} onClick={() => setTargetId(targetId === selectedId ? null : selectedId)}><span aria-hidden="true">🔁⤵</span></button>
        </>}
      </> : <small>{ko.chooseTile}</small>}
    </div>}
    <div className="workspace" ref={workspace} role="region" aria-label={ko.workspace} tabIndex={0} onClick={event => {
      if (!locked && !(event.target as HTMLElement).closest('button')) { setSelectedId(null); setTargetId(null) }
    }}>
      {program.length ? <BlockTiles program={program} selectedId={selectedPath ? selectedId : null} targetId={targetPath ? targetId : null} activeBlockId={activeBlockId} locked={locked} onSelect={id => {
        if (locked) return
        setSelectedId(selectedId === id ? null : id)
        if (selectedId === id) setTargetId(null)
      }} /> : <p>{ko.empty}</p>}
    </div>
    </div>
  </section>
}
