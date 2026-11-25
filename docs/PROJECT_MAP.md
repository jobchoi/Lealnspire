# PROJECT_MAP — 에이전트 착수 지도

Lealnspire는 아이가 명령 블록과 반복으로 로봇을 목적지까지 보내며 순서를 배우는 React 웹 게임입니다.

## 착수와 실행

1. 이 문서 → CLAUDE.md 전체 → AGENTS.md → 지정된 docs/handoff/<작업 ID>.md를 읽습니다.
2. git status와 현재 브랜치를 확인하고 기존 변경을 보존합니다. Codex는 커밋·push·브랜치 변경을 하지 않습니다.
3. 현재 작업·결정은 docs/NEXT_SESSION.md와 docs/TASKS.md, 규칙은 docs/GAME_DESIGN.md, 학습 구성은 docs/CURRICULUM.md를 봅니다. 다음 단계 방향은 docs/ROADMAP.md.
4. Codex는 지시서 범위만 수정하며 TASKS/NEXT_SESSION/WORK_HISTORY는 Claude가 갱신합니다.

```sh
npm run dev     # http://localhost:5173
npm run verify  # lint → Vitest → TypeScript 검사·Vite build
npm run e2e     # Playwright 사용자 시나리오, 개발 서버 자동 시작
```

Node 22 권장(.nvmrc), npm 사용. 실행 환경은 README.md, 설계 상세는 ARCHITECTURE.md.
E2E는 Chromium과 로컬 포트 실행 권한이 필요합니다. 실행 못 한 검증은 미검증으로 보고합니다.

## 모든 소스 파일

테스트도 같은 기능 옆에 있습니다. 아래 경로는 src/ 기준입니다.

