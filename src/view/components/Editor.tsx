import { blockOrder } from '../../model/editor'
import glossary from '../../i18n/glossary.json'
import { hasBody, blockAt } from '../../model/editor'
import { defaultTheme, type Theme } from '../theme/defaultTheme'
import { useEffect, useRef, useState } from 'react'
import { MAX_PROGRAM_BLOCKS } from '../../model/program'
import { EditorController } from '../../controller/EditorController'
import { useController } from '../hooks/useController'
import type { BlockType, Frame, Program, Condition, ConditionAtom } from '../../model/types'
import { BlockTiles } from './BlockTiles'
import { Engine, Symbol } from '../theme/Symbols'
import { t } from '../../i18n/I18n'

type EditorProps = { hintPalette?: boolean; hintWorkspace?: boolean; searchEnabled?: boolean; listsEnabled?: boolean; eventsEnabled?: boolean; events?: Frame['events']; returnsEnabled?: boolean; returned?: Frame['returned']; theme?: Theme; program: Program; onChange: (program: Program) => void; maxBlocks?: number; locked?: boolean; activeBlockId?: string | null; paramsEnabled?: boolean; conditions?: boolean; logicEnabled?: boolean; functionsEnabled?: boolean; variablesEnabled?: boolean; call?: Frame['call']; palette?: BlockType[]; check?: Frame['check']; checks?: NonNullable<Frame['check']>[]; loops?: Frame['loops']; failedBlockId?: string | null; controller?: EditorController }
const NOT = glossary.not.keyword as 'not'
const AND = glossary.and.keyword as 'and'
const OR = glossary.or.keyword as 'or'
const types = defaultTheme.blockTypes

