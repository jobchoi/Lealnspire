# 다음 세션 안내 (NEXT_SESSION)

> 이 파일은 작업이 끝날 때마다 덮어씁니다. 작업 목록은 [TASKS.md](TASKS.md), 과거 기록은 [WORK_HISTORY.md](WORK_HISTORY.md)에 있습니다.

마지막 갱신: 2026-11-28 · 기준 브랜치 develop(master와 같음) · 버전 **v1.21.0**

## 시작하는 법

- 먼저 [PROJECT_MAP.md](PROJECT_MAP.md) → 이 파일 → [TASKS.md](TASKS.md)
- 실행: `npm run dev` → http://localhost:5173 (영어: `?lang=en` 또는 홈의 언어 버튼)
- 검증: `npm run verify`, `npm run e2e`, `npm run e2e:prod`
- 다른 PC에서 이어 갈 때: [RESUME_ELSEWHERE.md](RESUME_ELSEWHERE.md)

## 현재 상태

- **1~12단원 전 과정 완성**(v1.0.0 순서·반복 … v1.6.0 논리 · v1.7.0 매개변수 · v1.8.0 반환값 · v1.9.0 이벤트 · v1.10.0 리스트 · v1.11.0 탐색 · v1.12.0 종합·전체 완주). 정규 퍼즐 45개 + 보너스 2개. 단원별 설계는 `docs/design/unit*.md`
- 영어 전체, 저장 v2(v1 원본 보존), 데스크톱 맵 확대(T64 1차), E2E 워커 6(T62)
- 작업 방식(사용자, 2026-11-26): 12월 초까지 GPT(Codex) 최대 활용 — 기획·교차 검토는 GPT 읽기 전용, 구현 Codex(작업 폴더 git worktree로 두 개까지 병렬), Claude는 지시·E2E·QC·화면 수정·기록. 2026-11-26 밤~27 아침은 Claude 주간 사용량 리셋 전이라 Claude가 직접 구현도 함
- develop·master·release·태그 push는 Claude가 직접(사용자 허용 2026-11-26, `.claude/settings.json`)
- 시작할 때 반드시 `git fetch origin --prune` → 원격 브랜치·이 파일 확인(두 PC가 같은 작업을 동시에 한 적 있음)

## 마지막 검증 결과 (2026-11-28, 집 PC WSL, Claude 실행)

| 항목 | 결과 |
|---|---|
| `npm run verify` | 통과(테스트 445개) |
| `npm run e2e` | 663개 통과(20.5분) |
| `npm run e2e:prod` | 4개 통과 |
| GitHub Actions | 확인 못 함(`gh` 없음) |
| 알려진 제한 | 실제 모바일 기기·사파리·파이어폭스 미검증 |

## 병합·태그

- 태그 `v0.1.0`~`v1.21.0` 원격. develop·master·release/1.21.0 원격 반영(Claude push)
- 작업 폴더: `Lealnspire`(기준), `Lealnspire-review`(v1.12.3 사본, UI/UX 리뷰용 — `npx vite --port 5180`). 병합 끝난 작업 폴더는 2026-11-27 정리. 다음 작업부터 develop에서 `feature/<ID>-<이름>` 새 브랜치로(기준 폴더의 `feature/T60-parameters`는 develop과 같은 옛 이름)

## 다음 작업

1. **T84 학습자 히스토리·대시보드**(사용자 방향 2026-11-28, 설계 `docs/design/learning-history.md`): T84-1~4 완료(v1.21.0, 저장 v3). 다음 **T84-5 관리자 대시보드**(지시서 `docs/handoff/T84-5.md`, 잠금 없음=사용자 결정) → T84-6 별 기준(완료+선택 도전) → T84-7 프로젝트(블록 코딩 문제 외 프로그램 개발 — 설계 먼저) → T84-8 서버 시험(로컬 검증 뒤)
2. T73(시범)·T74(힌트 볼 곳) 완료(v1.14.0~v1.16.0). 1·2단원 힌트 전면 교체는 T76 아동 관찰 뒤 재검토
3. 실제 기기 확인(휴대폰·태블릿, 사파리·파이어폭스) — 사용자와 일정 상의
4. 제안: T65(지도 렌더러 PixiJS, 승인 필요), 새 Claude 채팅으로 UI/UX 리뷰(사용자 아이디어, `~/project/Lealnspire-review`)
5. 사용자와 함께 논의: 연령 구분, 별 기준, 종합 단원 힌트 허용 수준(GPT 2차 점검), 기록 백업 방식(T75), 실제 배포 시점(라즈베리파이), 블로그 원고(`docs/blog/`)
- 작업 방식(사용자, 2026-11-26): 12월 초까지 GPT(Codex) 최대 활용 — 기획·검토는 GPT 읽기 전용, 구현 Codex(작업 폴더 병렬), Claude는 지시·E2E·QC·화면 수정·기록
