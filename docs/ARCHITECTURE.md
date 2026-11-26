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

## 2. 현재 폴더 구조 (T12)

```text
src/
  main.tsx                 # 브라우저 어댑터: storage 주입, 언어 선택, React 시작
  model/                   # 순수 TS: Program, GridModel, Interpreter, Score, 타입
    ProgressRepository.ts  # 주입 storage 읽기·쓰기, v2 검증·v1 이행·메모리 대체
    stages/index.ts        # 스테이지 1~8, 정답과 world
  controller/              # 순수 TS: AppController, GameController, EditorController
    Observable.ts          # 안정된 snapshot/subscribe
    BoardPresenter.ts      # 맵 표시 데이터 계산
    flow.ts, playback.ts   # 목록·이어하기, 프레임 진행
  view/                    # React 표시·이벤트 전달, 포커스·스크롤 등 DOM 처리
    App.tsx
    pages/                 # 첫 화면, 스테이지 목록, 게임
    components/            # 맵, 편집기, 블록 타일, 결과 모달
    hooks/useController.ts # useSyncExternalStore 어댑터
    theme/defaultTheme.ts  # 공통 Theme 인터페이스·기존 단독 렌더링 기본값
    theme/themes.ts        # 월드 등록·완료 후 교체 규칙
    theme/{sketchbook,train,handheld}.{ts,css} # 월드 표현·로컬 글꼴
    theme/Symbols.tsx      # SVG 아이콘과 방향별 캐릭터
    theme/TrainMap.tsx     # SVG 이소메트릭 섬
    theme/isometric.ts     # 좌표 변환 순수 함수
    theme/themes.test.tsx # 선택 규칙·좌표·접근성 이름 회귀
  i18n/
    I18n.ts                # t(key, params), 자동 locale 탐색, ko fallback
    locales/ko.json        # 기준 문구와 스테이지 문구
    locales/en.json        # 공식 지원 영어 전체 문구
  index.css
```

모든 소스 파일과 테스트 위치는 [PROJECT_MAP.md](PROJECT_MAP.md)를 봅니다.
기존 engine/storage/stages/hooks/pages/components는 이동 후 제거했습니다.

## 3. MVC 경계와 확장 방법

- 의존 방향: **View → Controller → Model**. View는 Model 타입을 참조할 수 있지만 규칙은 Controller에 맡깁니다. Model/Controller에는 React·DOM·브라우저 전역이 없습니다.
- Model: `program.ts`의 `Program`은 입력·출력을 복사하는 불변 트리 객체이며 add/remove/move/setCount/count/find를 제공합니다. 정적 편집 메서드와 기존 함수 별칭은 같은 구현을 사용합니다. `GridModel`, `Interpreter`, `Score`는 순수 계산 클래스입니다. Stage와 Frame 등 직렬화 데이터는 타입·레코드로 유지합니다.
- `ProgressRepository(storage?)`는 storage를 주입받습니다. `main.tsx`에서 localStorage 접근 실패 시 메모리 저장소로 생성합니다. 외부 API는 기존 Progress(version:1, lastProgram: Block[])를 유지하고 내부에서 v2 문서로 변환합니다.
- `AppController`: 화면 전환·잠금·이어하기·다음 이동, 게임 생성·해제. `GameController`: 코드 저장, 실행·프레임·속도·결과·성공 저장. `EditorController`: 블록 선택·추가 대상·상한·편집. 타이머는 GameController에만 있고 Scheduler 주입으로 테스트합니다.
- `Observable`은 상태가 변경될 때만 snapshot 객체를 교체합니다. React View는 `useController`로 구독합니다. 포커스, 모달 키보드 처리, 작업 공간 스크롤은 View 책임입니다.
- 언어 추가: `src/i18n/locales/<언어>.json` 파일 하나 추가. Vite glob으로 자동 등록하며 `?lang=<언어>`로 개발 확인합니다. 홈·목록에서 ko/en 선택기를 제공하며 lealnspire.settings에 저장합니다. main.tsx는 URL → 저장 설정 → ko 순으로 언어를 적용합니다. 점 구분 키와 `{count}` 등의 치환을 사용하며 해당 언어 → ko → 키 자체 순으로 대체합니다. `I18n.ts`의 `supportedLocales`가 공식 지원 목록(ko/en)입니다. 공식 locale은 ko와 모든 leaf key·치환 인자가 같아야 하며, 개발용 부분 locale은 ko 키의 부분집합과 같은 치환 인자를 지킵니다.
- `Stage.world`는 1~3 sketchbook, 4~6 train, 7~8 handheld입니다. View의 `themes.ts`에서 월드별 Theme를 선택합니다. 완료한 스테이지에서만 View의 임시 선택 상태로 다른 월드를 적용하며 테마 선택은 저장하지 않습니다. T13은 Model/Controller의 블록 타입과 실행 규칙을 바꾸지 않습니다.
- 기본 테마는 블록 종류·기호·이름·색 클래스·반복 표현·버튼 라벨·방향 기호를 정의합니다. CSS 클래스와 접근성 이름은 E2E 계약입니다.

