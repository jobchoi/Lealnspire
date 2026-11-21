import { useController } from '../hooks/useController'
import { PredictionController } from '../../controller/PredictionController'
import { Board } from '../components/Board'
import { BlockTiles } from '../components/BlockTiles'
import { themes } from '../theme/themes'
import { ConceptDefs } from '../theme/Symbols'
import { isometric } from '../theme/isometric'
import { t } from '../../i18n/I18n'
import './PredictionPage.css'
export function PredictionPage({ controller, onBack }: { controller: PredictionController; onBack: () => void }) {
  const { selected } = useController(controller)
  const playback = useController(controller.game)
  const { game, challenge } = controller
  const stage = game.stage, theme = themes[stage.world]
  const train = stage.world === 'train', size = stage.world === 'handheld' ? 16 : 80
  const w = stage.grid[0].length, h = stage.grid.length
  const label = (index: number) => t('prediction.candidate', { letter: 'ABC'[index], row: challenge.choices[index].pos.y + 1, column: challenge.choices[index].pos.x + 1, direction: t(`directions.${challenge.choices[index].dir}`) })
  return <section className={`prediction-page theme-${stage.world}`}>
    <ConceptDefs /><h1 tabIndex={-1} data-page-title>{t('prediction.title')}</h1>
    <button type="button" onClick={onBack}>{t('prediction.back')}</button>
    <p className="prediction-prompt">{t('prediction.prompt')}</p>
    <div className="prediction-map">
      <Board theme={theme} stage={stage} position={game.frame?.pos} direction={game.frame?.dir} bump={game.frame?.event === 'bump'} />
      <svg className="prediction-markers" viewBox={train ? `0 0 ${(w+h)*40+48} ${(w+h)*20+120}` : `-8 -8 ${w*size+16} ${h*size+16}`} aria-hidden="true">
        {challenge.choices.map((choice, index) => {
          const point = train ? isometric(choice.pos.x, choice.pos.y, h) : { x: (choice.pos.x + .5)*size, y: (choice.pos.y + .5)*size }
          const scale = train ? 1 : size/80
          return <g key={index} transform={`translate(${point.x} ${point.y}) scale(${scale})`}><g transform={`translate(0 ${-27 + index*23})`}><rect x="-29" y="-13" width="58" height="23" rx="6" fill={selected === index ? '#fde68a' : '#ffffff'} stroke="#111827" strokeWidth="2"/><text textAnchor="middle" y="4" fontSize="18" fontFamily="sans-serif" fontWeight="bold" fill="#111827">{'ABC'[index]} {theme.arrow(choice.dir)}</text></g></g>
        })}
      </svg>
    </div>
    <div className="prediction-code" aria-label={t('prediction.code')}><BlockTiles theme={theme} program={challenge.program} locked selectedId={null} targetId={null} activeBlockId={game.frame?.activeBlockId} loops={game.frame?.loops} onSelect={() => {}} /></div>
    <div className="prediction-choices">{challenge.choices.map((choice, index) => <button key={index} type="button" aria-label={label(index)} aria-pressed={selected === index} disabled={selected !== null} onClick={() => controller.choose(index)}>{'ABC'[index]} {theme.arrow(choice.dir)}</button>)}</div>
    <div className="prediction-feedback" role="status">{game.finished ? <><p>{t(controller.correct ? 'prediction.correct' : 'prediction.incorrect')}</p><p>{t('prediction.actual', { row: game.frame!.pos.y + 1, column: game.frame!.pos.x + 1, direction: t(`directions.${game.frame!.dir}`) })}</p><button type="button" onClick={controller.retry}>{t('prediction.retry')}</button></> : <p>{selected !== null && playback.playing ? t('prediction.running') : '\u00a0'}</p>}</div>
  </section>
}
