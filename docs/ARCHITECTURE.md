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
    ProgressRepository.ts  # 주입 storage 읽기·쓰기, 버전 1 검증·메모리 대체
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
    locales/en.json        # 일부 키만 있는 영어 예시
  index.css
```

모든 소스 파일과 테스트 위치는 [PROJECT_MAP.md](PROJECT_MAP.md)를 봅니다.
기존 engine/storage/stages/hooks/pages/components는 이동 후 제거했습니다.

## 3. MVC 경계와 확장 방법

- 의존 방향: **View → Controller → Model**. View는 Model 타입을 참조할 수 있지만 규칙은 Controller에 맡깁니다. Model/Controller에는 React·DOM·브라우저 전역이 없습니다.
- Model: `program.ts`의 `Program`은 입력·출력을 복사하는 불변 트리 객체이며 add/remove/move/setCount/count/find를 제공합니다. 정적 편집 메서드와 기존 함수 별칭은 같은 구현을 사용합니다. `GridModel`, `Interpreter`, `Score`는 순수 계산 클래스입니다. Stage와 Frame 등 직렬화 데이터는 타입·레코드로 유지합니다.
- `ProgressRepository(storage?)`는 storage를 주입받습니다. `main.tsx`에서 localStorage 접근 실패 시 메모리 저장소로 생성합니다. 저장 형식·키·버전·검증은 기존과 같습니다.
- `AppController`: 화면 전환·잠금·이어하기·다음 이동, 게임 생성·해제. `GameController`: 코드 저장, 실행·프레임·속도·결과·성공 저장. `EditorController`: 블록 선택·추가 대상·상한·편집. 타이머는 GameController에만 있고 Scheduler 주입으로 테스트합니다.
- `Observable`은 상태가 변경될 때만 snapshot 객체를 교체합니다. React View는 `useController`로 구독합니다. 포커스, 모달 키보드 처리, 작업 공간 스크롤은 View 책임입니다.
- 언어 추가: `src/i18n/locales/<언어>.json` 파일 하나 추가. Vite glob으로 자동 등록하며 `?lang=<언어>`로 개발 확인합니다. UI 선택기는 없습니다. 점 구분 키와 `{count}` 등의 치환을 사용하며 해당 언어 → ko → 키 자체 순으로 대체합니다. 키 테스트는 모든 locale 키가 ko의 부분집합인지 확인합니다.
- `Stage.world`는 1~3 sketchbook, 4~6 train, 7~8 handheld입니다. View의 `themes.ts`에서 월드별 Theme를 선택합니다. 완료한 스테이지에서만 View의 임시 선택 상태로 다른 월드를 적용하며 저장 형식은 버전 1을 유지합니다. T13은 Model/Controller의 블록 타입과 실행 규칙을 바꾸지 않습니다.
- 기본 테마는 블록 종류·기호·이름·색 클래스·반복 표현·버튼 라벨·방향 기호를 정의합니다. CSS 클래스와 접근성 이름은 E2E 계약입니다.

## 4. 데이터 구조 초안 [제안]

```ts
type Block =
  | { id: string; type: 'forward' | 'turnLeft' | 'turnRight' }
  | { id: string; type: 'repeat'; count: number; body: Block[] }

type Program = Block[]