## 4. 데이터 구조 초안 [제안]

```ts
type Block =
  | { id: string; type: 'forward' | 'turnLeft' | 'turnRight' }
  | { id: string; type: 'call'; fn: string }
  | { id: string; type: 'repeat'; count: number; body: Block[] }
  | { id: string; type: 'if'; condition: 'blockedAhead'; body: Block[]; else?: Block[] }
  | { id: string; type: 'while'; condition: 'clearAhead'; body: Block[] }

type FunctionDef = { id: string; icon: 'star' | 'moon'; body: Block[] }
type ProgramDocument = { main: Block[]; functions: FunctionDef[] }
type Program = Block[] // 이전 배열 API 호환

type Stage = {
  id: string; world: 'sketchbook' | 'train' | 'handheld'
  title: string; goal: string // i18n 키
  hints: { keys: [string, string]; highlight: 'path' | 'walls' | 'start' | 'goal' }
  grid: string[]            // 예: ["#####", "#S.G#"]  S: 출발, G: 도착, #: 벽
  variants?: string[][]    // 없으면 [grid], 같은 코드로 모두 성공해야 통과
  startDir: 'N' | 'E' | 'S' | 'W'
  palette?: Block['type'][] // 없으면 기존 단원 팔레트
  maxBlocks?: number
  starBlocks: number
  initialProgram?: Program  // 디버깅 스테이지용
  solution: Program         // 자동 테스트용
}

type Frame = {
  call?: { callId: string; fn: string }
  pos: { x: number; y: number }; dir: Dir; activeBlockId: string | null
  event?: 'move' | 'turn' | 'bump' | 'goal' | 'check'
  check?: { blockId: string; condition: 'blockedAhead' | 'clearAhead'; result: boolean }
  loops?: { blockId: string; iteration: number; count?: number }[]
}
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
| D14 | OOP + MVC: 순수 Model, Observable Controller, 표시 전용 React View | [확정, T12] | 사용자 요청. T13의 View 교체와 React 없는 컨트롤러 테스트를 지원 |
| D15 | 언어 리소스 JSON + I18n, 파일 자동 탐색과 ko fallback | [확정, T12] | 사용자 요청. 의존성 없이 언어 파일 하나로 확장 |
| D10 | 유료 API·자동 실행 없음. CI는 lint/test/build만 | [확정, 0단계] | 사용자 운영 원칙. 추가하려면 방식과 비용을 먼저 설명 |

## 6. 진행 상황 저장 (T36, [제안·잠정])

- `src/model/ProgressRepository.ts`만 주입 storage를 읽고 씁니다. 브라우저 localStorage 선택은 main.tsx가 담당합니다.
- 쓰기 키는 `lealnspire.progress.v2`, 문서는 `{ version: 2, stages: { [stageId]: { completed, bestStars, lastProgram: { main: Block[], functions: FunctionDef[] } } } }`입니다. [제안·잠정, T44] 함수는 최대 2개(별·달)이며 함수 몸체의 call과 없는 함수 참조를 거부합니다. `getDocument`는 문서 전체를 반환하고 기존 `getProgram`은 main을 반환합니다. `getProgress`는 version:1·Block[] 호환 표현에 함수가 있을 때만 선택적 functions 필드를 제공합니다. GameController는 doc 전체로 실행·저장·되돌리며 기존 화면용 program은 main입니다.
- 유효한 v2 최상위 구조를 우선합니다. 없거나 무효면 v1 키 `lealnspire.progress`를 읽고 순수 함수 `migrateV1toV2(raw)`로 스테이지별 이행 후 v2에 저장합니다. migrations 배열은 향후 단계별 변환을 추가할 자리입니다. v1 키는 이행·편집·완료 때 변경하지 않아 v1.0.0 롤백 시 과거 기록을 복원할 수 있습니다.
- 알 수 없는 버전은 v1 이행 없이 빈 상태로 시작하며 읽을 때 키를 삭제하거나 덮어쓰지 않습니다. 이후 일반 저장은 v2 키에만 씁니다. 최상위 구조가 유효하면 알려진 스테이지의 필드를 개별 보정하고, 알 수 없는 스테이지 ID의 항목만 제외합니다. v1 이행과 v2 읽기에 같은 규칙을 적용하고 다른 스테이지는 보존합니다.
- 완료 여부 boolean, 별 정수 0~3, forward/turnLeft/turnRight/repeat/if/while/call만 허용합니다. 반복 횟수 정수 2~10, 비어 있지 않은 고유 ID, 최상위 블록 깊이 1 기준 최대 깊이 10, main과 모든 함수 몸체를 합쳐 전체 노드 60개까지 허용합니다. 코드가 무효면 완료 여부·최고 별을 보존하고 lastProgram만 `{ main: [], functions: [] }`로 비웁니다(v2 래퍼·functions가 무효인 경우 포함). 완료 여부가 boolean이 아니면 false, 별이 0~3 정수가 아니면 0으로 해당 필드만 보정합니다.
- 불러올 때 명시된 Stage.palette 밖 블록이 중첩 가지에라도 있으면 해당 스테이지 코드만 비우고 완료·최고 별·다른 스테이지는 보존합니다.
- 읽기·쓰기 실패 시 메모리 상태로 계속 동작합니다. 이행 쓰기가 실패해도 복원한 메모리 기록과 v1 키는 유지됩니다. 입력·출력은 복사하여 외부 변경을 막습니다.
- 기록 삭제는 v1·v2 두 키를 모두 삭제 시도하고 메모리도 초기화합니다. `lealnspire.settings`의 언어 설정과 다른 앱 키는 유지합니다. 기존 기록 안내 문구는 저장 위치·내용·삭제 범위가 동일하여 유지합니다.
- `saveProgram`은 완료 여부와 최고 별을 유지하고 `completeStage`는 최고 별을 최댓값으로 유지합니다. GameController는 저장 코드 → 초기 코드 → 빈 코드 순으로 시작합니다. 빈 저장 코드도 유지합니다.
- `isUnlocked`는 첫 스테이지를 열고 이후에는 직전 스테이지 완료 여부를 봅니다. 유효하지 않은 인덱스는 닫힙니다.

## 7. 타일 작업 공간 (T10)

- 작업 공간 레이아웃은 교체 가능한 컴포넌트 `src/view/components/BlockTiles.tsx`와 `BlockTiles.css`로 분리합니다. `--tile-size`, `--tile-gap`으로 타일 크기와 간격을 조절합니다.
- EditorController는 선택 블록 ID와 repeat/if 추가 대상 ID를 따로 관리합니다. 타일 선택 후 고정 작업 막대에서 앞/뒤 이동·삭제·횟수 변경을 하고, 반복의 안에 넣기를 켜면 해당 몸체 끝에 추가합니다.
- `program.ts`의 `MAX_PROGRAM_BLOCKS = 10`과 `addBlock`이 repeat/if 몸체를 포함한 전체 추가 상한을 지킵니다. 실행기는 기존 저장 프로그램의 실행 의미를 유지합니다.


## E2E 테스트 의존성 (2026-11-21)

- `@playwright/test` 1.64.1(devDependency, 버전 고정): 사용자 시나리오 E2E(`npm run e2e`, `e2e/`). 이유: 사용자 요청으로 실제 사용자 수준 검증 필요. CI에는 아직 넣지 않음(브라우저 설치 시간). 타입 검사는 `tsconfig.e2e.json`

## T13 월드 표현

- Theme의 블록 기호는 ReactNode이며 접근성 이름은 공통 리소스, 보이는 이름·반복·실행 문구는 월드 리소스로 분리합니다. 팔레트·타일·맵에 같은 Theme를 전달합니다. Model/Controller는 변경하지 않습니다.
- 기차 지도는 순수 `isometric` 좌표 변환을 사용하는 SVG입니다. 스케치북은 SVG 거친 선 필터, 게임기는 픽셀 로봇과 CSS 주사선을 사용합니다.
- 의존성 추가(T13, Claude가 설치): `@fontsource/{gaegu, gamja-flower, do-hyeon, black-han-sans, press-start-2p}` 5.3.0. 이유: 월드별 손글씨·간판·도트 글꼴을 어느 기기에서나 같게 보이도록 외부 CDN 없이 자체 포함(오프라인·개인정보 요청 없음). 로컬 CSS로 import하며 한국어 subset과 Press Start 2P latin subset만 사용합니다.
- 전체 화면 장식은 모바일에서 패딩·테두리를 줄이고 기존 고정 맵/하단 실행 행을 유지합니다. 애니메이션은 전역 prefers-reduced-motion 규칙을 따릅니다.

### T17 예측 도전 (잠정)

- `src/model/predictions.ts`: 2·5·7번 도전과 변형 코드의 엔진 실행으로 계산한 후보. `predictions.test.ts`에서 후보 유일성·정답 1개 검증.
- `src/controller/PredictionController.ts`: 후보 선택·판정·재도전. GameController의 재생과 독립 메모리 ProgressRepository를 사용하며 정규 진행 저장은 변경하지 않음. `PredictionController.test.ts`에서 잠금·재생·저장 분리·화면 이탈 검증.
- `src/view/pages/PredictionPage.tsx`, `PredictionPage.css`: 월드 맵·후보 오버레이·고정 BlockTiles·결과. 완료한 해당 스테이지의 목록 버튼에서 진입, 돌아가면 목록. AppController가 진입 조건과 타이머 정리를 담당.

### T34 개념어·용어집 기반 [제안·잠정]

- `src/i18n/glossary.json`은 개념 ID별 `{ id, keyword, ko: { name, short }, en: { name, short }, avoid: { ko: [], en: [] } }`를 담습니다. `variable`의 키워드는 `set`, `event`는 `on`입니다. 예정 개념은 정의만 준비하며 화면에 노출하지 않습니다.
- 타일은 영어 개념어 + 기호·값, 설명·힌트·접근성 이름과 일반 버튼은 UI 언어를 씁니다. 앞으로·돌기는 기존 기호를 유지합니다. 키워드는 JSON을 import하여 `glossary.repeat.keyword`처럼 가져오며 View에 표시용 문자열로 복제하지 않습니다.
- 반복은 세 월드 모두 `repeat`와 `×N`을 표시합니다. 크레용 괄호·기차 바퀴 수 표지판·게임기 스타일은 유지합니다. 기차의 실행 회차 표시 중에는 공간 확보를 위해 바퀴 수 대신 회차 배지를 표시합니다. 팔레트의 보이는 이름은 키워드 + UI 언어 설명, 접근성 이름은 기존 계약을 유지합니다.
- `glossary.test.tsx`는 공식/개발 locale 키·치환 인자, 용어 정의, View의 표시용 JSX·반환 라벨 리터럴과 세 월드 렌더링을 검사합니다. 정적 라벨 검사는 임의의 문자열 조합 전체를 분석하는 검사기가 아니므로, 새로운 표기 경로에도 glossary 참조 원칙을 적용해야 합니다. 영어 전체 번역·공식 지원 등록은 T35입니다.

### T37 조건 실행 Model [제안·잠정]

`if`는 도달 시 이동의 충돌 판정과 같은 함수로 센서를 한 번 검사하고 `event: 'check'`, `check: { blockId, condition: 'blockedAhead', result }`를 기록합니다. 검사 중 위치·방향과 바깥 반복 회차는 유지됩니다. 검사는 명령과 같은 1000단계 상한에 포함되며 참인 몸체만 실행합니다. 알 수 없는 블록은 exhaustive switch에서 예외로 처리합니다.

`run`은 기존처럼 `grid` 하나를 실행합니다. `runAll(stage, program)`은 `variants ?? [grid]` 전체를 실행하여 `{ results, result, failedVariant }`를 반환합니다. `failedVariant`는 첫 실패의 0부터 시작하는 인덱스이며 모두 성공하면 null입니다. `failurePoint`는 이 결과도 받아 실패 변형의 원인에 `variant`를 추가합니다(기존 단일 실행 반환 형태 유지).

`editor.hasBody`가 repeat/if 공통 자식 탐색을 맡으며 Program의 개수·삽입·삭제·이동에 사용합니다. `cloneBlock`은 중첩 몸체를 복제하면서 목적지 트리와 중복되지 않는 ID를 모두 재발급합니다. 저장 v2의 main 목록에서 if 조건·몸체를 검증하며 깊이 10·노드 60·ID 중복 제한을 유지합니다. 저장 버전은 그대로 2입니다.

`src/model/conditions.test.ts`는 조건·변형·편집·저장과 지름길 전수 탐색을 검사합니다. `unit1-run.fixture.json`은 T37 이전 엔진에서 추출한 정규 8개·보너스 2개 정답·빈 코드·직진 충돌·초기 코드의 전체 프레임 회귀 기준입니다.

### T38 조건 화면·변형 재생 [제안·잠정]

GameController는 Stage.variants에만 runAll을 사용합니다. 현재 변형과 프레임 인덱스, 전체 실행 결과는 메모리 상태이며 저장하지 않습니다. 맵의 마지막 프레임을 속도 간격 동안 유지한 뒤 다음 맵의 초기 프레임으로 전환합니다. stepLimit 맵은 자동 재생 12틱 후 마지막 프레임으로 단축하고 이후 맵은 재생하지 않습니다(수동 단계 진행은 단축하지 않음). 재생 종료 위치와 전체 첫 실패 판정을 분리하며 결과·고치기는 항상 첫 실패 맵을 가리킵니다. 그 외에는 모든 맵 재생 후 전체 결과를 표시하고 전체 성공 때 별 3개를 저장합니다. 고치기는 첫 실패 변형과 원인 블록으로 복귀합니다. 저장 v2 형식과 1단원 실행·별 기준은 유지합니다. 새 의존성·파일 추가는 없습니다.

T40: 저장 검증 최대 깊이는 편집기의 블록 상한 MAX_PROGRAM_BLOCKS(10)와 일치합니다. 실패 칸·실패 블록은 현재 맵과 failure.variant가 일치할 때만 표시합니다. 결과의 실패 맵 카드 !는 유지하고 고치기는 첫 실패 맵으로 복귀합니다. 정적 영어 안내는 public/guide-en.html, 영어·조건 사용자 시나리오는 e2e/english.e2e.ts·conditions.e2e.ts입니다.

### T41 if/else [제안·잠정]

if에 선택적 `else?: Block[]`를 추가한다. 저장 버전은 v2 유지, 양쪽 가지에 같은 깊이·노드·ID 검증을 적용한다. 편집 경로의 if 인덱스 뒤 `-1`은 else 목록을 가리킨다(예: `[0,-1,0]`). `listAt`/`blockAt`이 경로 조회를 담당하고 Program.setElse는 불변 추가·제거를 제공한다. 검사 한 번으로 한 가지만 실행한다. GameController.branchChecks는 현재 실행 블록과 그 조상 블록별 최신 검사 결과를 유지하며 센서의 현재 프레임 문구와 구분한다.

### T42 조건 반복 [제안·잠정]

Block에 while/clearAhead/body를 추가하며 기존 blockedAhead 판정을 반전해 재사용한다. 검사마다 실행 단계와 check 프레임을 생성하여 빈 몸체도 유한 시간에 stepLimit으로 끝난다. RunResult.whileLimitBlockId는 원인 while을 고치기 화면에 전달한다. Frame.loops.count는 while에서는 생략한다. Stage.palette는 표시할 블록 종류를 지정하며 미지정 스테이지의 팔레트는 기존과 같다. 저장 문서는 v2를 유지하고 while의 조건 허용 목록은 clearAhead 하나다. 새로운 파일 model/while.test.ts와 docs/design/unit3-while.md가 실행·편집·저장 검증과 설계를 담는다.

### T44 함수 Model [제안·잠정]

`FunctionProgram`은 함수 생성·삭제와 main/함수 몸체 공통 편집·복제를 제공하며 ID를 문서 전체에서 재발급합니다. 정의는 0블록, call은 1블록이며 몸체를 합쳐 편집 상한 10개입니다. 함수 삭제는 main의 중첩 call도 제거합니다. 실행기는 배열과 문서를 모두 받고 call 자체는 프레임 없이 몸체 프레임에 호출 정보를 남깁니다. 실패 지점은 몸체 블록과 call 정보를 반환하며 while 상한은 whileLimitCall로 호출 문맥을 보존합니다. 함수 화면·스테이지는 T45입니다.

### T45 함수 화면·4단원 [제안·잠정]

EditorController.functionId는 편집 중인 함수 몸체를 지정합니다(undefined는 main). 선택·반복 추가 대상·이동·삭제·횟수 변경은 editProgram을 사용하고, 함수 몸체 편집은 onDocumentChange로 문서 전체를 저장합니다. 고치기는 failure.call.fn의 몸체 블록을 선택합니다. 함수 정의만 있는 빈 main도 실행 가능하여 정의와 호출의 차이를 확인할 수 있습니다.

Stage.initialFunctions/solutionFunctions는 기존 initialProgram/solution(main 배열)과 짝을 이루는 선택적 함수 정의입니다. ProgressRepository는 기록이 없을 때만 초기 함수를 사용하며 저장 이후의 빈 functions는 그대로 보존합니다. u4-1~3은 단일 variants 배열로 기존 통과 중심 별 3개 판정을 사용합니다. u3-3 뒤 순차 개방하고 각 단원 끝에서는 목록으로 돌아갑니다.

Editor의 함수 패널은 4단원에서만 나타나고 공통 팔레트·합산 상한을 사용합니다. Frame.call.callId와 fn으로 호출 타일·카드를 함께 강조하며 몸체의 activeBlockId도 표시합니다. 좁은 화면은 main/별 함수/달 함수 탭으로 작업 공간 하나를 공유하고 선택한 영역 안에서 스크롤합니다. 이동·삭제·반복 횟수·몸체 추가 대상 도구는 탭 밖 공통 작업 막대에 표시합니다. 블록 추가가 성공하면 실제 추가 위치의 탭을 표시합니다. 일반 타일 선택 후 추가는 기존 main 끝 추가 규칙을 유지하고, 함수 또는 중첩 몸체 추가 대상을 지정하면 해당 함수 탭을 유지합니다. 별·달 SVG는 Symbols에서 팔레트 호출 버튼·함수 카드·호출 타일에 재사용합니다. 실제 배치·44px·스크린샷 검증은 이 환경의 포트/Chromium 실행 제한으로 미검증입니다. 맵과 정답·전수 탐색은 [설계 기록](design/unit4-functions.md)에 있습니다.


### T47 변수 Model·저장 [제안·잠정]

- `types.ts`는 확장용 `Variable = 'A' | 'B'`를 두되 현재 블록·저장 검증은 A만 허용합니다. set(value 정수 0~20), change(by ±1), repeat.countVariable='A'를 추가합니다. 변수 반복은 count 생략이 가능하며 숫자 반복은 기존 2~10입니다.
- Interpreter는 Stage.variantVariables의 해당 변형 시작 값(없으면 A=0)으로 시작하며 함수/main이 공유합니다. 시작 값은 정수 0~20인 스테이지 데이터로 저장 코드와 무관합니다. run은 첫 변형 값을, runAll은 변형 인덱스별 값을 사용하며 누락된 항목은 A=0입니다. set/change는 1000단계에 포함되는 정지 프레임을 만들고 모든 프레임에 독립된 `variables: { A }`를 넣습니다. `variableChange`는 from/to(실패 시 시도한 값)를 남깁니다. 범위 초과는 마지막 유효 값을 유지하며 `variableRange`와 원인 블록·호출 문맥을 반환합니다. repeat A는 진입 시 횟수를 캡처하며 0회·20회도 허용합니다.
- Program.setVariableValue/toggleChange/setRepeatSource는 중첩·else 경로에서 원본을 변경하지 않고 편집합니다. 숫자로 돌아올 때 기존 count 또는 기본 3을 사용합니다. set/change는 각각 1블록입니다. v2의 validDocument 검증을 확장하며 저장 버전·키는 그대로입니다. 실행 값·프레임은 저장하지 않습니다. 구버전은 새 블록이 든 스테이지의 코드를 비우고 모르는 스테이지 ID를 무시합니다.
- `variables.test.ts`는 실행·오류·함수 공유·변형 초기화·편집·v2 왕복과 예시 맵을 검사합니다. `unit4-run.fixture.json`은 HEAD 실행기로 별도 생성한 4단원 정답 전체 결과 기준입니다. 기존 unit1/unit123 기준은 HEAD와 비교하여 모든 필드를 유지하고 각 프레임의 A=0만 추가했습니다(각 131/286프레임, 4단원 59프레임).

이전 while 예시 — **반례로 폐기**(각 7×7, 시작 방향 E):

```text
L=2      L=4
S..####  S....##
##.####  ####.##
##.G###  ####.##
##.####  ####.##
##.####  ####.G#
##.####  ####.##
##.####  ####.##
```

`set A 0; while clearAhead [F, change A +1]; R; repeat A [F]; L; F`는 9블록이며 두 맵 모두 성공합니다. 다만 **변수가 필수인 퍼즐이라는 조건은 충족하지 않습니다**. F/L/R, repeat 2~10, while(중첩·빈 몸체 포함)의 상태 변환을 최소 블록 수 순으로 열거했습니다. 두 맵의 비도착 칸×4방향은 80상태이며 성공·실패는 흡수 상태로 처리합니다. 0~4블록에서 새로 발견된 변환 수는 1/4/20/95/423개이고, 5블록에서 `repeat 9 [while clearAhead [F,L],R]` 반례를 발견하여 탐색을 종료했습니다. 즉 9블록 이하 불가능 주장은 반증되었으며 6~9블록 전체 열거는 하지 않았습니다. 반례는 실제 1000단계 제한 Interpreter에서도 양쪽 성공을 확인했습니다. 이 예시의 변수 필수 주장은 반례로 폐기했습니다. 탐색 기록은 폐기 근거로 보존하며 변수 필수 스테이지로 사용하지 않습니다.

변환 탐색은 종료하는 실행의 의미로 동등한 프로그램을 최소 비용 하나로 합칩니다. 무한 while은 실패로 합치고 엔진의 단계 상한을 완화한 탐색입니다. 그러므로 발견한 반례는 실제 엔진에서 재확인하고, 작은 크기에 해가 없다는 판단은 상한 있는 실행에도 적용됩니다. 화면·스테이지·새 의존성 추가는 이 작업 범위 밖입니다.


새 예시(Claude 확정, T47 마무리): 변수는 **맵마다 주어지는 값**을 읽기 위해 필요합니다. 두 맵의 시작 위치 (0,1), 방향 E와 출발 부근 모양은 같고 직진 통로는 꺾는 자리 뒤까지 이어집니다.

```text
A=2       A=4
##G#####  ####G###
S......#  S......#
########  ########
```

`variantVariables: [{ A: 2 }, { A: 4 }]`, `maxBlocks: 6`, 팔레트는 앞·왼·오·repeat(숫자/A)·set·change로 제한합니다. if·while·call은 없습니다. 정답 `repeat A [F], L, F`는 최상위 명령 3개이며 기존 몸체 포함 계산으로는 **4블록**입니다. 각 변형에서 A칸 직진 후 왼쪽 한 칸으로 도착합니다.

변수 블록을 제외하면 두 맵에서 동일한 명령열을 실행합니다. 성공·충돌로 멈추기 전까지 위치·방향이 같으며, 첫 번째로 서로 다른 칸에 진입할 때 한쪽 도착 칸은 다른 쪽 벽입니다. 따라서 한 맵의 성공은 다른 맵의 충돌을 뜻하므로 동시에 성공할 수 없습니다(블록 수와 무관). `variables.test.ts`는 비도착 칸×4방향 상태에 성공/실패 흡수 상태를 더한 변환으로 F/L/R, 숫자 repeat 2~10의 중첩·빈 몸체·순차 조합을 6블록까지 전수 탐색합니다. 동일한 전체 상태 변환은 최소 비용 대표 하나로 합칩니다. 실제 엔진의 실행 상한을 완화한 의미에서조차 해가 없으므로 상한 안에서도 해가 없습니다. 이전 while 예시는 반례 회귀와 while 안 change의 실행 검증으로만 남깁니다.

### T48 변수 화면 [제안·잠정]

5단원은 기존 variantVariables·프레임 variables/variableChange를 View에서 표시한다. 편집은 EditorController가 Program의 setVariableValue/toggleChange/setRepeatSource를 호출하며 저장은 기존 문서 경로를 사용한다. u5-3도 단일 변형으로 등록해 통과 중심 별 3개·순차 개방·단원 경계를 기존 변형 흐름과 공유한다. 파일 지도와 세부 규칙·전수 탐색은 PROJECT_MAP의 T48 절과 design/unit5-variables.md를 참고한다.

### T50 저장 복원 경계

저장 코드는 스테이지의 실효 팔레트로 검사한다. palette 생략 시 1단원은 이동·회전·repeat, 2단원은 여기에 if를 더한 기본 목록을 사용한다. repeat의 countVariable A는 변수 편집과 상자 표시를 제공하는 5단원에서만 복원한다. 위반한 스테이지의 코드(main·functions)만 비우며 완료 여부·최고 별과 다른 스테이지 기록은 유지한다. 구조 자체의 검증은 validDocument에서 별도로 유지한다.

### T59 6단원 옆 센서 전환 [제안·잠정]

사용자 결정(2026-11-26)으로 A=0 원자를 삭제하고 `blockedLeft`·`blockedRight`를 추가한다. 로봇 방향 기준 옆 칸의 벽·맵 밖을 검사하며 목표도 열린 칸이다. 기존 문자열 조건과 1~5단원 프레임은 유지한다. 조건 슬롯은 앞·왼·오른 막힘 세 원자와 not/and/or를 제공한다. 새 if는 blockedAhead 트리, while은 not blockedAhead 트리로 생성한다. 저장 v2를 유지하며 삭제된 aIsZero 저장 코드는 해당 스테이지만 비운다.

`model/stages/index.ts`의 u6-1~u6-4는 각 두 맵·상한 4이고 A 표시·초기값을 쓰지 않는다. `model/unit6.test.ts`는 F/L/R·순차·repeat 2~10·if/else·while의 임의 중첩과 빈 몸체를 포함해 제한 원자만 쓰는 4블록 이하 해의 부재를 증명한다. Board와 TrainMap은 검사한 원자마다 상대 방향의 칸을 표시한다. 상세 맵·정답·증명 범위는 [unit6-logic.md](design/unit6-logic.md)를 참조한다.

### T60 매개변수와 호출 지역 값 [제안·잠정]

함수 입력은 `param?: true` 하나이고 인자는 숫자(0~20) 또는 A다. 호출 순간 평가한 값을 Frame.call.arg에 복사하고 serial로 같은 호출 타일의 반복 실행을 구별한다. `repeat countParam`은 입력 있는 함수 몸체에서만 유효하며 반복 진입 시 지역 값을 고정한다. A는 기존처럼 모든 프레임에 유지되고 별도 지역 대입은 없다. 함수 몸체의 호출은 계속 금지한다.

저장 외피 v2는 유지한다. `params: true`인 7단원에서만 param/arg/countParam을 복원하며 repeat A도 허용한다(T50의 5단원 전용 규칙을 이 스테이지까지 확장). 잘못된 인자·지역 값 문맥은 스테이지 코드만 비운다. 입력 끄기는 그 함수의 중첩 main 호출 인자를 제거하고 함수 몸체의 ◆ 원천을 보관된 숫자(없으면 3)로 바꾼다. 다른 함수는 보존하며 문서 단위로 되돌린다. 켜기는 기존 호출에 기본 인자 2를 채운다.

추가 파일은 `model/unit7.test.ts`와 `model/unit123456-run.fixture.json`이다. 전자는 A=2/4를 상태에 포함한 모든 통행 위치·방향의 변환 합성으로 F/L/R·숫자/A repeat·main 호출·임의 중첩·빈 몸체·별/달 함수 몸체 조합을 상한 6까지 검사한다. 정의 몸체도 블록 수에 포함한다. 동치 변환은 최소 비용 대표만 남기고 합성 작업을 퍼즐당 100만 회로 제한한다. 후자는 T60 이전 실행기로 생성한 1~6단원 전체 프레임 회귀 기준이다. 새 라이브러리·외부 API·설정 변경은 없다.

### T63 반환값 [제안·잠정]

`return.value`는 숫자 0~20, A, 호출 지역 입력(param), 앞 칸 수(ahead) 중 하나다. 센서는 현재 방향으로 벽·맵 끝까지 열린 칸을 목표 포함 최대 20칸 세며 위치를 바꾸지 않는다. `repeat.countCall: { fn, arg? }`는 진입 때 한 번 함수를 실행하고 반환값을 횟수로 고정한다. 문장 호출은 반환값을 버리며, 값 호출이 반환 없이 끝나면 해당 repeat를 원인으로 missingReturn이 발생한다. 함수 몸체의 모든 호출은 계속 금지한다.

실행기는 continue/return(value)/stop을 구분해 중첩 반복 안의 return도 함수 전체를 끝낸다. returns 스테이지에서는 호출·return·센서 평가가 각각 단계 예산을 소비하며 기존 1000단계/1000회 반복 진입 제한을 유지한다. 기존 단원의 호출 프레임·예산 동작은 보존한다. 반환 프레임은 호출 ID·serial·입력·return ID·값·소비 repeat ID·뒤의 미실행 블록 ID와 별도 센서 관찰값을 기록한다. GameController가 현재 변형의 재생 위치까지 반환 내역을 조회하며 다음 호출이 시작되면 이전 표시를 비운다.

저장 외피는 v2다. 새 return/countCall은 returns 스테이지에서만 복원한다. main의 return, 입력 없는 함수의 ◆, 함수 몸체의 값/문장 호출, 없는 함수, 혼합 횟수 원천과 잘못된 값/인자는 거부한다. 손상 시 해당 코드(main/functions)만 비우고 완료·별과 다른 스테이지를 보존한다. 함수 입력 전환은 main의 중첩 값 호출 인자를 정리하며, 입력 끄기는 해당 함수의 return ◆를 숫자 0으로 바꾼다. 함수 삭제는 이를 값으로 부르는 repeat도 제거한다. 모든 편집은 기존 문서 단위 되돌리기를 사용한다.

추가 파일은 unit8.test.ts와 unit1234567-run.fixture.json이다. 이전 HEAD 실행기의 1~7단원 결과를 그대로 비교하며 전수 탐색의 흡수 성공/충돌 상태와 맵 독립성 근거는 설계 문서에 기록한다. 새 의존성·라이브러리 API·설정 변경은 없다.

### T67 결정적 이벤트 [제안·잠정]

`on { signal, body }`는 main 최상위의 신호별 단일 연결 선언이다. main 종료 후와 각 처리기 종료 후에 외부 신호열에서 하나씩 공급한다. ◇/○는 각각 a/b 문을 연 뒤 FIFO에 넣고, 처리기를 하나씩 실행한다. △는 장치 변화가 없다. 연결 없는 신호는 별도 프레임으로 지나가고, main은 다시 실행하지 않는다. 신호 공급·처리기 시작·종료도 기존 1000단계 예산을 사용하며 반복 진입 1000회, 큐 64개, 총 공급 128회 상한을 둔다. 현재 외부 공급 경계에서는 큐가 최대 하나다. 큐 가득 참 경계는 실행기와 공유하는 supplySignal로 직접 검사한다.

Frame.events는 커서·큐·현재 처리기(onId/signal/serial)·문 상태·phase를 값으로 복사한다. phase는 idle/arrival/start/running/end/unconnected다. 기존 Frame.event의 이동/검사 의미는 유지한다. 초기·main 프레임은 닫힌 문 상태이며 각 변형 실행에서 초기화한다. 센서는 닫힌 문을 벽처럼 취급한다. 저장 외피 v2는 유지하며 events 스테이지에서만 on을 복원한다. 중첩·중복·알 수 없는 신호는 해당 스테이지 코드만 비우고 완료·별을 보존한다.

편집기는 on을 최상위에만 추가하고 아직 연결하지 않은 기호를 배정한다. 이미 쓰는 신호로 변경하면 두 처리기의 연결을 서로 바꿔 중복 선언을 만들지 않는다. 이 맞바꾸기도 몸체 편집·삭제·이동과 함께 기존 문서 단위 되돌리기에 포함한다. 화면은 SVG 신호/자물쇠, 텍스트·테두리로 구분하며 T64 레이아웃을 유지하고 events-page에만 추가 스타일을 적용한다. 새 파일은 unit9.test.ts와 unit12345678-run.fixture.json이며 의존성·설정·새 라이브러리 API 변경은 없다.
