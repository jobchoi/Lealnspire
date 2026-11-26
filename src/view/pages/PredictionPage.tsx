import glossary from '../../i18n/glossary.json'
import { useState } from 'react'
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
  const [answers, setAnswers] = useState<(boolean | null)[]>(Array(8).fill(null))
  const [checked, setChecked] = useState(false)
  const { selected } = useController(controller)
  const playback = useController(controller.game)
  const { game, challenge } = controller
  const stage = game.stage, theme = themes[stage.world]
  const train = stage.world === 'train', size = stage.world === 'handheld' ? 16 : 80
  const w = stage.grid[0].length, h = stage.grid.length
  const label = (index: number) => t('prediction.candidate', { letter: 'ABC'[index], row: challenge.choices[index].pos.y + 1, column: challenge.choices[index].pos.x + 1, direction: t(`directions.${challenge.choices[index].dir}`) })
  if (challenge.id === 'p-u6-1') return <section className="prediction-page">
    <h1 tabIndex={-1} data-page-title>{t('prediction.title')}</h1><button type="button" onClick={onBack}>{t('prediction.back')}</button><p>{t('logic.predict')}</p><p>P: {t('logic.blockedLeft')} · Q: {t('logic.blockedRight')}</p>
    <div className="logic-prediction">{[[true, true], [true, false], [false, true], [false, false]].map(([p, q], row) => <div key={row}><span>{t('logic.blockedLeft')}: {t(p ? 'logic.true' : 'logic.false')} · {t('logic.blockedRight')}: {t(q ? 'logic.true' : 'logic.false')}</span>{(['and', 'or'] as const).map((op, col) => { const index = row * 2 + col, actual = col === 0 ? p && q : p || q; return <label key={op}>{op === glossary.and.keyword ? glossary.and.keyword : glossary.or.keyword} <select aria-label={t('logic.predictionRow', { row: row + 1, p: t(p ? 'logic.true' : 'logic.false'), q: t(q ? 'logic.true' : 'logic.false'), operator: op })} disabled={checked} value={answers[index] === null ? '' : String(answers[index])} onChange={event => setAnswers(old => old.map((value, i) => i === index ? event.target.value === '' ? null : event.target.value === 'true' : value))}><option value="">—</option><option value="true">{t('logic.true')}</option><option value="false">{t('logic.false')}</option></select>{checked && <span>{answers[index] === actual ? '✓' : '✕'} {t(actual ? 'logic.true' : 'logic.false')}</span>}</label> })}</div>)}</div>
    <div role="status">{checked && t(answers.every((answer, index) => answer === [true, true, false, true, false, true, false, false][index]) ? 'prediction.correct' : 'prediction.incorrect')}</div>
    {checked ? <button type="button" onClick={() => { setChecked(false); setAnswers(Array(8).fill(null)) }}>{t('prediction.retry')}</button> : <button type="button" disabled={answers.some(value => value === null)} onClick={() => setChecked(true)}>{t('logic.check')}</button>}
  </section>
  return <section className={`prediction-page theme-${stage.world}`}>
    <ConceptDefs /><h1 tabIndex={-1} data-page-title>{t('prediction.title')}</h1>
    <button type="button" onClick={onBack}>{t('prediction.back')}</button>
    <p className="prediction-prompt">{t('prediction.prompt')}</p>
    <div className="prediction-map">
      <Board check={game.frame?.check} theme={theme} stage={stage} position={game.frame?.pos} direction={game.frame?.dir} bump={game.frame?.event === 'bump'} />
      <svg className="prediction-markers" viewBox={train ? `0 0 ${(w+h)*40+48} ${(w+h)*20+120}` : `-8 -8 ${w*size+16} ${h*size+16}`} aria-hidden="true">
        {challenge.choices.map((choice, index) => {
          const point = train ? isometric(choice.pos.x, choice.pos.y, h) : { x: (choice.pos.x + .5)*size, y: (choice.pos.y + .5)*size }
          const scale = train ? 1 : size/80
          const peers = challenge.choices.filter(other => other.pos.x === choice.pos.x && other.pos.y === choice.pos.y)
          const slot = peers.indexOf(choice)
          const offset = (slot - (peers.length - 1) / 2) * 25
          return <g key={index} transform={`translate(${point.x} ${point.y}) scale(${scale})`}><g transform={`translate(${offset} -28)`}><rect x="-12" y="-9" width="24" height="17" rx="3" fill={selected === index ? '#fde68a' : '#ffffff'} stroke="#111827" strokeWidth="2"/><text textAnchor="middle" y="4" fontSize="12" fontFamily="sans-serif" fontWeight="bold" fill="#111827">{'ABC'[index]}{theme.arrow(choice.dir)}</text></g></g>
        })}
      </svg>
    </div>
    <div className="prediction-code" aria-label={t('prediction.code')}><BlockTiles theme={theme} program={challenge.program} locked selectedId={null} targetId={null} activeBlockId={game.frame?.activeBlockId} loops={game.frame?.loops} onSelect={() => {}} /></div>
    <div className="prediction-choices">{challenge.choices.map((choice, index) => <button key={index} type="button" aria-label={label(index)} aria-pressed={selected === index} disabled={selected !== null} onClick={() => controller.choose(index)}>{'ABC'[index]} {theme.arrow(choice.dir)}</button>)}</div>
    <div className="prediction-feedback" role="status">{game.finished ? <><p>{t(controller.correct ? 'prediction.correct' : 'prediction.incorrect')}</p><p>{t('prediction.actual', { row: game.frame!.pos.y + 1, column: game.frame!.pos.x + 1, direction: t(`directions.${game.frame!.dir}`) })}</p>{controller.firstCheck !== undefined && <p>{t(controller.firstCheck ? 'prediction.firstCheckBlocked' : 'prediction.firstCheckOpen')}</p>}<button type="button" onClick={controller.retry}>{t('prediction.retry')}</button></> : <p>{selected !== null && playback.playing ? t('prediction.running') : '\u00a0'}</p>}</div>
  </section>
}
