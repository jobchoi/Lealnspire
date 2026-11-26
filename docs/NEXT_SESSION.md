# 다음 세션 안내 (NEXT_SESSION)

> 이 파일은 작업이 끝날 때마다 덮어씁니다. 작업 목록은 [TASKS.md](TASKS.md), 과거 기록은 [WORK_HISTORY.md](WORK_HISTORY.md)에 있습니다.

마지막 갱신: 2026-11-26 · 작업 브랜치 `feature/T52-logic-ui` · 버전 **v1.5.1**(6단원 포함, 버전 번호는 아직 안 올림)

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
- **5단원(변수)**: 상자 A, set·change·repeat A, 맵별 시작 값, u5-1~u5-3 (v1.5.0)
- **7단원(매개변수)**: 함수 입력 ◆, `★(2)`·`★(A)` 값 복사, u7-1~u7-3 (v1.7.0)
- **6단원(논리)**: 앞·왼·오른 막힘 센서, not/and/or(두 조건까지), 조건 편집 줄, 항별 결과 표시, u6-1~u6-4, 진리표 예측 (v1.6.0, 옆 센서 방식은 사용자 결정 2026-11-26)
- **6단원(논리 not/and/or) [잠정]**: 원자 앞 열림·앞 막힘·A=0, 연산자 하나, 원자별 결과 표시, u6-1~u6-3, 네 조합 예측 (T51·T52, 2026-11-26)
- **영어**: 전체 문구·안내 페이지, 언어 선택 유지. 개념어(`repeat`, `if`)는 영어 그대로(사용자 결정 2026-11-25)
- **저장 v2**: `lealnspire.progress.v2`, v1 원본 보존(롤백 가능)
- 작업 방식: Claude가 기획·지시서·번역·E2E·QC·기록, Codex가 구현, 기획·검토는 GPT와 교차(ROADMAP 라운드 1~3)
- **작업 방식 확정(사용자, 2026-11-26)**: 2026년 12월 초까지는 GPT(Codex)를 최대한 활용하고 Claude 사용은 지시·QC·기록으로 최소화. 12월 이후 다시 확인
- 여러 PC에서 이어서 작업합니다. 어느 PC든 시작할 때 `git fetch origin --prune` → 이 파일의 작업 브랜치로 `git switch` → `bash scripts/setup.sh`

## 마지막 검증 결과 (2026-11-26, 집 PC WSL, Claude 실행)

| 항목 | 결과 |
|---|---|
| `npm run verify` | 통과(테스트 312개) |
| `npm run e2e` | 340개 통과·4개 건너뜀 |
| `npm run e2e:prod` | 4개 통과 |
| GitHub Actions | 확인 못 함(`gh` 없음) |
| 알려진 제한 | 실제 모바일 기기·사파리·파이어폭스 미검증, 전체 E2E 부하 간헐 실패가 가끔 있음(T62) |

## 병합·태그

- 태그 `v0.1.0`~`v1.7.0` 원격에 있음. 로컬 develop·master·release/1.7.0은 v1.7.0까지 준비
- **develop·master push는 사용자가 실행**(`.claude/settings.json`이 AI 금지). 원격 develop·master는 아직 옛 상태. 명령: `git push origin develop master release/1.0.0 release/1.1.0 release/1.2.0 release/1.3.0 release/1.3.1 release/1.4.0 release/1.4.1 release/1.5.0 release/1.5.1 release/1.6.0 release/1.7.0`
- 두 PC가 같은 T51을 동시에 진행한 일이 있었음(이 PC 대안은 `feature/T51-logic-alt`에 보존, 사용하지 않음). **시작할 때 반드시 `git fetch origin --prune` 후 원격 브랜치·이 파일을 확인**

## 다음 작업

- **병렬 작업 폴더(git worktree)** — 모두 `~/project/` 아래:
  - `Lealnspire-T63` (브랜치 `feature/T63-returns`): 8단원 반환값. 구현·v1.7.0 병합 커밋, QC 1차 지적 중 2건 남음(`docs/handoff/T63.md` 'QC 1차 이어서'), 수정은 커밋 전 작업 트리에 있음
  - `Lealnspire-T67` (브랜치 `feature/T67-events`, T63 위): 9단원 이벤트. Codex가 1/4 단계에서 중단, Model 일부 수정이 커밋 전 작업 트리에 있음 → 지시서 `docs/handoff/T67.md`로 이어서
  - `Lealnspire-v160`: v1.6.0 사본(시안 비교·UI/UX 리뷰용, `npx vite --port 5180`)
- 2026-11-26 22:27 **GPT(Codex) 사용량 한도** 도달(23:36 재개 가능) — 두 Codex가 동시에 멈춤. 병렬 실행은 사용량을 두 배로 씀
1. T63 남은 2건 → Claude 전체 E2E·스크린샷 → GPT 교차 검토 → v1.8.0
2. T67 이어서 → QC → v1.9.0, 이어서 리스트·탐색 → 종합(T68~)
3. 제안: T62(E2E 부하), T64(시안 대비 다듬기), T65(지도 렌더러 PixiJS, 승인 필요)
4. 사용자와 함께 논의: 연령 구분, 별 기준, 실제 배포 시점(라즈베리파이), 블로그 원고(`docs/blog/`)
- 작업 방식(사용자, 2026-11-26): 12월 초까지 GPT(Codex) 최대 활용, GPT 두 스레드 병렬, Claude는 지시·QC·기록
