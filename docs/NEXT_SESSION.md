# 다음 세션 안내 (NEXT_SESSION)

> 이 파일은 작업이 끝날 때마다 덮어씁니다. 작업 목록은 [TASKS.md](TASKS.md), 과거 기록은 [WORK_HISTORY.md](WORK_HISTORY.md)에 있습니다.

마지막 갱신: 2026-11-20 · 작업 브랜치 `claude/blissful-keller-3yrx8x`

## 시작하는 법

Claude Code에서 다음 중 하나를 입력합니다.

- `/next-task` — TASKS.md에서 다음 작업 하나를 골라 수행
- `/next-task T1` — 특정 작업 수행

## 현재 상태

- T0(뼈대, 문서, 자동화, 오케스트레이션): **완료**(로컬 검증과 GitHub Actions 모두 통과)
- 게임 기능: 아직 없음(자리표시 화면만 있음)

## 마지막 검증 결과

| 항목 | 결과 | 환경 |
|---|---|---|
| `npm run lint` | 통과 | 로컬, Node 22.23.5 |
| `npm run test` | 통과(1개) | 로컬 |
| `npm run build` | 통과 | 로컬 |
| 브라우저 렌더링 | 통과, 콘솔 오류 0건 | 로컬 헤드리스 Chromium |
| GitHub Actions | 통과 | [run #1](https://github.com/jobchoi/Lealnspire/actions/runs/44645760569), 커밋 599e085 |

## 사용자 결정 대기

0. **0단계를 `develop`에 반영하는 방식**: (A) `feature/T0-setup` 브랜치로 옮겨 PR(권장) · (B) 현재 `claude/blissful-keller-3yrx8x`에서 바로 PR. PR 병합은 사용자가 합니다.
1. **D1 회전 방식**: 로봇 기준 왼쪽/오른쪽 돌기(권장, 잠정 적용) 또는 화면 기준 상하좌우. T1이 이 결정에 막혀 있습니다.
2. 스테이지 초안(CURRICULUM.md 3절) 승인
3. 블록 편집기 직접 구현안(ARCHITECTURE.md D6) 승인

## 다음 작업

1. 사용자가 D1(회전 방식)을 결정하면 T1(게임 엔진) 시작
2. D1 결정 전에는 `/next-task`가 구현 없이 결정 요청만 보고합니다
