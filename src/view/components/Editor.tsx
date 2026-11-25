import { blockOrder } from '../../model/editor'
import glossary from '../../i18n/glossary.json'
import { hasBody, blockAt } from '../../model/editor'
import { defaultTheme, type Theme } from '../theme/defaultTheme'
import { useEffect, useRef, useState } from 'react'
import { MAX_PROGRAM_BLOCKS } from '../../model/program'
import { EditorController } from '../../controller/EditorController'
import { useController } from '../hooks/useController'
import type { BlockType, Frame, Program } from '../../model/types'
import { BlockTiles } from './BlockTiles'
import { Engine, Symbol } from '../theme/Symbols'
import { t } from '../../i18n/I18n'

type EditorProps = { theme?: Theme; program: Program; onChange: (program: Program) => void; maxBlocks?: number; locked?: boolean; activeBlockId?: string | null; conditions?: boolean; functionsEnabled?: boolean; call?: Frame['call']; palette?: BlockType[]; check?: Frame['check']; checks?: NonNullable<Frame['check']>[]; loops?: Frame['loops']; failedBlockId?: string | null; controller?: EditorController }
const types = defaultTheme.blockTypes

export function Editor({ theme = defaultTheme, program, onChange, maxBlocks, locked = false, activeBlockId, conditions = false, functionsEnabled = false, call, palette, check, checks, loops, failedBlockId, controller: supplied }: EditorProps) {
  const editor = useRef<HTMLElement>(null)
  const workspace = useRef<HTMLDivElement>(null)
  const [controller] = useState(() => supplied ?? new EditorController())
  controller.configure(program, onChange, locked, maxBlocks)
  const { selectedId, targetId, addedId } = useController(controller)
  const viewContext = locked ? `run:${call?.fn ?? ''}` : `edit:${controller.functionId ?? ''}:${controller.functionTarget}:${failedBlockId ?? ''}`
  const preferredPanel = locked ? call?.fn : controller.functionId
  const [panelChoice, setPanelChoice] = useState({ context: viewContext, tab: preferredPanel })
  if (panelChoice.context !== viewContext) setPanelChoice({ context: viewContext, tab: preferredPanel })
  const chosenPanel = panelChoice.context === viewContext ? panelChoice.tab : preferredPanel
  const visiblePanel = controller.functions.some(fn => fn.id === chosenPanel) ? chosenPanel : undefined
  const showPanel = (tab?: string) => setPanelChoice({ context: viewContext, tab })
  const { selectedPath, selectedBlock, targetPath, total, limit, atLimit, siblings } = controller
  useEffect(() => {
    const targetId = activeBlockId ?? addedId
    if (!targetId || !workspace.current) return
    const block = Array.from((editor.current ?? workspace.current).querySelectorAll<HTMLElement>('[data-block-id]')).find(node => node.dataset.blockId === targetId)
    if (block) {
      const area = block.closest<HTMLElement>('.workspace') ?? workspace.current
      const outer = area.getBoundingClientRect(), inner = block.getBoundingClientRect()
      const visibleTop = outer.top + (area.parentElement?.classList.contains('has-selection') ? 58 : 0)
      if (inner.top < visibleTop || inner.height > outer.bottom - visibleTop) area.scrollTop += inner.top - visibleTop
      else if (inner.bottom > outer.bottom) area.scrollTop += inner.bottom - outer.bottom
    }
    controller.acknowledgeAdded()
  }, [program, activeBlockId, addedId, controller, visiblePanel])
  const targetFunction = controller.functions.find(fn => fn.id === controller.functionId)
  const editing = controller.editProgram
  const targetBlock = targetPath ? blockAt(editing, targetPath) : undefined
  const selectedFunction = selectedBlock?.type === 'call' ? controller.functions.find(fn => selectedBlock.type === 'call' && fn.id === selectedBlock.fn) : undefined
  const label = (action: string) => t('action', { order: blockOrder(editing, selectedPath!), name: selectedFunction ? t(`functions.call.${selectedFunction.icon}`) : theme.blockName(selectedBlock!.type), action })
  return <section ref={editor} className="editor" aria-label={t('editor')}>
    <h2>{t('editor')}</h2>
    <div className="block-budget"><p aria-live="polite">{t('total', { count: total, max: limit })}</p>
    <span className="slot-dots" aria-hidden="true">{Array.from({ length: MAX_PROGRAM_BLOCKS }, (_, i) => <span key={i} className={i < total ? 'filled' : i >= limit ? 'unavailable' : ''}>{i < total ? '●' : '○'}</span>)}</span></div>
    <p className="insertion-status" aria-live="polite">{targetPath ? t(controller.targetElse ? 'targetElse' : targetBlock?.type === 'if' ? 'targetIf' : targetBlock?.type === 'while' ? 'targetWhile' : 'target', { order: blockOrder(editing, targetPath) }) : controller.functionTarget && targetFunction ? t(`functions.adding.${targetFunction.icon}`) : t('root')}</p>
    <div className="palette-row"><div className="palette" role="group" aria-label={t('palette')}>{(palette ?? (conditions ? [...types, 'if' as const] : types)).filter(type => type !== 'call').map(type => <button type="button" key={type} className={theme.blockClass(type)} aria-label={theme.blockName(type)} title={theme.blockName(type)} disabled={locked || atLimit} onClick={() => controller.add(type)}><span className="block-symbol" aria-hidden="true">{theme.blockSymbol(type)}</span>{conditions && theme.world === 'handheld' && type === 'repeat' && <span className="handheld-button-letter" aria-hidden="true">B</span>}{type === 'while' && <span className="sensor-icon" aria-hidden="true"><Symbol name="clearAhead" /></span>}{type === 'if' && <span className="sensor-icon" aria-hidden="true"><Symbol name="blockedAhead" /></span>}<small>{type === 'while' ? glossary.while.keyword : type === 'if' ? glossary.if.keyword : theme.paletteName?.(type) ?? theme.blockName(type)}</small></button>)}{functionsEnabled && controller.functions.map(fn => <button type="button" key={fn.id} className="block-call" aria-label={t(`functions.call.${fn.icon}`)} disabled={locked || atLimit || controller.addingToFunction} title={controller.addingToFunction ? t('functions.noNestedCalls') : t(`functions.call.${fn.icon}`)} onClick={() => controller.add('call', fn.id)}><span aria-hidden="true">{fn.icon === 'star' ? '★' : '☾'}()</span></button>)}</div><button type="button" className="undo-button" aria-label={t('undo')} title={t('undo')} disabled={locked || !controller.canUndo} onClick={controller.undo}><svg viewBox="0 0 24 24" width="26" height="26" aria-hidden="true"><path d="M9 4 3 10l6 6M3 10h11a6 6 0 0 1 0 12" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" /></svg></button></div>
    {atLimit && <p role="status">{t('limit')}</p>}
    {functionsEnabled && <div className="function-actions"><button disabled={locked || controller.functions.length >= 2} onClick={controller.createFunction}>{t('functions.create')}</button><button disabled={locked} aria-pressed={!controller.addingToFunction && !targetId} onClick={() => { controller.chooseFunction(); showPanel() }}>{t('root')}</button></div>}
    {functionsEnabled && controller.addingToFunction && <p className="function-notice" role="status">{t('functions.noNestedCalls')}</p>}
    {functionsEnabled && <div className="function-tabs" role="group" aria-label={t('functions.views')}>
      <button type="button" aria-pressed={!visiblePanel} onClick={() => showPanel()}>{t('functions.showMain')}</button>
      {controller.functions.map(fn => <button type="button" key={fn.id} aria-pressed={visiblePanel === fn.id} onClick={() => showPanel(fn.id)}>{t(`functions.show.${fn.icon}`)}</button>)}
    </div>}
    <div className="program-panels" data-panel={visiblePanel ? 'body' : 'main'}><div className="main-panel">
    <h3>{t('workspace')}</h3>
    <div className={`workspace-shell${selectedBlock ? ' has-selection' : ''}`}>
    {selectedBlock && <div className="tile-toolbar" role="group" aria-label={t('tools')}>
      {selectedBlock && selectedPath ? <>
        <button disabled={locked || selectedPath.at(-1) === 0} aria-label={label(t('before'))} onClick={() => controller.move('up')}>◀</button>
        <button disabled={locked || selectedPath.at(-1) === siblings!.length - 1} aria-label={label(t('after'))} onClick={() => controller.move('down')}>▶</button>
        <button disabled={locked} aria-label={label(t('remove'))} onClick={() => controller.remove()}>✕</button>
        {selectedBlock.type === 'if' && <>
          <button disabled={locked} aria-label={t(selectedBlock.else ? 'removeElse' : 'addElse')} onClick={controller.toggleElse}>{t(selectedBlock.else ? 'removeElse' : 'addElse')}</button>
          {selectedBlock.else && <button disabled={locked} aria-label={label(t('selectElse'))} onClick={() => controller.toggleTarget(true)}>{t('selectElse')}</button>}
        </>}
        {selectedBlock.type === 'repeat'  && <>
          <button disabled={locked || selectedBlock.count <= 2} aria-label={label(t('decrease'))} onClick={() => controller.setCount(selectedBlock.count - 1)}>−</button>
          <button disabled={locked || selectedBlock.count >= 10} aria-label={label(t('increase'))} onClick={() => controller.setCount(selectedBlock.count + 1)}>+</button>
        </>}
        {hasBody(selectedBlock) && <>
          <button disabled={locked} aria-pressed={targetId === selectedId && !controller.targetElse} aria-label={label(targetId === selectedId ? t('deselect') : t('select'))} onClick={() => controller.toggleTarget()}><span aria-hidden="true"><Symbol name="repeat" /></span></button>
        </>}
      </> : <small>{t('chooseTile')}</small>}
    </div>}
    <div className="workspace" ref={workspace} role="region" aria-label={t('workspace')} tabIndex={0} onClick={event => {
      if (!locked && !(event.target as HTMLElement).closest('button')) controller.clear()
    }}>
      {theme.world === 'train' && <Engine />}{program.length ? <BlockTiles theme={theme} program={program} functions={controller.functions} call={call} selectedId={!controller.functionId && selectedPath ? selectedId : null} targetId={!controller.functionId && targetPath ? targetId : null} targetElse={controller.targetElse} activeBlockId={activeBlockId} check={check} checks={checks} loops={loops} failedBlockId={failedBlockId} locked={locked} onSelect={id => controller.selectFunctionBlock(undefined, id)} />: <p>{t('empty')}</p>}
    {theme.world === 'handheld' && <div className="cartridge-slots" aria-hidden="true">{Array.from({ length: Math.max(0, 10 - total) }, (_, i) => <span key={i} />)}</div>}
    </div>
    </div></div>
    {functionsEnabled && <section className="function-panel" aria-label={t('functions.panel')}>
      {controller.functions.map(fn => <article key={fn.id} className={`function-card${call?.fn === fn.id ? ' function-active' : ''}${controller.functionTarget && controller.functionId === fn.id ? ' function-target' : ''}`} data-function-id={fn.id} data-visible={visiblePanel === fn.id}>
        <header><strong><span className="concept-keyword">{glossary.function.keyword}</span> <span aria-hidden="true">{fn.icon === 'star' ? '★' : '☾'}</span></strong>{call?.fn === fn.id && <span role="status">{t('functions.running')}</span>}</header>
        <div className="function-card-actions"><button disabled={locked} aria-pressed={controller.functionTarget && controller.functionId === fn.id} aria-label={t(`functions.target.${fn.icon}`)} onClick={() => { controller.chooseFunction(fn.id); setPanelChoice({ context: '', tab: fn.id }) }}>{t(`functions.target.${fn.icon}`)}</button>{controller.functionTarget && controller.functionId === fn.id && <button disabled={locked} aria-label={t(`functions.stop.${fn.icon}`)} onClick={() => { controller.chooseFunction(); showPanel() }}>{t(`functions.stop.${fn.icon}`)}</button>}<button disabled={locked} aria-label={t(`functions.remove.${fn.icon}`)} title={t('functions.deleteNotice')} onClick={() => controller.removeFunction(fn.id)}>✕</button></div>
        <p className="function-delete-notice">{t('functions.deleteNotice')}</p>
        <div className="function-body workspace" role="group" aria-label={t(`functions.body.${fn.icon}`)} tabIndex={0}>
          {fn.body.length ? <BlockTiles theme={theme} program={fn.body} selectedId={controller.functionId === fn.id ? selectedId : null} targetId={controller.functionId === fn.id ? targetId : null} activeBlockId={activeBlockId} loops={loops} failedBlockId={failedBlockId} locked={locked} onSelect={id => controller.selectFunctionBlock(fn.id, id)} /> : <p>{t('empty')}</p>}
        </div>
      </article>)}
    </section>}
    </div>
  </section>
}
