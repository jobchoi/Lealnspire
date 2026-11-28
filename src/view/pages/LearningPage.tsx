import type { AppController } from '../../controller/AppController'
import { stageLabel, t } from '../../i18n/I18n'
import { ConceptDefs, Symbol } from '../theme/Symbols'
import '../theme/themes'
import './LearningPage.css'

type Props = { data: AppController['learningData']; onHome: () => void; onList: () => void; onUnit: (unit: number) => void; onSelect: (index: number) => void; onRemove: (id: string) => void }
const symbols = ['repeat', 'if', 'while', 'star', 'set', 'blockedAhead', 'diamond', 'return', 'on', 'forEach', 'target', 'stageList']
export function LearningButton({ onClick }: { onClick?: () => void }) {
  return <button className="learning-entry" type="button" onClick={onClick}><Symbol name="sketchbook" /><span>{t('learning.title')}</span></button>
}
export function LearningPage({ data, onHome, onList, onUnit, onSelect, onRemove }: Props) {
  return <section className="learning-page theme-sketchbook">
    <ConceptDefs />
    <h1 data-page-title tabIndex={-1}>{t('learning.title')}</h1>
    <p className="learning-count">{t('learning.count', { count: data.completed })}</p>
    <section aria-labelledby="learning-next"><h2 id="learning-next">{t('learning.next')}</h2>
      {data.next && <div className={`learning-next world-${data.next.stage.world}`}><strong>{stageLabel(data.next.stage)}</strong><button type="button" aria-label={`${t('continue')}: ${stageLabel(data.next.stage)}`} onClick={() => onSelect(data.next!.index)}>{t('continue')}</button></div>}
    </section>
    {data.pastDetailsUnavailable && <p>{t('learning.older')}</p>}
    {data.completed === 0 && <p>{t('learning.empty')}</p>}
    <section aria-labelledby="learning-tools"><h2 id="learning-tools">{t('learning.tools')}</h2>
      <div className="learning-tools">{data.tools.map(({ unit, total, completed, active }) => <button type="button" key={unit} data-state={completed === total ? 'completed' : active || completed > 0 ? 'active' : 'unopened'} className={`learning-tool world-${data.entries.find(e => e.puzzle.unit === unit)?.stage.world ?? 'sketchbook'}`} onClick={() => onUnit(unit)}>
        <Symbol name={symbols[unit - 1]} /><strong>{t(unit === 1 ? 'learning.unit1' : `unit${unit}`)}</strong>
        {completed < total && (active || completed > 0) && <span>{t('learning.inProgress')}</span>}
      </button>)}</div>
    </section>
    <section aria-labelledby="learning-recent"><h2 id="learning-recent">{t('learning.recent')}</h2>
      {data.recent.length === 0 && <p>{t('learning.none')}</p>}
      <ul className="learning-cards">{data.recent.map(({ stage, index, fixed }) => <li className={`world-${stage.world}`} key={stage.id}>
        <strong>{stageLabel(stage)}</strong><p>{t(fixed ? 'learning.fixed' : 'learning.arrived')}</p>
        <button type="button" onClick={() => onSelect(index)} aria-label={`${t('learning.again')}: ${stageLabel(stage)}`}>{t('learning.again')}</button>
      </li>)}</ul>
    </section>
    <section><h2>{t('factory.activityTitle')}</h2><ul className="learning-cards">{data.projects.filter(p => p.created || p.revisitedEdit).map(p => <li key={p.id}><p>{t(p.deleted ? 'factory.deletedProject' : p.revisitedEdit ? 'factory.factEdited' : 'factory.factCreated')}</p></li>)}</ul></section>
    <section aria-labelledby="learning-review"><h2 id="learning-review">{t('learning.review')}</h2>
      {data.review.length === 0 && <p>{t('learning.reviewEmpty')}</p>}
      <ul className="learning-cards">{data.review.map(({ stage, index }) => <li className={`world-${stage.world}`} key={stage.id}>
        <strong>{stageLabel(stage)}</strong><div className="learning-actions">
          <button type="button" onClick={() => onSelect(index)} aria-label={`${t('learning.try')}: ${stageLabel(stage)}`}>{t('learning.try')}</button>
          <button type="button" onClick={() => onRemove(stage.id)} aria-label={`${t('learning.remove')}: ${stageLabel(stage)}`}>{t('learning.remove')}</button>
        </div>
      </li>)}</ul>
    </section>

    <section><h2>{t('challenges.recent')}</h2>{data.recentChallenges.map(({ stage, challenge }) => <p key={`${stage.id}:${challenge.id}`}>{stageLabel(stage)}: {t(`challenges.facts.${challenge.kind}`)}</p>)}</section>
    <details><summary>{t('challenges.legacyTitle')}</summary><p>{t('challenges.legacy')}</p>{data.entries.filter(e => e.legacyStars > 0).map(e => <p key={e.stage.id}>{stageLabel(e.stage)}: {t('stars', { count: e.legacyStars })}</p>)}</details>
    <div className="learning-actions"><button type="button" onClick={onHome}>{t('home')}</button><button type="button" onClick={onList}>{t('stageList')}</button></div>
  </section>
}
