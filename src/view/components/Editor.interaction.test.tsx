import type { ReactElement } from 'react'
import { beforeEach, expect, it, vi } from 'vitest'
import { EditorController } from '../../controller/EditorController'
import type { ProgramDocument, Program } from '../../model/types'

// Node 환경에서 훅 상태를 유지하며 편집 이벤트와 재렌더링을 검사한다.
const hooks = vi.hoisted(() => ({ values: [] as unknown[], cursor: 0 }))
vi.mock('react', async importOriginal => ({
  ...await importOriginal<typeof import('react')>(),
  useState: (initial: unknown) => {
    const index = hooks.cursor++
    if (hooks.values.length <= index) hooks.values[index] = typeof initial === 'function' ? (initial as () => unknown)() : initial
    return [hooks.values[index], (next: unknown) => { hooks.values[index] = next }]
  },
  useSyncExternalStore: (_subscribe: unknown, getSnapshot: () => unknown) => getSnapshot(),
  useRef: () => ({ current: null }),
  useEffect: () => {},
}))
import { Editor } from './Editor'
import { BlockTiles } from './BlockTiles'

type Node = ReactElement<Record<string, unknown>>
function nodes(value: unknown): Node[] {
  if (Array.isArray(value)) return value.flatMap(nodes)
  if (!value || typeof value !== 'object' || !('props' in value)) return []
  const node = value as Node
  return [node, ...nodes(node.props.children)]
}
function setup(initial: Program, locked = false) {
  let program = initial
  let tree: Node[] = []
  const render = () => { hooks.cursor = 0; tree = nodes(Editor({ program, locked, onChange: next => { program = next } })) }
  render()
  return {
    select: (id: string) => { const tiles = tree.find(n => n.type === BlockTiles)!; (tiles.props.onSelect as (id: string) => void)(id); render() },
    click: (label: string) => { const button = tree.find(n => n.type === 'button' && n.props['aria-label'] === label)!; expect(button).toBeDefined(); (button.props.onClick as () => void)(); render() },
    clear: () => { const area = tree.find(n => n.props.className === 'workspace')!; (area.props.onClick as (event: unknown) => void)({ target: { closest: () => null } }); render() },
    tree: () => tree,
    program: () => program,
  }
}
beforeEach(() => { hooks.values = []; hooks.cursor = 0 })
it('타일 재선택·빈 곳·삭제로 선택을 해제하며 앞/뒤 이동 후 선택을 유지한다', () => {
  const ui = setup([{ id: 'a', type: 'forward' }, { id: 'b', type: 'turnLeft' }])
  ui.select('b')
  ui.click('2번 왼쪽으로 돌기 앞으로 옮기기')
  expect(ui.program().map(b => b.id)).toEqual(['b', 'a'])
  ui.click('1번 왼쪽으로 돌기 뒤로 옮기기')
  expect(ui.program().map(b => b.id)).toEqual(['a', 'b'])
  ui.select('b')
  expect((hooks.values[0] as import('../../controller/EditorController').EditorController).getSnapshot().selectedId).toBeNull()
  ui.select('a'); ui.clear()
  expect((hooks.values[0] as import('../../controller/EditorController').EditorController).getSnapshot().selectedId).toBeNull()
  ui.select('a'); ui.click('1번 앞으로 삭제')
  expect((hooks.values[0] as import('../../controller/EditorController').EditorController).getSnapshot().selectedId).toBeNull()
  expect(ui.program().map(b => b.id)).toEqual(['b'])
})
it('반복 추가 대상을 켜고 끄며 횟수를 바꾸고 몸체에 추가한다', () => {
  const ui = setup([{ id: 'r', type: 'repeat', count: 2, body: [] }])
  ui.select('r')
  ui.click('1번 N번 반복 반복 횟수 늘리기')
  expect(ui.program()[0]).toMatchObject({ count: 3 })
  ui.click('1번 N번 반복 안에 넣기')
  ui.click('앞으로')
  expect(ui.program()[0]).toMatchObject({ body: [{ type: 'forward' }] })
  ui.click('1번 N번 반복 선택 해제')
  ui.click('오른쪽으로 돌기')
  expect(ui.program()).toHaveLength(2)
})
it('실행 중에는 타일 선택과 편집을 차단한다', () => {
  const ui = setup([{ id: 'a', type: 'forward' }], true)
  ui.select('a')
  expect((hooks.values[0] as import('../../controller/EditorController').EditorController).getSnapshot().selectedId).toBeNull()
  ui.click('앞으로')
  expect(ui.program()).toHaveLength(1)
})

it('함수 일반 타일 다음 추가는 main 탭에, 반복 몸체 추가는 함수 탭에 표시한다', () => {
  let doc: ProgramDocument = { main: [], functions: [{ id: 'moon', icon: 'moon', body: [{ id: 'plain', type: 'forward' }, { id: 'repeat', type: 'repeat', count: 2, body: [] }] }] }
  const controller = new EditorController()
  let tree: Node[] = []
  const render = () => {
    controller.configureDocument(doc, next => { doc = next }, false)
    hooks.cursor = 0
    tree = nodes(Editor({ program: doc.main, onChange: main => { doc = { ...doc, main } }, controller, functionsEnabled: true }))
    // React schedules a second render when the preferred panel context changes.
    hooks.cursor = 0
    tree = nodes(Editor({ program: doc.main, onChange: main => { doc = { ...doc, main } }, controller, functionsEnabled: true }))
  }
  const click = (name: string) => {
    const button = tree.find(n => n.type === 'button' && n.props['aria-label'] === name)!
    expect(button).toBeDefined()
    ;(button.props.onClick as () => void)()
    render()
  }
  const panel = () => tree.find(n => n.props.className === 'program-panels')!.props['data-panel']
  render()
  controller.selectFunctionBlock('moon', 'plain'); render()
  expect(panel()).toBe('body')
  click('앞으로')
  expect(doc.main).toHaveLength(1)
  expect(doc.functions[0].body).toHaveLength(2)
  expect(panel()).toBe('main')
  controller.selectFunctionBlock('moon', 'repeat'); render()
  click('2번 N번 반복 반복 횟수 늘리기')
  expect(doc.functions[0].body[1]).toMatchObject({ count: 3 })
  click('2번 N번 반복 반복 횟수 줄이기')
  click('2번 N번 반복 안에 넣기')
  click('앞으로')
  expect(doc.functions[0].body[1]).toMatchObject({ count: 2, body: [{ type: 'forward' }] })
  expect(panel()).toBe('body')
  click('2번 N번 반복 선택 해제')
  click('왼쪽으로 돌기')
  expect(doc.main).toHaveLength(2)
  expect(panel()).toBe('main')
})
