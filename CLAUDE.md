# CLAUDE.md — 작업 규칙

이 저장소에서 작업하는 사람과 AI 에이전트(Claude Code)가 따르는 규칙입니다.
Claude Code는 세션마다 이 파일을 자동으로 읽습니다.

## 0. 문서 지도

| 문서 | 역할 |
|---|---|
| [docs/NEXT_SESSION.md](docs/NEXT_SESSION.md) | **가장 먼저 읽는 문서.** 현재 상태, 마지막 검증 결과, 다음 작업, 사용자 결정 대기 항목 |
| [docs/TASKS.md](docs/TASKS.md) | 작업 목록(우선순위, 완료 조건, 상태)의 단일 출처 |
| [docs/WORK_HISTORY.md](docs/WORK_HISTORY.md) | 완료한 작업과 결정의 기록(위에 추가) |
| [docs/GAME_DESIGN.md](docs/GAME_DESIGN.md) | 대상 사용자, 게임 루프, 실행 규칙, MVP 범위 |
| [docs/CURRICULUM.md](docs/CURRICULUM.md) | 학습 목표, 스테이지 초안 |
| [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) | 기술 구성, 폴더 구조, 데이터 구조, 주요 결정 |

문서의 표시: **[확정]** 사용자가 승인함 · **[제안]** 검토 대기 · **[미결정]** 결정 필요.

## 1. 작업 시작

1. `git status`, `git branch --show-current`로 작업 트리와 브랜치를 확인합니다. 작업 브랜치는 5절 규칙을 따릅니다. 커밋되지 않은 변경이 있으면 내용부터 파악하고, 남의 변경을 덮어쓰지 않습니다.
2. NEXT_SESSION.md → TASKS.md 순서로 읽습니다.
3. 사용자가 작업을 지정하지 않았으면 TASKS.md에서 **상태가 `대기`이고 선행 작업과 사용자 결정이 모두 끝난 가장 높은 우선순위 작업 하나**를 고릅니다.
4. 고른 작업에 [미결정] 항목이 걸려 있으면 구현하지 말고 사용자에게 질문합니다.
5. 작업을 시작하면 TASKS.md의 상태를 `진행 중`으로 바꿉니다.

## 2. 구현

- **한 번에 작업 하나.** 완료 조건에 없는 기능은 임의로 넣지 않습니다. 필요해 보이면 TASKS.md에 새 작업으로 제안만 추가합니다.
- MVP 제외 목록(GAME_DESIGN.md 5절)에 있는 기능은 사용자 요청 없이 만들지 않습니다.
- `src/engine/`(게임 규칙, 실행기)은 React와 DOM에 의존하지 않는 순수 TypeScript로 작성하고 단위 테스트를 붙입니다.
- 화면 문구는 한국어입니다. 문구가 늘어나면 `src/i18n/ko.ts`로 모읍니다.
- localStorage는 `src/storage/`에서만 읽고 씁니다. 저장 구조를 바꾸면 버전 번호를 올립니다.
- 새 의존성은 꼭 필요할 때만 추가하고, 이유를 ARCHITECTURE.md에 기록합니다.
- 잠정안으로 진행해야 하면 문서에 "잠정"으로 표시하고 보고에 적습니다.

## 3. 검증

- 커밋 전에 `npm run verify`(lint → test → build)를 실행합니다. 하나라도 실패하면 완료로 처리하지 않습니다.
- `node`/`npm`을 찾지 못하면 검증을 건너뛰지 말고 "미검증(Node 없음)"으로 보고합니다. PC별 Node 경로는 `.claude/settings.local.json`(커밋 안 함)의 `env.PATH`로 지정합니다(README 참고).
- 완료 조건에 적힌 검증을 모두 실행합니다. 화면 변경은 브라우저에서 확인합니다(개발 서버 또는 헤드리스 브라우저).
- 필요하면 `reviewer` 서브에이전트에게 변경 검토를 맡깁니다(8절).
- **실행하지 않은 검증은 성공으로 기록하지 않습니다.** 실행하지 못한 항목은 "미검증"과 이유를, 실패는 출력 요약과 함께 그대로 기록합니다.
- 테스트를 통과시키려고 테스트를 건너뛰거나 지우거나 기대값을 근거 없이 바꾸지 않습니다.
- CI 결과는 GitHub에서 실제로 확인한 경우에만 "통과"로 적습니다.

