# 아키텍처 (ARCHITECTURE)

> 표시: **[확정]** · **[제안]** · **[미결정]**

## 1. 현재 기술 구성 [확정, 0단계 기준]

| 영역 | 선택 | 버전(설치 기준) | 비고 |
|---|---|---|---|
| UI | React | 19.3 | |
| 언어 | TypeScript | 7.0 | `tsc -b`로 타입 검사 |
| 번들러/개발 서버 | Vite | 8.3 | `@vitejs/plugin-react` |
| 테스트 | Vitest | 5.1 | 현재 Node 환경, DOM 테스트 도구는 아직 없음 |
| 린트 | oxlint | 1.90 | Vite 기본 템플릿 구성, `--deny-warnings` |
| CI | GitHub Actions | - | `.github/workflows/ci.yml` |
| 런타임 | Node.js | `^20.19.0 \|\| >=22.12.0` | Vite 8 요구사항, `.nvmrc` = 22 |
| 게임 화면 | CSS Grid | - | 사용자 지정 |
| 저장소 | localStorage | - | 서버 없음, 사용자 지정 |

## 2. 현재 폴더 구조 [확정]

```
.
├─ .github/workflows/ci.yml   # lint, test, build
├─ .claude/
│  ├─ skills/next-task/       # /next-task: 다음 작업 수행 절차
│  └─ agents/reviewer.md      # 읽기 전용 검토 서브에이전트
├─ docs/                      # 기획, 작업 목록, 설계, 진행 기록
├─ public/favicon.svg
├─ src/
│  ├─ main.tsx                # 진입점
│  ├─ App.tsx                 # 스테이지 1, 편집기·실행 재생·결과·진행 저장 연결
│  ├─ App.test.tsx            # 렌더링 확인 테스트
│  ├─ components/             # Board, Editor, ResultModal과 렌더링 테스트
│  ├─ engine/                 # 게임 엔진, 블록 편집, editor, score(잠정 별 평가)와 단위 테스트
│  ├─ hooks/                 # usePlayback, 순수 프레임 진행 함수와 테스트
│  ├─ storage/                # progress.ts(버전 1 저장소), Node 가짜 저장소 테스트
│  ├─ stages/                 # 스테이지 1~8과 정답 검증
│  ├─ i18n/ko.ts              # 편집기·앱 화면 문구
│  └─ index.css
├─ index.html
├─ package.json, vite.config.ts, tsconfig*.json, .oxlintrc.json, .nvmrc
├─ README.md, CLAUDE.md
```

## 3. 목표 폴더 구조 [제안]

```
src/
├─ engine/        # 순수 로직: types, grid(맵 파싱·이동), interpreter(run → Frame[]), program(블록 트리 편집)
├─ stages/        # stage01.ts … , index.ts
├─ storage/       # progress.ts (localStorage, 버전 관리)
├─ hooks/         # usePlayback(재생), useProgress
├─ components/    # board/, editor/, controls/, common/
├─ pages/         # HomePage, StageSelectPage, PlayPage
├─ i18n/ko.ts     # 화면 문구
└─ styles/
```

원칙: `engine/`은 React와 DOM을 모릅니다. 이후 단원(자료구조, 알고리즘 등)을 붙일 때도 같은 경계를 씁니다.

## 4. 데이터 구조 초안 [제안]

```ts
type Block =
  | { id: string; type: 'forward' | 'turnLeft' | 'turnRight' }
  | { id: string; type: 'repeat'; count: number; body: Block[] }

type Program = Block[]

type Stage = {
  id: string; title: string; goal: string; hint: string
  grid: string[]            // 예: ["#####", "#S.G#"]  S: 출발, G: 도착, #: 벽
  startDir: 'N' | 'E' | 'S' | 'W'
  maxBlocks?: number
  starBlocks: number
  initialProgram?: Program  // 디버깅 스테이지용
  solution: Program         // 자동 테스트용
}

type Frame = { pos: { x: number; y: number }; dir: Dir; activeBlockId: string | null; event?: 'move' | 'turn' | 'bump' | 'goal' }
```

구현된 엔진은 위 구조와 함께 `Dir`, `Position`, `RunResult`를 내보냅니다. `run`은 초기 상태 프레임과 명령별 프레임, 결과(`success`, `collision`, `unfinished`, `stepLimit`)를 반환합니다. 반복 블록 자체는 실행 단계가 아니며, 1000번째 명령 후 추가 명령이 있을 때 단계 초과입니다. 맵은 `.` 또는 공백을 빈 칸으로 허용하고 출발과 도착은 각각 정확히 하나여야 합니다. 편집 함수의 경로는 각 중첩 단계의 배열 인덱스이며 빈 부모 경로는 최상위입니다.

## 5. 주요 결정

