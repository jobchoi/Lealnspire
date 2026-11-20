# 작업 기록 (WORK_HISTORY)

## 2026-11-20 — 집 PC(WSL)에서 4개 프로젝트 오케스트레이션 환경 재구성

- 이 PC의 작업 폴더는 `~/project`(직장 PC는 `~/workspace`). `scripts/progress-summary.sh`, `scripts/codex-run.sh`가 경로를 고정하지 않고 레포 상위 폴더를 작업 폴더로 쓰도록 변경, 학습실 레포 두 위치 모두 인식
- 클론: playX-mas(`feature/P2-adventure`), Rt_journeyPrjNum1(`feature/bank-excel-import`). 학습실 레포는 `feature/space-utilization-v1`로 전환. Lealnspire는 `feature/T1-engine`으로 전환
- 로컬 환경: 장학 기금 `.venv`(+ `.git/info/exclude`에 `.venv/`, `samples/`), conda env `study-room`(Python 3.12). `samples/sample.xlsx`(개인정보)는 이 PC에 없음
- 검증(이 PC): Lealnspire `npm run verify` 통과(테스트 22개), `setup.sh --check` 전 항목 OK, playX-mas `node --test` 6개 통과, 장학 기금 pytest 16개 통과, 학습실 backend pytest 12개 통과(추적 중인 DB 변경 없음), `progress-summary.sh` 4개 프로젝트 집계(47/20/76/66%)
- Codex CLI: VS Code 확장 내장 `codex-cli 0.171.0-alpha.13`, ChatGPT 로그인 상태 확인. `codex-run.sh` 실제 실행은 사용량이 들어 하지 않음(미검증)
- T2 화면: 헤드리스 Chromium으로 스테이지 1 렌더링 확인(3칸 맵, 로봇, 도착). TASKS 체크는 QC 마무리 때 반영 예정

## 2026-11-20 — T2 구현 (Codex, Claude QC 대기)

- 스테이지 1~8과 정답, CSS Grid 지도 및 방향 표시를 구현. 스테이지 초안과 6~8 블록 제한은 잠정.
- `npm run verify`: lint 통과, 테스트 4개 파일 22개 통과, 빌드 통과. 브라우저 스크린샷은 미검증(Claude QC 예정).
- Context7 사용 불가 및 네트워크 제한으로 라이브러리 문서 조회 미검증. 커밋·push는 Claude QC 후 예정.

## 2026-11-20 — D1 결정 및 T1 Codex 구현

- 사용자가 D1을 A안(로봇 기준 왼쪽/오른쪽 회전)으로 확정하여 기존 잠정안을 확정으로 변경.
- Codex 구현: 순수 TypeScript 게임 엔진, 블록 트리 편집 함수 및 단위 테스트.
- 로컬 `npm run verify` 통과: lint, 테스트 11개, build. Claude QC 및 커밋은 대기.


새 기록은 위에 추가합니다. 검증 결과는 실제로 실행한 것만 적습니다.

---

## 다중 프로젝트 병렬 오케스트레이션, 플레이북 초안 (2026-11-20)

- 4개 Codex 작업 동시 실행(playX-mas 기획·뼈대, 장학 기금 카뱅 가져오기 계획, 학습실 상태 정리, 이 레포 플레이북)
- 추가: `scripts/codex-run.sh`(Codex 실행 + `~/workspace/_progress/PROGRESS.md` 진행 기록. 시작/종료는 스크립트, 단계는 Codex 자기 보고. Codex 쓰기는 대상 레포+진행 폴더만)
- 시행착오: 백그라운드 `codex exec`가 stdin 입력 대기로 멈춤 → `< /dev/null`로 해결, 재실행 후 4개 모두 exit=0
- 추가(Codex 작성): `docs/playbook/`. Claude QC: 개인정보 노출 없음 확인. 내용 세부 검토는 미실시

---

## T0b 환경 구성 스크립트 — Codex 구현, Claude 검증 (2026-11-20)

