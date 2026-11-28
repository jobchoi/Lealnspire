import { useState } from 'react'
import type { AppController } from '../../controller/AppController'
import { stageLabel, t, i18n } from '../../i18n/I18n'
import type { HistoryEvent } from '../../model/history'
import './AdminPage.css'

type Props = { data: AppController['adminData']; onHome: () => void }
const date = (value: string | null) => value ? new Date(value).toLocaleString(i18n.locale === 'en' ? 'en-US' : 'ko-KR') : t('admin.none')
type Timeline = Props['data']['entries'][number]['timeline']
function detailRows(timeline: Timeline) {
  const rows: { sequence: number; at: string; label: string; visitId?: string; changes?: number }[] = []
  for (const item of timeline) {
    if (!('event' in item)) {
      rows.push({ sequence: item.sequence, at: item.from, label: `${t('admin.compacted')}: ${date(item.from)} — ${date(item.to)}` })
      continue
    }
    const event = item.event
    if (event.type === 'timeSegment' || event.type === 'executionCalculated' || event.type === 'resultReached' || event.type === 'executionInterrupted') continue
    let label = t(`admin.events.${event.type}`)
    if (event.type === 'attemptStarted') {
      if (event.data.purpose === 'challenge') label = t('challenges.column')
      // Match by visit and attempt, stopping at a new execution even for incomplete records.
      const following: HistoryEvent[] = []
      for (const next of timeline) {
        if (next.sequence <= item.sequence) continue
        if (!('event' in next)) break
        if (next.event.visitId !== event.visitId) continue
        if (next.event.type === 'attemptStarted' || next.event.type === 'visitEnded') break
        if (next.event.attemptId === event.attemptId) following.push(next.event)
      }
      const result = following.find(e => e.type === 'executionCalculated')
      const terminal = following.find(e => e.type === 'resultReached' || e.type === 'executionInterrupted')
      const outcome = terminal?.type === 'executionInterrupted' ? t('admin.events.executionInterrupted')
        : terminal?.type === 'resultReached' && result?.type === 'executionCalculated' ? t(`admin.results.${result.data.result}`) : t('admin.pendingResult')
      label += ` → ${outcome}`
    }
    if (event.type === 'codeChanged') {
      const previous = rows.at(-1)
      if (previous?.changes !== undefined && previous.visitId === event.visitId && new Date(previous.at).toDateString() === new Date(event.recordedAt).toDateString()) {
        previous.changes += event.data.changes
        previous.label = t('admin.codeChanges', { count: previous.changes })
        continue
      }
      label = t('admin.codeChanges', { count: event.data.changes })
    }
    if (event.type === 'hintShown') label = t('admin.hintStep', { step: event.data.step })
    if (event.type === 'demoEnded') label = t(event.data.reachedEnd ? 'admin.demoEnd' : 'admin.demoStopped')
    rows.push({ sequence: item.sequence, at: event.recordedAt, label, visitId: event.visitId, ...(event.type === 'codeChanged' ? { changes: event.data.changes } : {}) })
  }
  const groups: { day: string; rows: typeof rows }[] = []
  for (const row of rows) {
    const day = new Date(row.at).toLocaleDateString(i18n.locale === 'en' ? 'en-US' : 'ko-KR')
    if (groups.at(-1)?.day !== day) groups.push({ day, rows: [] })
    groups.at(-1)!.rows.push(row)
  }
  return groups
}
function DataCards({ rows, kind }: { rows: { id: string; title: string; values: { key: string; value: string | number }[]; note?: string }[]; kind: string }) {
  return <div className={`admin-cards admin-${kind}-cards`}>{rows.map(row => <article key={row.id}>
    <h3>{row.title}</h3><dl>{row.values.map(value => <div key={value.key}><dt>{t(value.key)}</dt><dd>{value.value}</dd></div>)}</dl>
    {row.note && <p>{row.note}</p>}
  </article>)}</div>
}
export function AdminPage({ data, onHome }: Props) {
  const [selected, setSelected] = useState(data.entries[0]?.stage.id ?? '')
  const entry = data.entries.find(e => e.stage.id === selected)
  const attention = data.entries.filter(e => e.attention)
  const helpEntries = data.entries.filter(e => e.puzzle.attempts > 0 || e.puzzle.demoUses > 0 || e.puzzle.hint1Attempts > 0 || e.puzzle.hint2Attempts > 0 || e.timeline.some(item => 'event' in item && (item.event.type === 'hintShown' || item.event.type === 'demoStarted')))
  const groups = entry ? detailRows(entry.timeline) : []
  return <section className="admin-page">
    <p className="admin-development">{t('admin.development')}</p>
    <h1 data-page-title tabIndex={-1}>{t('admin.title')}</h1>
    <p>{t('admin.local')}</p>
    <button type="button" onClick={onHome}>{t('home')}</button>
    <section aria-labelledby="admin-summary"><h2 id="admin-summary">{t('admin.summary')}</h2>
      <dl><dt>{t('admin.completed')}</dt><dd>{t('admin.ratio', { count: data.completed, total: data.total })}</dd>
        <dt>{t('admin.lastActivity')}</dt><dd>{date(data.lastActivity)}</dd>
        <dt>{t('admin.started')}</dt><dd>{date(data.historyStartedAt)}</dd>
        <dt>{t('admin.detailFrom')}</dt><dd>{date(data.detailFrom)}</dd>
        <dt>{t('admin.storage')}</dt><dd role="status">{t(data.persistent ? 'admin.saved' : 'admin.unavailable')}</dd></dl>
      <p>{t('admin.retention')}</p><p>{t('admin.timeNote')}</p>
      {data.pastDetailsUnavailable && <p>{t('admin.older')}</p>}
      {data.incomplete && <p>{t('admin.incomplete')}</p>}
      {data.compactedRanges.map((range, i) => <p key={i}>{t('admin.compacted')}: {date(range.from)} — {date(range.to)}</p>)}
    </section>
    <section aria-labelledby="admin-factory"><h2 id="admin-factory">{t('factory.activityTitle')}</h2>
      <p>{t('factory.projectCount', { count: data.projects.filter(p => !p.deleted).length })}</p>
      <p>{t('factory.timeEstimate')}</p>
      <div className="factory-activity-cards">{data.projects.map(p => <article key={p.id}>
        <h3>{t(p.deleted ? 'factory.deletedProject' : 'factory.activityTitle')}</h3>
        <dl><dt>{t('admin.lastActivity')}</dt><dd>{date(p.lastAt)}</dd>
          <dt>{t('factory.runs')}</dt><dd>{p.runs}</dd><dt>{t('factory.saves')}</dt><dd>{p.saves}</dd>
          <dt>{t('factory.revisits')}</dt><dd>{p.opened}</dd><dt>{t('admin.minutes')}</dt><dd>{t('admin.minuteValue', { count: Math.round(p.activityMs / 60000) })}</dd>
          <dt>{t('factory.executed')}</dt><dd>{p.executed.map(k => t(`factory.${k}`)).join(', ') || t('admin.none')}</dd>
          <dt>{t('factory.operationErrors')}</dt><dd>{p.errors.map(k => t(`factory.adultErrors.${k}`)).join(', ') || t('admin.none')}</dd>
        </dl>
      </article>)}</div>
    </section>
    <section aria-labelledby="admin-units"><h2 id="admin-units">{t('admin.units')}</h2>
      <div className="admin-table-scroll" role="region" aria-labelledby="admin-units" tabIndex={0}><table>
        <thead><tr>{['unit', 'completed', 'active', 'minutes'].map(key => <th scope="col" key={key}>{t(`admin.${key}`)}</th>)}</tr></thead>
        <tbody>{data.units.map(unit => <tr key={unit.unit}><th scope="row">{t('admin.unitNumber', { unit: unit.unit })}</th><td>{unit.completed}/{unit.total}</td><td>{unit.active.map(e => stageLabel(e.stage)).join(', ') || t('admin.none')}</td><td>{t('admin.minuteValue', { count: unit.minutes })}</td></tr>)}</tbody>
      </table></div>
      <DataCards kind="units" rows={data.units.map(unit => ({ id: String(unit.unit), title: t('admin.unitNumber', { unit: unit.unit }), values: [
        { key: 'admin.completed', value: `${unit.completed}/${unit.total}` },
        { key: 'admin.active', value: unit.active.map(e => stageLabel(e.stage)).join(', ') || t('admin.none') },
        { key: 'admin.minutes', value: t('admin.minuteValue', { count: unit.minutes }) },
      ] }))} />
    </section>
    <section aria-labelledby="admin-challenges"><h2 id="admin-challenges">{t('challenges.column')}</h2>
      <div className="admin-table-scroll" role="region" aria-labelledby="admin-challenges" tabIndex={0}><table>
        <thead><tr><th scope="col">{t('admin.puzzle')}</th><th scope="col">{t('admin.completed')}</th><th scope="col">{t('challenges.column')}</th></tr></thead>
        <tbody>{data.challengeEntries.map(e => <tr key={e.stage.id}><th scope="row">{stageLabel(e.stage)}</th><td>{e.puzzle.completed ? t('stamp.done') : t('admin.none')}</td><td>{e.challenges.map(c => t(`challenges.${c.kind}`, { max: c.params.maxBlocks ?? 0 })).join(', ') || t('admin.none')}</td></tr>)}</tbody>
      </table></div>
      <DataCards kind="challenges" rows={data.challengeEntries.map(e => ({ id: e.stage.id, title: stageLabel(e.stage), values: [
        { key: 'admin.completed', value: e.puzzle.completed ? t('stamp.done') : t('admin.none') },
        { key: 'challenges.column', value: e.challenges.map(c => t(`challenges.${c.kind}`, { max: c.params.maxBlocks ?? 0 })).join(', ') || t('admin.none') },
      ] }))} />
    </section>
    <section aria-labelledby="admin-attention"><h2 id="admin-attention">{t('admin.attention')}</h2>
      {attention.length === 0 && <p>{t('admin.noAttention')}</p>}
      <ul>{attention.map(e => <li key={e.stage.id}><strong>{stageLabel(e.stage)}</strong>
        {e.puzzle.needsAttention && <p>{t('admin.threeFailures')}</p>}
        {e.repeated.map(result => <p key={result}>{t('admin.repeated', { result: t(`admin.results.${result}`) })}</p>)}
        {e.helpedUnfinished && <p>{t('admin.helpedUnfinished')}</p>}
      </li>)}</ul>
    </section>
    <section aria-labelledby="admin-help"><h2 id="admin-help">{t('admin.help')}</h2><p>{t('admin.helpScope')}</p>
      {helpEntries.length === 0 ? <p>{t('admin.noAttempts')}</p> : <>
      <div className="admin-table-scroll" role="region" aria-labelledby="admin-help" tabIndex={0}><table><thead><tr>{['puzzle', 'attempts', 'hint1', 'hint2', 'demos', 'helpedSuccess', 'independentSuccess'].map(key => <th scope="col" key={key}>{t(`admin.${key}`)}</th>)}</tr></thead>
        <tbody>{helpEntries.map(e => <tr key={e.stage.id}><th scope="row">{stageLabel(e.stage)}</th><td>{e.puzzle.attempts}{e.puzzle.attempts < 3 && <p>{t('admin.smallSample')}</p>}</td><td>{e.puzzle.hint1Attempts}/{e.puzzle.attempts}</td><td>{e.puzzle.hint2Attempts}/{e.puzzle.attempts}</td><td>{e.puzzle.demoUses}/{e.puzzle.demoEnds}</td><td>{e.helpedSuccess}/{e.helpedAttempts}</td><td>{e.independentSuccess}</td></tr>)}</tbody>
      </table></div>
      <DataCards kind="help" rows={helpEntries.map(e => ({ id: e.stage.id, title: stageLabel(e.stage), note: e.puzzle.attempts < 3 ? t('admin.smallSample') : undefined, values: [
        { key: 'admin.attempts', value: e.puzzle.attempts },
        { key: 'admin.hint1', value: `${e.puzzle.hint1Attempts}/${e.puzzle.attempts}` },
        { key: 'admin.hint2', value: `${e.puzzle.hint2Attempts}/${e.puzzle.attempts}` },
        { key: 'admin.demos', value: `${e.puzzle.demoUses}/${e.puzzle.demoEnds}` },
        { key: 'admin.helpedSuccess', value: `${e.helpedSuccess}/${e.helpedAttempts}` },
        { key: 'admin.independentSuccess', value: e.independentSuccess },
      ] }))} /></>}

    </section>
    <section aria-labelledby="admin-detail"><h2 id="admin-detail">{t('admin.detail')}</h2>
      <label htmlFor="admin-puzzle">{t('admin.puzzle')}</label>{' '}
      <select id="admin-puzzle" value={selected} onChange={event => setSelected(event.target.value)}>{data.entries.map(e => <option key={e.stage.id} value={e.stage.id}>{stageLabel(e.stage)}</option>)}</select>
      {entry && <><h3>{stageLabel(entry.stage)}</h3>{entry.legacyStars > 0 && <details><summary>{t('challenges.legacyTitle')}</summary><p>{t('challenges.legacy')}</p><p>{t('stars', { count: entry.legacyStars })}</p></details>}{groups.length === 0 && <p>{t('admin.emptyDetail')}</p>}
        {groups.map((group, index) => <div className="admin-day" key={index}><h4>{group.day}</h4>
          <ol>{group.rows.map(row => <li key={row.sequence}><time dateTime={row.at}>{new Date(row.at).toLocaleTimeString(i18n.locale === 'en' ? 'en-US' : 'ko-KR', { hour: '2-digit', minute: '2-digit', hour12: false })}</time> — {row.label}</li>)}</ol>
        </div>)}</>}
    </section>
  </section>
}
