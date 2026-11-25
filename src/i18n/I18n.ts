import korean from './locales/ko.json'
// en remains a partial development locale until T35.
export const supportedLocales = ['ko'] as const
export type Messages = { [key: string]: string | Messages }
export const locales = import.meta.glob<Messages>('./locales/*.json', { eager: true, import: 'default' })
function lookup(messages: Messages, key: string): string | undefined {
  let value: string | Messages | undefined = messages
  for (const part of key.split('.')) value = typeof value === 'object' ? value[part] : undefined
  return typeof value === 'string' ? value : undefined
}
export class I18n {
  locale: string
  constructor(locale = 'ko') { this.locale = locale }
  t = (key: string, params: Record<string, string | number> = {}): string => {
    const message = lookup(locales[`./locales/${this.locale}.json`] ?? {}, key) ?? lookup(korean, key) ?? key
    return message.replace(/\{(\w+)\}/g, (match, name: string) => String(params[name] ?? match))
  }
}
export const i18n = new I18n()
export const t = i18n.t