- 사용자 방침: Claude 토큰은 최소로, GPT(Codex)는 최대한 활용. 실행은 Claude가 `codex exec`로 함(사용자 승인)
- Codex: `.claude/settings.json` 읽기 전용 검토 → 맨 앞 `//` 주석 때문에 JSON이 깨져 설정 전체가 무시됨을 발견(사용자가 수정 예정). 패턴 기반 deny는 우회 가능하므로 GitHub 브랜치 보호 권장
- Codex: `scripts/setup.sh`, `scripts/setup.ps1`(UTF-8 BOM), README 절 작성. 스스로 요구사항 1을 미충족, 나머지 대부분을 미검증으로 정직하게 보고
- Claude 검증: Linux 전체 실행 통과(npm ci, 브라우저, PATH, verify), Windows PowerShell 5.1 `-Check` 정상 동작. 점검 모드가 conda env의 Node를 못 찾는 문제 발견 → Codex에 수정 지시 → 재검증에서 전 항목 OK
- 미검증: macOS 전체, Windows 전체 설치 실행

---

## 모델 간 오케스트레이션 구성(Claude ↔ Codex) (2026-11-20)

- 사용자 요청: 환경 구성 스크립트는 GPT에게 작업을 맡겨 수행해 보기(Claude는 오케스트레이션 담당)
- 이 PC에 Codex CLI(`codex-cli 0.162.0-alpha`, VS Code 확장에 포함)가 있음을 확인. 인증 파일은 읽지 않음
- 추가: `AGENTS.md`(Codex용 안내 — 규칙은 CLAUDE.md, 커밋·push·작업 문서 수정 금지), `docs/handoff/T0b.md`(첫 작업 지시서), TASKS.md T0b, CLAUDE.md 7-1절(지시 → 실행 → 검증 → 교차 검토 → 기록)
- Claude가 먼저 만들었던 스크립트 초안은 레포에서 빼서 세션 임시 폴더에 보관(Codex가 독립적으로 구현한 뒤 비교용)
- 실행 방식(A: 사용자가 Codex 창에 입력 / B: Claude가 `codex exec`)은 사용자 결정 대기

---

## MCP 서버 구성 (2026-11-20)

- 사용자 요청: context7(라이브러리 문서), playwright(화면 검증)를 프로젝트 범위 `.mcp.json`으로 구성. context7이 보안 문제로 안 되면 공식 출처로 대체
- `context7`: 원격 HTTP 엔드포인트 사용. 로컬에서 패키지 코드를 실행하지 않아 공급망 위험이 작음. API 키 없음(비밀 정보 없음)
  - 확인: `initialize`, `tools/list` 응답 정상(서버 4.7.3). `context7.com` 홈페이지는 이 PC에서 TLS 오류(`EE certificate key too weak`)가 나지만 MCP 엔드포인트는 정상이라 대체 서버는 추가하지 않음. 대신 CLAUDE.md 3-1절에 "Context7 불가 시 공식 문서" 규칙을 둠
- `playwright`: Microsoft 공식 `@playwright/mcp`, 2주 이상 지난 0.0.84로 고정(`@latest` 미사용). headless, 프로필은 메모리(`--isolated`), 출력은 `.playwright-mcp/`(gitignore)
  - 브라우저 설치: `install-browser chrome-for-testing`(Chrome for Testing 157, `~/.cache/ms-playwright`)
  - 확인: stdio로 직접 접속해 도구 25개 확인, `npm run dev` 화면을 `browser_navigate`로 열어 제목 "Lealnspire" 확인, 콘솔 오류 0건(React DevTools 안내 INFO 1건)
- `/mcp` 화면 확인: 미검증. 이 세션은 `.mcp.json` 생성 전에 시작돼 서버를 불러오지 않았음. 재시작 후 사용자가 승인하고 `/mcp`에서 확인 필요
- CLAUDE.md 3-1절(MCP 사용 규칙), README(MCP 설정), ARCHITECTURE D13 추가
- `.claude/settings.json` 권한 추가(npm/git 자동 허용)를 사용자 위임으로 다시 시도했으나 Claude Code 안전장치가 다시 거부. 사용자가 직접 추가해야 함

