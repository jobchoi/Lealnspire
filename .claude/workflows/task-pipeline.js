export const meta = {
  name: 'task-pipeline',
  description: 'TASKS.md 작업 하나를 계획 → 구현 → 독립 검토 2개 → 수정 → 문서·커밋·push까지 진행',
  whenToUse: '사용자가 특정 작업(예: T1)을 "워크플로로" 진행하라고 할 때. args에 작업 ID 문자열을 넘긴다.',
  phases: [
    { title: 'Plan', detail: '착수 가능 여부와 완료 조건 확인(구현 없음)' },
    { title: 'Implement', detail: '완료 조건 범위만 구현 + npm run verify' },
    { title: 'Review', detail: 'reviewer 2개가 서로 다른 관점으로 독립 검토' },
    { title: 'Fix', detail: '필수 지적이 있으면 1회 수정 후 재검토' },
    { title: 'Finalize', detail: '문서 갱신, 재검증, 커밋, 작업 브랜치 push' },
  ],
}

// ---- 입력 ----
const taskId = typeof args === 'string' ? args.trim() : args && args.taskId
if (!taskId) throw new Error('args로 작업 ID를 넘겨야 합니다. 예: "T1"')
const MAX_FIX_ROUNDS = 1 // 에이전트 수를 작게 유지(최대 7개)

// ---- 스키마 ----
const PLAN = {
  type: 'object',
  properties: {
    ready: { type: 'boolean', description: '지금 구현을 시작해도 되는가' },
    blocker: { type: 'string', description: 'ready=false일 때 막힌 이유와 사용자에게 할 질문' },
    branch: { type: 'string', description: '작업할 브랜치 이름(예: feature/T1-engine)' },
    baseBranch: { type: 'string', description: '분기할 기준 브랜치' },
    criteria: { type: 'array', items: { type: 'string' }, description: 'TASKS.md 완료 조건 원문' },
    plan: { type: 'array', items: { type: 'string' }, description: '구현 단계' },
  },
  required: ['ready', 'blocker', 'branch', 'baseBranch', 'criteria', 'plan'],
}
const IMPL = {
  type: 'object',
  properties: {
    summary: { type: 'string' },
    changedFiles: { type: 'array', items: { type: 'string' } },
    verify: {
      type: 'object',
      properties: {
        lint: { enum: ['pass', 'fail', 'not_run'] },
        test: { enum: ['pass', 'fail', 'not_run'] },
        build: { enum: ['pass', 'fail', 'not_run'] },
      },
      required: ['lint', 'test', 'build'],
    },
    verifyOutput: { type: 'string', description: '실패 시 출력 요약, 통과 시 테스트 개수 등' },
    unmetCriteria: { type: 'array', items: { type: 'string' }, description: '아직 충족 못 했거나 확인 못 한 완료 조건' },
  },
  required: ['summary', 'changedFiles', 'verify', 'verifyOutput', 'unmetCriteria'],
}
const REVIEW = {
  type: 'object',
  properties: {
    verdict: { enum: ['pass', 'changes'] },
    findings: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          severity: { enum: ['must', 'should'] },
          where: { type: 'string', description: '파일:줄' },
          issue: { type: 'string', description: '무엇이 왜 틀렸는지, 구체적 입력과 결과' },
        },
        required: ['severity', 'where', 'issue'],
      },
    },
    commandsRun: { type: 'array', items: { type: 'string' } },
  },
  required: ['verdict', 'findings', 'commandsRun'],
}
const FINAL = {
  type: 'object',
  properties: {
    status: { enum: ['완료', '진행 중'], description: 'TASKS.md에 기록한 상태' },
    commit: { type: 'string' },
    pushed: { type: 'boolean' },
    verify: { type: 'string', description: '마지막 npm run verify 결과' },
    remaining: { type: 'array', items: { type: 'string' }, description: '남은 완료 조건, 사용자 결정 필요 사항' },
  },
  required: ['status', 'commit', 'pushed', 'verify', 'remaining'],
}

const LENSES = [
  {
    key: 'scope',
    focus:
      '완료 조건 충족 여부(항목별 근거), 범위 초과(완료 조건·MVP 제외 목록 침범), CLAUDE.md 4절 문서 갱신 누락, 검증하지 않은 내용을 성공으로 적었는지',
  },
  {
    key: 'correctness',
    focus:
      '정확성 버그(GAME_DESIGN.md 실행 규칙과 구현의 차이), 경계 조건, 테스트가 규칙을 실제로 검증하는지, 구조 규칙(src/engine 순수성, localStorage는 src/storage만)',
  },
]

const reviewPrompt = (lens, impl) =>
  `작업 ${taskId}의 현재 작업 트리 변경(git diff, 새 파일 포함)을 검토합니다.
이번 검토의 관점: ${lens.focus}.
다른 관점은 다른 검토자가 봅니다. 이 관점에 집중하세요.
구현자 보고: ${impl.summary}
구현자가 밝힌 미충족 조건: ${JSON.stringify(impl.unmetCriteria)}
파일을 수정하지 마세요. 지적은 확인한 근거가 있을 때만 must로 표시합니다.`

