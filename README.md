# Lealnspire

프로그래밍 경험이 없는 청소년과 성인이 **게임으로 컴퓨터과학을 배우는** 웹 프로젝트입니다.

- 첫 단원(MVP): 격자 맵에서 로봇을 목적지까지 이동시키는 **블록 코딩 퍼즐**로 명령의 순서와 반복문을 익힙니다.
- 장기 계획(미확정): 자료구조, 알고리즘, 컴퓨터 구조, 운영체제, 네트워크 단원으로 확장합니다.
- 회원가입이나 서버 없이 브라우저(localStorage)에 진행 상황을 저장합니다.

> 현재 상태: **0단계(뼈대, 문서, 자동화) 로컬 검증 완료.** 게임 기능은 아직 구현되지 않았습니다.
> 최신 상태는 [docs/NEXT_SESSION.md](docs/NEXT_SESSION.md)를 보세요.

## 기술 구성

React 19 · TypeScript · Vite · Vitest · oxlint · GitHub Actions

## 실행 방법

필요 환경: Node.js `^20.19.0 || >=22.12.0` (권장 버전은 `.nvmrc`의 22)

```bash
npm install
```

```bash
npm run dev
```

브라우저에서 http://localhost:5173 을 엽니다.

## 검증 방법

| 명령 | 내용 |
|---|---|
| `npm run lint` | oxlint 정적 검사(경고도 실패로 처리) |
| `npm run test` | Vitest 단위 테스트 1회 실행 |
| `npm run build` | 타입 검사(`tsc -b`) + 프로덕션 빌드 |
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
