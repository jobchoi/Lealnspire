import { renderToStaticMarkup } from 'react-dom/server'
import { expect, it } from 'vitest'
import { PredictionPage } from './PredictionPage'
import { PredictionController } from '../../controller/PredictionController'
import { predictions } from '../../model/predictions'
it('renders each world with fixed code, three named choices and map markers', () => {
  for (const prediction of predictions) {
    const controller = new PredictionController(prediction)
    const html = renderToStaticMarkup(<PredictionPage controller={controller} onBack={() => {}} />)
    expect(html).toContain(`theme-${controller.game.stage.world}`)
    expect(html).toContain('prediction-markers')
    for (const letter of 'ABC') expect(html).toContain(`aria-label="후보 ${letter}:`)
    expect(html).toContain('disabled=""')
    expect(html).not.toContain('role="dialog"')
  }
})