| 파일 | 역할 |
|---|---|
| `controller/AppController.ts` | 화면 전환·잠금·이어하기·다음·게임 수명 관리 |
| `controller/BoardPresenter.ts` | 맵·로봇 위치를 표시용 셀 데이터로 변환 |
| `controller/EditorController.ts` | 선택·repeat/if 추가 대상·블록 편집·상한·잠금 |
| `controller/GameController.ts` | 편집 저장·실행·프레임 재생·속도·타이머·결과·성공 저장 |
| `controller/Observable.ts` | subscribe/getSnapshot, 상태 변경 알림과 안정된 snapshot |
| `controller/controllers.test.ts` | 구독·편집·잠금·상한·가짜 타이머·저장·결과·화면 이동 |
| `controller/flow.test.ts` | 이어하기·마지막 스테이지·완료 후 다음 표시 |
| `controller/flow.ts` | 이어하기·다음 표시·스테이지 카드 데이터 계산 |
| `controller/playback.test.ts` | 프레임 경계·빈 프레임 |
| `controller/playback.ts` | 속도 간격, 다음 프레임과 마지막 프레임 계산 |
| `i18n/I18n.test.ts` | 치환·fallback·locale 키 부분집합·View 한글·MVC 플랫폼 경계 |
| `i18n/glossary.json`, `glossary.test.tsx` | 개념 키워드·한영 정의, 공식/부분 locale 키·인자와 표시 키워드 검사 |
| `i18n/I18n.ts` | 공식 지원 locale 목록(ko/en), JSON 자동 발견, 키 조회·치환, locale → ko → key fallback |
| `i18n/locales/en.json` | 공식 지원 영어 전체 문구 |
| `i18n/locales/ko.json` | 기준 한국어 리소스, 스테이지 문구 포함 |
| `index.css` | 기본 화면 배치·색·반응형 스타일 |
| `main.tsx` | 브라우저 storage 주입, ?lang 선택, React mount |
| `model/ProgressRepository.test.ts` | 손상·버전·검증·예외·복사·최고 별·저장·잠금 |
| `model/ProgressRepository.ts` | 주입 storage의 v2 문서 저장·v1 순수 이행·검증·복사·메모리 대체와 잠금 계산 |
| `model/editor.test.ts` | ID 경로·중첩 탐색·새 블록 생성 |
| `model/editor.ts` | 재귀 ID 경로 찾기, 새 블록 ID와 기본 반복 생성 |
| `model/engine.test.ts` | 맵 오류·회전·충돌·중첩 반복·성공·명령/반복 안전 상한 |
| `model/grid.ts` | GridModel: 맵 검증·파싱과 좌표 키 |
| `model/interpreter.ts` | Interpreter: 명령 실행, 프레임 생성, 1000단계·반복 진입 안전장치 |
| `model/program.test.ts` | 10개 상한·중첩 블록 수·불변 Program 소유권 |
| `model/program.ts` | 불변 Program 클래스, 정적 편집 API와 함수 별칭, 10개 상한 |
| `model/score.test.ts` | 별 평가 경계 |
| `model/score.ts` | Score: 잠정 별 3·2·1 평가 |
| `model/stages/index.ts` | 스테이지 1~8, 문구 키, world, 초기 코드·정답 |
| `model/stages/stages.test.ts` | 1~8 정답·상한·지름길 방지·world 배치 |
| `model/types.ts` | Block, Program 배열 타입, Stage(world 포함), Dir, Position, Frame, RunResult |
| `view/App.test.tsx` | 앱 첫 화면 렌더링 |
| `view/App.tsx` | 현재 화면 표시와 제목 포커스 이동 |
| `view/components/BlockTiles.css` | 타일·반복 틀·작업 막대 배치 |
| `view/components/BlockTiles.tsx` | 중첩 반복·선택·실행 강조 타일 표시 |
| `view/components/Board.test.tsx` | 벽·도착·방향·충돌 렌더링 |
| `view/components/Board.tsx` | 맵 셀·로봇·충돌 표시 |
| `view/components/Editor.interaction.test.tsx` | 선택 해제·이동·삭제·횟수·반복 대상·잠금 이벤트 |
| `view/components/Editor.test.tsx` | 중첩·aria·상한·잠금·타일·빈 반복 렌더링 |
| `view/components/Editor.tsx` | 편집 컨트롤 표시, 이벤트 전달, 타일 스크롤 처리 |
| `view/components/ResultModal.test.tsx` | 성공·실패·별·다음·마지막 안내 렌더링 |
| `view/components/ResultModal.tsx` | 결과 표시, 모달 포커스·Tab·Escape 처리 |
| `view/hooks/useController.ts` | React useSyncExternalStore 구독 어댑터(SSR snapshot 포함) |
| `view/pages/HomePage.tsx` | 첫 화면·시작·이어하기·목록 버튼 |
| `view/pages/PlayPage.tsx` | 게임 화면 조합, Controller 구독과 이벤트 전달 |
| `view/pages/StageSelectPage.tsx` | 스테이지 카드·잠금·최고 별 표시 |
| `view/pages/pages.test.tsx` | 이어하기·카드 잠금·저장 코드·힌트·다음 렌더링 |
| `view/theme/sketchbook.ts`, `sketchbook.css` | 공책·크레용 테마와 자체 포함 손글씨 글꼴 |
| `view/theme/train.ts`, `train.css` | 기차 칸·순환 선로와 마을 테마 |
| `view/theme/handheld.ts`, `handheld.css` | 게임기·도트 화면·카트리지 테마 |
| `view/theme/themes.ts`, `themes.test.tsx` | 월드 등록·완료 조건에 따른 선택과 렌더링 회귀 테스트 |
| `view/theme/Symbols.tsx` | 공통 SVG 명령·월드 아이콘, 방향별 로봇 |
| `view/theme/TrainMap.tsx`, `isometric.ts` | SVG 섬 지도와 순수 이소메트릭 좌표 변환 |
| `view/theme/defaultTheme.ts` | Theme 인터페이스와 기본 기호·이름·색 클래스·반복·버튼·방향 표현 |

## MVC와 데이터

