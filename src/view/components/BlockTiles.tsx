import { hasBody } from '../../model/editor'
import { Symbol } from '../theme/Symbols'
import type { CSSProperties } from 'react'
import { defaultTheme, type Theme } from '../theme/defaultTheme'
import type { Frame, Program, FunctionDef, Condition } from '../../model/types'
import glossary from '../../i18n/glossary.json'
import { t } from '../../i18n/I18n'
import './BlockTiles.css'

type Props = { activeHandlerId?: string; returned?: Frame['returned']; functions?: FunctionDef[]; call?: Frame['call']; theme?: Theme; program: Program; selectedId: string | null; targetId: string | null; targetElse?: boolean; activeBlockId?: string | null; check?: Frame['check']; checks?: NonNullable<Frame['check']>[]; loops?: Frame['loops']; failedBlockId?: string | null; locked: boolean; onSelect: (id: string) => void; parent?: number[]; offset?: number; branch?: string; ribbons?: { ink: string; selected: boolean; conditional: boolean; skipped: boolean }[] }

function conditionText(condition: Condition): string {
  if (condition.kind === 'atom') return t(`logic.${condition.atom}`)
  if (condition.kind === 'not') return `${glossary.not.keyword} ${conditionText(condition.operand)}`
  return `${conditionText(condition.left)} ${condition.kind === 'and' ? glossary.and.keyword : glossary.or.keyword} ${conditionText(condition.right)}`
}

function compactCondition(condition: Condition): string {
  if (condition.kind === 'atom') return condition.atom === 'blockedLeft' ? '←▥' : condition.atom === 'blockedRight' ? '→▥' : condition.atom === 'clearAhead' ? '↑' : '↑▥'
  if (condition.kind === 'not') return `${glossary.not.keyword} ${compactCondition(condition.operand)}`
  return `${compactCondition(condition.left)} ${condition.kind === 'and' ? glossary.and.keyword : glossary.or.keyword} ${compactCondition(condition.right)}`
}

