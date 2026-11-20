import { useState } from 'react'
import { addBlock, countBlocks, deleteBlock, moveBlock, setRepeatCount } from '../engine/program'
import { createBlock, findBlockPath } from '../engine/editor'
import type { Block, Program } from '../engine/types'
import { ko } from '../i18n/ko'

type EditorProps = { program: Program; onChange: (program: Program) => void; maxBlocks?: number }
const types: Block['type'][] = ['forward', 'turnLeft', 'turnRight', 'repeat']

export function Editor({ program, onChange, maxBlocks }: EditorProps) {
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const selectedPath = selectedId === null ? undefined : findBlockPath(program, selectedId)
  const total = countBlocks(program)
  const atLimit = maxBlocks !== undefined && total >= maxBlocks
  function change(next: Program) {
    if (selectedId !== null && !findBlockPath(next, selectedId)) setSelectedId(null)
    onChange(next)
  }
  function renderList(blocks: Program, parent: number[] = []) {
    return <ol className="block-list">{blocks.map((block, index) => {
      const path = [...parent, index]
      const order = path.map(i => i + 1).join('.')
      const selected = !!selectedPath && selectedId === block.id
      const label = (action: string) => ko.action(order, ko.blocks[block.type], action)
      return <li key={block.id} className={`block${selected ? ' block-selected' : ''}`}>
        <div className="block-heading"><strong>{order}. {ko.blocks[block.type]}</strong>{selected && <span>{ko.selected}</span>}</div>
        <div className="block-actions">
          <button type="button" aria-label={label(ko.up)} disabled={index === 0} onClick={() => change(moveBlock(program, path, 'up'))}>{ko.up}</button>
          <button type="button" aria-label={label(ko.down)} disabled={index === blocks.length - 1} onClick={() => change(moveBlock(program, path, 'down'))}>{ko.down}</button>
          <button type="button" aria-label={label(ko.remove)} onClick={() => change(deleteBlock(program, path))}>{ko.remove}</button>
        </div>
        {block.type === 'repeat' && <>
          <div className="repeat-controls">
            <label>{ko.count} <select aria-label={label(ko.count)} value={block.count} onChange={event => change(setRepeatCount(program, path, Number(event.target.value)))}>
              {Array.from({ length: 9 }, (_, i) => i + 2).map(count => <option key={count} value={count}>{count}</option>)}
            </select> {ko.times}</label>
            <button type="button" aria-pressed={selected} aria-label={label(selected ? ko.deselect : ko.select)} onClick={() => setSelectedId(selected ? null : block.id)}>{selected ? ko.deselect : ko.select}</button>
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
    <div className="palette" role="group" aria-label={ko.palette}>{types.map(type => <button type="button" key={type} disabled={atLimit} onClick={() => {
      if (!atLimit) change(addBlock(program, createBlock(program, type), selectedPath ?? []))
    }}>{ko.blocks[type]}</button>)}</div>
    {atLimit && <p role="status">{ko.limit}</p>}
    <h3>{ko.workspace}</h3>
    {program.length ? renderList(program) : <p>{ko.empty}</p>}
  </section>
}
