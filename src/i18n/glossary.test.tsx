import { describe, expect, it } from 'vitest'
import { renderToString } from 'react-dom/server'
import glossary from './glossary.json'
import { locales, supportedLocales, type Messages } from './I18n'
import korean from './locales/ko.json'
import { BlockTiles } from '../view/components/BlockTiles'
import { themes, worlds } from '../view/theme/themes'

function leaves(messages: Messages, prefix = ''): Record<string, string> {
  return Object.fromEntries(Object.entries(messages).flatMap(([key, value]) =>
    typeof value === 'string' ? [[prefix + key, value]] : Object.entries(leaves(value, `${prefix}${key}.`))))
}
const params = (value: string) => [...new Set([...value.matchAll(/\{(\w+)\}/g)].map(match => match[1]))].sort()

describe('terminology and locale contracts', () => {
  it('requires complete keys and matching interpolation arguments for supported locales', () => {
    const base = leaves(korean)
    for (const locale of supportedLocales) {
      const messages = locales[`./locales/${locale}.json`]
      expect(messages, locale).toBeDefined()
      const translated = leaves(messages)
      expect(Object.keys(translated).sort(), locale).toEqual(Object.keys(base).sort())
      for (const key of Object.keys(base)) expect(params(translated[key]), `${locale}:${key}`).toEqual(params(base[key]))
    }
  })
  it('allows partial development locales but rejects unknown keys and changed arguments', () => {
    const base = leaves(korean)
    for (const [path, messages] of Object.entries(locales)) {
      for (const [key, value] of Object.entries(leaves(messages))) {
        expect(base, `${path}:${key}`).toHaveProperty(key)
        expect(params(value), `${path}:${key}`).toEqual(params(base[key]))
      }
    }
  })
  it('defines unique IDs, lowercase keywords, names, definitions and avoid lists', () => {
    for (const [id, entry] of Object.entries(glossary)) {
      expect(entry.id).toBe(id)
      expect(entry.keyword).toMatch(/^[a-z]+$/)
      for (const locale of ['ko', 'en'] as const) {
        expect(entry[locale].name.trim(), `${id}:${locale}`).not.toBe('')
        expect(entry[locale].short.trim(), `${id}:${locale}`).not.toBe('')
        expect(Array.isArray(entry.avoid[locale])).toBe(true)
      }
    }
    expect(new Set(Object.values(glossary).map(entry => entry.id)).size).toBe(Object.keys(glossary).length)
  })
  it('sources visible concept keywords from the glossary rather than View literals', () => {
    const keywords = new Set(Object.values(glossary).map(entry => entry.keyword))
    const sources = import.meta.glob(['../view/**/*.ts', '../view/**/*.tsx'], { query: '?raw', eager: true, import: 'default' })
    for (const [path, raw] of Object.entries(sources)) {
      if (path.includes('.test.')) continue
      const source = String(raw).replace(/className=(?:"[^"]*"|\{`[^`]*`\})/g, '').replace(/aria-current=\{[^}]*\}/g, '').replace(/style=\{\{[\s\S]*?\}\}/g, '')
      // Inspect JSX text and literal labels; block discriminants and resource
      // paths remain legal. Templates used for labels must contain no keywords.
      const visible = [
        ...[...source.matchAll(/>([^<>{}\n]+)<\//g)].map(match => match[1]),
        ...[...source.matchAll(/(?:\b(?:const|let)\s+\w+\s*=\s*|return\s+|=>\s*|\?\s*|:\s*)(['"`])([^'"`\n]+)\1/g)].map(match => match[2]),
        ...[...source.matchAll(/\{(['"`])([^'"`\n]+)\1\}/g)].map(match => match[2]),
      ]
      for (const rawLabel of visible) {
        const label = rawLabel.replace(/\$\{[^}]*\}/g, '').trim()
        if (/^[a-z]+(?:[.-][\w.-]*)+$/.test(label)) continue // resource keys / CSS
        for (const word of label.match(/[a-zA-Z]+/g) ?? []) expect(keywords.has(word), `${path}: hardcoded ${word}`).toBe(false)
      }
    }
    for (const world of worlds) {
      const html = renderToString(<BlockTiles theme={themes[world]} program={[{ id: 'r', type: 'repeat', count: 3, body: [] }]} selectedId={null} targetId={null} locked={false} onSelect={() => {}} />)
      expect(html).toContain(`class="concept-keyword">${glossary.repeat.keyword}</span>`)
      expect(html).toContain('class="repeat-count">×3</span>')
      expect(html).toContain('aria-label="1번 반복 3번"')
      expect(themes[world].paletteName!('repeat')).toBe(glossary.repeat.keyword)
    }
  })
})
