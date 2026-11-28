import { afterEach, expect, it } from 'vitest'
import { renderToString } from 'react-dom/server'
import { FactoryCode, FactoryPage, FactoryPicture } from './FactoryPage'
import { FactoryEditorController } from '../../controller/FactoryEditorController'
import { FactoryPlaybackController } from '../../controller/FactoryPlaybackController'
import { factoryUnits } from '../../model/factory/unlocks'
import { i18n, t } from '../../i18n/I18n'
import type { Progress } from '../../model/ProgressRepository'
const progress = (units: number[]): Progress => ({ version: 1, stages: Object.fromEntries(factoryUnits.flatMap((ss, i) => units.includes(i + 1) ? ss.map(s => [s.id, { completed: true, bestStars: 0, lastProgram: [] }]) : [])) })
afterEach(() => { i18n.locale = 'ko' })
it('opens only tools actually completed, including a missing intermediate unit', () => {
  for (const locale of ['ko', 'en']) {
    i18n.locale = locale
    const locked = renderToString(<FactoryCode editor={new FactoryEditorController()} />)
    expect(locked).toContain(t('factory.locked'))
    expect(locked).not.toContain(`aria-label="${t('factory.addBlock', { block: t('factory.takeBelt') })}"`)
    const e = new FactoryEditorController(undefined, progress([1, 3, 4, 5, 7, 8, 9, 10, 11]))
    const html = renderToString(<FactoryCode editor={e} />)
    expect(html).toContain(t('factory.takeBelt'))
    expect(html).toContain(t('factory.repeat'))
    expect(html).not.toContain(`aria-label="${t('factory.addBlock', { block: t('factory.while') })}"`)
    expect(html).not.toContain(`aria-label="${t('factory.addBlock', { block: t('factory.if') })}"`)
    expect(html).toContain(t('factory.unitLock', { unit: 2 }))
    e.setProgress(progress([1, 2, 3]))
    expect(renderToString(<FactoryCode editor={e} />)).toContain(`aria-label="${t('factory.addBlock', { block: t('factory.while') })}"`)
  }
})
it('describes queue exit and stack top, provides SVG shapes and setup controls in both locales', () => {
  const e = new FactoryEditorController(undefined, progress([1]))
  e.addBox('belt', '◆'); e.addBox('leaf', '○'); e.addBox('leaf', '◆')
  const p = new FactoryPlaybackController(e)
  for (const locale of ['ko', 'en']) {
    i18n.locale = locale
    const html = renderToString(<FactoryPage progress={progress([1])} onHome={() => {}} supplied={p} />)
    expect(html).toContain(t('factory.add', { place: t('factory.belt'), shape: '◆' }))
    expect(html).toContain(t('factory.earlier', { place: t('factory.leaf'), index: 2 }))
    expect(html).toContain(t('factory.removeBox', { place: t('factory.leaf'), index: 1, shape: '○' }))
    expect(html).toContain(t('factory.front')); expect(html).toContain(t('factory.top'))
    expect(html).toContain('aria-label="◆"'); expect(html).toContain(t('factory.run'))
    expect(html).toContain(t('factory.pileRead', { boxes: '○, ◆', top: '◆' }))
  }
  const picture = renderToString(<FactoryPicture title="Start" state={e.getSnapshot().input.start} />)
  expect(picture.match(/M14 4V1h12v3/g)).toHaveLength(1)
  p.dispose()
})
it('renders source errors and completion questions without scoring or saving progress', () => {
  const e = new FactoryEditorController(undefined, progress([1])), p = new FactoryPlaybackController(e)
  e.add({ id: 'empty-belt', type: 'takeBelt' }); p.step()
  for (const locale of ['ko', 'en']) {
    i18n.locale = locale
    expect(renderToString(<FactoryPage progress={progress([1])} onHome={() => {}} supplied={p} />)).toContain(t('factory.errors.beltEmpty'))
    expect(renderToString(<FactoryCode editor={e} activeId={p.getSnapshot().frame?.activeBlockId} />)).toContain('aria-current="step"')
  }
  p.reset(); e.remove('empty-belt'); p.step()
  expect(renderToString(<FactoryPage progress={progress([1])} onHome={() => {}} supplied={p} />)).toContain(t('factory.question'))
  p.dispose()
})
