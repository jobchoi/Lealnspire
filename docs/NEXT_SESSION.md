# 다음 세션 안내 (NEXT_SESSION)

> 이 파일은 작업이 끝날 때마다 덮어씁니다. 작업 목록은 [TASKS.md](TASKS.md), 과거 기록은 [WORK_HISTORY.md](WORK_HISTORY.md)에 있습니다.

마지막 갱신: 2026-11-20 · 작업 브랜치 `feature/T3-editor`

## 시작하는 법

- `/next-task` — TASKS.md에서 다음 작업 하나를 골라 수행
- `/next-task T3` — 특정 작업 수행
- 다른 PC에서 이어 갈 때: [RESUME_ELSEWHERE.md](RESUME_ELSEWHERE.md)

> T0~T2가 아직 `develop`에 병합되지 않았습니다. 작업 브랜치는 앞 작업 브랜치에서 차례로 분기합니다(T1-engine → T2a-qc-fix → …).

## 현재 상태

- 완료: T0(뼈대·문서·CI), T0b(환경 스크립트, macOS 미검증), D1(로봇 기준 회전), T1(게임 엔진), T2(스테이지 1~8, 맵 화면), T2a(QC 후속), T3(블록 편집기)
- 화면: 스테이지 1의 맵과 블록 편집기. 실행, 저장, 스테이지 이동은 아직 없습니다(T4~T6)
- 확인 방법: `npm run dev` → http://localhost:5173

## 마지막 검증 결과 (2026-11-20, 집 PC WSL)

| 항목 | 결과 |
|---|---|
| `npm run verify` | 통과(lint, 테스트 30개, build) |
| GitHub Actions | 통과(`feature/T1-engine` 최신 커밋) |
| 브라우저 | 스테이지 1~8 렌더링 확인(헤드리스 Chromium, 데스크톱·375px) |

## 사용자 결정 대기

2. **`develop` 병합**: PR 생성·병합은 사용자 요청 시에만. 병합하면 `develop`에서 옛 Android 코드가 삭제됩니다(기록은 남음)
3. 스테이지 초안(CURRICULUM.md 3절)과 블록 편집기 직접 구현안(ARCHITECTURE.md D6) 최종 승인

## 다음 작업

1. T4 → T5 → T6. 사용자 승인(2026-11-20)으로 Codex 구현·Claude QC를 차례로 진행
