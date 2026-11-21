# 다음 세션 안내 (NEXT_SESSION)

> 이 파일은 작업이 끝날 때마다 덮어씁니다. 작업 목록은 [TASKS.md](TASKS.md), 과거 기록은 [WORK_HISTORY.md](WORK_HISTORY.md)에 있습니다.

마지막 갱신: 2026-11-20 · 작업 브랜치 `feature/T12-mvc-i18n`

## 시작하는 법

- `/next-task` — TASKS.md에서 다음 작업 하나를 골라 수행
- `/next-task T3` — 특정 작업 수행
- 다른 PC에서 이어 갈 때: [RESUME_ELSEWHERE.md](RESUME_ELSEWHERE.md)

> T0~T2가 아직 `develop`에 병합되지 않았습니다. 작업 브랜치는 앞 작업 브랜치에서 차례로 분기합니다(T1-engine → T2a-qc-fix → …).

## 현재 상태

- 완료: T0(뼈대·문서·CI), T0b(환경 스크립트, macOS 미검증), D1(로봇 기준 회전), T1(게임 엔진), T2(스테이지 1~8, 맵 화면), T2a(QC 후속), T3(블록 편집기), T4(실행 재생), T5(진행 저장), T6(화면 흐름), T9(저학년 UX), T10(가로 정사각형 블록·10개 상한), T11(사용자 시나리오 E2E), T12(MVC·언어 JSON·PROJECT_MAP) — **MVP 필수 작업 완료**
- 화면(기호 중심, 맵·실행 버튼 고정): 첫 화면 → 스테이지 목록(잠금·별) → 게임(맵, 편집기, 실행·재생, 힌트, 결과 모달). 진행 상황은 브라우저에 저장
- 확인 방법: `npm run dev` → http://localhost:5173

## 마지막 검증 결과 (2026-11-20, 집 PC WSL)

| 항목 | 결과 |
|---|---|
| `npm run verify` | 통과(lint, 테스트 73개, build) |
| `npm run e2e` | 통과(33개, 1개 데스크톱 전용 건너뜀) |
| GitHub Actions | 통과(`feature/T9-kid-ux` 47675ac) |
| 브라우저 | Playwright로 첫 화면부터 스테이지 1~8 UI 완주, 375px 배치, 콘솔 오류 0 |

## 사용자 결정 대기

1. **`develop` 병합**: PR 생성·병합은 사용자 요청 시에만. 병합하면 `develop`에서 옛 Android 코드가 삭제됩니다(기록은 남음)
2. 스테이지 초안(CURRICULUM.md 3절), 블록 편집기 직접 구현안(D6), 잠정 별 기준(3·2·1) 최종 승인
3. T7(드래그 앤 드롭), T8(배포) 착수 여부

## 다음 작업

1. T13 테마 월드 3종(스케치북 1~3, 기차 마을 4~6, 게임기 7~8 [확정])
3. 미검증으로 남은 것: T0b macOS·Windows 전체 설치 실행
