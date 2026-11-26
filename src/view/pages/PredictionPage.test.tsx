import { renderToStaticMarkup } from 'react-dom/server'
import { expect, it, vi } from 'vitest'
import { PredictionPage } from './PredictionPage'
import { PredictionController } from '../../controller/PredictionController'
import { t } from '../../i18n/I18n'
import { predictions } from '../../model/predictions'
it('renders each world with fixed code, three named choices and map markers', () => {
  for (const prediction of predictions.filter(item => item.id !== 'p-u6-1')) {
    const controller = new PredictionController(prediction)
    const html = renderToStaticMarkup(<PredictionPage controller={controller} onBack={() => {}} />)
    expect(html).toContain(`theme-${controller.game.stage.world}`)
    expect(html).toContain('prediction-markers')
    for (const letter of 'ABC') expect(html).toContain(`aria-label="후보 ${letter}:`)
    expect(html).toContain('disabled=""')
    expect(html).not.toContain('role="dialog"')
  }
})

it('reveals the conditional check explanation only after the prediction finishes', () => {
  vi.useFakeTimers()
  try {
    const controller = new PredictionController(predictions.find(prediction => prediction.id === 'p-u2-1')!)
    const html = () => renderToStaticMarkup(<PredictionPage controller={controller} onBack={() => {}} />)
    expect(html()).not.toContain(t('prediction.firstCheckOpen'))
    controller.choose(0)
    expect(html()).not.toContain(t('prediction.firstCheckOpen'))
    vi.runAllTimers()
    expect(html()).toContain(t('prediction.firstCheckOpen'))
    controller.retry()
    expect(html()).not.toContain(t('prediction.firstCheckOpen'))
    controller.dispose()
  } finally { vi.useRealTimers() }
})

it('renders all four logic input combinations with eight choices', () => {
  const controller = new PredictionController(predictions.find(item => item.id === 'p-u6-1')!)
  const html = renderToStaticMarkup(<PredictionPage controller={controller} onBack={() => {}} />)
  expect((html.match(/<select/g) ?? [])).toHaveLength(8)
  expect(html).toContain(t('logic.predict'))
})
