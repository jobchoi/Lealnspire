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
  // Selecting a function block alone leaves the insertion destination at main.
  expect(doc.main).toHaveLength(2)
  expect(doc.main.at(-1)).toMatchObject({ type: 'turnLeft' })
  expect(doc.functions[0].body).toHaveLength(2)
  expect(panel()).toBe('main')
})

it('edits input sockets, call values and repeat sources through the parameter toolbar', () => {
  const controller = new EditorController()
  let document: ProgramDocument = { main: [{ id: 'c', type: 'call', fn: 'star' }], functions: [{ id: 'star', icon: 'star', body: [{ id: 'r', type: 'repeat', count: 3, body: [] }] }] }
  let tree: Node[] = []
  const render = () => {
    controller.configureDocument(document, next => { document = next }, false)
    hooks.cursor = 0
    tree = nodes(Editor({ program: document.main, onChange: main => { document = { ...document, main } }, controller, functionsEnabled: true, variablesEnabled: true, paramsEnabled: true }))
  }
  const click = (label: string) => {
    const button = tree.find(node => node.type === 'button' && node.props['aria-label'] === label)
    expect(button).toBeDefined()
    ;(button!.props.onClick as () => void)(); render()
  }
  render(); click('별 함수가 값 받기')
  expect(document.functions[0].param).toBe(true)
  expect(document.main[0]).toMatchObject({ arg: { kind: 'number', value: 2 } })
  controller.selectFunctionBlock(undefined, 'c'); render()
  click('1번 별 함수 부르기 값 늘리기')
  expect(document.main[0]).toMatchObject({ arg: { kind: 'number', value: 3 } })
  click('A로')
  expect(document.main[0]).toMatchObject({ arg: { kind: 'A' } })
  controller.selectFunctionBlock('star', 'r'); render()
  click('횟수를 A로'); click('건네받은 값으로 반복')
  expect(document.functions[0].body[0]).toMatchObject({ countParam: true })
  click('별 함수가 값 받지 않기')
  expect(document.main[0]).not.toHaveProperty('arg')
  expect(document.functions[0].body[0]).toMatchObject({ count: 3 })
})

it('QC: 반복을 빠져나오면 함수 끝에 추가하고 main 추가는 명시적으로 전환한다', () => {
  const editor = new EditorController()
  editor.configureDocument({ main: [], functions: [{ id: 'star', icon: 'star', body: [{ id: 'r', type: 'repeat', count: 2, body: [] }] }] }, () => {}, false)
  editor.chooseFunction('star')
  editor.select('r'); editor.toggleTarget(); editor.add('forward'); editor.toggleTarget()
  expect(editor.addingToFunction).toBe(true)
  expect(editor.getSnapshot().targetId).toBeNull()
  editor.add('turnLeft')
  expect(editor.functions[0].body.map(block => block.type)).toEqual(['repeat', 'turnLeft'])
  expect(editor.program).toEqual([])
  editor.chooseFunction(); editor.add('call')
  expect(editor.program[0].type).toBe('call')
})

it('QC: nested repeat exit restores the containing if body or else body', () => {
  for (const alternative of [false, true]) {
    const repeat = { id: 'r', type: 'repeat' as const, count: 2, body: [] }
    const editor = new EditorController()
    editor.configure([{ id: 'if', type: 'if', condition: 'blockedAhead', body: alternative ? [] : [repeat], ...(alternative ? { else: [repeat] } : {}) }], () => {}, false)
    editor.select('if'); editor.toggleTarget(alternative)
    editor.select('r'); editor.toggleTarget(); editor.add('forward'); editor.toggleTarget()
    expect(editor.getSnapshot().targetId).toBe('if')
    expect(editor.targetElse).toBe(alternative)
    editor.add('turnLeft')
    const block = editor.program[0]
    if (block.type !== 'if') throw new Error('Expected if')
    expect((alternative ? block.else! : block.body).map(child => child.type)).toEqual(['repeat', 'turnLeft'])
  }
})

it('QC2: leaving an if or else restores main or the explicitly chosen function body', () => {
  for (const inFunction of [false, true]) for (const alternative of [false, true]) {
    const editor = new EditorController()
    editor.configureDocument({ main: [], functions: [{ id: 'star', icon: 'star', body: [{ id: 'if', type: 'if', condition: 'blockedAhead', body: [], else: [] }] }] }, () => {}, false)
    if (inFunction) { editor.chooseFunction('star'); editor.selectFunctionBlock('star', 'if') }
    else editor.selectFunctionBlock('star', 'if')
    editor.toggleTarget(alternative)
    editor.add('forward')
    editor.toggleTarget(alternative)
    expect(editor.addingToFunction).toBe(inFunction)
    expect(editor.getSnapshot().targetId).toBeNull()
    editor.add('turnLeft')
    expect(editor.program.map(block => block.type)).toEqual(inFunction ? [] : ['turnLeft'])
    expect(editor.functions[0].body.map(block => block.type)).toEqual(inFunction ? ['if', 'turnLeft'] : ['if'])
  }
})

it('QC2: switching if branches keeps the original return location', () => {
  const editor = new EditorController()
  editor.configure([{ id: 'if', type: 'if', condition: 'blockedAhead', body: [], else: [] }], () => {}, false)
  editor.select('if'); editor.toggleTarget(); editor.toggleTarget(true); editor.toggleTarget(true)
  expect(editor.getSnapshot().targetId).toBeNull()
  expect(editor.targetElse).toBe(false)
  editor.add('turnRight')
  expect(editor.program.map(block => block.type)).toEqual(['if', 'turnRight'])
})