의존 방향은 **View → Controller → Model**입니다. Model/Controller는 React·DOM·브라우저 전역에 의존하지 않습니다.
View에서 Model 타입은 참조할 수 있지만 실행·편집 규칙·저장·재생 타이머는 Controller가 처리합니다.
브라우저 환경 접근은 main.tsx가 담당하여 ProgressRepository에 storage를 주입합니다.
Model의 IO는 ProgressRepository에만 있습니다. storage 실패 시 메모리로 계속 동작합니다.
View는 포커스, 모달 키보드, 타일 스크롤과 CSS를 담당합니다.

| 타입/객체 | 의미 |
|---|---|
| Block | 고유 id + forward/turnLeft/turnRight 또는 repeat(count 2~10, body), if(condition: blockedAhead, body) |
| Program (types.ts) | 직렬화 가능한 Block[]; 저장 형식 유지 |
| Program (program.ts 클래스) | 트리를 복사하여 소유하고 새 객체로 편집; toBlocks로 복사 반환 |
| Stage | id, world, title/goal 문구 키, hints(2단계 키·강조), grid, variants?, startDir, maxBlocks?, starBlocks, initialProgram?, solution |
| Frame | pos, dir, activeBlockId, event(move/turn/bump/goal/check)?, check?, loops? |
| RunResult | frames + success/collision/unfinished/stepLimit; RunAllResult는 results/result/failedVariant |
| Progress | version:1, stages: { [id]: { completed, bestStars, lastProgram } } |
| Observable | 변경 때 snapshot을 교체하고 listener 통지, 구독 해제 함수 제공 |

Program 상한은 반복 몸체까지 합쳐 10개이며 스테이지 제한은 더 낮을 수 있습니다.
Interpreter는 목표에 도착하면 즉시 멈추고, 명령 1000개와 반복 진입 1000회에 안전장치를 둡니다.
저장 키는 lealnspire.progress.v2(version:2)이며 lastProgram은 { main: Block[], functions: [] }입니다. ProgressRepository의 외부 Progress API는 기존 version:1·Block[] 형태를 유지합니다. v2가 없거나 최상위 구조가 무효면 lealnspire.progress(v1)를 스테이지별로 이행하고 v1은 보존합니다. v1 이행·v2 읽기 모두 무효 코드는 빈 코드로, 무효 completed·bestStars는 각각 false·0으로 보정하며 다른 필드는 보존합니다. 알 수 없는 스테이지 ID만 제외합니다. 알 수 없는 버전은 이행 없이 빈 상태로 시작합니다. 삭제는 두 진행 키만 제거하고 설정은 유지합니다.
Stage.world는 1~3 sketchbook, 4~6 train, 7~8 handheld입니다. View는 world별 테마를 선택하며 완주한 스테이지는 세 월드로 다시 풀 수 있습니다.

## 화면 흐름과 메서드

첫 화면 → 시작/이어하기 → 게임 ↔ 목록 → 게임. 마지막 성공의 다음은 목록으로 갑니다.
첫 스테이지는 열려 있고 이후는 직전 스테이지 완료 시 열립니다.
이어하기는 기록이 있을 때 첫 미완료·해제 스테이지로 가며 모두 완료하면 숨깁니다.

| Controller | 주요 메서드/상태 |
|---|---|
| AppController | start, openStage(index), continue, next, list, home; progress, cards, continueIndex, game |
| GameController | edit(program), play, step, reset, dismiss, setSpeed, toggleHint, dispose; frame/result/locked/finished/stars/canNext |
| EditorController | configure, select, clear, toggleTarget, add, move, remove, setCount; selectedPath/targetPath/total/limit/atLimit |

GameController는 실행 전체를 Interpreter로 계산한 뒤 프레임만 재생합니다. 변형 맵은 순서대로 재생하고 실패 표시는 현재 맵과 failure.variant가 일치할 때만 표시합니다. 결과의 실패 맵 카드에는 !를 유지하며 고치기는 첫 실패 맵으로 돌아갑니다.
실행을 시작하면 편집이 잠기고 reset으로 해제됩니다. 성공의 마지막 프레임에서만 완료·별을 저장합니다.
속도는 800/400/150ms. 화면을 떠날 때 dispose로 타이머를 취소합니다. Scheduler는 테스트에서 주입 가능합니다.
EditorController는 선택 타일과 반복 추가 대상을 별도로 관리합니다. View는 구독 후 동작을 전달합니다.

