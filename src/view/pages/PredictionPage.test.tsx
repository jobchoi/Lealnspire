import { renderToStaticMarkup } from 'react-dom/server'
import { expect, it, vi } from 'vitest'
import { PredictionPage } from './PredictionPage'
import { PredictionController } from '../../controller/PredictionController'
import type { ReactElement } from 'react'
import { i18n, t } from '../../i18n/I18n'
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

it('renders all four logic rows with localized sensor names and eight choices in ko/en', () => {
  const previous = i18n.locale
  try {
    for (const locale of ['ko', 'en']) {
      i18n.locale = locale
      const controller = new PredictionController(predictions.find(item => item.id === 'p-u6-1')!)
      const html = renderToStaticMarkup(<PredictionPage controller={controller} onBack={() => {}} />)
      expect((html.match(/<select/g) ?? [])).toHaveLength(8)
      expect(html).toContain(t('logic.predict'))
      for (const [p, q] of [[true, true], [true, false], [false, true], [false, false]]) {
        expect(html).toContain(`<span>${t('logic.blockedLeft')}: ${t(p ? 'logic.true' : 'logic.false')} · ${t('logic.blockedRight')}: ${t(q ? 'logic.true' : 'logic.false')}</span>`)
      }
      expect(html).not.toContain('<span>P:')
      expect(html).not.toContain(' · Q: ' + t('logic.true') + '</span>')
      controller.dispose()
    }
  } finally { i18n.locale = previous }
})

// Exercise the real page handlers while retaining hook state between renders.
const hooks = vi.hoisted(() => ({ active: false, values: [] as unknown[], cursor: 0 }))
vi.mock('react', async importOriginal => ({
  ...await importOriginal<typeof import('react')>(),
  useState: (initial: unknown) => {
    if (!hooks.active) return [initial, () => {}]
    const index = hooks.cursor++
    if (hooks.values.length <= index) hooks.values[index] = initial
    return [hooks.values[index], (next: unknown) => {
      hooks.values[index] = typeof next === 'function' ? next(hooks.values[index]) : next
    }]
  },
  useSyncExternalStore: (_subscribe: unknown, snapshot: () => unknown) => snapshot(),
}))
type Node = ReactElement<Record<string, unknown>>
function nodes(value: unknown): Node[] {
  if (Array.isArray(value)) return value.flatMap(nodes)
  if (!value || typeof value !== 'object' || !('props' in value)) return []
  const node = value as Node
  return [node, ...nodes(node.props.children)]
}
it('handles unanswered rows, every truth-table result, feedback and retry in ko/en', () => {
  const previous = i18n.locale
  try {
    for (const locale of ['ko', 'en']) for (const correct of [true, false]) {
      i18n.locale = locale
      hooks.active = true; hooks.values = []
      const controller = new PredictionController(predictions.find(item => item.id === 'p-u6-1')!)
      const render = () => { hooks.cursor = 0; return nodes(PredictionPage({ controller, onBack: () => {} })) }
      let tree = render()
      const selects = () => tree.filter(node => node.type === 'select')
      const check = () => tree.find(node => node.type === 'button' && node.props.children === t('logic.check'))!
      const change = (index: number, value: string) => {
        (selects()[index].props.onChange as (event: unknown) => void)({ target: { value } }); tree = render()
      }
      const expected = [true, true, false, true, false, true, false, false]
      expect(check().props.disabled).toBe(true)
      for (const [index, actual] of expected.entries()) change(index, String(correct ? actual : !actual))
      expect(check().props.disabled).toBe(false)
      change(0, '')
      expect(selects()[0].props.value).toBe('')
      expect(check().props.disabled).toBe(true)
      change(0, String(correct))
      expect(selects()[2].props['aria-label']).toBe(t('logic.predictionRow', { row: 2, p: t('logic.true'), q: t('logic.false'), operator: 'and' }))
      ;(check().props.onClick as () => void)(); tree = render()
      expect(selects().every(node => node.props.disabled)).toBe(true)
      const results = tree.filter(node => node.type === 'label').map(node => nodes(node.props.children).find(child => child.type === 'span')!.props.children)
      expect(results).toEqual(expected.map(actual => [correct ? '✓' : '✕', ' ', t(actual ? 'logic.true' : 'logic.false')]))
      expect(tree.find(node => node.props.role === 'status')!.props.children).toBe(t(correct ? 'prediction.correct' : 'prediction.incorrect'))
      const retry = tree.find(node => node.type === 'button' && node.props.children === t('prediction.retry'))!
      ;(retry.props.onClick as () => void)(); tree = render()
      expect(selects().every(node => node.props.value === '' && !node.props.disabled)).toBe(true)
      expect(check().props.disabled).toBe(true)
      expect(tree.find(node => node.props.role === 'status')!.props.children).toBe(false)
      controller.dispose()
    }
  } finally { hooks.active = false; i18n.locale = previous }
})