export function BlockTiles({ activeHandlerId, returned, functions, call, theme = defaultTheme, program, selectedId, targetId, targetElse = false, activeBlockId, check, checks, loops, failedBlockId, locked, onSelect, parent = [], offset = 0, branch, ribbons = [] }: Props) {
  return <ol className="tile-list">{program.map((block, index) => {
    const branchCheck = checks?.find(item => item.blockId === block.id) ?? check
    const path = [...parent, index + offset]
    const order = path.map(i => i + 1).join('.')
    const loop = loops?.find(loop => loop.blockId === block.id)
    const fn = block.type === 'call' ? functions?.find(fn => fn.id === block.fn) : undefined
    const skippedReturn = returned?.skippedIds.includes(block.id)
    const returnValue = block.type === 'return' ? block.value.kind === 'number' ? block.value.value : block.value.kind === 'A' ? 'A' : block.value.kind === 'param' ? '◆' : t('returns.ahead') : ''
    const countCall = block.type === 'repeat' ? block.countCall : undefined
    const valueFn = functions?.find(fn => fn.id === countCall?.fn)
    const valueLabel = block.type === 'repeat' && block.countSource ? ({ current: '▣', listAtA: 'L[A]', listLength: t('lists.length', { length: 'L' }) }[block.countSource]) : countCall ? `${valueFn?.icon === 'moon' ? '☾' : '★'}(${countCall.arg?.kind === 'A' ? 'A' : countCall.arg?.value ?? ''})` : undefined
    const active = activeHandlerId === block.id || activeBlockId === block.id || call?.callId === block.id
    const selected = selectedId === block.id
    const tone = path.reduce((sum, i) => sum + i, parent.length) % 3
    const lanes = hasBody(block) ? [...ribbons, { ink: block.type === 'while' ? '#15665b' : block.type === 'if' ? '#69439b' : ['#c56030', '#7b529c', '#237e81'][tone], conditional: block.type === 'if', skipped: branchCheck?.blockId === block.id && !branchCheck.result, selected: selected || targetId === block.id }] : ribbons
    const branchSuffix = branch ? ` (${branch})` : ''
    const tile = <button type="button" data-block-id={block.id} className={`block-tile ${theme.blockClass(block.type)}${active ? ' block-active' : ''}${skippedReturn ? ' return-skipped' : ''}${failedBlockId === block.id ? ' block-failed' : ''}${loop ? ' has-loop-progress' : ''}`} aria-label={(block.type === 'forEach' ? t('lists.tile', { order }) : block.type === 'on' ? t('events.tile', { order, signal: t(`events.${({ '◇': 'diamond', '○': 'circle', '△': 'triangle' } as const)[block.signal]}`) }) : block.type === 'return' ? t('returns.tile', { order, value: returnValue }) : block.type === 'call' && block.arg && fn ? t(`parameters.call.${fn.icon}`, { order, value: block.arg.kind === 'A' ? 'A' : block.arg.value }) : block.type === 'set' ? t('variables.setTile', { order, value: block.value }) : block.type === 'change' ? t(block.by === 1 ? 'variables.changeAddTile' : 'variables.changeSubtractTile', { order }) : block.type === 'repeat' && countCall ? t(`returns.repeat.${valueFn?.icon ?? functions?.[0]?.icon}`, { order }) : block.type === 'repeat' && block.countSource ? t(`lists.repeat.${block.countSource}`, { order }) : block.type === 'repeat' ? t('repeatTile', { order, count: (block.countSource === 'current' ? t('lists.current') : valueLabel) ?? (block.countParam ? t('parameters.value') : block.countVariable ?? block.count ?? 3) }) : t('tile', { order, name: fn ? t(`functions.call.${fn.icon}`) : theme.blockName(block.type) })) + ((block.type === 'if' || block.type === 'while') && typeof block.condition !== 'string' ? `: ${conditionText(block.condition)}` : '') + branchSuffix} aria-pressed={selected} aria-current={active ? 'step' : undefined} aria-disabled={locked} disabled={locked} onClick={() => onSelect(block.id)}>
      {skippedReturn && <span className="return-skip-label">⊘<span className="sr-only">{t('returns.skipped')}</span></span>}
      {(block.type === 'if' || block.type === 'while') && typeof block.condition !== 'string' && <span className="logic-condition" aria-hidden="true">{compactCondition(block.condition)}</span>}
      {loop && <span className="loop-progress" role="img" aria-label={loop.count === undefined ? t('whileIteration', { iteration: loop.iteration }) : t('loopIteration', { iteration: loop.iteration, count: loop.count })}>{loop.count === undefined ? loop.iteration : `${loop.iteration}/${block.type === 'repeat' && (block.countVariable || block.countParam) ? `${block.countParam ? '◆' : 'A'}(=${loop.count})` : loop.count}`}</span>}
      {failedBlockId === block.id && <span className="failure-badge" role="img" aria-label={t('failureBlock')}>!</span>}
      {lanes.map((lane, depth) => <span key={depth} className={`repeat-ribbon${lane.conditional ? ' if-ribbon' : ''}${lane.skipped ? ' ribbon-skipped' : ''}`} aria-hidden="true" data-ribbon-depth={depth + 1} style={{ '--ribbon-depth': depth, '--ribbon-ink': lane.selected ? '#2563eb' : lane.ink } as CSSProperties} />)}
      <small aria-hidden="true">{order}</small><span className="block-symbol" aria-hidden="true">{block.type === 'on' ? <Symbol name={({ '◇': 'diamond', '○': 'circle', '△': 'triangle' } as const)[block.signal]} /> : fn ?  <><Symbol name={fn.icon} /><span>({block.type === 'call' && block.arg ? block.arg.kind === 'A' ? 'A' : block.arg.value : ''})</span></> : theme.blockSymbol(block.type)}</span>{call?.callId === block.id && <span className="call-running">{call.arg !== undefined && block.type === 'call' && block.arg ? `${block.arg.kind === 'A' ? 'A' : block.arg.value} → ${call.arg}` : t('functions.running')}</span>}{block.type === 'forEach' && <strong className="concept-keyword">{glossary.list.keyword}</strong>}{block.type === 'on' && <strong className="concept-keyword">{glossary.on.keyword}</strong>}{block.type === 'while' && <><strong aria-hidden="true">{glossary.while.keyword}</strong><span className="sensor-icon" aria-hidden="true"><Symbol name="clearAhead" /></span><span className="recheck-label">{t('recheck')}</span></>}{block.type === 'if' && <><strong aria-hidden="true">{glossary.if.keyword}</strong><span className="sensor-icon" aria-hidden="true"><Symbol name="blockedAhead" /></span>{branchCheck?.blockId === block.id && !branchCheck.result && <span className="skip-label"><Symbol name="skip" />{t('skipped')}</span>}</>}{block.type === 'return' && <strong className="return-value">↩ {returnValue}</strong>}{block.type === 'set' && <strong aria-hidden="true"><span className="concept-keyword">{glossary.variable.keyword}</span> A ← {block.value}</strong>}{block.type === 'change' && <strong aria-hidden="true">A {block.by === 1 ? '+' : '−'} 1</strong>}{block.type === 'repeat' && <strong aria-hidden="true"><span className="concept-keyword">{glossary.repeat.keyword}</span><span className="repeat-count">{`×${valueLabel ?? (block.countParam ? '◆' : block.countVariable ?? block.count)}`}</span></strong>}{returned?.repeatId === block.id && <span className="return-count">↩{returned.value}</span>}{hasBody(block) && !block.body.length && <span className="empty-repeat-label">{t('emptyRepeat')}</span>}
    </button>
    const body = hasBody(block) ? <>
        {targetId === block.id && !targetElse && <span className="insertion-marker" aria-label={t('selected')}>⤵</span>}
        {block.type === 'if' && block.else && <span className="branch-label">{glossary.if.keyword}</span>}
        {block.body.length ? <BlockTiles activeHandlerId={activeHandlerId} returned={returned} functions={functions} call={call} theme={theme} program={block.body} selectedId={selectedId} targetId={targetId} targetElse={targetElse} activeBlockId={activeBlockId} check={check} checks={checks} loops={loops} failedBlockId={failedBlockId} locked={locked} onSelect={onSelect} parent={path} branch={block.type === 'if' && block.else ? glossary.if.keyword : branch} ribbons={lanes} /> : <span className="empty-repeat">{t('emptyRepeat')}</span>}
    </> : null
    return <li key={block.id} data-repeat-tone={hasBody(block) ? path.reduce((sum, i) => sum + i, parent.length) % 3 : undefined} data-repeat-depth={hasBody(block) ? parent.length + 1 : undefined} className={hasBody(block) ? `repeat-frame${block.type === 'on' ? ' on-frame' : ''}${block.type === 'while' ? ' while-frame' : ''}${block.type === 'if' ? ` if-frame${block.else ? ' has-else' : ''}` : ''}${branchCheck?.blockId === block.id && !branchCheck.result ? ' if-skipped' : ''}${selected || targetId === block.id ? ' frame-selected' : ''}` : 'tile-item'}>
      {theme.world === 'sketchbook' && block.type === 'repeat' && <svg className="crayon-bracket" viewBox="0 0 100 40" preserveAspectRatio="none" aria-hidden="true"><path d="M6 4 C2 4 2 36 6 36 M94 4 C98 4 98 36 94 36" stroke="#e4572e" strokeWidth="2.4" fill="none" vectorEffect="non-scaling-stroke" filter="url(#sketchbook-rough)"/></svg>}
      {tile}
      {hasBody(block) && (block.type === 'if' && block.else ? <div className="if-branch">{body}</div> : body)}
      {block.type === 'if' && block.else && <div className="else-branches">
        {targetId === block.id && targetElse && <span className="insertion-marker" aria-label={t('selectElse')}>⤵</span>}
        <span className={branchCheck?.blockId === block.id && branchCheck.result ? 'branch-skipped' : 'branch-label'}>{glossary.else.keyword}{branchCheck?.blockId === block.id && branchCheck.result && <span>{t('skipped')}</span>}</span>
        <div className={branchCheck?.blockId === block.id && branchCheck.result ? 'branch-skipped' : 'branch-content'}>
          {block.else.length ? <BlockTiles activeHandlerId={activeHandlerId} returned={returned} functions={functions} call={call} theme={theme} program={block.else} selectedId={selectedId} targetId={targetId} targetElse={targetElse} activeBlockId={activeBlockId} check={check} checks={checks} loops={loops} failedBlockId={failedBlockId} locked={locked} onSelect={onSelect} parent={path} offset={block.body.length} branch={glossary.else.keyword} ribbons={ribbons} /> : <span className="empty-repeat">{t('emptyRepeat')}</span>}
        </div>
      </div>}
    </li>
  })}</ol>
}
