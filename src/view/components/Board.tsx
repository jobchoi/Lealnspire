import { defaultTheme as theme } from '../theme/defaultTheme'
import { t } from '../../i18n/I18n'
import { boardCells } from '../../controller/BoardPresenter'
import type { Dir, Position, Stage } from '../../model/types'


type BoardProps = { stage: Stage; position?: Position; direction?: Dir; bump?: boolean }

export function Board({ stage, position, direction = stage.startDir, bump = false }: BoardProps) {
  const grid = boardCells(stage, position)
  return (
    <div className={`board${bump ? ' board-bump' : ''}`} role="img" aria-label={t('board', { title: t(stage.title), direction: t(`directions.${direction}`) })} style={{ gridTemplateColumns: `repeat(${grid.width}, 1fr)` }}>
      {grid.cells.map(({ key, wall, goal, occupied }) => {
        return <div className={`board-cell${wall ? ' board-wall' : ''}${goal ? ' board-goal' : ''}`} key={key}>
          {goal && <span aria-hidden="true">★</span>}
          {occupied && <span className="board-robot" aria-hidden="true">{theme.arrow(direction)}</span>}
        </div>
      })}
    </div>
  )
}