it('QC4: selecting a newly added function repeat preserves its return location', () => {
  const editor = new EditorController()
  editor.configureDocument({ main: [], functions: [] }, () => {}, false)
  editor.createFunction()
  const fn = editor.functions[0].id
  editor.chooseFunction(fn)
  editor.add('repeat')
  const repeat = editor.functions[0].body[0]
  editor.selectFunctionBlock(fn, repeat.id)
  editor.toggleTarget()
  editor.add('forward')
  editor.toggleTarget()
  expect(editor.functionId).toBe(fn)
  expect(editor.functionTarget).toBe(true)
  expect(editor.getSnapshot().targetId).toBeNull()
  editor.add('turnLeft')
  expect(editor.program).toEqual([])
  expect(editor.functions[0].body).toMatchObject([
    { type: 'repeat', body: [{ type: 'forward' }] }, { type: 'turnLeft' },
  ])
  editor.clear()
  editor.add('turnRight')
  expect(editor.program).toMatchObject([{ type: 'turnRight' }])
})

it('edits return values and value-call inputs through the toolbar, restricts return insertion to functions', () => {
  const controller = new EditorController()
  let document: ProgramDocument = { main: [{ id: 'repeat', type: 'repeat', count: 3, body: [] }], functions: [{ id: 'star', icon: 'star', param: true, body: [{ id: 'ret', type: 'return', value: { kind: 'ahead' } }] }] }
  let tree: Node[] = []
  const render = () => {
    controller.configureDocument(document, next => { document = next }, false)
    hooks.cursor = 0
    tree = nodes(Editor({ program: document.main, onChange: main => { document = { ...document, main } }, controller, functionsEnabled: true, variablesEnabled: true, paramsEnabled: true, returnsEnabled: true, palette: ['forward', 'repeat', 'return', 'call'] }))
  }
  const click = (label: string) => {
    const button = tree.find(node => node.type === 'button' && node.props['aria-label'] === label)
    expect(button).toBeDefined()
    expect(button!.props.disabled).toBeFalsy()
    ;(button!.props.onClick as () => void)(); render()
  }
  render()
  expect(tree.find(node => node.type === 'button' && node.props['aria-label'] === '값 돌려주기 (return)')?.props.disabled).toBe(true)
  controller.selectFunctionBlock(undefined, 'repeat'); render()
  click('반복 횟수 원천 바꾸기'); click('반복 횟수 원천 바꾸기')
  expect(document.main[0]).toMatchObject({ countCall: { fn: 'star', arg: { kind: 'A' } } })
  const numericArg = tree.find(node => node.type === 'button' && node.props.children === '숫자로')!
  expect(numericArg).toBeDefined()
  ;(numericArg.props.onClick as () => void)(); render()
  expect(document.main[0]).toMatchObject({ countCall: { arg: { kind: 'number', value: 1 } } })
  click('1번 N번 반복 값 늘리기')
  expect(document.main[0]).toMatchObject({ countCall: { arg: { kind: 'number', value: 2 } } })
  click('반복 횟수 원천 바꾸기')
  expect(document.main[0]).not.toHaveProperty('countCall')
  controller.chooseFunction('star'); controller.select('ret'); render()
  click('반환값 원천 바꾸기')
  expect(document.functions[0].body[0]).toMatchObject({ value: { kind: 'number', value: 0 } })
  click('1번 값 돌려주기 (return) 값 늘리기')
  click('반환값 원천 바꾸기')
  expect(document.functions[0].body[0]).toMatchObject({ value: { kind: 'A' } })
  click('반환값 원천 바꾸기')
  expect(document.functions[0].body[0]).toMatchObject({ value: { kind: 'param' } })
  click('반환값 원천 바꾸기')
  expect(document.functions[0].body[0]).toMatchObject({ value: { kind: 'ahead' } })
  click('값 돌려주기 (return)')
  expect(document.functions[0].body).toHaveLength(2)
})

it('edits on connection symbols through buttons, swaps occupied signals and targets a handler body', () => {
  let document: ProgramDocument = { main: [{ id: 'a', type: 'on', signal: '○', body: [] }, { id: 'b', type: 'on', signal: '◇', body: [] }], functions: [] }
  const controller = new EditorController()
  let tree: Node[] = []
  const render = () => {
    controller.configureDocument(document, next => { document = next }, false, 7)
    hooks.cursor = 0
    tree = nodes(Editor({ program: document.main, onChange: main => { document = { ...document, main } }, controller, eventsEnabled: true, palette: ['forward', 'repeat', 'on'] }))
  }
  const click = (label: string) => {
    const button = tree.find(node => node.type === 'button' && node.props['aria-label'] === label)
    expect(button).toBeDefined()
    expect(button!.props.disabled).toBeFalsy()
    ;(button!.props.onClick as () => void)(); render()
  }
  render()
  controller.select('a'); render()
  click('다이아몬드 신호')
  expect(document.main).toMatchObject([{ signal: '◇' }, { signal: '○' }])
  click('세모 신호')
  expect(document.main[0]).toMatchObject({ signal: '△' })
  controller.toggleTarget(); render()
  expect(tree.find(node => node.type === 'button' && node.props['aria-label'] === '신호가 오면 실행 (on)')?.props.disabled).toBe(true)
  click('앞으로')
  expect(document.main[0]).toMatchObject({ body: [{ type: 'forward' }] })
  controller.clear(); render()
  click('신호가 오면 실행 (on)')
  expect(document.main[2]).toMatchObject({ signal: '◇', body: [] })
  expect(tree.find(node => node.type === 'button' && node.props['aria-label'] === '신호가 오면 실행 (on)')?.props.disabled).toBe(true)
})