type Stage = {
  id: string; world: 'sketchbook' | 'train' | 'handheld'
  title: string; goal: string; hint: string // i18n 키
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
| D14 | OOP + MVC: 순수 Model, Observable Controller, 표시 전용 React View | [확정, T12] | 사용자 요청. T13의 View 교체와 React 없는 컨트롤러 테스트를 지원 |
| D15 | 언어 리소스 JSON + I18n, 파일 자동 탐색과 ko fallback | [확정, T12] | 사용자 요청. 의존성 없이 언어 파일 하나로 확장 |
| D10 | 유료 API·자동 실행 없음. CI는 lint/test/build만 | [확정, 0단계] | 사용자 운영 원칙. 추가하려면 방식과 비용을 먼저 설명 |

## 6. 진행 상황 저장 (T5)

- `src/model/ProgressRepository.ts`만 주입된 storage를 읽고 씁니다. 브라우저 localStorage의 선택과 예외 처리는 main.tsx가 담당합니다. 키는 `lealnspire.progress`, 저장 구조 버전은 `1`입니다.
- 저장 예: `{"version":1,"stages":{"1":{"completed":true,"bestStars":3,"lastProgram":[{"id":"f1","type":"forward"}]}}}`. 스테이지 키는 `Stage.id`입니다.
- `createProgressStore(storage?)`는 `getItem`/`setItem`만 가진 저장소를 주입받을 수 있습니다. 브라우저 어댑터의 저장소 접근, 읽기 또는 쓰기가 실패하면 메모리 상태로 계속 동작합니다. 새로고침을 넘는 보존은 브라우저 저장소가 사용 가능할 때만 보장합니다.
- JSON 파싱 실패·다른 버전·잘못된 최상위 구조는 빈 진행 상황으로 초기화합니다. 잘못된 스테이지 항목은 개별적으로 버립니다. 완료 여부, 정수 별 0~3, 프로그램 블록 타입·고유한 비어 있지 않은 ID·반복 몸체·정수 횟수 2~10을 검증합니다.
- `saveProgram`은 완료 여부와 최고 별을 유지합니다. `completeStage`는 완료를 기록하고 최고 별을 최댓값으로 유지합니다. 입출력 프로그램은 복사하여 외부 변경으로부터 보호합니다.
- `isUnlocked(progress, stageIndex)`는 0 기반 인덱스를 사용합니다. 첫 스테이지는 항상 열리고 이후에는 `stages` 배열의 직전 스테이지가 완료되어야 열립니다. 유효하지 않은 인덱스는 닫힘입니다(T6에서 사용).
- GameController는 저장 코드 → `initialProgram` → 빈 프로그램 순으로 시작합니다. 편집 이벤트마다 즉시 저장하고 재생이 성공으로 끝나면 완료 여부·최고 별을 기록합니다. 빈 저장 코드도 유지합니다.

## 7. 타일 작업 공간 (T10)

- 작업 공간 레이아웃은 교체 가능한 컴포넌트 `src/view/components/BlockTiles.tsx`와 `BlockTiles.css`로 분리합니다. `--tile-size`, `--tile-gap`으로 타일 크기와 간격을 조절합니다.
- EditorController는 선택 블록 ID와 반복 추가 대상 ID를 따로 관리합니다. 타일 선택 후 고정 작업 막대에서 앞/뒤 이동·삭제·횟수 변경을 하고, 반복의 안에 넣기를 켜면 해당 몸체 끝에 추가합니다.
- `program.ts`의 `MAX_PROGRAM_BLOCKS = 10`과 `addBlock`이 반복 몸체를 포함한 전체 추가 상한을 지킵니다. 실행기는 기존 저장 프로그램의 실행 의미를 유지합니다.


## E2E 테스트 의존성 (2026-11-21)

- `@playwright/test` 1.64.1(devDependency, 버전 고정): 사용자 시나리오 E2E(`npm run e2e`, `e2e/`). 이유: 사용자 요청으로 실제 사용자 수준 검증 필요. CI에는 아직 넣지 않음(브라우저 설치 시간). 타입 검사는 `tsconfig.e2e.json`

## T13 월드 표현

- Theme의 블록 기호는 ReactNode이며 접근성 이름은 공통 리소스, 보이는 이름·반복·실행 문구는 월드 리소스로 분리합니다. 팔레트·타일·맵에 같은 Theme를 전달합니다. Model/Controller는 변경하지 않습니다.
- 기차 지도는 순수 `isometric` 좌표 변환을 사용하는 SVG입니다. 스케치북은 SVG 거친 선 필터, 게임기는 픽셀 로봇과 CSS 주사선을 사용합니다.
- 의존성 추가(T13, Claude가 설치): `@fontsource/{gaegu, gamja-flower, do-hyeon, black-han-sans, press-start-2p}` 5.3.0. 이유: 월드별 손글씨·간판·도트 글꼴을 어느 기기에서나 같게 보이도록 외부 CDN 없이 자체 포함(오프라인·개인정보 요청 없음). 로컬 CSS로 import하며 한국어 subset과 Press Start 2P latin subset만 사용합니다.
- 전체 화면 장식은 모바일에서 패딩·테두리를 줄이고 기존 고정 맵/하단 실행 행을 유지합니다. 애니메이션은 전역 prefers-reduced-motion 규칙을 따릅니다.