## 3-1. MCP 도구 사용 규칙

프로젝트 MCP 서버는 `.mcp.json`에 있습니다: `context7`(라이브러리 문서), `playwright`(브라우저 검증).

- **라이브러리 사용 전 반드시 Context7 문서를 먼저 참고합니다.** 새 라이브러리를 쓰거나, 이미 쓰는 라이브러리(React, Vite, Vitest, oxlint, TypeScript 등)의 API를 처음 쓰거나 설정을 바꿀 때 `resolve-library-id` → 문서 조회 순서로 확인하고, `package.json`의 설치 버전에 맞는 내용인지 봅니다.
  - Context7을 쓸 수 없거나(연결 실패, 보안 정책으로 차단, 라이브러리 미등록) 내용이 설치 버전과 다르면, **후순위로 공식 문서**(react.dev, vite.dev, vitest.dev, oxc.rs, typescriptlang.org, 각 패키지의 GitHub 저장소)를 직접 읽습니다.
  - 어느 출처를 참고했는지 작업 보고에 적습니다. 기억에만 의존해 API를 쓰지 않습니다.
  - Context7에 보내는 질의에는 라이브러리 이름과 일반적인 질문만 넣고, 코드나 비밀 정보는 넣지 않습니다.
- **UI 수정 후 Playwright로 검증합니다.** 화면(`src/` 컴포넌트, CSS)을 바꾸면 `npm run dev`를 띄우고 Playwright MCP로 해당 화면을 열어 확인합니다.
  - 최소 확인: 페이지 렌더링, 변경한 요소의 동작(클릭 등), 콘솔 오류 0건. 반응형이 걸린 작업은 폭 375px도 확인합니다.
  - 확인한 내용(어떤 화면, 어떤 동작, 결과)을 보고와 WORK_HISTORY.md에 적습니다. Playwright를 쓸 수 없으면 "미검증(Playwright 없음)"으로 기록하고 완료로 처리하지 않습니다.
  - Playwright 출력(`.playwright-mcp/`)은 커밋하지 않습니다. 확인이 끝나면 개발 서버를 종료합니다.

## 4. 문서 갱신

변경과 **같은 커밋**에서 관련 문서를 갱신합니다.

| 이런 변경이 있으면 | 이 문서를 갱신 |
|---|---|
| 작업 시작·완료, 완료 조건 변경, 새 작업 제안 | docs/TASKS.md |
| 작업 종료(완료든 중단이든) | docs/NEXT_SESSION.md, docs/WORK_HISTORY.md |
| 실행·검증 명령, 필요 환경 변경 | README.md |
| 게임 규칙, 루프, MVP 범위 변경 | docs/GAME_DESIGN.md |
| 스테이지, 학습 목표 변경 | docs/CURRICULUM.md |
| 폴더 구조, 의존성, 데이터 구조, 기술 결정 변경 | docs/ARCHITECTURE.md |
| 작업 규칙, 스킬, 서브에이전트 변경 | CLAUDE.md |

- 사용자가 승인한 것만 [확정]으로 바꿉니다.
- 결정을 바꿀 때는 이전 내용을 조용히 지우지 말고 WORK_HISTORY.md에 이유를 남깁니다.
- NEXT_SESSION.md는 항상 "지금 이 저장소를 처음 보는 사람"이 다음 행동을 알 수 있게 덮어씁니다.

## 5. 브랜치 규칙 (git flow)

사용자가 `git flow init -d`(기본값)로 구성한 규칙을 따릅니다. 이 설정은 각 PC의 `.git/config`에만 있으므로 여기에 적어 둡니다.

| 브랜치 | 용도 | 만드는 곳 → 합치는 곳 |
|---|---|---|
| `master` | 배포·릴리스 | `release/*`, `hotfix/*`만 합침 |
| `develop` | 개발 통합(기본 브랜치) | `feature/*`, `bugfix/*`를 PR로 합침 |
| `feature/<작업 ID>-<이름>` | TASKS.md 작업 하나 (예: `feature/T1-engine`) | `develop` → `develop` |
| `bugfix/<이름>` | `develop`에 있는 버그 수정 | `develop` → `develop` |
| `release/<버전>` | 릴리스 준비 (예: `release/0.1.0`) | `develop` → `master`와 `develop` |
| `hotfix/<버전>` | 배포본 긴급 수정 | `master` → `master`와 `develop` |