// ---- Plan ----
phase('Plan')
const plan = await agent(
  `작업 ${taskId}을(를) 시작할 수 있는지 판단하고 계획만 세웁니다. 파일을 수정하지 마세요.
- docs/NEXT_SESSION.md, docs/TASKS.md와 관련 설계 문서를 읽습니다.
- 선행 작업이 완료됐는지, [미결정] 항목이나 사용자 결정 대기가 걸려 있는지 확인합니다. 하나라도 걸리면 ready=false.
- 브랜치: CLAUDE.md 5절 이름 규칙. 기준 브랜치는 develop이지만, 선행 작업이 아직 develop에 병합되지 않았다면 그 선행 작업 브랜치를 기준으로 합니다.`,
  { label: `plan:${taskId}`, schema: PLAN }
)
if (!plan) throw new Error('계획 단계 에이전트가 결과를 반환하지 않았습니다')
if (!plan.ready) {
  log(`착수 불가: ${plan.blocker}`)
  return { status: 'blocked', taskId, blocker: plan.blocker }
}
log(`${taskId} → ${plan.branch} (기준 ${plan.baseBranch}), 완료 조건 ${plan.criteria.length}개`)

// ---- Implement ----
phase('Implement')
let impl = await agent(
  `작업 ${taskId}을(를) 구현합니다.
1. 작업 트리가 깨끗한지 확인하고, ${plan.baseBranch}에서 ${plan.branch} 브랜치를 만들거나 전환합니다.
2. TASKS.md에서 ${taskId} 상태를 "진행 중"으로 바꿉니다.
3. 아래 완료 조건 범위만 구현합니다(범위 밖 아이디어는 TASKS.md에 "제안"으로만 추가).
   완료 조건: ${JSON.stringify(plan.criteria)}
   계획: ${JSON.stringify(plan.plan)}
4. npm run verify를 실행하고 결과를 그대로 보고합니다.
아직 커밋하지 마세요(검토 후 마무리 단계에서 커밋합니다).`,
  { label: `implement:${taskId}`, schema: IMPL }
)
if (!impl) throw new Error('구현 단계 에이전트가 결과를 반환하지 않았습니다')

// ---- Review (2 lenses, 독립) ----
const runReviews = (lenses, phaseName, round) =>
  parallel(
    lenses.map((lens) => () =>
      agent(reviewPrompt(lens, impl), {
        label: `review:${lens.key}#${round}`,
        phase: phaseName,
        agentType: 'reviewer',
        schema: REVIEW,
      }).then((r) => r && { ...r, lens: lens.key })
    )
  ).then((rs) => rs.filter(Boolean))

phase('Review')
let reviews = await runReviews(LENSES, 'Review', 0)
let must = reviews.flatMap((r) => r.findings.filter((f) => f.severity === 'must').map((f) => ({ ...f, lens: r.lens })))
log(`검토 결과: 필수 ${must.length}건, 권장 ${reviews.flatMap((r) => r.findings).length - must.length}건`)

// ---- Fix loop ----
let round = 0
while (must.length && round < MAX_FIX_ROUNDS) {
  round++
  phase('Fix')
  impl = await agent(
    `작업 ${taskId}의 검토 지적 중 필수 항목을 수정합니다.
지적: ${JSON.stringify(must)}
타당하지 않은 지적은 고치지 말고 이유를 summary에 적습니다. 수정 후 npm run verify를 다시 실행합니다. 아직 커밋하지 마세요.`,
    { label: `fix:${taskId}#${round}`, phase: 'Fix', schema: IMPL }
  )
  if (!impl) break
  // 재검토는 한 명이 두 관점을 합쳐서 확인(에이전트 수 절약)
  reviews = await runReviews(
    [{ key: 'recheck', focus: `이전 필수 지적이 해결됐는지, 수정으로 새 문제가 생겼는지. 이전 지적: ${JSON.stringify(must)}` }],
    'Fix',
    round
  )
  must = reviews.flatMap((r) => r.findings.filter((f) => f.severity === 'must').map((f) => ({ ...f, lens: r.lens })))
}
if (must.length) log(`수정 ${round}회 후에도 필수 지적 ${must.length}건이 남음 → "진행 중"으로 기록`)

// ---- Finalize ----
phase('Finalize')
const allShould = reviews.flatMap((r) => r.findings.filter((f) => f.severity === 'should'))
const final = await agent(
  `작업 ${taskId}을(를) 마무리합니다.
- npm run verify를 다시 실행합니다.
- 남은 필수 지적: ${JSON.stringify(must)}
- 반영하지 않은 권장 지적: ${JSON.stringify(allShould)}
- 구현자가 밝힌 미충족 조건: ${JSON.stringify(impl ? impl.unmetCriteria : ['구현 결과 없음'])}
- 모든 완료 조건을 실제로 확인했고 필수 지적이 없을 때만 TASKS.md 상태를 "완료"로, 아니면 "진행 중"으로 두고 남은 항목을 적습니다.
- CLAUDE.md 4절에 따라 문서를 갱신합니다. WORK_HISTORY.md에는 이번 작업이 task-pipeline 워크플로로 진행됐다는 것과 검토 결과(필수/권장 건수, 반영 여부)를 남깁니다.
- 작업 단위로 커밋하고 git push -u origin ${plan.branch}로 push합니다. develop/master 병합이나 PR 생성은 하지 않습니다.`,
  { label: `finalize:${taskId}`, schema: FINAL }
)

return {
  taskId,
  branch: plan.branch,
  implement: impl && { summary: impl.summary, changedFiles: impl.changedFiles, verify: impl.verify },
  review: reviews.map((r) => ({ lens: r.lens, verdict: r.verdict, findings: r.findings.length })),
  fixRounds: round,
  remainingMust: must,
  final,
}
