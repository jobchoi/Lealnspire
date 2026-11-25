import { hasBody } from '../../model/editor'
import { Symbol } from '../theme/Symbols'
import type { CSSProperties } from 'react'
import { defaultTheme, type Theme } from '../theme/defaultTheme'
import type { Frame, Program } from '../../model/types'
import glossary from '../../i18n/glossary.json'
import { t } from '../../i18n/I18n'
import './BlockTiles.css'

type Props = { theme?: Theme; program: Program; selectedId: string | null; targetId: string | null; activeBlockId?: string | null; check?: Frame['check']; loops?: Frame['loops']; failedBlockId?: string | null; locked: boolean; onSelect: (id: string) => void; parent?: number[]; ribbons?: { ink: string; selected: boolean; conditional: boolean; skipped: boolean }[] }

export function BlockTiles({ theme = defaultTheme, program, selectedId, targetId, activeBlockId, check, loops, failedBlockId, locked, onSelect, parent = [], ribbons = [] }: Props) {
  return <ol className="tile-list">{program.map((block, index) => {
    const path = [...parent, index]
    const order = path.map(i => i + 1).join('.')
    const loop = loops?.find(loop => loop.blockId === block.id)
    const selected = selectedId === block.id
    const tone = path.reduce((sum, i) => sum + i, parent.length) % 3
    const lanes = hasBody(block) ? [...ribbons, { ink: block.type === 'if' ? '#69439b' : ['#c56030', '#7b529c', '#237e81'][tone], conditional: block.type === 'if', skipped: check?.blockId === block.id && !check.result, selected: selected || targetId === block.id }] : ribbons
    const tile = <button type="button" data-block-id={block.id} className={`block-tile ${theme.blockClass(block.type)}${activeBlockId === block.id ? ' block-active' : ''}${failedBlockId === block.id ? ' block-failed' : ''}${loop ? ' has-loop-progress' : ''}`} aria-label={block.type === 'repeat' ? t('repeatTile', { order, count: block.count }) : t('tile', { order, name: theme.blockName(block.type) })} aria-pressed={selected} aria-current={activeBlockId === block.id ? 'step' : undefined} aria-disabled={locked} disabled={locked} onClick={() => onSelect(block.id)}>
      {loop && <span className="loop-progress" role="img" aria-label={t('loopIteration', { iteration: loop.iteration, count: loop.count })}>{loop.iteration}/{loop.count}</span>}
      {failedBlockId === block.id && <span className="failure-badge" role="img" aria-label={t('failureBlock')}>!</span>}
      {lanes.map((lane, depth) => <span key={depth} className={`repeat-ribbon${lane.conditional ? ' if-ribbon' : ''}${lane.skipped ? ' ribbon-skipped' : ''}`} aria-hidden="true" data-ribbon-depth={depth + 1} style={{ '--ribbon-depth': depth, '--ribbon-ink': lane.selected ? '#2563eb' : lane.ink } as CSSProperties} />)}
      <small aria-hidden="true">{order}</small><span className="block-symbol" aria-hidden="true">{theme.blockSymbol(block.type)}</span>{block.type === 'if' && <><strong aria-hidden="true">{glossary.if.keyword}</strong><span className="sensor-icon" aria-hidden="true"><Symbol name="blockedAhead" /></span>{check?.blockId === block.id && !check.result && <span className="skip-label"><Symbol name="skip" />{t('skipped')}</span>}</>}{block.type === 'repeat' && <strong aria-hidden="true"><span className="concept-keyword">{glossary.repeat.keyword}</span><span className="repeat-count">{`×${block.count}`}</span></strong>}{hasBody(block) && !block.body.length && <span className="empty-repeat-label">{t('emptyRepeat')}</span>}
    </button>
    return <li key={block.id} data-repeat-tone={hasBody(block) ? path.reduce((sum, i) => sum + i, parent.length) % 3 : undefined} data-repeat-depth={hasBody(block) ? parent.length + 1 : undefined} className={hasBody(block) ? `repeat-frame${block.type === 'if' ? ' if-frame' : ''}${check?.blockId === block.id && !check.result ? ' if-skipped' : ''}${selected || targetId === block.id ? ' frame-selected' : ''}` : 'tile-item'}>
      {theme.world === 'sketchbook' && block.type === 'repeat' && <svg className="crayon-bracket" viewBox="0 0 100 40" preserveAspectRatio="none" aria-hidden="true"><path d="M6 4 C2 4 2 36 6 36 M94 4 C98 4 98 36 94 36" stroke="#e4572e" strokeWidth="2.4" fill="none" vectorEffect="non-scaling-stroke" filter="url(#sketchbook-rough)"/></svg>}
      {tile}
      {hasBody(block) && <>
        {targetId === block.id && <span className="insertion-marker" aria-label={t('selected')}>⤵</span>}
        {block.body.length ? <BlockTiles theme={theme} program={block.body} selectedId={selectedId} targetId={targetId} activeBlockId={activeBlockId} check={check} loops={loops} failedBlockId={failedBlockId} locked={locked} onSelect={onSelect} parent={path} ribbons={lanes} /> : <span className="empty-repeat">{t('emptyRepeat')}</span>}
      </>}
    </li>
  })}</ol>
}
