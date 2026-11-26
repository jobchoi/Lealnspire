import { TrainMap } from '../theme/TrainMap'
import { Robot, Symbol } from '../theme/Symbols'
import { defaultTheme, type Theme } from '../theme/defaultTheme'
import { t } from '../../i18n/I18n'
import { boardCells } from '../../controller/BoardPresenter'
import type { Frame, Dir, HintHighlight, Position, Stage } from '../../model/types'


type BoardProps = { events?: Frame['events']; check?: Frame['check']; theme?: Theme; stage: Stage; position?: Position; direction?: Dir; bump?: boolean; failurePosition?: Position; hintHighlight?: HintHighlight }

export function Board({ events, theme = defaultTheme, check, stage, position, direction = stage.startDir, bump = false, failurePosition, hintHighlight }: BoardProps) {
  const grid = boardCells(stage, position, hintHighlight)
  const robotIndex = grid.cells.findIndex(cell => cell.occupied)
  const goalIndex = grid.cells.findIndex(cell => cell.goal)
  const directions: Dir[] = ['N', 'E', 'S', 'W']
  const sensors = check ? (check.atoms ?? [{ atom: check.condition, value: check.condition === 'clearAhead' ? !check.result : check.result }]).map(item => {
    const relative = item.atom === 'blockedLeft' ? 3 : item.atom === 'blockedRight' ? 1 : 0
    const delta = { N: [0, -1], E: [1, 0], S: [0, 1], W: [-1, 0] }[directions[(directions.indexOf(direction) + relative) % 4]]
    return { x: robotIndex % grid.width + delta[0], y: Math.floor(robotIndex / grid.width) + delta[1] }
  }) : []
  const sensorLabel = check?.atoms ? check.atoms.map(item => `${t(`logic.${item.atom}`)}: ${t(item.value ? 'logic.true' : 'logic.false')}`).join(', ') : check ? t((check.condition === 'clearAhead' ? !check.result : check.result) ? 'sensorBlocked' : 'sensorClear') : ''
  const doorLabel = grid.cells.filter(cell => cell.door).map(cell => `${cell.door}: ${t(events?.doors[cell.door!] ? 'events.open' : 'events.closed')}`).join(', ')
  const label = (doorLabel ? doorLabel + ' ' : '') + sensorLabel + ' ' + t('board', { title: t(stage.title), row: Math.floor(robotIndex / grid.width) + 1, column: robotIndex % grid.width + 1, goalRow: Math.floor(goalIndex / grid.width) + 1, goalColumn: goalIndex % grid.width + 1, direction: t(`directions.${direction}`) })
  if (theme.world === 'train') return <TrainMap events={events} sensors={sensors} sensorLabel={sensorLabel} hintHighlight={hintHighlight} stage={stage} position={position} direction={direction} bump={bump} failurePosition={failurePosition} />
  if (theme.world) {
    const pixel = theme.world === 'handheld', size = pixel ? 16 : 80, width = grid.width * size, height = stage.grid.length * size
    return <svg className={`board art-board${bump ? ' board-bump' : ''}`} role="img" aria-label={label} viewBox={`-8 -8 ${width+16} ${height+16}`}>
      <defs><pattern id="lcd-scan" width="3" height="3" patternUnits="userSpaceOnUse"><path d="M0 2h3" stroke="#0f380f" strokeOpacity=".12" strokeWidth="1"/></pattern><pattern id="crayon-wall" width="80" height="80" patternUnits="userSpaceOnUse"><path d="M6 12l60 60M6 42l32 32M32 6l42 42" stroke="#8d7b68" strokeWidth="5" opacity=".7" filter="url(#sketchbook-rough)"/></pattern><pattern id="pixel-wall" width="16" height="16" patternUnits="userSpaceOnUse"><rect width="16" height="16" fill="#306230"/><path d="M0 7h16M0 15h16M7 0v7M12 8v7" stroke="#0f380f" strokeWidth="1"/></pattern></defs>
      <rect width={width} height={height} fill={pixel ? '#9bbc0f' : '#fffaf0'} stroke={pixel ? '#8bac0f' : '#3b3a36'} strokeWidth={pixel ? 1 : 3} filter={pixel ? undefined : 'url(#sketchbook-rough)'}/>
      {grid.cells.map(({key,wall,goal,occupied,hint,door},i)=><g key={key} transform={`translate(${i%grid.width*size} ${Math.floor(i/grid.width)*size})`}>
        <rect className={wall ? 'board-wall' : 'map-tile'} width={size} height={size} fill={wall ? `url(#${pixel ? 'pixel' : 'crayon'}-wall)` : 'none'} stroke={pixel ? 'none' : '#3b3a36'} strokeWidth="1.5" strokeDasharray="4 6" filter={pixel ? undefined : 'url(#sketchbook-rough)'}/>
        {!wall && !goal && !occupied && <path d={pixel ? 'M7 7h2v2H7z' : 'M34 40h12'} fill={pixel ? '#306230' : 'none'} stroke={pixel ? 'none' : '#2e86de'} strokeWidth="4" strokeDasharray="2 8" strokeLinecap="round"/>}
        {door && <g className="board-door" data-door={door} data-open={!!events?.doors[door]} role="img" aria-label={`${door}: ${t(events?.doors[door] ? 'events.open' : 'events.closed')}`}><rect x={size*.08} y={size*.08} width={size*.84} height={size*.84} fill="#fff8df" stroke="#49351a" strokeWidth={size*.04} strokeDasharray={events?.doors[door] ? `${size*.12}` : undefined}/><svg x={size*.2} y={size*.15} width={size*.6} height={size*.7} viewBox="0 0 32 32" fill="none" stroke="#49351a" strokeWidth="3"><path d={events?.doors[door] ? 'M8 14V9a8 8 0 0 1 16 0M5 14h22v16H5zM16 20v5' : 'M8 14V9a8 8 0 0 1 16 0v5M5 14h22v16H5zM16 20v5'} /></svg></g>}
        {goal && <g className="board-goal">{pixel ? <path d="M6 3h1v11H6zM7 3h6v1h-1v1h1v1H7z" fill="#0f380f"/> : <path d="M40 14l8 18 20 2-15 13 5 20-18-11-18 11 5-20-15-13 20-2z" fill="#f6c343" stroke="#3b3a36" strokeWidth="2.5" filter="url(#sketchbook-rough)"/>}</g>}
        {failurePosition?.x === i % grid.width && failurePosition?.y === Math.floor(i / grid.width) && <g className="board-failure" role="img" aria-label={t('failureCell')}><rect x={size * .08} y={size * .08} width={size * .84} height={size * .84} fill="none" stroke="currentColor" strokeWidth={size * .06} strokeDasharray={size * .12}/><text x={size * .78} y={size * .3} fontSize={size * .28} fill="currentColor">!</text></g>}
        {hint && <g className="board-hint" data-hint-cell={key}><rect x={size * .08} y={size * .08} width={size * .84} height={size * .84} rx={size * .05} fill="none" stroke="currentColor" strokeWidth={size * .06}/><path d={`M${size*.12} ${size*.3}L${size*.3} ${size*.12}M${size*.7} ${size*.88}L${size*.88} ${size*.7}`} stroke="currentColor" strokeWidth={size*.06}/></g>}
        {occupied && <g className="board-robot"><foreignObject width={size} height={size}><Robot world={theme.world} direction={direction}/></foreignObject></g>}
      </g>)}
      {sensors.map((sensor, index) => <g key={index} className="board-sensor" transform={`translate(${sensor.x * size} ${sensor.y * size})`}><rect x="1" y="1" width={size - 2} height={size - 2} fill="none" stroke="currentColor" strokeWidth={size * .06}/><path d={`M0 ${size*.3}L${size*.3} 0M0 ${size*.7}L${size*.7} 0M${size*.3} ${size}L${size} ${size*.3}M${size*.7} ${size}L${size} ${size*.7}`} stroke="currentColor" strokeWidth={size*.04}/></g>)}
      {pixel && <rect width={width} height={height} fill="url(#lcd-scan)" pointerEvents="none"/>}
    </svg>
  }
  return (
    <div className={`board${bump ? ' board-bump' : ''}`} role="img" aria-label={label} style={{ gridTemplateColumns: `repeat(${grid.width}, 1fr)` }}>
      {grid.cells.map(({ key, wall, goal, occupied, hint, door }) => {
        return <div data-hint-cell={hint ? key : undefined} className={`board-cell${sensors.some(sensor => sensor.x === Number(key.split(',')[0]) && sensor.y === Number(key.split(',')[1])) ? ' board-sensor' : ''}${hint ? ' board-hint' : ''}${wall ? ' board-wall' : ''}${goal ? ' board-goal' : ''}`} key={key}>
          {key === [failurePosition?.x, failurePosition?.y].join(',') && <span className="board-failure" role="img" aria-label={t('failureCell')}>!</span>}
          {door && <span className="board-door" role="img" aria-label={`${door}: ${t(events?.doors[door] ? 'events.open' : 'events.closed')}`}><Symbol name={events?.doors[door] ? 'lockOpen' : 'lockClosed'} /></span>}
          {goal && <span aria-hidden="true">{theme.world ? <Symbol name="goal" /> : '★'}</span>}
          {occupied && <span className="board-robot" aria-hidden="true">{theme.world ? <Robot world={theme.world} direction={direction} /> : theme.arrow(direction)}</span>}
        </div>
      })}
    </div>
  )
}
