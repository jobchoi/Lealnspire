# 힌트 구조·강조 대상 통일 (T74) [제안·잠정]

> 기획: GPT 읽기 전용 기획(2026-11-27, 원문 `~/project/_progress/logs/T74-gpt-plan.md` — 중간 일부가 일본어로 출력돼 한국어 확정표를 따로 받음) → Claude 검토·범위 축소. 근거: 제품 점검(`product-audit-gpt.md`) "10·11단원 힌트가 로봇 맵을 강조, 리스트 칸·비교를 봐야 함".

## 1. 현재
- `hints: { keys: [string, string], highlight: 'path'|'walls'|'start'|'goal' }` — 두 단계가 맵 강조 하나를 공유. 맵 밖(팔레트·작업 공간·리스트·비교·신호·상자 A)은 강조 불가.
- 47스테이지·94힌트 중 완성 코드를 말하는 힌트는 없음. 힌트2 10개가 고칠 블록·위치를 **일부 제시**(u3-2, u4-2, u5-1, u5-2, u6-2, u6-3, u7-1, u7-2, u8-1, u9-3).

## 2. 규칙
- 힌트1 = 지금 보이는 맵·값·코드에서 찾는 **관찰**, 힌트2 = 원리와 잇는 **개념 질문**. 정답 숫자·반복 횟수·블록 배열·정확한 수정 위치·값은 말하지 않음("A에 1을 더하면?"도 금지).
- 단계마다 강조 주 대상 하나(+관계 비교가 꼭 필요할 때 보조 하나). 정답 칸·정답 블록만 골라 강조하지 않음. 힌트가 코드·탭·선택·재생을 바꾸지 않음.
- 강조 대상: `map`(기존 path/walls/start/goal), `palette`, `workspace`, `list`, `search`, `signals`, `variables`. 색만이 아니라 테두리 + 힌트 본문 "볼 곳: …" 짧은 안내.

## 3. Claude 검토 — 범위 결정
- **채택**: 단계별 강조 구조(`focus: [HintFocus, HintFocus]`), GPT 원문 2절 "단계별 권장 배정" 표 그대로, "일부 제시" 힌트2 10개를 GPT 원문 3절 개념 질문으로 교체(아래 표), 10·11·12-3 힌트1 교체.
- **보류**: 1단원·2단원 힌트1 전면 교체. 현재 문구("로봇과 별 사이의 칸을 세어 보세요")가 6~7세에게 더 구체적이고 E2E·아이 흐름에서 검증됨. GPT 교체안의 힌트2("블록 하나를 실행하면 로봇은 어떻게 움직일까요?")는 도움 수준이 떨어짐 → 아동 관찰(T76) 뒤 재검토.

| 키 | ko | en |
|---|---|---|
| u32Hint2 | 조건에 따라 계속하는 반복과 횟수가 정해진 반복은 어떻게 다를까요? | How does a loop controlled by a condition differ from one with a set count? |
| u42Hint2 | 함수를 부를 때마다 함수 안의 블록은 어떻게 실행될까요? | What happens to the blocks inside a function each time it is called? |
| u51Hint2 | 반복 횟수를 정할 때, 맵마다 달라지는 정보는 어디에서 얻을 수 있을까요? | Where can you get information that changes between maps when choosing a repeat count? |
| u52Hint2 | 반복이 다시 시작될 때, A는 처음 값 그대로일까요? | When the loop starts another round, does A still have its starting value? |
| u62Hint2 | 센서가 알려 주는 '막힘'과 찾고 싶은 '열림'은 어떤 관계일까요? | How are the sensor's "blocked" result and the "clear" state you want related? |
| u63Hint2 | 두 조건을 함께 만족해야 할 때와 하나만 만족해도 될 때는 어떻게 구별할까요? | How can you tell whether both conditions must be true or just one? |
| u71Hint2 | 함수를 부를 때 건넨 값은 함수 안에서 어떤 기호로 읽을까요? | Which symbol reads the value passed into a function? |
| u72Hint2 | 함수를 부를 때 직접 쓴 수와 A를 건네는 것은 어떻게 다를까요? | How is passing a fixed number different from passing A? |
| u81Hint2 | 함수가 돌려준 수는 호출한 곳에서 어떻게 쓸 수 있을까요? | How could the caller use a number returned by a function? |
| u93Hint2 | 도착한 신호와 실행할 처리기는 무엇으로 연결될까요? | What connects an arriving signal to the handler that runs? |
| u101Hint1 | 각 구간의 길이와 리스트 값에는 어떤 관계가 있나요? | How do the list values relate to the lengths of the path segments? |
| u102Hint1 | 리스트의 첫 칸에서 번호와 안에 든 값은 각각 무엇인가요? | What are the index and the value of the first list cell? |
| u103Hint1 | 두 리스트에서 값과 칸 수는 각각 어떻게 다른가요? | How do the values and the number of cells differ between the two lists? |
| u123Hint1 | 두 맵에서 리스트의 칸 수와 꺾는 곳은 어떻게 다른가요? | How do the number of list cells and the turning point differ between the two maps? |

(키 이름은 실제 locale 키를 확인해 맞춘다. 원래 문구는 WORK_HISTORY에 남긴다.)

## 4. 모델·화면
- `types.ts`: `HintTarget = {kind:'map', area: HintHighlight} | {kind:'palette'|'workspace'|'list'|'search'|'signals'|'variables'}`, `HintFocus = {primary, secondary?}`, `hints.focus: [HintFocus, HintFocus]`(기존 `highlight` 대체).
- `PlayPage`가 현재 단계 focus를 읽어 map이면 기존 `Board.hintHighlight`, 그 밖에는 해당 영역에 `data-hint-focus` 클래스. 저장 형식·실행기·점수 변경 없음.
- 대상 적합성 단위 테스트: list는 lists 있는 스테이지만, search는 search, signals는 signals, variables는 A 있는 스테이지만.
