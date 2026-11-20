import { useEffect, useRef, useState } from 'react'
import { addBlock, countBlocks, deleteBlock, moveBlock, setRepeatCount } from '../engine/program'
import { createBlock, findBlockPath } from '../engine/editor'
import type { Block, Program } from '../engine/types'
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
      if (inner.top < outer.top || inner.height > outer.height) area.scrollTop += inner.top - outer.top
      else if (inner.bottom > outer.bottom) area.scrollTop += inner.bottom - outer.bottom
    }
    addedId.current = null
  }, [program, activeBlockId])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const selectedPath = selectedId === null ? undefined : findBlockPath(program, selectedId)
  const total = countBlocks(program)
  const atLimit = maxBlocks !== undefined && total >= maxBlocks
  function change(next: Program) {
    if (locked) return
    if (selectedId !== null && !findBlockPath(next, selectedId)) setSelectedId(null)
    onChange(next)
  }
  function renderList(blocks: Program, parent: number[] = []) {
    return <ol className="block-list">{blocks.map((block, index) => {
      const path = [...parent, index]
      const order = path.map(i => i + 1).join('.')
      const selected = !!selectedPath && selectedId === block.id
      const label = (action: string) => ko.action(order, ko.blocks[block.type], action)
      return <li aria-current={activeBlockId === block.id ? 'step' : undefined} key={block.id} data-block-id={block.id} className={`block block-${block.type}${selected ? ' block-selected' : ''}${activeBlockId === block.id ? ' block-active' : ''}`}>
        <div className="block-heading"><strong><span className="block-symbol" aria-hidden="true">{ko.icons[block.type]}</span><small>{order}. {ko.blocks[block.type]}</small></strong>{selected && <span aria-label={ko.selected}><span aria-hidden="true">⤵</span></span>}</div>
        <div className="block-actions">
          <button type="button" title={label(ko.up)} aria-label={label(ko.up)} disabled={locked || index === 0} onClick={() => change(moveBlock(program, path, 'up'))}><span aria-hidden="true">{ko.icons.up}</span></button>
          <button type="button" title={label(ko.down)} aria-label={label(ko.down)} disabled={locked || index === blocks.length - 1} onClick={() => change(moveBlock(program, path, 'down'))}><span aria-hidden="true">{ko.icons.down}</span></button>
          <button type="button" disabled={locked} title={label(ko.remove)} aria-label={label(ko.remove)} onClick={() => change(deleteBlock(program, path))}><span aria-hidden="true">{ko.icons.remove}</span></button>
        </div>
        {block.type === 'repeat' && <>
          <div className="repeat-controls">
            <button type="button" disabled={locked || block.count <= 2} aria-label={label(ko.decrease)} title={label(ko.decrease)} onClick={() => change(setRepeatCount(program, path, block.count - 1))}><span aria-hidden="true">−</span></button>
            <output aria-label={label(ko.count)}>×{block.count}</output>
            <button type="button" disabled={locked || block.count >= 10} aria-label={label(ko.increase)} title={label(ko.increase)} onClick={() => change(setRepeatCount(program, path, block.count + 1))}><span aria-hidden="true">+</span></button>
            <button type="button" disabled={locked} aria-pressed={selected} title={label(selected ? ko.deselect : ko.select)} aria-label={label(selected ? ko.deselect : ko.select)} onClick={() => setSelectedId(selected ? null : block.id)}><span aria-hidden="true">{ko.icons.repeat} {ko.icons.select}</span><small>{selected ? ko.deselect : ko.select}</small></button>
          </div>
          {renderList(block.body, path)}
        </>}
      </li>
    })}</ol>
  }
  return <section className="editor" aria-label={ko.editor}>
    <h2>{ko.editor}</h2>
    <p aria-live="polite">{ko.total(total, maxBlocks)}</p>
    <p aria-live="polite">{selectedPath ? ko.target(selectedPath.map(i => i + 1).join('.')) : ko.root}</p>
    <div className="palette" role="group" aria-label={ko.palette}>{types.map(type => <button type="button" key={type} className={`block-${type}`} aria-label={ko.blocks[type]} title={ko.blocks[type]} disabled={locked || atLimit} onClick={() => {
      if (!locked && !atLimit) {
        const block = createBlock(program, type)
        addedId.current = block.id
        change(addBlock(program, block, selectedPath ?? []))
      }
    }}><span className="block-symbol" aria-hidden="true">{ko.icons[type]}</span><small>{ko.blocks[type]}</small></button>)}</div>
    {atLimit && <p role="status">{ko.limit}</p>}
    <h3>{ko.workspace}</h3>
    <div className="workspace" ref={workspace} role="region" aria-label={ko.workspace} tabIndex={0}>{program.length ? renderList(program) : <p>{ko.empty}</p>}</div>
  </section>
}