---

## 오케스트레이션 설정 마무리 (2026-11-20)

- 사용자 요청: 기능 구현 전에 AI 오케스트레이션을 실험해 볼 수 있게 설정 마무리
- 로컬 Node: 이 PC(WSL)에 Node가 없어 conda env `lealnspire`(Node 22.23.5)를 만들고 `.claude/settings.local.json`의 `env.PATH`로 연결(커밋 안 함, `.gitignore`에 추가)
- 추가: 저장 워크플로 `.claude/workflows/task-pipeline.js` — 계획 → 구현 → `reviewer` 2개(범위 / 정확성) 독립 검토 → 필수 지적 1회 수정·재검토 → 문서·커밋·push
  - 구현 역할을 서브에이전트로 따로 만들지 않음. 워크플로 단계 프롬프트로 충분하고, 검토만 `reviewer`를 재사용
  - 에이전트 최대 7개로 제한(사용량 절약). 훅·예약 실행은 넣지 않음
- 문서: CLAUDE.md 3절(Node 없을 때 처리)·8절(워크플로, 선택 기준), README(conda Node), ARCHITECTURE D12, NEXT_SESSION(실행 방법, 분기 기준)
- 시도했으나 적용 안 됨: `.claude/settings.json`에 npm/git 명령 자동 허용 추가 → Claude Code 안전장치가 AI의 권한 확대를 거부. 사용자가 직접 추가하도록 안내
- 검증(로컬, Node 22.23.5): `npm ci` 후 `npm run verify` 통과(lint 0건, 테스트 1개 통과, build 성공). 워크플로 스크립트는 문법 검사만 통과, 실제 실행은 미검증(첫 실행은 T1에서)

---

## push 자동화 설정 (2026-11-20)

- 사용자 요청: 시험용 레포이므로 이 PC에서의 push는 확인 없이 자동 처리
- 로컬 remote를 HTTPS → SSH로 변경(이 PC의 기존 `~/.ssh` 키, GitHub 인증 확인). `feature/T0-setup` push 성공
- `.claude/settings.json` 추가: `feature/*`, `bugfix/*` push 자동 허용 / force push, 브랜치 삭제, `develop`·`master` push 거부
- CLAUDE.md 5절에 push 규칙(브랜치 명시, 맨 `git push` 금지) 추가
- 남은 일(사용자): GitHub Rulesets로 `develop`·`master` 직접 push 금지를 서버에서도 강제(권장)

---

## 0단계를 feature 브랜치로 옮김 (2026-11-20)

- 사용자 결정: 0단계 결과를 git flow 규칙에 맞춰 `feature/T0-setup`으로 옮겨 진행(NEXT_SESSION 결정 대기 0번의 A안)
- `feature/T0-setup`은 `claude/blissful-keller-3yrx8x`(`b2d3f6c`)에서 그대로 분기. 코드 변경 없음, 문서만 갱신
- Kotlin(ARCore) 프로젝트는 보류. `develop`(`29f8b9a`)에 그대로 남아 있고, 이 브랜치를 병합하면 `develop`에서는 삭제되지만 히스토리로 복구 가능
- 참고: git은 클론할 때 모든 브랜치의 히스토리를 받으므로, 브랜치를 나눈다고 클론 크기가 줄지는 않음. 현재 저장소 크기는 약 0.5MB. 필요하면 `git clone --single-branch -b develop` 또는 `--depth 1`로 받을 수 있음
- 검증: 로컬 미검증(이 PC의 WSL에 Node 없음). 코드 변경이 없어 push 후 GitHub Actions 결과로 확인

---

## 브랜치 규칙을 git flow로 정함 (2026-11-20)