export function Editor({ hintPalette = false, hintWorkspace = false, searchEnabled = false, listsEnabled = false, eventsEnabled = false, events, theme = defaultTheme, program, onChange, maxBlocks, returnsEnabled = false, returned, locked = false, activeBlockId, paramsEnabled = false, conditions = false, logicEnabled = false, functionsEnabled = false, variablesEnabled = false, call, palette, check, checks, loops, failedBlockId, controller: supplied }: EditorProps) {
  const editor = useRef<HTMLElement>(null)
  const workspace = useRef<HTMLDivElement>(null)
  const [controller] = useState(() => supplied ?? new EditorController())
  controller.configure(program, onChange, locked, maxBlocks, logicEnabled, paramsEnabled, returnsEnabled, eventsEnabled, listsEnabled, searchEnabled)
  program = controller.program
  const { selectedId, targetId, addedId } = useController(controller)
  const viewContext = locked ? `run:${call?.fn ?? ''}` : `edit:${controller.functionId ?? ''}:${controller.functionTarget}:${failedBlockId ?? ''}`
  const preferredPanel = locked ? call?.fn : controller.functionId
  const [panelChoice, setPanelChoice] = useState({ context: viewContext, tab: preferredPanel })
  if (panelChoice.context !== viewContext) setPanelChoice({ context: viewContext, tab: preferredPanel })
  const chosenPanel = panelChoice.context === viewContext ? panelChoice.tab : preferredPanel
  const visiblePanel = controller.functions.some(fn => fn.id === chosenPanel) ? chosenPanel : undefined
  const addBlock = (type: BlockType, fn?: string) => {
    controller.add(type, fn)
    if (controller.getSnapshot().addedId) setPanelChoice({ context: '', tab: controller.functionId })
  }
  const showPanel = (tab?: string) => setPanelChoice({ context: viewContext, tab })
  const { selectedPath, selectedBlock, targetPath, total, limit, atLimit, siblings } = controller
  useEffect(() => {
    const targetId = activeBlockId ?? addedId
    if (!targetId || !workspace.current) return
    const block = Array.from((editor.current ?? workspace.current).querySelectorAll<HTMLElement>('[data-block-id]')).find(node => node.dataset.blockId === targetId)
    if (block) {
      const area = block.closest<HTMLElement>('.workspace') ?? workspace.current
      const outer = area.getBoundingClientRect(), inner = block.getBoundingClientRect()
      const visibleTop = outer.top + (area.parentElement?.classList.contains('has-selection') && !variablesEnabled ? 58 : 0)
      if (inner.top < visibleTop || inner.height > outer.bottom - visibleTop) area.scrollTop += inner.top - visibleTop
      else if (inner.bottom > outer.bottom) area.scrollTop += inner.bottom - outer.bottom
    }
    controller.acknowledgeAdded()
  }, [program, activeBlockId, addedId, controller, visiblePanel, variablesEnabled])
  const targetFunction = controller.functions.find(fn => fn.id === controller.functionId)
  const editing = controller.editProgram
  const targetBlock = targetPath ? blockAt(editing, targetPath) : undefined
  const selectedFunction = selectedBlock?.type === 'call' ? controller.functions.find(fn => selectedBlock.type === 'call' && fn.id === selectedBlock.fn) : undefined
  const valueCall = selectedBlock?.type === 'repeat' ? selectedBlock.countCall : undefined
  const valueFunction = controller.functions.find(fn => fn.id === valueCall?.fn)
  const returnValue = selectedBlock?.type === 'return' ? selectedBlock.value : undefined
  const label = (action: string) => t('action', { order: blockOrder(editing, selectedPath!), name: searchEnabled && selectedBlock?.type === 'if' ? t('search.condition') : selectedFunction ? t(`functions.call.${selectedFunction.icon}`) : theme.blockName(selectedBlock!.type), action })
  const condition = selectedBlock && (selectedBlock.type === 'if' || selectedBlock.type === 'while') ? selectedBlock.condition : undefined
  const tree: Condition | undefined = typeof condition === 'string' ? { kind: 'atom', atom: condition } : condition
  const atomOf = (node: Condition): ConditionAtom => node.kind === 'atom' ? node.atom : node.kind === NOT ? atomOf(node.operand) : 'clearAhead'
  const leaf = (atom: ConditionAtom, negate: boolean): Condition => negate ? { kind: NOT, operand: { kind: 'atom', atom } } : { kind: 'atom', atom }
  const left = tree && (tree.kind === AND || tree.kind === OR) ? tree.left : tree
  const right = tree && (tree.kind === AND || tree.kind === OR) ? tree.right : leaf('blockedRight', false)
  const setLeaf = (side: 'left' | 'right', node: Condition) => {
    if (!tree) return
    controller.setCondition(tree.kind === AND || tree.kind === OR ? { ...tree, [side]: node } : node)
  }
  const leafControls = (node: Condition, side: 'left' | 'right') => <span><label>{t(`logic.${side}`)} <select disabled={locked} aria-label={t(`logic.${side}`)} value={atomOf(node)} onChange={event => setLeaf(side, leaf(event.target.value as ConditionAtom, node.kind === NOT))}>{(['blockedAhead', 'blockedLeft', 'blockedRight'] as const).map(atom => <option key={atom} value={atom}>{{ blockedAhead: '↑', blockedLeft: '←', blockedRight: '→' }[atom]} {t(`logic.${atom}`)}</option>)}</select></label><button type="button" disabled={locked} aria-label={`${t(`logic.${side}`)} ${NOT}`} aria-pressed={node.kind === NOT} onClick={() => setLeaf(side, leaf(atomOf(node), node.kind !== NOT))}>{NOT}</button></span>
  const toolbar = selectedBlock ? <div className="tile-toolbar" role="group" aria-label={t('tools')}>
      {selectedBlock && selectedPath ? <>
        <button disabled={locked || selectedPath.at(-1) === 0} aria-label={label(t('before'))} onClick={() => controller.move('up')}>◀</button>
        <button disabled={locked || selectedPath.at(-1) === siblings!.length - 1} aria-label={label(t('after'))} onClick={() => controller.move('down')}>▶</button>
        <button disabled={locked} aria-label={label(t('remove'))} onClick={() => controller.remove()}>✕</button>
        {selectedBlock.type === 'on' && <span className="signal-picker" role="group" aria-label={t('events.connection')} aria-describedby="signal-swap-help" title={t('events.swap')}><span id="signal-swap-help" className="sr-only">{t('events.swap')}</span>{(['◇', '○', '△'] as const).map((signal, i) => <button type="button" key={signal} disabled={locked} aria-label={t(`events.${['diamond', 'circle', 'triangle'][i]}`)} aria-pressed={selectedBlock.signal === signal} onClick={() => controller.setSignal(signal)}><Symbol name={['diamond', 'circle', 'triangle'][i]} /></button>)}</span>}
        {selectedBlock.type === 'forEach' && searchEnabled && <button disabled={locked} aria-label={t('search.direction')} onClick={controller.toggleDirection}>{t(selectedBlock.direction === 'back' ? 'search.back' : 'search.front')}</button>}
        {selectedBlock.type === 'if' && <>
          <button disabled={locked} aria-label={t(selectedBlock.else ? 'removeElse' : 'addElse')} onClick={controller.toggleElse}>{t(selectedBlock.else ? 'removeElse' : 'addElse')}</button>
          {selectedBlock.else && <button disabled={locked} aria-label={label(t('selectElse'))} onClick={() => controller.toggleTarget(true)}>{t('selectElse')}</button>}
        </>}
        {selectedBlock.type === 'call' && selectedBlock.arg && <>
          <button disabled={locked || selectedBlock.arg.kind === 'number' && selectedBlock.arg.value <= 0} aria-label={label(t('variables.decrease'))} onClick={() => controller.setCallArgument({ kind: 'number', value: selectedBlock.arg?.kind === 'number' ? selectedBlock.arg.value - 1 : 2 })}>−</button>
          <button disabled={locked || selectedBlock.arg.kind === 'number' && selectedBlock.arg.value >= 20} aria-label={label(t('variables.increase'))} onClick={() => controller.setCallArgument({ kind: 'number', value: selectedBlock.arg?.kind === 'number' ? selectedBlock.arg.value + 1 : 2 })}>+</button>
          <button disabled={locked} aria-label={t(selectedBlock.arg.kind === 'A' ? 'parameters.useNumber' : 'parameters.useA')} onClick={() => controller.setCallArgument(selectedBlock.arg?.kind === 'A' ? { kind: 'number', value: 2 } : { kind: 'A' })}>{t(selectedBlock.arg.kind === 'A' ? 'parameters.useNumber' : 'parameters.useA')}</button>
        </>}
        {returnValue && <>
          <button disabled={locked || returnValue.kind === 'number' && returnValue.value <= 0} aria-label={label(t('variables.decrease'))} onClick={() => controller.setReturnValue({ kind: 'number', value: returnValue.kind === 'number' ? returnValue.value - 1 : 0 })}>−</button>
          <button disabled={locked || returnValue.kind === 'number' && returnValue.value >= 20} aria-label={label(t('variables.increase'))} onClick={() => controller.setReturnValue({ kind: 'number', value: returnValue.kind === 'number' ? returnValue.value + 1 : 1 })}>+</button>
          <button disabled={locked} aria-label={t('returns.source')} onClick={() => controller.setReturnValue(returnValue.kind === 'number' ? { kind: 'A' } : returnValue.kind === 'A' && targetFunction?.param ? { kind: 'param' } : returnValue.kind === 'ahead' ? { kind: 'number', value: 0 } : { kind: 'ahead' })}>{t('returns.sourceShort')}</button>
        </>}
        {valueCall && valueFunction?.param && <>
          <button disabled={locked || valueCall.arg?.kind === 'number' && valueCall.arg.value <= 0} aria-label={label(t('variables.decrease'))} onClick={() => controller.setValueCallArgument({ kind: 'number', value: valueCall.arg?.kind === 'number' ? valueCall.arg.value - 1 : 0 })}>−</button>
          <button disabled={locked || valueCall.arg?.kind === 'number' && valueCall.arg.value >= 20} aria-label={label(t('variables.increase'))} onClick={() => controller.setValueCallArgument({ kind: 'number', value: valueCall.arg?.kind === 'number' ? valueCall.arg.value + 1 : 1 })}>+</button>
          <button disabled={locked} onClick={() => controller.setValueCallArgument(valueCall.arg?.kind === 'A' ? { kind: 'number', value: 1 } : { kind: 'A' })}>{t(valueCall.arg?.kind === 'A' ? 'parameters.useNumber' : 'parameters.useA')}</button>
        </>}
        {selectedBlock.type === 'set'  && <>
          <button disabled={locked || selectedBlock.value <= 0} aria-label={label(t('variables.decrease'))} onClick={() => controller.setVariableValue(selectedBlock.value - 1)}>−</button>
          <button disabled={locked || selectedBlock.value >= 20} aria-label={label(t('variables.increase'))} onClick={() => controller.setVariableValue(selectedBlock.value + 1)}>+</button>
        </>}
        {selectedBlock.type === 'change' && <button disabled={locked} aria-label={t('variables.toggleChange')} onClick={controller.toggleChange}>{t('variables.toggleChange')}</button>}
        {selectedBlock.type === 'repeat' && variablesEnabled && <button disabled={locked} aria-label={listsEnabled ? t('lists.source') : returnsEnabled ? t('returns.repeatSource') : t(paramsEnabled && selectedBlock.countVariable && targetFunction?.param ? 'parameters.useParam' : selectedBlock.countVariable || selectedBlock.countParam ? 'variables.useNumber' : 'variables.useA')} onClick={controller.toggleRepeatSource}>{listsEnabled ? (selectedBlock.countSource === 'current' ? '▣' : selectedBlock.countSource === 'listAtA' ? 'L[A]' : selectedBlock.countSource === 'listLength' ? t('lists.length', { length: 'L' }) : selectedBlock.countVariable ?? '×') : returnsEnabled ? t('returns.repeatSource') : paramsEnabled && selectedBlock.countVariable && targetFunction?.param ? '◆' : t(selectedBlock.countVariable || selectedBlock.countParam ? 'variables.repeatNumber' : 'variables.repeatA')}</button>}
        {selectedBlock.type === 'repeat' && !selectedBlock.countSource && !selectedBlock.countVariable && !selectedBlock.countParam && !selectedBlock.countCall && <>
          <button disabled={locked || (selectedBlock.count ?? 3) <= 2} aria-label={label(t('decrease'))} onClick={() => controller.setCount((selectedBlock.count ?? 3) - 1)}>−</button>
          <button disabled={locked || (selectedBlock.count ?? 3) >= 10} aria-label={label(t('increase'))} onClick={() => controller.setCount((selectedBlock.count ?? 3) + 1)}>+</button>
        </>}
        {hasBody(selectedBlock) && <>
          <button disabled={locked} aria-pressed={targetId === selectedId && !controller.targetElse} aria-label={label(targetId === selectedId ? t('deselect') : t('select'))} onClick={() => controller.toggleTarget()}><span aria-hidden="true"><Symbol name="repeat" /></span></button>
        </>}
      </> : <small>{t('chooseTile')}</small>}
    {logicEnabled && tree && left && <div className="logic-editor"><label>{t('logic.operator')} <select disabled={locked} value={tree.kind === AND || tree.kind === OR ? tree.kind : 'atom'} onChange={event => controller.setCondition(event.target.value === 'atom' ? left : { kind: event.target.value as 'and' | 'or', left, right })}><option value="atom">{t('logic.single')}</option><option value="and">{AND}</option><option value="or">{OR}</option></select></label>{leafControls(left, 'left')}{(tree.kind === AND || tree.kind === OR) && leafControls(right, 'right')}</div>}
    </div> : null
  return <section ref={editor} className="editor" aria-label={t('editor')}>
    <h2>{t('editor')}</h2>
    <div className="block-budget"><p aria-live="polite">{t('total', { count: total, max: limit })}</p>
    <span className="slot-dots" aria-hidden="true">{Array.from({ length: MAX_PROGRAM_BLOCKS }, (_, i) => <span key={i} className={i < total ? 'filled' : i >= limit ? 'unavailable' : ''}>{i < total ? '●' : '○'}</span>)}</span>{functionsEnabled && atLimit && <span className="function-limit" role="status">{t('limit')}</span>}</div>
    <p className="insertion-status" aria-live="polite">{targetPath ? t(controller.targetElse ? 'targetElse' : targetBlock?.type === 'forEach' ? 'lists.target' : targetBlock?.type === 'on' ? 'events.target' : targetBlock?.type === 'if' ? 'targetIf' : targetBlock?.type === 'while' ? 'targetWhile' : 'target', { order: blockOrder(editing, targetPath) }) : controller.functionTarget && targetFunction ? t(`functions.adding.${targetFunction.icon}`) : t('root')}</p>
    <div className="palette-row"><div className="palette" data-hint-focus={hintPalette ? 'palette' : undefined} role="group" aria-label={t('palette')}>{(palette ?? (conditions ? [...types, 'if' as const] : types)).filter(type => type !== 'call').map(type => <button type="button" key={type} className={theme.blockClass(type)} aria-label={searchEnabled && type === 'if' ? t('search.condition') : theme.blockName(type)} title={searchEnabled && type === 'if' ? t('search.condition') : theme.blockName(type)} disabled={locked || atLimit || searchEnabled && (type === 'forward' && !!targetPath || (type === 'if' || type === 'breakForEach') && !targetPath?.some((_, i) => blockAt(editing, targetPath.slice(0, i + 1))?.type === 'forEach')) || type === 'return' && !controller.addingToFunction || type === 'on' && (!!controller.targetPath || !!controller.functionId || program.filter(block => block.type === 'on').length >= 3)} onClick={() => addBlock(type)}><span className="block-symbol" aria-hidden="true">{theme.blockSymbol(type)}</span>{conditions && theme.world === 'handheld' && type === 'repeat' && <span className="handheld-button-letter" aria-hidden="true">B</span>}{type === 'while' && <span className="sensor-icon" aria-hidden="true"><Symbol name="clearAhead" /></span>}{type === 'if' && <span className="sensor-icon" aria-hidden="true"><Symbol name={searchEnabled ? "target" : "blockedAhead"} /></span>}<small>{type === 'set' ? glossary.variable.keyword : type === 'change' ? glossary.change.keyword : type === 'while' ? glossary.while.keyword : type === 'if' ? glossary.if.keyword : theme.paletteName?.(type) ?? theme.blockName(type)}</small></button>)}{functionsEnabled && controller.functions.map(fn => <button type="button" key={fn.id} className="block-call" aria-label={t(`functions.call.${fn.icon}`)} disabled={locked || atLimit || controller.addingToFunction} title={controller.addingToFunction ? t('functions.noNestedCalls') : t(`functions.call.${fn.icon}`)} onClick={() => addBlock('call', fn.id)}><span aria-hidden="true"><Symbol name={fn.icon} />()</span></button>)}</div><button type="button" className="undo-button" aria-label={t('undo')} title={t('undo')} disabled={locked || !controller.canUndo} onClick={controller.undo}><svg viewBox="0 0 24 24" width="26" height="26" aria-hidden="true"><path d="M9 4 3 10l6 6M3 10h11a6 6 0 0 1 0 12" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" /></svg></button></div>
    {atLimit && !functionsEnabled && <p role="status">{t('limit')}</p>}
    {functionsEnabled && <div className="function-navigation"><div className="function-actions"><button disabled={locked || controller.functions.length >= 2} onClick={controller.createFunction}>{t('functions.create')}</button><button disabled={locked} aria-pressed={!controller.addingToFunction && !targetId} onClick={() => { controller.chooseFunction(); showPanel() }}>{t('functions.addMain')}</button></div>
    {controller.addingToFunction && <p className="function-notice" role="status">{t('functions.noNestedCalls')}</p>}
    <div className="function-tabs" data-hint-focus={hintWorkspace ? 'workspace' : undefined} role="group" aria-label={t('functions.views')}>
      <button type="button" aria-pressed={!visiblePanel} onClick={() => showPanel()}>{t('functions.showMain')}</button>
      {controller.functions.map(fn => <button type="button" key={fn.id} aria-pressed={visiblePanel === fn.id} onClick={() => showPanel(fn.id)}>{t(`functions.show.${fn.icon}`)}</button>)}
    </div></div>}
    {functionsEnabled && <div className="function-tools">{toolbar}</div>}
    {eventsEnabled && <p className="event-notice" tabIndex={0}>{t('events.notice')}</p>}
    <div className="program-panels" data-panel={visiblePanel ? 'body' : 'main'}><div className="main-panel">
    <h3>{t('workspace')}</h3>
    <div data-hint-focus={hintWorkspace ? 'workspace' : undefined} className={`workspace-shell${!functionsEnabled && selectedBlock ? ' has-selection' : ''}`}>
    {!functionsEnabled && toolbar}
    <div className="workspace" ref={workspace} role="region" aria-label={t('workspace')} tabIndex={0} onClick={event => {
      if (!locked && !(event.target as HTMLElement).closest('button')) controller.clear()
    }}>
      {theme.world === 'train' && <Engine />}{program.length ? <BlockTiles activeHandlerId={events?.handler?.onId} theme={theme} program={program} functions={controller.functions} returned={returned} call={call} selectedId={!controller.functionId && selectedPath ? selectedId : null} targetId={!controller.functionId && targetPath ? targetId : null} targetElse={controller.targetElse} activeBlockId={activeBlockId} check={check} checks={checks} loops={loops} failedBlockId={failedBlockId} locked={locked} onSelect={id => controller.selectFunctionBlock(undefined, id)} />: <p>{t('empty')}</p>}
    {theme.world === 'handheld' && <div className="cartridge-slots" aria-hidden="true">{Array.from({ length: Math.max(0, 10 - total) }, (_, i) => <span key={i} />)}</div>}
    </div>
    </div></div>
    {functionsEnabled && <section className="function-panel" aria-label={t('functions.panel')}>
      {controller.functions.map(fn => <article key={fn.id} className={`function-card${call?.fn === fn.id ? ' function-active' : ''}${controller.functionTarget && controller.functionId === fn.id ? ' function-target' : ''}`} data-function-id={fn.id} data-visible={visiblePanel === fn.id}>
        <header><strong><span className="concept-keyword">{glossary.function.keyword}</span> <span aria-hidden="true"><Symbol name={fn.icon} /></span></strong>{paramsEnabled && <button className="parameter-socket" aria-pressed={!!fn.param} disabled={locked} aria-label={t(`parameters.${fn.param ? 'disable' : 'enable'}.${fn.icon}`)} onClick={() => controller.toggleParameter(fn.id)}><svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><path d="M12 2 22 12 12 22 2 12Z" fill={fn.param ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" />{!fn.param && <path d="M3 21 21 3" stroke="currentColor" strokeWidth="2" />}</svg><span>{fn.param ? call?.fn === fn.id ? `◆${call.arg ?? ''}` : '◆' : '−'}</span></button>}{returnsEnabled && <span className="return-socket" aria-label={t('returns.output')}>↩{returned?.fn === fn.id ? returned.value : ''}</span>}{call?.fn === fn.id && <span role="status">{t('functions.running')}</span>}</header>
        <div className="function-card-actions"><button disabled={locked} aria-pressed={controller.functionTarget && controller.functionId === fn.id} aria-label={t(`functions.target.${fn.icon}`)} onClick={() => { controller.chooseFunction(fn.id); setPanelChoice({ context: '', tab: fn.id }) }}>{t(`functions.target.${fn.icon}`)}</button>{controller.functionTarget && controller.functionId === fn.id && <button disabled={locked} aria-label={t(`functions.stop.${fn.icon}`)} onClick={() => { controller.chooseFunction(); showPanel() }}>{t(`functions.stop.${fn.icon}`)}</button>}<button disabled={locked} aria-label={t(`functions.remove.${fn.icon}`)} title={t('functions.deleteNotice')} onClick={() => controller.removeFunction(fn.id)}>✕</button></div>
        {returned?.fn === fn.id && returned.skippedIds.length > 0 && <p className="return-skipped-notice">⊘ {t('returns.skipped')}</p>}
        <p className="function-delete-notice">{t('functions.deleteNotice')}</p>
        <div className="function-body workspace" role="group" aria-label={t(`functions.body.${fn.icon}`)} tabIndex={0}>
          {fn.body.length ? <BlockTiles theme={theme} returned={returned?.fn === fn.id ? returned : undefined} program={fn.body} selectedId={controller.functionId === fn.id ? selectedId : null} targetId={controller.functionId === fn.id ? targetId : null} activeBlockId={activeBlockId} loops={loops} failedBlockId={failedBlockId} locked={locked} onSelect={id => controller.selectFunctionBlock(fn.id, id)} /> : <p>{t('empty')}</p>}
        </div>
      </article>)}
    </section>}
    </div>
  </section>
}