## 이걸 바꾸려면 여기를

| 변경 | 시작 위치·함께 볼 것 |
|---|---|
| 스테이지 추가 | model/stages/index.ts + ko.json의 문구 키; 정답/잠금/이어하기 테스트와 E2E 정답 |
| 블록 종류 추가 | model/types.ts → program/editor/interpreter → controller → View Theme; 저장 검증·모든 관련 테스트 |
| 문구 수정 | i18n/locales/ko.json; aria-label은 e2e/helpers.ts 계약 확인 |
| 언어 추가 | locales/<언어>.json 하나 추가, ko 키의 부분집합; ?lang=<언어>로 확인 |
| 테마 추가(T13) | view/theme/themes.ts의 등록·선택, 각 월드 Theme·CSS·Symbols/TrainMap과 components; Model·Controller 변경 불필요 |
| 저장 구조 변경 | model/ProgressRepository.ts; version·검증·복사·손상 처리 테스트 |
| 실행/재생 변경 | model/interpreter.ts, controller/GameController.ts, playback.ts |
| 화면 이동 변경 | controller/AppController.ts, flow.ts + view/App.tsx |
| 배치 변경 | index.css, view/components/BlockTiles.css, pages/components; 작은 화면 E2E |
| 파일 추가·이동 | 이 문서의 소스 표와 ARCHITECTURE.md를 같은 작업에서 갱신 |

I18n.t(key, params)는 {name} 치환을 하고, 선택 언어 → 한국어 → key 순으로 표시합니다.
Vite import.meta.glob이 JSON 파일을 자동 등록합니다. 기본 언어는 ko이며 홈·목록에서 ko/en 언어 선택기를 제공합니다. 선택은 lealnspire.settings에 저장하고 main.tsx에서 URL → 저장 설정 → ko 순으로 적용합니다.
ko.json이 기준이며 공식 ko/en은 모든 leaf key·치환 인자가 일치해야 합니다. 개발용 부분 locale은 ko 키의 부분집합을 허용합니다.
Theme은 블록 기호·이름·CSS 클래스·반복 표현·버튼 라벨·방향 기호를 모읍니다.
T13은 테마 선택·맵 그림체 등 View 표현을 확장하고 저장된 블록 타입·실행 의미는 보존합니다.

## 테스트와 화면 계약