- 사용자가 로컬에서 `git flow init -d`로 구성(배포 `master`, 개발 `develop`, 접두어 feature/ bugfix/ release/ hotfix/ support/, 태그 접두어 없음)
- CLAUDE.md 5절에 브랜치 규칙 추가, `/next-task` 스킬과 `reviewer`에 반영, ARCHITECTURE.md D11 기록
- 0단계 작업은 세션 기본 브랜치 `claude/blissful-keller-3yrx8x`에 있음. `develop` 반영 방식은 사용자 결정 대기

---

## 0단계 마무리 — push와 CI 확인 (2026-11-20)

- GitHub 권한이 해결된 뒤 `599e085`를 작업 브랜치에 push(이전 시도들은 403으로 실패)
- GitHub Actions [run #1](https://github.com/jobchoi/Lealnspire/actions/runs/44645760569): 성공(lint, test, build). T0를 완료로 변경

---

## 0단계 — 프로젝트 뼈대, 문서, 자동화 (2026-11-19)

### 작업 전 확인

- 경로: `/home/user/Lealnspire`, 원격: `https://github.com/jobchoi/Lealnspire`
- 작업 브랜치: `claude/blissful-keller-3yrx8x` (원격 브랜치와 같은 커밋 `29f8b9a`)
- 원격 기본 브랜치: `develop` (`29f8b9a`, 작업 브랜치와 같음). `master`는 최초 커밋 `d5ca38e`만 있고 `develop`에 포함됨
- 커밋되지 않은 파일, 추적되지 않은 파일: 없음
- 결론: 삭제 대상(`MyApplication_kt/` 45개 파일, Android용 `.gitignore`)은 모두 원격 `develop`에 저장되어 있음

### 변경 사항

- 삭제: `MyApplication_kt/`(Android ARCore 샘플), 기존 `.gitignore`
- 추가: Vite React-TS 템플릿 기반 뼈대(데모 코드와 이미지는 제거하고 자리표시 화면으로 교체)
- 추가: Vitest와 렌더링 확인 테스트 1개(`src/App.test.tsx`)
- 추가: npm 스크립트 `lint`, `typecheck`, `test`, `test:watch`, `build`, `verify`
- 추가: GitHub Actions CI(`npm ci` → lint → test → build)
- 추가: README.md, CLAUDE.md, docs/ 문서 6개

- 추가(오케스트레이션): docs/TASKS.md(우선순위, 완료 조건), CLAUDE.md 작업 절차 개편, `/next-task` 스킬, `reviewer` 서브에이전트
- 보강: `.gitignore`에 `.env*` 추가(비밀 정보 커밋 방지)

### 결정

- D1 기존 Android 샘플 삭제, 루트에 웹 프로젝트(사용자 승인)
- D3 린트는 oxlint, D4 테스트는 Vitest(템플릿 기본 구성을 따름)
- 회전 방식은 미결정. 문서는 잠정 권장안(로봇 기준 돌기)으로 작성
- 서브에이전트는 읽기 전용 `reviewer` 하나만 둔다. 구현 역할을 나누면 이 규모에서는 문맥 전달 비용이 더 크다고 판단
- 자동 실행(예약 작업, AI를 호출하는 CI)은 넣지 않는다. CI는 무료인 lint/test/build만 실행

### 검증 결과(로컬, Node 22.23.5 / npm 10.9.9)

- `npm run lint`: 통과(0건). 일부러 `debugger` 문을 넣은 파일로 실패(exit 1)하는 것도 확인 후 제거
- `npm run test`: 통과(테스트 파일 1개, 테스트 1개)
- `npm run build`: 통과(`tsc -b` + `vite build`)
- `npm run dev`: 5173 포트에서 페이지 응답 확인
- 프로덕션 빌드(`vite preview`)를 헤드리스 Chromium으로 열어 제목 렌더링과 콘솔 오류 0건 확인
- GitHub Actions: 미검증. `git push`가 403(Claude GitHub 앱에 저장소 권한 없음)으로 실패해 원격 실행 전
