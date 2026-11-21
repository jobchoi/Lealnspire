import { defaultTheme as theme } from '../theme/defaultTheme'
import { useEffect, useRef, useState } from 'react'
import { MAX_PROGRAM_BLOCKS } from '../../model/program'
import { EditorController } from '../../controller/EditorController'
import { useController } from '../hooks/useController'
import type { Program } from '../../model/types'
import { BlockTiles } from './BlockTiles'
import { t } from '../../i18n/I18n'

type EditorProps = { program: Program; onChange: (program: Program) => void; maxBlocks?: number; locked?: boolean; activeBlockId?: string | null }
const types = theme.blockTypes

export function Editor({ program, onChange, maxBlocks, locked = false, activeBlockId }: EditorProps) {
  const workspace = useRef<HTMLDivElement>(null)
  const [controller] = useState(() => new EditorController())
  controller.configure(program, onChange, locked, maxBlocks)
  const { selectedId, targetId, addedId } = useController(controller)
  const { selectedPath, selectedBlock, targetPath, total, limit, atLimit, siblings } = controller
  useEffect(() => {
    const targetId = activeBlockId ?? addedId
    if (!targetId || !workspace.current) return
    const area = workspace.current
    const block = Array.from(area.querySelectorAll<HTMLElement>('[data-block-id]')).find(node => node.dataset.blockId === targetId)
    if (block) {
      const outer = area.getBoundingClientRect(), inner = block.getBoundingClientRect()
      const visibleTop = outer.top + (area.parentElement?.classList.contains('has-selection') ? 58 : 0)
      if (inner.top < visibleTop || inner.height > outer.bottom - visibleTop) area.scrollTop += inner.top - visibleTop
      else if (inner.bottom > outer.bottom) area.scrollTop += inner.bottom - outer.bottom
    }
    controller.acknowledgeAdded()
  }, [program, activeBlockId, addedId, controller])
  const label = (action: string) => t('action', { order: selectedPath!.map(i => i + 1).join('.'), name: theme.blockName(selectedBlock!.type), action })
  return <section className="editor" aria-label={t('editor')}>
    <h2>{t('editor')}</h2>
    <div className="block-budget"><p aria-live="polite">{t('total', { count: total, max: limit })}</p>
    <span className="slot-dots" aria-hidden="true">{Array.from({ length: MAX_PROGRAM_BLOCKS }, (_, i) => <span key={i} className={i < total ? 'filled' : i >= limit ? 'unavailable' : ''}>{i < total ? '●' : '○'}</span>)}</span></div>
    <p className="insertion-status" aria-live="polite">{targetPath ? t('target', { order: targetPath.map(i => i + 1).join('.') }) : t('root')}</p>
    <div className="palette" role="group" aria-label={t('palette')}>{types.map(type => <button type="button" key={type} className={theme.blockClass(type)} aria-label={theme.blockName(type)} title={theme.blockName(type)} disabled={locked || atLimit} onClick={() => controller.add(type)}><span className="block-symbol" aria-hidden="true">{theme.blockSymbol(type)}</span><small>{theme.blockName(type)}</small></button>)}</div>
    {atLimit && <p role="status">{t('limit')}</p>}
    <h3>{t('workspace')}</h3>
    <div className={`workspace-shell${selectedBlock ? ' has-selection' : ''}`}>
    {selectedBlock && <div className="tile-toolbar" role="group" aria-label={t('tools')}>
      {selectedBlock && selectedPath ? <>
        <button disabled={locked || selectedPath.at(-1) === 0} aria-label={label(t('before'))} onClick={() => controller.move('up')}>◀</button>
        <button disabled={locked || selectedPath.at(-1) === siblings!.length - 1} aria-label={label(t('after'))} onClick={() => controller.move('down')}>▶</button>
        <button disabled={locked} aria-label={label(t('remove'))} onClick={() => controller.remove()}>✕</button>
        {selectedBlock.type === 'repeat' && <>
          <button disabled={locked || selectedBlock.count <= 2} aria-label={label(t('decrease'))} onClick={() => controller.setCount(selectedBlock.count - 1)}>−</button>
          <button disabled={locked || selectedBlock.count >= 10} aria-label={label(t('increase'))} onClick={() => controller.setCount(selectedBlock.count + 1)}>+</button>
          <button disabled={locked} aria-pressed={targetId === selectedId} aria-label={label(targetId === selectedId ? t('deselect') : t('select'))} onClick={() => controller.toggleTarget()}><span aria-hidden="true">🔁⤵</span></button>
        </>}
      </> : <small>{t('chooseTile')}</small>}
    </div>}
    <div className="workspace" ref={workspace} role="region" aria-label={t('workspace')} tabIndex={0} onClick={event => {
      if (!locked && !(event.target as HTMLElement).closest('button')) controller.clear()
    }}>
      {program.length ? <BlockTiles program={program} selectedId={selectedPath ? selectedId : null} targetId={targetPath ? targetId : null} activeBlockId={activeBlockId} locked={locked} onSelect={controller.select} />: <p>{t('empty')}</p>}
    </div>
    </div>
  </section>
}