| # | 결정 | 상태 | 근거 |
|---|---|---|---|
| D1 | 기존 Android(ARCore) 샘플을 삭제하고 웹 프로젝트를 저장소 루트에 둔다 | [확정] | 사용자 승인. 기존 코드는 git 기록(`develop`의 29f8b9a)에 남아 있음 |
| D2 | React + TypeScript + Vite, CSS Grid, localStorage | [확정] | 사용자 지정 |
| D3 | 린트는 Vite 기본 템플릿의 oxlint를 사용 | [확정, 0단계] | 템플릿 기본값이고 빠르며 설정이 단순. 규칙이 부족하면 ESLint로 바꿀 수 있음 |
| D4 | 테스트는 Vitest | [확정, 0단계] | Vite 설정을 그대로 사용 |
| D5 | 실행기는 프로그램 전체를 먼저 실행해 상태 목록(`Frame[]`)을 만들고, 화면은 이를 재생만 한다 | [제안] | 한 단계 실행, 속도 조절, 블록 강조, 테스트가 쉬워짐 |
| D6 | 블록 편집기는 직접 구현(1차 클릭 방식, 이후 dnd-kit 드래그) | [제안] | Blockly는 무겁고 꾸미기 어려우며 이후 단원 UI와 맞추기 불편. 블록 4종이라 직접 구현 부담이 작음 |
| D7 | 로봇 기준 왼쪽/오른쪽 돌기 | [확정] | 사용자 결정(2026-11-20), GAME_DESIGN.md 7절 참고 |
| D8 | 배포 방식(GitHub Pages 등) | [미결정] | MVP 후반에 결정, 사용자 요청 시에만 |
| D9 | AI 작업 이어가기: CLAUDE.md 규칙 + TASKS.md 단일 작업 목록 + `/next-task` 스킬 + `reviewer` 서브에이전트 1개 | [확정, 0단계] | 사용자 요청. 긴 프롬프트 없이 같은 절차 반복. 역할은 필요할 때만 추가 |
| D11 | 브랜치는 git flow(`master` 배포, `develop` 통합, `feature/<작업 ID>-<이름>`) | [확정] | 사용자가 기존 저장소 방식대로 `git flow init -d`로 구성. 버전 태그 접두어는 [미결정](현재 없음) |
| D12 | 다중 에이전트는 저장 워크플로 `task-pipeline` 하나(계획·구현·검토 2·수정·마무리). 사용자 요청 시에만 실행 | [확정] | 사용자 요청(오케스트레이션 실험). 에이전트 최대 7개로 제한 |
| D13 | MCP: `context7`(원격 HTTP, 키 없음) + `playwright`(`@playwright/mcp@0.0.84` 고정, headless) | [확정] | 사용자 요청. 버전은 2주 이상 지난 것으로 고정. Context7을 쓸 수 없으면 공식 문서로 대체(CLAUDE.md 3-1절) |
| D10 | 유료 API·자동 실행 없음. CI는 lint/test/build만 | [확정, 0단계] | 사용자 운영 원칙. 추가하려면 방식과 비용을 먼저 설명 |

## 6. 진행 상황 저장 (T5)

- `src/storage/progress.ts`만 브라우저 localStorage에 접근합니다. 키는 `lealnspire.progress`, 저장 구조 버전은 `1`입니다.
- 저장 예: `{"version":1,"stages":{"1":{"completed":true,"bestStars":3,"lastProgram":[{"id":"f1","type":"forward"}]}}}`. 스테이지 키는 `Stage.id`입니다.
- `createProgressStore(storage?)`는 `getItem`/`setItem`만 가진 저장소를 주입받을 수 있습니다. 기본 저장소 접근, 읽기 또는 쓰기가 실패하면 메모리 상태로 계속 동작합니다. 새로고침을 넘는 보존은 브라우저 저장소가 사용 가능할 때만 보장합니다.
- JSON 파싱 실패·다른 버전·잘못된 최상위 구조는 빈 진행 상황으로 초기화합니다. 잘못된 스테이지 항목은 개별적으로 버립니다. 완료 여부, 정수 별 0~3, 프로그램 블록 타입·고유한 비어 있지 않은 ID·반복 몸체·정수 횟수 2~10을 검증합니다.
- `saveProgram`은 완료 여부와 최고 별을 유지합니다. `completeStage`는 완료를 기록하고 최고 별을 최댓값으로 유지합니다. 입출력 프로그램은 복사하여 외부 변경으로부터 보호합니다.
- `isUnlocked(progress, stageIndex)`는 0 기반 인덱스를 사용합니다. 첫 스테이지는 항상 열리고 이후에는 `stages` 배열의 직전 스테이지가 완료되어야 열립니다. 유효하지 않은 인덱스는 닫힘입니다(T6에서 사용).
- App은 저장 코드 → `initialProgram` → 빈 프로그램 순으로 시작합니다. 편집 이벤트마다 즉시 저장하고 재생이 성공으로 끝나면 완료 여부·최고 별을 기록합니다. 빈 저장 코드도 유지합니다.
