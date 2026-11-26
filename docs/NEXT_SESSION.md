# 다음 세션 안내 (NEXT_SESSION)

> 이 파일은 작업이 끝날 때마다 덮어씁니다. 작업 목록은 [TASKS.md](TASKS.md), 과거 기록은 [WORK_HISTORY.md](WORK_HISTORY.md)에 있습니다.

마지막 갱신: 2026-11-27 · 기준 줄기 브랜치 `feature/T60-parameters`(develop·master와 같음) · 버전 **v1.10.0**

## 시작하는 법

- 먼저 [PROJECT_MAP.md](PROJECT_MAP.md) → 이 파일 → [TASKS.md](TASKS.md)
- 실행: `npm run dev` → http://localhost:5173 (영어: `?lang=en` 또는 홈의 언어 버튼)
- 검증: `npm run verify`, `npm run e2e`, `npm run e2e:prod`
- 다른 PC에서 이어 갈 때: [RESUME_ELSEWHERE.md](RESUME_ELSEWHERE.md)

## 현재 상태

- 1~10단원 구현·태그 완료(v1.0.0 순서·반복 … v1.6.0 논리 · v1.7.0 매개변수 · v1.8.0 반환값 · v1.9.0 이벤트 · v1.10.0 리스트). 단원별 설계는 `docs/design/unit*.md`
- 영어 전체, 저장 v2(v1 원본 보존), 데스크톱 맵 확대(T64 1차), E2E 워커 6(T62)
- 작업 방식(사용자, 2026-11-26): 12월 초까지 GPT(Codex) 최대 활용 — 기획·교차 검토는 GPT 읽기 전용, 구현 Codex(작업 폴더 git worktree로 두 개까지 병렬), Claude는 지시·E2E·QC·화면 수정·기록. 2026-11-26 밤~27 아침은 Claude 주간 사용량 리셋 전이라 Claude가 직접 구현도 함
- develop·master·release·태그 push는 Claude가 직접(사용자 허용 2026-11-26, `.claude/settings.json`)
- 시작할 때 반드시 `git fetch origin --prune` → 원격 브랜치·이 파일 확인(두 PC가 같은 작업을 동시에 한 적 있음)

## 마지막 검증 결과 (2026-11-27 새벽, 집 PC WSL, Claude 실행)

| 항목 | 결과 |
|---|---|
| `npm run verify` | 통과(테스트 350개) |
| `npm run e2e` | 455개 통과·4개 건너뜀(10단원 폴더, v1.10.0 직전) |
| `npm run e2e:prod` | 4개 통과 |
| GitHub Actions | 확인 못 함(`gh` 없음) |
| 알려진 제한 | 실제 모바일 기기·사파리·파이어폭스 미검증, 작은 폰(360×560)은 맵 높이 75px 규칙 |

## 병합·태그

- 태그 `v0.1.0`~`v1.10.0` 원격. develop·master·release/1.10.0 원격 반영 완료(Claude push)
- 작업 폴더(git worktree, `~/project/`): `Lealnspire`(기준 줄기), `Lealnspire-T70`(11단원 구현 중), 끝난 폴더 `Lealnspire-T63`·`-T67`·`-T69`(병합 완료 — 지워도 됨), `Lealnspire-v160`(v1.6.0 사본, UI/UX 리뷰용). **두 폴더에서 동시에 E2E를 돌리지 말 것(같은 5173 포트를 재사용해 엉뚱한 코드를 검사함)**

## 다음 작업

1. **T70 11단원 탐색**: Codex 구현 중(`../Lealnspire-T70`, 지시서 `docs/handoff/T70.md`, 설계 `docs/design/unit11-search.md`) → Claude E2E·QC → GPT 교차 검토 → v1.11.0
2. **12단원 종합**: GPT 기획 중(`~/project/_progress/logs/unit12-gpt-plan.md`) → 설계 확정 → 구현
3. 제안: T64 2차(빈 작업 공간·휴대폰), T65(지도 렌더러 PixiJS, 승인 필요), T62 관찰(워커 6에서 간헐 실패 재발 여부)
4. 사용자와 함께 논의: 연령 구분, 별 기준, 실제 배포 시점(라즈베리파이), 블로그 원고(`docs/blog/`)
