# 작업 지시서 T2a — QC 후속 수정

- 지시: Claude Code · 구현: Codex(GPT) · 검증: Claude Code
- 작업 브랜치: `feature/T2a-qc-fix` (브랜치를 바꾸지 말 것, 커밋·push 금지)
- 먼저 읽을 것: `AGENTS.md`, `CLAUDE.md`, `docs/GAME_DESIGN.md` 4절, `docs/CURRICULUM.md` 3절, `docs/TASKS.md`의 T2a, `src/engine/`, `src/stages/`

## 문제 (Claude QC에서 재현)

1. 스테이지 7(`사각형 둘레`): 출발 `(0,0)` 동쪽, 도착 `(0,1)`. `turnRight, forward` 2블록으로 성공함. 학습 목표(반복할 패턴 찾기)가 무너짐.
2. `run()`: 몸체가 빈 `repeat`(count 10)를 겹치면 단계 수가 늘지 않아 1000단계 안전장치가 작동하지 않음. 실측 5겹 10ms, 6겹 12ms, 7겹 44ms(겹마다 약 10배 증가).

## 요구사항(완료 조건)

1. 스테이지 7 맵을 바꿔, 반복 블록 없이는 `starBlocks`보다 짧게 풀 수 없게 합니다. 정답은 반복을 쓰는 4블록 내외, 맵은 최대 8×8. 제목·목표·힌트를 맵에 맞게 고칩니다.
2. 회귀 테스트(`src/stages/stages.test.ts`): 모든 스테이지에서 기본 명령 3종만으로 된 일렬 프로그램 중 길이 `< starBlocks`인 성공 프로그램이 없음(전수 탐색, 테스트 1초 이내).
3. `run()` 수정: 반복 몸체 실행도 안전장치에 반영해 빈 반복을 아무리 겹쳐도 즉시 끝나게 합니다. 방법은 자유(예: 반복 1회 진입을 단계와 별도 카운터로 세서 상한 초과 시 `stepLimit`). 빈 반복만 있는 프로그램의 결과는 `unfinished`로 유지하는 것을 권장. 결과 종류를 바꾸면 이유를 보고.
4. 테스트(`src/engine/engine.test.ts`): 10겹 빈 반복(count 10)이 100ms 안에 끝남.
5. 기존 테스트를 지우거나 기대값을 근거 없이 바꾸지 않습니다.
6. 문서: `docs/CURRICULUM.md` 3절의 스테이지 7 설명, 동작 규칙이 바뀌면 `docs/GAME_DESIGN.md` 4절.
7. `npm run verify` 통과.

## 하지 말 것

- 지시서에 없는 파일 수정, 의존성 추가, 커밋, push, 브랜치 변경
- `docs/TASKS.md`, `docs/NEXT_SESSION.md`, `docs/WORK_HISTORY.md` 수정

## 보고 형식(마지막 메시지)

1. 수정한 파일
2. 요구사항 1~7 각각: 충족 / 미충족 / 미검증 + 한 줄 근거
3. 새 스테이지 7 맵과 정답
4. 실행한 명령과 결과
