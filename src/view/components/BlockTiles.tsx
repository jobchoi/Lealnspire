import { defaultTheme as theme } from '../theme/defaultTheme'
import type { Program } from '../../model/types'
import { t } from '../../i18n/I18n'
import './BlockTiles.css'

type Props = { program: Program; selectedId: string | null; targetId: string | null; activeBlockId?: string | null; locked: boolean; onSelect: (id: string) => void; parent?: number[] }

export function BlockTiles({ program, selectedId, targetId, activeBlockId, locked, onSelect, parent = [] }: Props) {
  return <ol className="tile-list">{program.map((block, index) => {
    const path = [...parent, index]
    const order = path.map(i => i + 1).join('.')
    const selected = selectedId === block.id
    const tile = <button type="button" data-block-id={block.id} className={`block-tile ${theme.blockClass(block.type)}${activeBlockId === block.id ? ' block-active' : ''}`} aria-label={block.type === 'repeat' ? t('repeatTile', { order, count: block.count }) : t('tile', { order, name: theme.blockName(block.type) })} aria-pressed={selected} aria-current={activeBlockId === block.id ? 'step' : undefined} disabled={locked} onClick={() => onSelect(block.id)}>
      <small aria-hidden="true">{order}</small><span className="block-symbol" aria-hidden="true">{theme.blockSymbol(block.type)}</span>{block.type === 'repeat' && <strong aria-hidden="true">{theme.repeat(block.count)}</strong>}
    </button>
    return <li key={block.id} className={block.type === 'repeat' ? `repeat-frame${selected || targetId === block.id ? ' frame-selected' : ''}` : 'tile-item'}>
      {tile}
      {block.type === 'repeat' && <>
        {targetId === block.id && <span className="insertion-marker" aria-label={t('selected')}>⤵</span>}
        {block.body.length ? <BlockTiles program={block.body} selectedId={selectedId} targetId={targetId} activeBlockId={activeBlockId} locked={locked} onSelect={onSelect} parent={path} /> : <span className="empty-repeat">{t('emptyRepeat')}</span>}
      </>}
    </li>
  })}</ol>
}
