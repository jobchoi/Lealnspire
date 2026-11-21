# Lealnspire

프로그래밍 경험이 없는 청소년과 성인이 **게임으로 컴퓨터과학을 배우는** 웹 프로젝트입니다.

- 첫 단원(MVP): 격자 맵에서 로봇을 목적지까지 이동시키는 **블록 코딩 퍼즐**로 명령의 순서와 반복문을 익힙니다.
- 장기 계획(미확정): 자료구조, 알고리즘, 컴퓨터 구조, 운영체제, 네트워크 단원으로 확장합니다.
- 회원가입이나 서버 없이 브라우저(localStorage)에 진행 상황을 저장합니다.

> 현재 상태: **0단계(뼈대, 문서, 자동화) 완료.** 게임 기능은 아직 구현되지 않았습니다.
> 최신 상태는 [docs/NEXT_SESSION.md](docs/NEXT_SESSION.md)를 보세요.

## 기술 구성

React 19 · TypeScript · Vite · Vitest · oxlint · GitHub Actions

## 새 PC 환경 구성(자동)

저장소를 클론한 뒤 프로젝트 폴더에서 실행합니다. 먼저 설치나 설정 변경 없이 상태를 확인할 수 있습니다.

```bash
# Linux, WSL, macOS
bash scripts/setup.sh --check
bash scripts/setup.sh
```

```powershell
# Windows PowerShell 5.1 또는 PowerShell 7
.\scripts\setup.ps1 -Check
.\scripts\setup.ps1
```

스크립트는 git과 Node를 확인하고 필요하면 Node를 준비한 뒤 `npm ci`, Playwright MCP 브라우저 설치와 `npm run verify`를 실행합니다. Claude Code의 로컬 PATH를 설정하고, GitHub SSH 인증이 확인되면 HTTPS origin을 SSH로 바꿉니다. Linux에서 브라우저 라이브러리가 누락되면 설치 명령을 안내합니다.

관리자 권한이나 sudo를 실행하지 않고, SSH 키를 만들거나 MCP 서버를 승인하지 않습니다. 실행 후 Claude Code를 재시작하고 프로젝트 MCP 서버를 승인한 다음 `/mcp`로 연결을 확인하세요. Windows에서 스크립트 실행 정책이 차단하면 현재 프로세스에 한해 `Set-ExecutionPolicy -Scope Process Bypass`를 실행한 뒤 다시 실행할 수 있습니다.

## 실행 방법

필요 환경: Node.js `^20.19.0 || >=22.12.0` (권장 버전은 `.nvmrc`의 22)

<details><summary>conda로 Node를 쓰는 경우(시스템에 Node가 없을 때)</summary>

```bash
conda create -y -n lealnspire -c conda-forge "nodejs=22"
conda activate lealnspire
```

Claude Code가 이 Node를 쓰게 하려면 `.claude/settings.local.json`(커밋하지 않음)에 PATH를 지정합니다.

```json
{ "env": { "PATH": "/home/<사용자>/miniconda3/envs/lealnspire/bin:<기존 PATH>" } }
```
</details>

```bash
npm install
```

```bash
npm run dev
```

브라우저에서 http://localhost:5173 을 엽니다.

## AI 도구(MCP) 설정

`.mcp.json`에 프로젝트용 MCP 서버 두 개가 있습니다. Claude Code를 이 폴더에서 처음 열면 사용 승인을 묻습니다.

| 서버 | 용도 | 방식 |
|---|---|---|
| `context7` | 최신 라이브러리 문서 조회 | 원격 HTTP(`https://mcp.context7.com/mcp`), API 키 없이 사용(요청 한도 낮음) |
| `playwright` | 브라우저로 화면 검증 | 로컬 `npx @playwright/mcp@0.0.84`, headless Chromium |

처음 한 번 브라우저를 설치해야 합니다.

```bash
npx -y @playwright/mcp@0.0.84 install-browser chrome-for-testing
```

연결 확인: Claude Code에서 `/mcp`를 입력해 두 서버가 connected인지 봅니다.

## 검증 방법

| 명령 | 내용 |
|---|---|
| `npm run lint` | oxlint 정적 검사(경고도 실패로 처리) |
| `npm run test` | Vitest 단위 테스트 1회 실행 |
| `npm run build` | 타입 검사(`tsc -b`) + 프로덕션 빌드 |
| `npm run e2e` | 사용자 시나리오 E2E(Playwright, 처음 한 번 `npx playwright install chromium`) |
| `npm run e2e:prod` | 배포용 빌드 E2E: 루트(`/`)와 하위 경로(`/lealnspire/`)로 빌드해 미리보기 서버(4173, 4174)에서 확인. 배포 절차는 [docs/DEPLOY.md](docs/DEPLOY.md) |
| `npm run verify` | 위 세 가지를 순서대로 실행 |

변경을 올리기 전에 실행합니다.

```bash
npm run verify
```

GitHub Actions(`.github/workflows/ci.yml`)가 모든 브랜치의 push와 pull request에서 lint, test, build를 실행합니다.

## AI와 이어서 작업하기

Claude Code에서 `/next-task`를 입력하면 CLAUDE.md 절차에 따라 docs/TASKS.md의 다음 작업 하나를 수행하고,
검증 결과와 다음 작업을 문서에 남깁니다. 특정 작업은 `/next-task T1`처럼 지정합니다.

## 문서

| 문서 | 내용 |
|---|---|
| [CLAUDE.md](CLAUDE.md) | 작업 규칙, 문서 갱신 기준, 검증 기준 |
| [docs/TASKS.md](docs/TASKS.md) | 작업 목록, 우선순위, 완료 조건 |
| [docs/GAME_DESIGN.md](docs/GAME_DESIGN.md) | 대상 사용자, 핵심 게임 루프, MVP 범위 |
| [docs/CURRICULUM.md](docs/CURRICULUM.md) | 학습 목표와 스테이지 초안 |
| [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) | 기술 구성과 주요 결정 |
| [docs/NEXT_SESSION.md](docs/NEXT_SESSION.md) | 현재 상태, 확인 결과, 다음 작업 |
| [docs/WORK_HISTORY.md](docs/WORK_HISTORY.md) | 단계별 변경 사항과 결정 기록 |
