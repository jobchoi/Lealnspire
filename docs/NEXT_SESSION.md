# 다음 세션 안내 (NEXT_SESSION)

> 이 파일은 작업이 끝날 때마다 덮어씁니다. 작업 목록은 [TASKS.md](TASKS.md), 과거 기록은 [WORK_HISTORY.md](WORK_HISTORY.md)에 있습니다.

마지막 갱신: 2026-11-25 · 작업 브랜치 `feature/T46-functions-stabilize` · 버전 **v1.4.1**

## 시작하는 법

- 먼저 [PROJECT_MAP.md](PROJECT_MAP.md) → 이 파일 → [TASKS.md](TASKS.md)
- 실행: `npm run dev` → http://localhost:5173 (영어: `?lang=en` 또는 홈의 언어 버튼)
- 검증: `npm run verify`, `npm run e2e`, `npm run e2e:prod`
- 다른 PC에서 이어 갈 때: [RESUME_ELSEWHERE.md](RESUME_ELSEWHERE.md)

## 현재 상태

- **1단원(순서·반복)**: 정규 8 + 보너스 2, 테마 월드 3종, 고치기·힌트·예측·회차·되돌리기 (v1.0.0)
- **2단원(조건 if/else)**: `if [앞 막힘]`(도달 시 한 번 검사)과 `else`, 센서 표시, 같은 코드로 맵 여러 개 통과, u2-1~u2-6, 조건 예측 (v1.1.0~v1.2.0)
- **3단원(조건 반복 while)**: `while [앞 열림]`, 끝나지 않는 반복 안내, u3-1~u3-3 (v1.3.0)
- **4단원(함수)**: 그림 카드 함수(별·달), 호출, 재귀 금지, 좁은 화면 main/함수 탭, u4-1~u4-3 (v1.4.0)
- **영어**: 전체 문구·안내 페이지, 언어 선택 유지. 개념어(`repeat`, `if`)는 영어 그대로(사용자 결정 2026-11-25)
- **저장 v2**: `lealnspire.progress.v2`, v1 원본 보존(롤백 가능)
- 작업 방식: Claude가 기획·지시서·번역·E2E·QC·기록, Codex가 구현, 기획·검토는 GPT와 교차(ROADMAP 라운드 1~3)

## 마지막 검증 결과 (2026-11-25, 집 PC WSL, Claude 실행)

| 항목 | 결과 |
|---|---|
| `npm run verify` | 통과(테스트 252개) |
| `npm run e2e` | 191개 통과 |
| `npm run e2e:prod` | 4개 통과 |
| GitHub Actions | 확인 못 함(`gh` 없음) |
| 알려진 제한 | 실제 모바일 기기·사파리·파이어폭스 미검증, 1단원 결과 창 별이 빈 테두리, 예측 후보 라벨이 로봇을 가림, if 몸체 사이 끌어 옮기기 없음(삭제 후 다시 놓기) |

## 병합·태그

- 태그 `v0.1.0`·`v0.2.0`·`v1.0.0`·`v1.1.0`·`v1.2.0`·`v1.3.0`·`v1.3.1`·`v1.4.0`·`v1.4.1` 원격에 있음. 로컬 develop·master·release/1.1.0은 v1.1.0과 그 뒤 문서 커밋까지 준비
- **develop·master push는 사용자가 실행**(`.claude/settings.json`이 AI 금지). 2026-11-25 기준 원격 develop·master는 아직 옛 상태(Android 코드). 명령: `git push origin develop master release/1.0.0 release/1.1.0 release/1.2.0 release/1.3.0 release/1.3.1 release/1.4.0 release/1.4.1`

## 다음 작업

1. 변수(T47·T48) → 논리 → 매개변수 → 반환값 → 이벤트 → 리스트(ROADMAP 라운드 3)(ROADMAP 라운드 3, TASKS T41~T57)
2. 사소한 다듬기: 1단원 결과 창 별 채우기, 예측 후보 라벨 위치
3. 사용자와 함께 논의: 연령 구분 필요 여부, 별 기준 확정, 실제 배포 시점(라즈베리파이)
