import { TrainMap } from '../theme/TrainMap'
import { Robot, Symbol } from '../theme/Symbols'
import { defaultTheme, type Theme } from '../theme/defaultTheme'
import { t } from '../../i18n/I18n'
import { boardCells } from '../../controller/BoardPresenter'
import type { Frame, Dir, HintHighlight, Position, Stage } from '../../model/types'


type BoardProps = { check?: Frame['check']; theme?: Theme; stage: Stage; position?: Position; direction?: Dir; bump?: boolean; failurePosition?: Position; hintHighlight?: HintHighlight }

export function Board({ theme = defaultTheme, check, stage, position, direction = stage.startDir, bump = false, failurePosition, hintHighlight }: BoardProps) {
  const grid = boardCells(stage, position, hintHighlight)
  const robotIndex = grid.cells.findIndex(cell => cell.occupied)
  const goalIndex = grid.cells.findIndex(cell => cell.goal)
  const delta = { N: [0, -1], E: [1, 0], S: [0, 1], W: [-1, 0] }[direction]
  const sensor = check ? { x: robotIndex % grid.width + delta[0], y: Math.floor(robotIndex / grid.width) + delta[1] } : undefined
  const sensorLabel = check ? t((check.condition === 'clearAhead' ? !check.result : check.result) ? 'sensorBlocked' : 'sensorClear') : ''
  const label = sensorLabel + ' ' + t('board', { title: t(stage.title), row: Math.floor(robotIndex / grid.width) + 1, column: robotIndex % grid.width + 1, goalRow: Math.floor(goalIndex / grid.width) + 1, goalColumn: goalIndex % grid.width + 1, direction: t(`directions.${direction}`) })
  if (theme.world === 'train') return <TrainMap sensor={sensor} sensorLabel={sensorLabel} hintHighlight={hintHighlight} stage={stage} position={position} direction={direction} bump={bump} failurePosition={failurePosition} />
  if (theme.world) {
    const pixel = theme.world === 'handheld', size = pixel ? 16 : 80, width = grid.width * size, height = stage.grid.length * size
    return <svg className={`board art-board${bump ? ' board-bump' : ''}`} role="img" aria-label={label} viewBox={`-8 -8 ${width+16} ${height+16}`}>
      <defs><pattern id="lcd-scan" width="3" height="3" patternUnits="userSpaceOnUse"><path d="M0 2h3" stroke="#0f380f" strokeOpacity=".12" strokeWidth="1"/></pattern><pattern id="crayon-wall" width="80" height="80" patternUnits="userSpaceOnUse"><path d="M6 12l60 60M6 42l32 32M32 6l42 42" stroke="#8d7b68" strokeWidth="5" opacity=".7" filter="url(#sketchbook-rough)"/></pattern><pattern id="pixel-wall" width="16" height="16" patternUnits="userSpaceOnUse"><rect width="16" height="16" fill="#306230"/><path d="M0 7h16M0 15h16M7 0v7M12 8v7" stroke="#0f380f" strokeWidth="1"/></pattern></defs>
      <rect width={width} height={height} fill={pixel ? '#9bbc0f' : '#fffaf0'} stroke={pixel ? '#8bac0f' : '#3b3a36'} strokeWidth={pixel ? 1 : 3} filter={pixel ? undefined : 'url(#sketchbook-rough)'}/>
      {grid.cells.map(({key,wall,goal,occupied,hint},i)=><g key={key} transform={`translate(${i%grid.width*size} ${Math.floor(i/grid.width)*size})`}>
        <rect className={wall ? 'board-wall' : 'map-tile'} width={size} height={size} fill={wall ? `url(#${pixel ? 'pixel' : 'crayon'}-wall)` : 'none'} stroke={pixel ? 'none' : '#3b3a36'} strokeWidth="1.5" strokeDasharray="4 6" filter={pixel ? undefined : 'url(#sketchbook-rough)'}/>
        {!wall && !goal && !occupied && <path d={pixel ? 'M7 7h2v2H7z' : 'M34 40h12'} fill={pixel ? '#306230' : 'none'} stroke={pixel ? 'none' : '#2e86de'} strokeWidth="4" strokeDasharray="2 8" strokeLinecap="round"/>}
        {goal && <g className="board-goal">{pixel ? <path d="M6 3h1v11H6zM7 3h6v1h-1v1h1v1H7z" fill="#0f380f"/> : <path d="M40 14l8 18 20 2-15 13 5 20-18-11-18 11 5-20-15-13 20-2z" fill="#f6c343" stroke="#3b3a36" strokeWidth="2.5" filter="url(#sketchbook-rough)"/>}</g>}
        {failurePosition?.x === i % grid.width && failurePosition?.y === Math.floor(i / grid.width) && <g className="board-failure" role="img" aria-label={t('failureCell')}><rect x={size * .08} y={size * .08} width={size * .84} height={size * .84} fill="none" stroke="currentColor" strokeWidth={size * .06} strokeDasharray={size * .12}/><text x={size * .78} y={size * .3} fontSize={size * .28} fill="currentColor">!</text></g>}
        {hint && <g className="board-hint" data-hint-cell={key}><rect x={size * .08} y={size * .08} width={size * .84} height={size * .84} rx={size * .05} fill="none" stroke="currentColor" strokeWidth={size * .06}/><path d={`M${size*.12} ${size*.3}L${size*.3} ${size*.12}M${size*.7} ${size*.88}L${size*.88} ${size*.7}`} stroke="currentColor" strokeWidth={size*.06}/></g>}
        {occupied && <g className="board-robot"><foreignObject width={size} height={size}><Robot world={theme.world} direction={direction}/></foreignObject></g>}
      </g>)}
      {sensor && <g className="board-sensor" transform={`translate(${sensor.x * size} ${sensor.y * size})`}><rect x="1" y="1" width={size - 2} height={size - 2} fill="none" stroke="currentColor" strokeWidth={size * .06}/><path d={`M0 ${size*.3}L${size*.3} 0M0 ${size*.7}L${size*.7} 0M${size*.3} ${size}L${size} ${size*.3}M${size*.7} ${size}L${size} ${size*.7}`} stroke="currentColor" strokeWidth={size*.04}/></g>}
      {pixel && <rect width={width} height={height} fill="url(#lcd-scan)" pointerEvents="none"/>}
    </svg>
  }
  return (
    <div className={`board${bump ? ' board-bump' : ''}`} role="img" aria-label={label} style={{ gridTemplateColumns: `repeat(${grid.width}, 1fr)` }}>
      {grid.cells.map(({ key, wall, goal, occupied, hint }) => {
        return <div data-hint-cell={hint ? key : undefined} className={`board-cell${sensor?.x === Number(key.split(',')[0]) && sensor?.y === Number(key.split(',')[1]) ? ' board-sensor' : ''}${hint ? ' board-hint' : ''}${wall ? ' board-wall' : ''}${goal ? ' board-goal' : ''}`} key={key}>
          {key === [failurePosition?.x, failurePosition?.y].join(',') && <span className="board-failure" role="img" aria-label={t('failureCell')}>!</span>}
          {goal && <span aria-hidden="true">{theme.world ? <Symbol name="goal" /> : '★'}</span>}
          {occupied && <span className="board-robot" aria-hidden="true">{theme.world ? <Robot world={theme.world} direction={direction} /> : theme.arrow(direction)}</span>}
        </div>
      })}
    </div>
  )
}
