import { isometric } from './isometric'
import type { Frame, Dir, HintHighlight, Position, Stage } from '../../model/types'
import { boardCells } from '../../controller/BoardPresenter'
import { t } from '../../i18n/I18n'
const artwork = {"station": "<path d=\"M-16 8 L0 0 L16 8 L0 16Z\" fill=\"#fca5a5\"/><path d=\"M-16 8 L0 16 L0 30 L-16 22Z\" fill=\"#fef3c7\"/><path d=\"M16 8 L0 16 L0 30 L16 22Z\" fill=\"#fde68a\"/><path d=\"M-18 8 L0 -6 L18 8 L0 0Z\" fill=\"#dc2626\"/><rect x=\"-1\" y=\"-26\" width=\"2\" height=\"18\" fill=\"#1c1917\"/><path d=\"M1 -26h10l-3 4 3 4H1z\" fill=\"#dc2626\"/>", "robot": "<path d=\"M-12 0 L6 -9 L18 -3 L0 6Z\" fill=\"#2563eb\"/><path d=\"M-12 0 L0 6 L0 14 L-12 8Z\" fill=\"#1d4ed8\"/><path d=\"M18 -3 L0 6 L0 14 L18 5Z\" fill=\"#1e40af\"/><rect x=\"2\" y=\"-20\" width=\"6\" height=\"12\" fill=\"#1e293b\"/><circle cx=\"5\" cy=\"-24\" r=\"4\" fill=\"#fff\" opacity=\".8\"/>", "rock": "<path d=\"M0 0 L40 -20 L80 0 L40 20 Z\" fill=\"#a8a29e\"/><path d=\"M0 0 L40 20 L40 44 L0 24 Z\" fill=\"#78716c\"/><path d=\"M80 0 L40 20 L40 44 L80 24 Z\" fill=\"#57534e\"/>", "tree": "<rect x=\"-3\" y=\"0\" width=\"6\" height=\"14\" fill=\"#78350f\"/><circle cy=\"-6\" r=\"12\" fill=\"#15803d\"/>"}
export function TrainMap({ events, stage, position, direction, bump, failurePosition, hintHighlight, sensors = [], sensorLabel = '' }: { events?: Frame['events']; sensors?: Position[]; sensorLabel?: string; stage: Stage; position?: Position; direction: Dir; bump: boolean; failurePosition?: Position; hintHighlight?: HintHighlight }) {
 const grid = boardCells(stage, position, hintHighlight), h = stage.grid.length, w = grid.width
  const robotIndex = grid.cells.findIndex(cell => cell.occupied)
  const goalIndex = grid.cells.findIndex(cell => cell.goal)
  const doorLabel = grid.cells.filter(cell => cell.door).map(cell => `${cell.door}: ${t(events?.doors[cell.door!] ? 'events.open' : 'events.closed')}`).join(', ')
  const label = (doorLabel ? doorLabel + ' ' : '') + sensorLabel + ' ' + t('board', { title: t(stage.title), row: Math.floor(robotIndex / grid.width) + 1, column: robotIndex % grid.width + 1, goalRow: Math.floor(goalIndex / grid.width) + 1, goalColumn: goalIndex % grid.width + 1, direction: t(`directions.${direction}`) })
 const point = (x: number, y: number) => isometric(x, y, h)
 const a=point(0,0), b=point(w,0), c=point(w,h), d=point(0,h)
 return <svg className={`board train-island${bump ? ' board-bump' : ''}`} role="img" aria-label={label} viewBox={`0 0 ${(w+h)*40+48} ${(w+h)*20+120}`}>
 <path d={`M${a.x} ${a.y-20} ${b.x} ${b.y-20} ${c.x} ${c.y-20} ${d.x} ${d.y-20}Z`} fill="#a3e635"/>
 <path d={`M${d.x} ${d.y-20} ${c.x} ${c.y-20}v28L${d.x} ${d.y+8}Z`} fill="#92400e"/>
 <path d={`M${b.x} ${b.y-20} ${c.x} ${c.y-20}v28L${b.x} ${b.y+8}Z`} fill="#78350f"/>
 {grid.cells.map((cell,i)=>{const p=point(i%w,Math.floor(i/w));return <g key={cell.key} transform={`translate(${p.x} ${p.y})`}>
 <path d="M0-20 40 0 0 20-40 0Z" fill="none" stroke="#65a30d" strokeWidth=".8"/>
 {!cell.wall && <path d="M-18 9 18-9" stroke="#fde68a" strokeWidth="9" opacity=".8"/>}
 {cell.wall && <g className="board-wall" transform="translate(-32 -16) scale(.8)" dangerouslySetInnerHTML={{__html:artwork.rock}}/>}
 {cell.wall && i%3===0 && <g transform="translate(0 -30)" dangerouslySetInnerHTML={{__html:artwork.tree}}/>}
 {cell.hint && <g className="board-hint" data-hint-cell={cell.key}><path d="M0-20 40 0 0 20-40 0Z" fill="#fff7ed" stroke="#542078" strokeWidth="3" vectorEffect="non-scaling-stroke"/><path d="M-30-5-10 15 M-15-12 15 12 M0-20 30 5" fill="none" stroke="#542078" strokeWidth="2" vectorEffect="non-scaling-stroke"/></g>}
 {cell.door && <g className="board-door" data-door={cell.door} data-open={!!events?.doors[cell.door]} role="img" aria-label={`${cell.door}: ${t(events?.doors[cell.door] ? 'events.open' : 'events.closed')}`} transform="translate(-16 -24)"><rect width="32" height="36" rx="3" fill="#fff8df" stroke="#49351a" strokeWidth="2" strokeDasharray={events?.doors[cell.door] ? '4 3' : undefined}/><path d={events?.doors[cell.door] ? 'M8 14V9a8 8 0 0 1 16 0M5 14h22v16H5zM16 20v5' : 'M8 14V9a8 8 0 0 1 16 0v5M5 14h22v16H5zM16 20v5'} fill="none" stroke="#49351a" strokeWidth="3"/></g>}
 {cell.goal && <g className="board-goal" transform="translate(0 -12)" dangerouslySetInnerHTML={{__html:artwork.station}}/>}
 {failurePosition?.x === i % w && failurePosition?.y === Math.floor(i / w) && <g className="board-failure" role="img" aria-label={t('failureCell')}><path d="M0-20 40 0 0 20-40 0Z" fill="#fff7ed" stroke="#9f1239" strokeWidth="3" vectorEffect="non-scaling-stroke"/><circle cx="24" cy="-14" r="12" fill="#fff7ed" stroke="#9f1239" strokeWidth="2" vectorEffect="non-scaling-stroke"/><text x="24" y="-5" textAnchor="middle" fontSize="26" fontWeight="bold" fill="#9f1239">!</text></g>}
 {cell.occupied && <g className="board-robot" transform={`rotate(${{E:0,S:90,W:180,N:270}[direction]})`}><g dangerouslySetInnerHTML={{__html:artwork.robot}}/></g>}
 </g>})}{sensors.map((sensor, index) => <g key={index} className="board-sensor" transform={`translate(${point(sensor.x, sensor.y).x} ${point(sensor.x, sensor.y).y})`}><path d="M0-20 40 0 0 20-40 0Z" fill="#fff7ed" stroke="#542078" strokeWidth="3" vectorEffect="non-scaling-stroke"/><path d="M-30-5-10 15 M-15-12 15 12 M0-20 30 5" fill="none" stroke="#542078" strokeWidth="2" vectorEffect="non-scaling-stroke"/></g>)}</svg>
}