기존 단위 테스트의 검증을 이동 후 유지합니다. Controller는 Node에서 가짜 타이머·주입 storage로 검사합니다.
View 렌더링은 react-dom/server, 편집 상호작용은 이벤트 호출 하네스로 검사합니다.
I18n 테스트는 production View TSX의 한글 literal과 Model/Controller의 React·DOM·localStorage 의존도 검사합니다.
E2E 시나리오는 e2e/*.e2e.ts: 기호로 1~8 완주, 연타·실행 중 조작·새로고침, 상한·중첩,
키보드, 1280×720/375×667/360×560 배치·터치·버튼 크기를 검사합니다.
**e2e/helpers.ts가 화면 계약**입니다. role과 접근성 이름, .palette/.workspace/.board/.run-button/
.playback-controls/.editor/.block-active, [role=dialog], [role=status]를 유지합니다.
화면 작업은 E2E 실행과 e2e-results/screens/ 스크린샷 육안 확인까지 해야 검증 완료입니다.

T12에서 새로 참고한 API 공식 문서(Context7 도구 없음):
- React 19.3 useSyncExternalStore: https://react.dev/reference/react/useSyncExternalStore
- Vite glob import: https://vite.dev/guide/features.html#glob-import

### T17 예측 도전 (잠정)

- `src/model/predictions.ts`: 2·5·7번 도전과 변형 코드의 엔진 실행으로 계산한 후보. `predictions.test.ts`에서 후보 유일성·정답 1개 검증.
- `src/controller/PredictionController.ts`: 후보 선택·판정·재도전. GameController의 재생과 독립 메모리 ProgressRepository를 사용하며 정규 진행 저장은 변경하지 않음. `PredictionController.test.ts`에서 잠금·재생·저장 분리·화면 이탈 검증.
- `src/view/pages/PredictionPage.tsx`, `PredictionPage.css` (렌더링 검증 `PredictionPage.test.tsx`): 월드 맵·후보 오버레이·고정 BlockTiles·결과. 완료한 해당 스테이지의 목록 버튼에서 진입, 돌아가면 목록. AppController가 진입 조건과 타이머 정리를 담당.

### E2E 파일 (e2e/, 화면 계약은 helpers.ts)

| 파일 | 시나리오 |
|---|---|
| `english.e2e.ts` | 영어 선택·유지·풀이·영어 안내 페이지 |
| `conditions.e2e.ts` | 2단원 if 편집·검사·변형 재생·실패 고치기·조건 예측 |
| `journeys.e2e.ts` | 처음 온 아이 1~8 완주, 기호 구분, 4번 고치기, 연타·상한·실행 중 조작·새로고침·중첩·키보드 |
| `layout.e2e.ts` | 세 월드 + 본래 스테이지 4·8 × 3개 화면 크기 배치, 44px, 글자 잘림·쪼개짐 |
| `fix.e2e.ts` | T15 실패 지점 고치기, T22 닫은 뒤 바로 편집 |
| `hint.e2e.ts` | T16 2단계 힌트, 모든 힌트가 정답 순서를 말하지 않음 |
| `loop.e2e.ts` | T18 반복 회차(중첩 포함) |
| `undo.e2e.ts` | T19 되돌리기 1회 |
| `privacy.e2e.ts` | T20 기록 안내·삭제(다른 키 보존) |
| `predict.e2e.ts` | T17 예측 도전 |
| `bonus.e2e.ts` | T21 보너스 잠금·풀이·이전 기록 호환(T23 완주 계약) |
| `a11y.e2e.ts` | T24 대비 자동 계산, 버튼 이름, 맵 대체 설명, 동작 줄이기, 키보드 전체 흐름 |
| `records.e2e.ts` | T25 망가진 기록·저장 차단·복원·최고 별 |
| `production.prod.ts` | T27 배포 빌드(루트·/lealnspire/): 외부 요청·4xx 0, 기록 복원, 안내 페이지, 라이선스 파일 |

### 설정·정적 파일·스크립트

| 파일 | 역할 |
|---|---|
| `vite.config.ts` | Vite 설정(base 기본 `/`, 배포 시 `--base`) |
| `playwright.config.ts` | 개발 서버 E2E(`npm run e2e`): desktop·phone·small-phone(@layout만) |
| `playwright.prod.config.ts` | 배포 빌드 E2E(`npm run e2e:prod`): dist-e2e/root·subpath를 4173·4174에서 미리보기 |
| `public/favicon.svg` | 자체 제작 아이콘 |
| `public/guide-en.html` | 영어 교사·보호자 안내 정적 페이지 |
| `public/guide.html` | 교사·보호자 안내 정적 페이지(docs/GUIDE.md와 핵심 문장 일치 테스트) |
| `public/licenses/fonts.txt` | 글꼴 5종 OFL 원문(재배포 조건) |
| `scripts/codex-run.sh` | Codex 실행·진행 기록, `scripts/progress-summary.sh` 진행판 요약 |
| `scripts/setup.sh`, `setup.ps1` | 새 PC 환경 구성(T0b) |

### 문서 (docs/)

`TASKS.md`(작업 단일 출처), `NEXT_SESSION.md`(현재 상태), `WORK_HISTORY.md`(기록), `ROADMAP.md`(Claude+GPT 교차 기획 1·2), `GAME_DESIGN.md`, `CURRICULUM.md`, `ARCHITECTURE.md`, `GUIDE.md`(교사·보호자), `DEPLOY.md`(배포 절차), `ASSETS.md`(자산·라이선스), `RESUME_ELSEWHERE.md`(다른 PC에서 이어 가기), `handoff/`(Codex 지시서), `design/`(시안·QC 캡처), `playbook/`(오케스트레이션 기록), `progress/`(진행판 사본).

### T37 조건 Model [제안·잠정]

- `model/types.ts`: if/blockedAhead, check 프레임, Stage.variants, RunAllResult.
- `model/interpreter.ts`: 센서 검사·명시적 분기, runAll의 전체 변형 판정, failurePoint의 첫 실패 variant(0부터).
- `model/editor.ts`, `program.ts`: hasBody로 repeat/if 중첩 편집·개수·ID 탐색, cloneBlock으로 복제 및 ID 재발급.
- `model/ProgressRepository.ts`: v2 if 조건·몸체 검증(깊이 10·노드 60 제한).
- `model/conditions.test.ts`, `model/unit1-run.fixture.json`: 조건·변형·저장·지름길 전수 탐색 및 T37 이전 1단원 전체 프레임 회귀 기준. 화면·컨트롤러 연결은 T38.

### T38 조건 화면 [제안·잠정]

기존 GameController는 variants가 있으면 runAll 결과를 맵 순서대로 재생하고 전체 성공 때만 별 3개를 저장합니다. EditorController/BlockTiles는 hasBody로 if·repeat 중첩을 표시·편집합니다. Board/TrainMap은 검사 칸의 테두리·무늬와 센서 대체 설명을 표시합니다. PlayPage에는 변형 미리 보기·검사 상태가 있으며 StageSelectPage는 2단원을 별도로 묶습니다. model/stages/index.ts의 unit2Stages에 U2-1이 있고, 정규 8개 완료 후 보너스와 독립적으로 열립니다.


### T39 2단원 확장 [제안·잠정]

- model/stages/index.ts: U2-2~U2-4, 지정된 두 변형 맵·초기 코드·정답. stages.test.ts에서 정답·U2-4 초기 실패·if 없는 상한 이하 코드의 상태 변환 전수 탐색 검증.
- ProgressRepository.isUnlocked: 정규 8개 완료 뒤 2단원을 순차 개방. flow.test.ts에서 이어하기·다음·마지막 목록 복귀 검증.
- model/predictions.ts: p-u2-1의 별도 단일 Stage와 엔진 기반 세 후보. PredictionController는 해당 Stage로 독립 재생하며 끝난 후 첫 검사 결과를 제공. PredictionPage와 ResultModal은 검사 설명·2단원 완주 문구를 locale에서 표시.

### T41 if/else [제안·잠정]

기존 model/types·editor·program·interpreter·ProgressRepository에 선택적 else 가지와 경로 표식 -1을 확장했다. EditorController·Editor·BlockTiles는 가지 편집과 건너뜀을 표시한다. u2-5(train)·u2-6(handheld)을 unit2Stages에 이어 붙이며 stages.test.ts는 else 없는 프로그램(if 포함)의 상태 변환을 전수 탐색한다. conditions.test.ts에서 else 실행·편집·복제·저장 회귀를 검사한다. 새 소스 파일은 없다.

### T42 while [제안·잠정]

- `model/while.test.ts`: while 0회·재검사·중첩·단계 상한 원인·회차·편집·저장·개방 회귀.
- `model/types.ts`, `interpreter.ts`, `editor.ts`, `ProgressRepository.ts`: clearAhead 조건 반복, 선택적 loops.count, whileLimitBlockId와 실패 원인 추적, v2 검증.
- `model/stages/index.ts`: unit3Stages u3-1~u3-3, Stage.palette와 순차 개방. `controller/flow.ts`는 3단원까지 이어하기를 찾는다.
- 기존 Editor/BlockTiles/Board/PlayPage/StageSelectPage/ResultModal에 while 팔레트·검사·회차·완주 표시. 상세 설계는 `docs/design/unit3-while.md`.