- 작업 하나당 `feature/*` 브랜치 하나를 `develop` 최신 상태에서 만듭니다. 작업 브랜치에는 push해도 됩니다.
- push는 항상 브랜치를 명시합니다: `git push origin feature/<이름>` (처음은 `-u`). 맨 `git push`는 쓰지 않습니다. `.claude/settings.json`이 `feature/*`, `bugfix/*` push만 자동 허용하고, force push·삭제·`develop`/`master` push는 거부합니다.
- 원격은 SSH(`git@github.com:jobchoi/Lealnspire.git`)이며 인증은 각 PC의 `~/.ssh` 키를 씁니다. 키나 토큰은 저장소에 두지 않습니다.
- 작업이 끝나면 `develop`으로 가는 PR을 만들 수 있지만, **병합은 사용자가 하거나 요청할 때만** 합니다.
- `release/*`, `hotfix/*`, `support/*` 생성과 `master` 반영, 버전 태그는 사용자 요청이 있을 때만 합니다.
- 클라우드 세션이 다른 이름의 브랜치(예: `claude/...`)를 지정했더라도 위 이름 규칙을 우선하고, 어떤 브랜치를 썼는지 보고에 적습니다.

## 6. 커밋과 보고

- 커밋은 작업 단위로 하고, 메시지는 한국어로 "무엇을, 왜"를 적습니다.
- 작업이 끝나면 사용자에게 다음을 보고합니다.
  1. 수행한 작업(TASKS.md의 ID)과 완료 조건 충족 여부
  2. 변경한 파일
  3. 실행 방법
  4. 실제로 실행한 검증과 결과(미검증 항목 포함)
  5. 사용자 결정이 필요한 것, 다음 작업

## 7. 하지 않는 것(사용자 요청 없이)

- `develop` 또는 `master`에 병합·직접 push, pull request 병합
- `release/*`, `hotfix/*` 브랜치 생성, 버전 태그 추가
- 배포(GitHub Pages 등), 블로그나 외부 서비스 발행
- API 키, 토큰, 비밀번호 등 비밀 정보를 저장소·문서·커밋에 기록(`.env*`는 gitignore 대상)
- 유료 API 호출이나 자동 실행(예약 작업, AI를 호출하는 CI)을 추가. 필요하면 **방식과 예상 비용을 먼저 설명하고 승인**을 받습니다.
- 히스토리 재작성(force push, rebase로 공개 커밋 변경)

## 8. 스킬과 서브에이전트

| 이름 | 종류 | 위치 | 용도 |
|---|---|---|---|
| `/next-task` | 스킬 | `.claude/skills/next-task/SKILL.md` | 1~6절 절차로 다음 작업 하나를 수행 |
| `reviewer` | 서브에이전트 | `.claude/agents/reviewer.md` | 읽기 전용 검토: 변경이 완료 조건, 이 규칙, 문서 갱신 기준을 지키는지 확인 |
| `task-pipeline` | 워크플로 | `.claude/workflows/task-pipeline.js` | 작업 하나를 계획 → 구현 → `reviewer` 2개(범위/정확성) 독립 검토 → 필수 지적 1회 수정·재검토 → 문서·커밋·push. 에이전트 최대 7개 |

**어느 것을 쓸지**

- 작은 작업, 문서 수정: `/next-task` (에이전트 1개, 토큰 적게 씀)
- 규칙이 많은 로직(T1 엔진 등)이나 검토가 중요한 작업: `task-pipeline` 워크플로. 사용자가 "워크플로로"라고 요청할 때만 실행합니다.
- 워크플로는 Claude 구독 사용량을 단일 세션보다 몇 배 더 씁니다(에이전트마다 문맥을 새로 읽음). 유료 API 키나 외부 서비스는 쓰지 않습니다.

역할은 필요가 확인될 때만 늘립니다. 새 역할을 만들면 이 표와 WORK_HISTORY.md에 이유를 적습니다.
