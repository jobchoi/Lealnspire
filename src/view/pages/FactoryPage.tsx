import { useEffect, useState } from 'react'
import type { Progress } from '../../model/ProgressRepository'
import type { Atom, Block, Box, Condition, Frame, Pile, Shape, StartState, Value } from '../../model/factory/types'
import { FactoryEditorController, type FactoryTarget } from '../../controller/FactoryEditorController'
import { FactoryPlaybackController } from '../../controller/FactoryPlaybackController'
import { useController } from '../hooks/useController'
import { t } from '../../i18n/I18n'
import { ConceptDefs } from '../theme/Symbols'
import { worlds } from '../theme/themes'
import './FactoryPage.css'

const piles: Pile[] = ['leaf', 'moon', 'sun']
const places = ['belt', ...piles] as const
const shapes: Shape[] = ['◆', '○', '△']
const signals = ['◇', '○', '△'] as const
const label = (key: string) => t(`factory.${key}`)
const numbers = (max: number, min = 0) => Array.from({ length: max - min + 1 }, (_, i) => min + i)
export function FactoryBox({ box, highlight = false, top = false }: { box: Box; highlight?: boolean; top?: boolean }) {
  return <span className={`factory-box${highlight ? ' factory-box-highlight' : ''}`} data-box-id={box.id}>
    <svg viewBox="0 0 40 40" role="img" aria-label={box.shape}><rect x="2" y="2" width="36" height="36" rx="5" fill="#fff7de" stroke="currentColor" strokeWidth="2" />
      {box.shape === '◆' ? <path d="M20 9 31 20 20 31 9 20Z" fill="#345776" /> : box.shape === '○' ? <circle cx="20" cy="20" r="10" fill="none" stroke="#345776" strokeWidth="3" /> : <path d="M20 9 31 30H9Z" fill="none" stroke="#345776" strokeWidth="3" />}
      {top && <path d="M14 4V1h12v3" fill="none" stroke="currentColor" strokeWidth="2" />}
    </svg>
  </span>
}
export function FactoryPicture({ state, title, changed = [] }: { state: StartState & { held?: Box | null }; title: string; changed?: string[] }) {
  return <section className="factory-picture" aria-label={title}><h2>{title}</h2>
    <div className="factory-belt" role="group" aria-label={`${label('belt')}: ${t('factory.beltRead', { boxes: state.belt.map(b => b.shape).join(', ') || label('empty') })}`}>
      <strong>{label('belt')}</strong><p>{label('front')}</p><div className="factory-belt-boxes"><span aria-hidden="true">←</span>{state.belt.map((b, i) => <span key={b.id} className={i === 0 ? 'factory-front' : ''}><FactoryBox box={b} highlight={changed.includes(b.id)} /></span>)}</div>
    </div>
    <p>{label('top')}</p><div className="factory-piles">{piles.map(p => <div key={p} role="group" aria-label={`${label(p)}: ${t('factory.pileRead', { boxes: state.piles[p].map(b => b.shape).join(', ') || label('empty'), top: state.piles[p].at(-1)?.shape ?? label('empty') })}`}>
      <strong><PileIcon pile={p} />{label(p)}</strong><div className="factory-bin">{state.piles[p].map((b, i) => <FactoryBox key={b.id} box={b} top={i === state.piles[p].length - 1} highlight={changed.includes(b.id)} />)}</div>
    </div>)}</div>
    {'held' in state && <div className="factory-held" role="group" aria-label={`${label('held')}: ${state.held?.shape ?? label('empty')}`}><strong>{label('held')}</strong><svg aria-hidden="true" viewBox="0 0 60 30"><path d="M30 0v9M15 25 9 13h42l-6 12M9 13l21-4 21 4" fill="none" stroke="currentColor" strokeWidth="3" /></svg>{state.held ? <FactoryBox box={state.held} highlight={changed.includes(state.held.id)} /> : <span>{label('empty')}</span>}</div>}
  </section>
}
function PileIcon({ pile }: { pile: Pile }) {
  return <svg className="factory-pile-icon" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2">{pile === 'leaf' ? <><path d="M4 20C0 6 12 3 21 3c0 12-3 20-17 17ZM4 20 17 7" /></> : pile === 'moon' ? <path d="M18 3A9 9 0 1 0 21 17 10 10 0 0 1 18 3Z" /> : <><circle cx="12" cy="12" r="5" /><path d="M12 0v4m0 16v4M0 12h4m16 0h4M3 3l3 3m12 12 3 3M3 21l3-3M18 6l3-3" /></>}</svg>
}
export function FactorySetup({ editor }: { editor: FactoryEditorController }) {
  const { input, locked } = useController(editor)
  const total = places.reduce((n, p) => n + (p === 'belt' ? input.start.belt : input.start.piles[p]).length, 0)
  return <section aria-label={label('start')}><p>{t('factory.total', { count: total })}</p>{places.map(place => {
    const boxes = place === 'belt' ? input.start.belt : input.start.piles[place], max = place === 'belt' ? 12 : 6
    return <fieldset key={place} disabled={locked}><legend>{t('factory.capacity', { place: label(place), count: boxes.length, max })}</legend>
      <div className="factory-actions">{shapes.map(shape => <button key={shape} type="button" disabled={boxes.length >= max || total >= 18} aria-label={t('factory.add', { place: label(place), shape })} onClick={() => editor.addBox(place, shape)}>{shape} +</button>)}</div>
      <ol className="factory-box-editor">{boxes.map((b, i) => <li key={b.id}><FactoryBox box={b} /><div className="factory-actions">
        <button type="button" disabled={i === 0} aria-label={t('factory.earlier', { place: label(place), index: i + 1 })} onClick={() => editor.moveBox(place, i, i - 1)}>↑</button>
        <button type="button" disabled={i === boxes.length - 1} aria-label={t('factory.later', { place: label(place), index: i + 1 })} onClick={() => editor.moveBox(place, i, i + 1)}>↓</button>
        <button type="button" aria-label={t('factory.removeBox', { place: label(place), index: i + 1, shape: b.shape })} onClick={() => editor.removeBox(place, i)}>×</button>
      </div></li>)}</ol>
    </fieldset>
  })}</section>
}
function Select({ title, value, choices, onChange }: { title: string; value: string | number; choices: { value: string | number; name: string }[]; onChange: (value: string) => void }) {
  return <label className="factory-field"><span>{title}</span><select value={value} onChange={e => onChange(e.target.value)}>{choices.map(c => <option key={c.value} value={c.value}>{c.name}</option>)}</select></label>
}
const options = (values: readonly string[]) => values.map(value => ({ value, name: label(value) }))
const numeric = (max: number, min = 0) => numbers(max, min).map(value => ({ value, name: String(value) }))
const atomKinds: Atom['kind'][] = ['beltEmpty', 'beltHasBoxes', 'heldEmpty', 'heldHasBox', 'pileEmpty', 'pileHasBoxes', 'pileFull', 'heldShape', 'pileShape', 'matchesTarget']
function makeAtom(kind: Atom['kind']): Atom {
  if (kind === 'heldShape') return { kind, shape: '◆' }
  if (kind === 'pileShape') return { kind, pile: 'leaf', shape: '◆' }
  if (kind === 'pileEmpty' || kind === 'pileHasBoxes' || kind === 'pileFull') return { kind, pile: 'leaf' }
  return { kind }
}
const initialCondition: Condition = { kind: 'atom', atom: { kind: 'beltHasBoxes' } }
function ConditionFields({ condition, onChange, editor, block }: { condition: Condition; onChange: (c: Condition) => void; editor: FactoryEditorController; block: Extract<Block, { type: ('if' | 'while') }> }) {
  const allowed = (c: Condition) => editor.canReplace({ ...block, condition: c })
  const atomField = (c: Condition, change: (c: Condition) => void, title: string) => {
    const a = c.kind === 'atom' ? c.atom : c.kind === 'not' && c.operand.kind === 'atom' ? c.operand.atom : makeAtom('beltHasBoxes')
    const wrap = (atom: Atom): Condition => c.kind === 'not' ? { kind: ('not' as const), operand: { kind: 'atom', atom } } : { kind: 'atom', atom }
    return <fieldset><legend>{title}</legend><Select title={label('condition')} value={a.kind} choices={atomKinds.filter(kind => allowed(wrap(makeAtom(kind)))).map(value => ({ value, name: label(`atoms.${value}`) }))} onChange={v => change(wrap(makeAtom(v as Atom['kind'])))} />
      {'pile' in a && <Select title={label('pile')} value={a.pile} choices={options(piles)} onChange={v => change(wrap({ ...a, pile: v as Pile }))} />}
      {'shape' in a && <Select title={label('shape')} value={a.shape} choices={shapes.map(value => ({ value, name: value }))} onChange={v => change(wrap({ ...a, shape: v as Shape }))} />}
      {editor.units.includes(6) && <label><input type="checkbox" checked={c.kind === 'not'} onChange={() => change(c.kind === 'not' ? c.operand : { kind: ('not' as const), operand: c })} />{label('not')}</label>}
    </fieldset>
  }
  const left = condition.kind === 'and' || condition.kind === 'or' ? condition.left : condition
  return <div className="factory-condition">{editor.units.includes(6) && <Select title={label('logic')} value={condition.kind === 'and' || condition.kind === 'or' ? condition.kind : 'atom'} choices={options(['atom', 'and', 'or'])} onChange={v => onChange(v === 'atom' ? left : { kind: v as 'and' | 'or', left, right: initialCondition })} />}
    {atomField(left, c => onChange(condition.kind === 'and' || condition.kind === 'or' ? { ...condition, left: c } : c), label('left'))}
    {(condition.kind === 'and' || condition.kind === 'or') && atomField(condition.right, c => onChange({ ...condition, right: c }), label('right'))}
  </div>
}
function values(): Value[] { return [{ kind: 'number', value: 2 }, { kind: 'A' }, { kind: 'param' }, { kind: 'beltCount' }, ...piles.map(pile => ({ kind: 'pileCount' as const, pile })), { kind: 'current' }, { kind: 'listAtA' }, { kind: 'listLength' }] }
const valueName = (v: Value) => v.kind === 'pileCount' ? `${label('pileCount')}: ${label(v.pile)}` : label(v.kind === 'current' ? 'currentValue' : v.kind)
const repeatValue = (v: Value): Partial<Extract<Block, { type: ('repeat') }>> => v.kind === 'number' ? { count: v.value } : v.kind === 'A' ? { countVariable: 'A' } : v.kind === 'param' ? { countParam: true } : { countSource: v }
function blockCandidates(editor: FactoryEditorController): Block[] {
  const id = 'factory-candidate'
  return [{ id, type: 'takeBelt' }, { id, type: 'takePile', pile: 'leaf' }, { id, type: 'putPile', pile: 'leaf' }, { id, type: ('repeat' as const), count: 2, body: [] }, { id, type: ('if' as const), condition: initialCondition, body: [], else: [] }, { id, type: ('while' as const), condition: initialCondition, body: [] }, ...editor.doc.functions.map(f => ({ id, type: 'call' as const, fn: f.id, ...(f.param ? { arg: { kind: 'number' as const, value: 2 } } : {}) })), { id, type: ('set' as const), variable: 'A', value: 0 }, { id, type: ('change' as const), variable: 'A', by: 1 }, { id, type: ('return' as const), value: { kind: 'number', value: 2 } }, ...signals.map(signal => ({ id, type: ('on' as const), signal, body: [] })), { id, type: 'forEach', body: [] }, { id, type: 'breakForEach' }]
}
function BlockFields({ block: b, editor }: { block: Block; editor: FactoryEditorController }) {
  const replace = (next: Block) => editor.replace(b.id, next)
  const valueField = (value: Value, choices: Value[], change: (v: Value) => void) => <>
    <Select title={label('source')} value={JSON.stringify({ ...value, ...(value.kind === 'number' ? { value: 2 } : {}) })} choices={choices.map(v => ({ value: JSON.stringify(v), name: valueName(v) }))} onChange={v => change(JSON.parse(v) as Value)} />
    {value.kind === 'number' && <Select title={label('value')} value={value.value} choices={numeric(b.type === 'repeat' ? 10 : 20, b.type === 'repeat' ? 2 : 0)} onChange={v => change({ kind: 'number', value: Number(v) })} />}
  </>
  return <div className="factory-fields">
    {'pile' in b && <Select title={label('pile')} value={b.pile} choices={options(piles)} onChange={v => replace({ ...b, pile: v as Pile })} />}
    {(b.type === 'if' || b.type === 'while') && <ConditionFields editor={editor} block={b} condition={b.condition} onChange={condition => replace({ ...b, condition })} />}
    {b.type === 'repeat' && (() => {
      const { count: _c, countVariable: _a, countParam: _p, countSource: _s, countCall: _f, ...base } = b
      const build = (v: Value) => ({ ...base, ...repeatValue(v) }) as Block
      const value: Value = b.count !== undefined ? { kind: 'number', value: b.count } : b.countVariable ? { kind: 'A' } : b.countParam ? { kind: 'param' } : b.countSource ?? { kind: 'number', value: 2 }
      const calls = editor.doc.functions.flatMap(f => { const next: Block = { ...base, countCall: { fn: f.id, ...(f.param ? { arg: { kind: 'number', value: 2 } } : {}) } }; return editor.canReplace(next) ? [next] : [] })
      return <>{!b.countCall && valueField(value, values().filter(v => editor.canReplace(build(v))), v => replace(build(v)))}
        {calls.map(c => <button type="button" key={c.id + ('countCall' in c ? c.countCall?.fn : '')} onClick={() => replace(c)}>{label('returned')} {'countCall' in c && c.countCall?.fn}</button>)}
        {b.countCall && <><span>{label('returned')}: {b.countCall.fn}</span><button type="button" onClick={() => replace({ ...base, count: 2 })}>{label('number')}</button>{b.countCall.arg && valueField(b.countCall.arg, [{ kind: 'number', value: 2 }, ...(editor.units.includes(5) ? [{ kind: 'A' as const }] : [])], v => { if (v.kind === 'number' || v.kind === 'A') replace({ ...base, countCall: { ...b.countCall!, arg: v } }) })}</>}
      </>
    })()}
    {b.type === 'return' && valueField(b.value, values().filter(v => editor.canReplace({ ...b, value: v } as Block)), v => replace({ ...b, value: v } as Block))}
    {b.type === 'set' && <Select title={label('value')} value={b.value} choices={numeric(20)} onChange={v => replace({ ...b, value: Number(v) })} />}
    {b.type === 'change' && <Select title={label('value')} value={b.by} choices={[{ value: 1, name: '+1' }, { value: -1, name: '−1' }]} onChange={v => replace({ ...b, by: Number(v) as 1 | -1 })} />}
    {b.type === 'forEach' && <Select title={label('direction')} value={b.direction ?? 'front'} choices={[{ value: 'front', name: label('frontDirection') }, ...(editor.canReplace({ ...b, direction: 'back' }) ? [{ value: 'back', name: label('backDirection') }] : [])]} onChange={v => replace({ ...b, direction: v as 'front' | 'back' })} />}
    {b.type === 'on' && <Select title={label('signal')} value={b.signal} choices={signals.filter(signal => editor.canReplace({ ...b, signal })).map(value => ({ value, name: value }))} onChange={v => replace({ ...b, signal: v as typeof b.signal })} />}
    {b.type === 'call' && <><Select title={label('function')} value={b.fn} choices={editor.doc.functions.map(f => ({ value: f.id, name: f.icon === 'star' ? '☆' : '☾' }))} onChange={v => { const f = editor.doc.functions.find(f => f.id === v)!; replace({ id: b.id, type: 'call', fn: v, ...(f.param ? { arg: { kind: 'number', value: 2 } } : {}) }) }} />{b.arg && valueField(b.arg, [{ kind: 'number', value: 2 }, ...(editor.units.includes(5) ? [{ kind: 'A' as const }] : [])], v => { if (v.kind === 'A' || v.kind === 'number') replace({ ...b, arg: v }) })}</>}
  </div>
}
function targetKey(target: FactoryTarget) { return JSON.stringify(target) }
export function FactoryCode({ editor, activeId }: { editor: FactoryEditorController; activeId?: string | null }) {
  const { input, locked, canUndo } = useController(editor)
  const [target, setTarget] = useState<FactoryTarget>({ kind: 'main' })
  const [notice, setNotice] = useState(false)
  const targets: { target: FactoryTarget; name: string }[] = [{ target: { kind: 'main' }, name: label('main') }]
  const collect = (list: Block[], prefix: string) => list.forEach((b, i) => { if ('body' in b) { const name = `${prefix} ${i + 1} ${label(b.type)}`; targets.push({ target: { kind: 'body', id: b.id }, name }); collect(b.body, name); if (b.type === 'if') { targets.push({ target: { kind: ('else' as const), id: b.id }, name: `${name} ${label('else')}` }); collect(b.else ?? [], `${name} ${label('else')}`) } } })
  collect(input.program.main, label('main'))
  input.program.functions.forEach(f => { const name = `${label('function')} ${f.icon === 'star' ? '☆' : '☾'}`; targets.push({ target: { kind: ('function' as const), id: f.id }, name }); collect(f.body, name) })
  const currentTarget = targets.find(v => targetKey(v.target) === targetKey(target))?.target ?? targets[0].target
  const candidates = blockCandidates(editor).filter(b => editor.canAdd(b, currentTarget))
  const tree = (list: Block[], container: FactoryTarget) => <ol className="factory-code-list">{list.map((b, i) => <li key={b.id} className={`factory-tile${activeId === b.id ? ' factory-active' : ''}`} aria-current={activeId === b.id ? 'step' : undefined}>
    <strong>{i + 1}. {label(b.type)} {b.type === 'call' && (input.program.functions.find(f => f.id === b.fn)?.icon === 'star' ? '☆' : '☾')}</strong><BlockFields block={b} editor={editor} />
    <div className="factory-actions"><button type="button" disabled={i === 0} aria-label={label('moveUp')} onClick={() => editor.move(b.id, container, i - 1)}>↑</button><button type="button" disabled={i === list.length - 1} aria-label={label('moveDown')} onClick={() => editor.move(b.id, container, i + 1)}>↓</button><button type="button" onClick={() => { setNotice(!editor.duplicate(b.id, container, i + 1)) }}>{label('duplicate')}</button><button type="button" onClick={() => editor.remove(b.id)}>{label('remove')}</button></div>
    {'body' in b && <div className="factory-nest"><button type="button" aria-pressed={targetKey(currentTarget) === targetKey({ kind: 'body', id: b.id })} onClick={() => setTarget({ kind: 'body', id: b.id })}>{label('body')}</button>{tree(b.body, { kind: 'body', id: b.id })}</div>}
    {b.type === 'if' && <div className="factory-nest"><button type="button" aria-pressed={targetKey(currentTarget) === targetKey({ kind: ('else' as const), id: b.id })} onClick={() => setTarget({ kind: ('else' as const), id: b.id })}>{label('else')}</button>{tree(b.else ?? [], { kind: ('else' as const), id: b.id })}</div>}
  </li>)}</ol>
  return <section aria-label={label('code')}>
    {!editor.units.includes(1) && <p>{label('locked')}</p>}
    <p>{t('factory.blocks', { count: editor.total })}</p>
    <fieldset disabled={locked}><legend>{label('workspace')}</legend>
      <Select title={label('target')} value={targetKey(currentTarget)} choices={targets.map(v => ({ value: targetKey(v.target), name: v.name }))} onChange={v => setTarget(JSON.parse(v) as FactoryTarget)} />
      <div className="factory-palette" aria-label={label('palette')}>{candidates.map((b, i) => <button type="button" key={i} aria-label={t('factory.addBlock', { block: `${label(b.type)}${b.type === 'on' ? ` ${b.signal}` : b.type === 'call' ? ` ${input.program.functions.find(f => f.id === b.fn)?.icon === 'star' ? '☆' : '☾'}` : ''}` })} onClick={() => { setNotice(!editor.add({ ...b, id: editor.nextBlockId() }, currentTarget)) }}>{label(b.type)} {b.type === 'on' && b.signal}{b.type === 'call' && (input.program.functions.find(f => f.id === b.fn)?.icon === 'star' ? '☆' : '☾')}</button>)}</div>
      {tree(input.program.main, { kind: 'main' })}
      {input.program.functions.map(f => <section key={f.id}><h3>{label('function')} {f.icon === 'star' ? '☆' : '☾'} {f.param && label('param')}</h3><button type="button" aria-label={t('factory.deleteFunction', { name: f.icon === 'star' ? '☆' : '☾' })} onClick={() => setNotice(!editor.removeFunction(f.id))}>{label('remove')}</button>{tree(f.body, { kind: ('function' as const), id: f.id })}</section>)}
      {editor.units.includes(1) && editor.units.includes(4) && <div className="factory-actions"><button type="button" disabled={input.program.functions.length >= 2} onClick={() => editor.createFunction()}>{label('createFunction')}</button>{editor.units.includes(7) && <button type="button" disabled={input.program.functions.length >= 2} onClick={() => editor.createFunction(true)}>{label('paramFunction')}</button>}</div>}
      <button type="button" disabled={!canUndo} onClick={() => editor.undo()}>{label('undo')}</button>
    </fieldset>
    {notice && <p role="status">{label('rejected')}</p>}
    {numbers(11, 1).filter(unit => !editor.units.includes(unit)).map(unit => <p key={unit}>{t('factory.unitLock', { unit })}</p>)}
    <FactoryInputs editor={editor} />
  </section>
}
function FactoryInputs({ editor }: { editor: FactoryEditorController }) {
  const { input, locked } = useController(editor)
  return <fieldset disabled={locked}><legend>{label('orders')} / {label('signals')}</legend>
    {editor.units.includes(10) && <><div className="factory-actions">{input.orders.map((v, i) => <Select key={i} title={t('factory.order', { index: i })} value={v} choices={numeric(10)} onChange={v => editor.setOrders(input.orders.map((old, at) => at === i ? Number(v) : old))} />)}</div><button type="button" disabled={input.orders.length >= 5} onClick={() => editor.setOrders([...input.orders, 0])}>{label('addOrder')}</button><button type="button" disabled={!input.orders.length} onClick={() => editor.setOrders(input.orders.slice(0, -1))}>{label('removeOrder')}</button></>}
    {editor.units.includes(11) && <Select title={label('targetNumber')} value={input.target} choices={numeric(10)} onChange={v => editor.setTarget(Number(v))} />}
    {editor.units.includes(9) && <><p>{input.signals.join(' → ') || label('empty')} ({input.signals.length}/20)</p><div className="factory-actions">{signals.map(signal => <button type="button" key={signal} disabled={input.signals.length >= 20} onClick={() => editor.setSignals([...input.signals, signal])}>{t('factory.addSignal', { signal })}</button>)}<button type="button" disabled={!input.signals.length} onClick={() => editor.setSignals(input.signals.slice(0, -1))}>{label('removeSignal')}</button></div></>}
  </fieldset>
}
function factoryObservation(frame: Frame | null, previous: Frame | null) {
  if (!frame) return label('ready')
  if (frame.error) return t(`factory.errors.${frame.error.code}`, { ...frame.error.params, pile: frame.error.params.pile ? label(frame.error.params.pile) : '' })
  if (frame.event === 'end') return label('ended')
  if (frame.event === 'unconnected') return label('unconnected')
  if (frame.event === 'signal') return t('factory.signalDelivered', { signal: frame.context.signal?.signal ?? '' })
  if (frame.event === 'check') return label('checked')
  if (previous && !previous.state.held && frame.state.held) {
    const place = previous.state.belt.some(b => b.id === frame.state.held!.id) ? 'belt' : piles.find(p => previous.state.piles[p].some(b => b.id === frame.state.held!.id)) ?? 'belt'
    return t('factory.took', { place: label(place), shape: frame.state.held.shape })
  }
  if (previous?.state.held && !frame.state.held) {
    const place = piles.find(p => frame.state.piles[p].some(b => b.id === previous.state.held!.id)) ?? 'leaf'
    return t('factory.put', { place: label(place), shape: previous.state.held.shape })
  }
  if (previous && frame.state.A !== previous.state.A) return t('factory.changed', { value: frame.state.A })
  if (typeof frame.value === 'number') return t('factory.read', { value: frame.value })
  return label('observing')
}
export function FactoryControls({ playback }: { playback: FactoryPlaybackController }) {
  const state = useController(playback)
  const editor = useController(playback.editor)
  const allowed = !editor.requiredUnits.length
  return <div className="factory-runbar"><button type="button" disabled={state.running || !allowed} onClick={playback.play}>{label('run')}</button><button type="button" disabled={state.running || !allowed} onClick={playback.step}>{label('step')}</button><button type="button" onClick={playback.reset}>{label('reset')}</button><button type="button" disabled={!editor.locked && !state.running} onClick={playback.stop}>{label('stop')}</button><Select title={label('speed')} value={state.speed} choices={options(['slow', 'normal', 'fast'])} onChange={v => playback.setSpeed(v as typeof state.speed)} /></div>
}
export function FactoryPage({ progress, onHome, supplied }: { progress: Progress; onHome: () => void; supplied?: FactoryPlaybackController }) {
  const [playback] = useState(() => supplied ?? new FactoryPlaybackController(new FactoryEditorController(undefined, progress)))
  const [tab, setTab] = useState('start')
  const [world, setWorld] = useState<typeof worlds[number]>('sketchbook')
  const editing = useController(playback.editor)
  const playing = useController(playback)
  useEffect(() => { playback.activate(); return playback.dispose }, [playback])
  const changed = playing.frame?.state.held?.id ?? playing.previous?.state.held?.id
  return <section className={`factory-page theme-${world} world-${world}`}><ConceptDefs /><header><h1 data-page-title tabIndex={-1}>{label('title')}</h1><button type="button" onClick={onHome}>{t('home')}</button></header>
    <p>{label('notice')}</p><Select title={label('theme')} value={world} choices={worlds.map(value => ({ value, name: t(`themes.${value}.name`) }))} onChange={v => setWorld(v as typeof world)} />
    <FactoryControls playback={playback} />
    <div role="status" className="factory-observation"><p>{!playing.started && playing.frame && !playing.finished ? label('stopped') : factoryObservation(playing.frame, playing.previous)}</p>{playing.finished && !playing.frame?.error && <p>{label('question')}</p>}</div>
    <div className="factory-columns"><div><FactoryPicture title={label('current')} state={playing.frame?.state ?? { ...editing.input.start, held: null }} changed={changed ? [changed] : []} /><p>{label('A')}: {playing.frame?.state.A ?? 0}</p><details><summary>{label('compare')}</summary><FactoryPicture title={label('start')} state={editing.input.start} /></details></div>
      <div><div className="factory-tabs" role="group" aria-label={label('title')}>{['start', 'code'].map(v => <button type="button" key={v} aria-pressed={tab === v} onClick={() => setTab(v)}>{label(v)}</button>)}</div>
      {tab === 'start' ? <FactorySetup editor={playback.editor} /> : <FactoryCode editor={playback.editor} activeId={playing.frame?.activeBlockId} />}</div>
    </div>
  </section>
}
