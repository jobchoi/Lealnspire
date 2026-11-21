# 작업 기록 (WORK_HISTORY)

## 2026-11-21 — T21 전이 보너스 2개 (구현 Codex, 기준·E2E·QC Claude), T23 범위·완주 계약 정리 (Claude) [잠정]

- T21 Codex: 보너스 b1(기차, 큰 계단)·b2(게임기, 앞뒤가 있는 길), 8번 완료 후 열림, 저장 버전 1 유지, 지름길 전수 탐색 테스트, 힌트 2단계. QC 수정 1회(제목 접두 중복)
- Claude: 두 정답 경로를 직접 추적해 확인, e2e/bonus.e2e.ts 추가, journeys 잠김 검사를 정규 1~8로 한정(설계 변경에 따른 기대값 변경, 이유 기록)
- T23 Claude: GPT가 지적한 문서 불일치 정리 — GAME_DESIGN(대상 확장은 [제안]으로 덧붙이고 [확정] 문구 유지, 현재 루프, 10절 완주 계약: 1단원 완료=정규 1~8, 보너스·예측은 선택, 별=코드 길이 피드백, 공식 언어 한국어), CURRICULUM(구현 상태, 실제 블록 제한, 디버깅·예측 학습 목표)
- 검증: verify 131개, e2e 75개 통과·1개 건너뜀, 보너스 목록·화면 육안 확인

## 2026-11-21 — T17 실행 전 예측 도전 (구현 Codex, 내용·E2E·QC Claude) [잠정]

- Claude: 도전 3개 설계(2번 F R F, 5번 3[F], 7번 2[F F R]), 오답 후보는 흔한 오해(회전 방향 반대, 반복 횟수 착각)를 변형 프로그램으로 엔진 실행해 계산
- Codex: predictions 모델(정답 미저장, 엔진 판정, 후보 검사 테스트), PredictionController·PredictionPage, 목록의 깬 스테이지에 '예측 도전'. QC 수정 1회: 폰에서 다음 카드가 버튼을 덮음, '☁' 문자 → SVG
- 검증: verify 125개, e2e 71개 통과·1개 건너뜀, 스크린샷 육안 확인

## 2026-11-21 — 기획 라운드 2: 첫 제품 완성 정의 (Claude + GPT)

- Claude 독립 초안(2단원 조건문을 완성 범위에 포함)을 먼저 기록한 뒤 GPT(읽기 전용)가 독립 기획
- GPT안 채택: 완성 = 순서·반복 첫 제품의 배포 준비 상태(C1~C5), 2단원은 명세까지만 하고 구현은 제외 목록 해제 결정 후. 조건 표현은 "앞이 막혔으면"
- GPT가 찾은 문서 불일치(GAME_DESIGN 대상 연령, CURRICULUM "미구현", NEXT_SESSION이 T13 시점) → T23에서 정리
- TASKS에 T23~T32 등록, ROADMAP.md 라운드 2 절 추가

## 2026-11-21 — T20 저장 기록 안내·삭제 (구현 Codex, E2E·QC Claude) [잠정]

- Codex: 홈 정보 버튼(aria "내 기록 안내"), 저장 항목·기기 한정·브라우저 정리 시 삭제 안내, 확인 후 ProgressRepository.clear로 앱 키만 삭제, 저장 불가 환경 처리. 테스트 121개
- 검증: verify 121개, e2e 69개 통과·1개 건너뜀, localStorage 접근 경계 grep, 360×560 육안 확인
- 사용자 지시(2026-11-21): "토큰이 허락하는 데까지 GPT와 자체적으로 소통하면서 기획까지 자동화해서 프로젝트 완성" → T17·T21 후 GPT와 다음 기획 라운드 진행

## 2026-11-21 — T19 편집 한 번 되돌리기 (구현 Codex, E2E·QC Claude) [잠정]

- Codex: 직전 편집 1회 되돌리기(redo 없음), 스테이지 이동 시 기록 삭제, 재생 중 비활성, 끝난 뒤에는 재생 초기화 후 적용, 팔레트 줄 끝 버튼(aria "되돌리기"). 테스트 117개
- QC: 첫 배치에서 버튼이 블록 개수 줄 높이를 키워 작업 공간이 줄어 배치 E2E 5건 실패(데스크톱 sketchbook 340>329, train 316>298 등) → Codex가 팔레트 줄로 옮김
- 검증: verify 117개, e2e 67개 통과·1개 건너뜀, 스크린샷 육안 확인

## 2026-11-21 — T18 반복 회차 표시 (구현 Codex, E2E·QC Claude) [잠정]

- Codex: Frame에 실행 중 반복들의 회차(바깥→안쪽) 추가, 반복 타일에 "현재/전체" 표시(aria "3번 중 2번째"), 세 월드 스타일. 단위 테스트 109개
- Claude 지시서 허점 수정: "끝나면 사라짐"이라 쓴 탓에 마지막 회차가 프로그램 마지막 프레임이면 3/3을 볼 수 없었음 → 끝난 상태에서도 유지, 처음으로·편집·재실행 때 사라지게 Codex 수정
- 검증: verify 109개, e2e 65개 통과·1개 건너뜀, 스크린샷 육안 확인

## 2026-11-21 — T22 결과 창을 닫은 뒤 바로 편집 (구현 Codex, E2E·QC Claude) [제안]

- T16 E2E 작성 중 발견한 문제: 결과를 닫으면 "처음으로" 전까지 편집이 잠김
- Codex: 재생이 끝난 상태에서는 잠그지 않고, 편집하면 재생을 처음으로 되돌린 뒤 적용. 재생 중·한 단계 실행 도중의 잠금은 유지. 컨트롤러 테스트
- 검증: verify 103개, e2e 61개 통과·1개 건너뜀

## 2026-11-21 — T16 요청형 2단계 힌트 (내용·E2E·QC Claude, 구현 Codex) [잠정]

- 기존 힌트가 정답을 그대로 말함(예: stage6 "앞, 왼쪽, 앞, 오른쪽을 반복해요") → Claude가 1~8 힌트를 "볼 곳(맵 강조) → 질문" 2단계로 새로 작성(지시서 표)
- Codex: Stage 힌트 데이터·강조 칸 계산(path/walls/start/goal, 단위 테스트), 힌트 단계 상태·다음 힌트, 세 월드 맵 강조, T15 후속(기차 실패 칸 표시 강화). QC 수정 1회: 기차 강조 가시성, 폰에서 힌트가 맵을 줄이는 문제(목표 줄 자리 한 줄 바), 월드별 힌트 바 스타일
- Claude E2E: e2e/hint.e2e.ts 2개(흐름, 모든 힌트가 순서를 말하지 않음). 테스트 작성 중 발견: 결과 창을 닫으면 "처음으로" 전까지 편집이 잠김(T4 설계) → T22로 제안
- 간헐 실패: `[phone] @layout sketchbook 월드 버튼` 테스트가 전체 실행에서 3회(T14·T16 중) 시간 초과. startIn에 목록이 보일 때까지 다시 누르기를 넣었으나 이후에도 1회 발생 → 원인 미확정. 단독 8회·전체 3회 반복(177개) 모두 통과. 다음 실패 시 e2e-results의 trace.zip을 보존해 분석할 것
- 검증: verify 92개, e2e 59개 통과(마지막 전체 실행 1회는 위 간헐 실패 1건, 반복 실행 177개 통과), 스크린샷 육안 확인

## 2026-11-21 — T15 실패 지점에서 고쳐 보기 (구현 Codex, E2E·QC Claude) [잠정]

- Codex: 실행기에서 실패 지점 계산(충돌=부딪힌 블록·이동 전 위치, 미도달=마지막 블록·멈춘 위치, 반복 안은 안쪽 블록, 단계 상한·빈 실행은 없음), 실패 모달 "고치기"(코드 보존·출발점·원인 블록 선택·스크롤), 블록 "!" 표시(aria "실패 지점 블록")와 맵 칸 표시(aria "실패 지점"), 편집·재실행 시 사라짐. 단위 테스트 89개
- Claude: e2e/fix.e2e.ts 시나리오 2개 추가. 정답은 알려 주지 않고 원인 위치만 보여 주는지 화면으로 확인
- 검증: verify 89개, e2e 55개 통과·1개 건너뜀, 세 월드 폰·데스크톱 스크린샷 육안 확인, 콘솔 오류 0
- 발견: 기차 맵 실패 칸 표시가 작음 → T16에서 보완

## 2026-11-21 — T14 T13 다듬기 (구현 Codex, QC Claude)

- Codex: 스케치북 글자 크기·굵기(목표 16px+, 라벨 13px+), 꽉 찬 팔레트 대비, 홈 폰 화면 월드 카드 겹침 해소(src/index.css, sketchbook.css)
- Claude QC: verify 83개, e2e 51개 통과. 첫 전체 실행에서 `[phone] sketchbook 월드 버튼` 1건이 tap 30초 시간 초과로 실패했으나 단독 재실행과 전체 2회 재실행 모두 통과 → 간헐 실패로 기록(테스트는 그대로 둠). 홈·스케치북 375×667·360×560 스크린샷 육안 확인

## 2026-11-21 — 2단계 로드맵 교차 기획 (Claude + GPT)

- 사용자 요청: 후속 작업 정리, 기획도 GPT와 함께 요즘 동향을 반영해 자체 설계·구현, 파일에 기록
- Claude: 웹 조사(연구·업계 동향, 근거 수준 구분) 후 독립 초안 작성(GPT 결과를 보기 전)
- GPT(Codex, 읽기 전용): 같은 자료로 독립 기획, 후보 8개·추천 순서·하지 말 것·결정 항목
- 종합: docs/ROADMAP.md(비교표와 채택·보류 이유), TASKS.md에 T14 구체화와 T15~T21 [제안·잠정] 등록. 보류: 내 맵 만들기·URL 공유(제외 목록), 2단원, 더 짧게 다시 풀기
- 진행 방식: 사용자 지시에 따라 승인을 기다리지 않고 T14부터 차례로 구현하되, 모두 잠정으로 기록해 사용자가 되돌릴 수 있게 함

## 2026-11-21 — T13 GPT 교차 검토 후속 (검토 GPT, 구현 Codex, E2E·QC Claude)

- 사용자 요청: 서버를 띄우기 전에 GPT와 교차 검증
- GPT 읽기 전용 검토 지적: 필수 2(글자 잘림 검사가 내부 overflow 잘림을 놓침, 기차 팔레트 대비 흰색/초록 3.30:1·흰색/주황 2.15:1), 권장 2(평탄화된 중첩 반복에서 바깥 범위 끊김, 배치 검사가 스테이지 1만 사용), 사소 2(startIn 대기, isometric.ts 미사용)
- Claude가 사실 확인: 대비를 상대 휘도 공식으로 재계산해 일치, TrainMap.tsx가 자체 point 함수 사용 확인
- Codex 수정: 세 월드 팔레트·타일·반복 글자 대비 조정(라벨 4.5:1, 아이콘 3:1 기준), 깊이별 반복 띠, TrainMap이 isometric.ts 사용·좌표 테스트
- Claude E2E: 잘림 검사에 버튼 안 overflow 조상 경계 추가(임시 테스트로 width 10px overflow:hidden 라벨을 잡는 것 확인 후 삭제), startIn을 스테이지 번호·완료 카드 활성 확인 방식으로 변경, 본래 스테이지 4(train)·8(handheld) 배치 케이스 추가
- 검증(Claude 실행): verify 통과(테스트 83개), e2e 51개 통과·1개 건너뜀, 중첩 반복을 넣은 화면을 1280×720·375×667로 육안 확인(대비 개선, 두 반복 범위 띠 보임), 콘솔 오류 0

## 2026-11-21 — T13 테마 월드 3종 (구현 Codex, QC Claude)

- 사용자 결정: 스케치북 1~3, 기차 마을 4~6, 게임기 7~8 [확정], 완료한 스테이지는 다른 월드로 다시 풀기. 목표는 docs/design/concepts 시안 수준
- Codex: `src/view/theme/`(themes.ts 등록·선택, sketchbook/train/handheld Theme·CSS, Symbols.tsx SVG 기호, TrainMap.tsx 이소메트릭 맵), 월드별 목록 묶음, 월드 전환 버튼, ko.json 문구, 테스트(themes.test.tsx)
- Claude: @fontsource 5종 설치(이유 ARCHITECTURE.md), QC 4회. 1차는 시안보다 크게 못 미쳐 시안 SVG·CSS 이식 지시(docs/design/qc/ 1차 캡처), 2차·3차는 배치 실패·반복 범위 미표시·글자 줄바꿈 등 13개·6개 항목 전달
- Claude E2E: `e2e/layout.e2e.ts`를 세 월드 모두 검사하도록 확장(1번 완료 후 월드 전환), 짧은 버튼 글자 줄바꿈 검사 추가, 글자 잘림 검사를 버튼 scrollWidth 대신 실제 글자 위치로 변경(반복 범위 띠·기차 바퀴 같은 그림 장식이 밖으로 나오는 것은 잘림이 아님. 기존 scrollWidth 검사는 장식 3px에 걸렸음)
- 검증(Claude 실행): `npm run verify` 통과(테스트 82개), `npm run e2e` 45개 통과·1개 건너뜀, 스테이지 1·4·7과 홈·목록을 1280×720, 375×667로 캡처해 육안 확인, 콘솔 오류 0
- 남은 다듬기: TASKS.md T14 제안

## 2026-11-21 — T12 구조 개편: MVC·OOP, 언어 JSON, PROJECT_MAP (구현 Codex, QC Claude)

- 사용자 요청: OOP·MVC, 언어 추가는 파일 추가로(JSON, XML 아님), 다른 에이전트가 문서 하나로 착수
- Codex: `src/model/`(엔진·스테이지·ProgressRepository), `src/controller/`(App·Game·Editor 컨트롤러, Observable, BoardPresenter), `src/view/`(React는 표시·이벤트만, useSyncExternalStore 구독, theme/ 기본 테마), `src/i18n/`(I18n 클래스, locales/ko.json·en.json 일부 예시, ko 대체), 스테이지 `world` 필드(1~3 sketchbook, 4~6 train, 7~8 handheld), `docs/PROJECT_MAP.md`
- Claude QC: verify(73개), E2E(33개, 동작 동일), 경계 grep 직접 확인
- 다음: T13 테마 월드 3종은 view/theme에 테마를 추가하는 방식

## 2026-11-21 — T10 가로 정사각형 블록(구현 Codex), T11 사용자 시나리오 E2E(Claude)

- 사용자 피드백: 블록을 옆으로 정사각형으로, 최대 10개, 반복 사용 시 작업 공간이 너무 작음, "오류 없으니 통과" 대신 실제 사용자 수준 테스트
- Codex: 블록 상한 10(`MAX_PROGRAM_BLOCKS`), 정사각형 타일·줄바꿈, 반복 주황 틀, 타일 선택 + 작업 막대, 10칸 점 막대, `BlockTiles` 분리(레이아웃 교체 가능), 작은 화면 맵 축소·머리글 압축
- Claude: `@playwright/test` 1.64.1 추가, `e2e/`(helpers, journeys, layout), CLAUDE.md 3절에 E2E·스크린샷 육안 확인 규칙
- QC 경과: 1차 자동 검사는 통과했으나 스크린샷을 보니 작은 화면 작업 공간이 사실상 안 보임 → 작업 공간 실제 높이 기준을 테스트에 추가 → Codex 수정 → 2차 통과. 내 테스트 오류 3건(블록 9개로 10개 기대, 이미 선택된 블록 재클릭, 문구 고정 검사)은 테스트 쪽을 고침
- 남은 것: 전체적인 투박한 외형은 T13(테마 월드)에서

## 2026-11-20 — T9 저학년 UX 개선 (구현 Codex, QC Claude)

- 사용자 피드백 5건: 블록 추가 시 맵이 안 보임, 글만 있는 블록, 저학년 디자인, 속도 기호, 다시 푼 스테이지의 다음 버튼
- 다음 버튼 원인(Claude 재현): 결과 창에는 있으나 창을 닫으면 게임 화면에 다음으로 가는 수단이 없었음
- Codex: 기호+색 블록(⬆ ↺ ↻ 🔁, 이동 파랑·회전 초록·반복 주황), 반복 횟수 −/+, 아이콘 편집 버튼, 실행 컨트롤 기호, 속도 ▶/▶▶/▶▶▶, 완료 스테이지 상단 다음 버튼, 맵·실행 컨트롤 고정과 작업 공간 자체 스크롤, GAME_DESIGN 저학년 UX 원칙 절
- Claude QC: 1차에서 실행 버튼이 화면 밖으로 밀리는 문제 발견 → Codex 수정 → 2차 4개 화면 크기에서 통과, 1~8 완주 재확인

## 2026-11-20 — T6 화면 흐름, 힌트, 반응형 (구현 Codex, QC Claude)

- Codex: `src/pages/`(HomePage, StageSelectPage, PlayPage), 이어하기 대상 계산, 다음 스테이지·완주 모달, 힌트, 반응형 CSS, GAME_DESIGN 6절·ARCHITECTURE 2절
- Claude QC: verify 통과(테스트 54개), Playwright로 1~8 UI 완주와 화면 흐름·375px 확인, 콘솔 오류 0
- MVP 필수 작업(T0~T6) 완료

## 2026-11-20 — T5 진행 상황 저장 (구현 Codex, QC Claude)

- Codex: `src/storage/progress.ts`(버전 1, 검증, 가짜 storage 주입, 메모리 대체), 잠금 해제 순수 함수, App 연결, ARCHITECTURE 갱신
- Claude QC: verify 통과(테스트 47개), Playwright로 새로고침 유지·저장 구조·손상값 복구·저장소 차단 확인, 콘솔 오류 0

## 2026-11-20 — T4 실행 재생과 결과 표시 (구현 Codex, QC Claude)

- Codex: `usePlayback` 훅(프레임 인덱스만 보관), 순수 프레임 진행 함수, `score.ts`(잠정 별 기준), `ResultModal`, Board 충돌 표시, 편집기 실행 중 강조·잠금, GAME_DESIGN 3절(잠정)·ARCHITECTURE 2절
- Claude QC: verify 통과(테스트 38개), Playwright로 성공·미도달·충돌 실제 재생과 모달·잠금·강조·375px 확인, 콘솔 오류 0

## 2026-11-20 — T3 블록 편집기 (구현 Codex, QC Claude)

- Codex: `src/components/Editor.tsx`, `src/engine/editor.ts`(id 생성, 경로 찾기), `src/i18n/ko.ts`, App 연결, CSS, ARCHITECTURE 2절. Codex 샌드박스에서는 개발 서버 포트를 열 수 없어 브라우저 확인을 미검증으로 보고
- Claude QC: verify 통과(테스트 30개). Playwright 스크립트로 클릭·키보드 조작, 375px 가로 스크롤, 콘솔 오류 확인 → 모두 통과

## 2026-11-20 — T2a QC 후속 수정 (구현 Codex, QC Claude)

- Codex: 스테이지 7 맵 교체(`세 변 따라가기`), 반복 진입 1000회 상한, 회귀 테스트 3개, CURRICULUM·GAME_DESIGN 갱신
- Claude QC: `npm run verify` 통과(테스트 25개). 변이 확인 — 옛 스테이지 7 맵으로 되돌리면 지름길 테스트 실패, 옛 실행기로 되돌리면 10겹 빈 반복 테스트가 44초 걸려 실패
- 판단: 반복이 많이 겹친 정상 프로그램도 1000단계 전후에서 `stepLimit`이 될 수 있으나 8×8 이하 맵에서는 영향 없음

## 2026-11-20 — T1·T2 QC (Claude)

- 방식: CLAUDE.md 7-1절대로 코드는 고치지 않고 테스트만. 임시 테스트 파일로 재현 후 삭제
- 통과: `npm run verify`(lint, 테스트 22개, build), GitHub Actions(최신 커밋 성공), 엔진의 React·DOM 의존 없음, 스테이지 1~8 렌더링(데스크톱·375px 폭)
- 지적 1(학습 설계): 스테이지 7이 `오른쪽으로 돌기, 앞으로` 2블록으로 풀림. 일렬 블록 전수 탐색에서 다른 스테이지는 지름길 없음
- 지적 2(권장): 빈 반복 중첩 시 안전장치 미작동. 5겹 10ms → 7겹 44ms 실측
- 확인 중 착시: 좁은 확인용 상자(260px)에서 스테이지 5가 넘쳐 보였으나 실제 375px 화면에서는 정상
- 결과: T1·T2 완료, 지적 사항은 T2a(구현 Codex, 승인 대기)로 등록

## 2026-11-20 — 집 PC(WSL)에서 4개 프로젝트 오케스트레이션 환경 재구성

- 이 PC의 작업 폴더는 `~/project`(직장 PC는 `~/workspace`). `scripts/progress-summary.sh`, `scripts/codex-run.sh`가 경로를 고정하지 않고 레포 상위 폴더를 작업 폴더로 쓰도록 변경, 학습실 레포 두 위치 모두 인식
- 클론: playX-mas(`feature/P2-adventure`), Rt_journeyPrjNum1(`feature/bank-excel-import`). 학습실 레포는 `feature/space-utilization-v1`로 전환. Lealnspire는 `feature/T1-engine`으로 전환
- 로컬 환경: 장학 기금 `.venv`(+ `.git/info/exclude`에 `.venv/`, `samples/`), conda env `study-room`(Python 3.12). `samples/sample.xlsx`(개인정보)는 이 PC에 없음
- 검증(이 PC): Lealnspire `npm run verify` 통과(테스트 22개), `setup.sh --check` 전 항목 OK, playX-mas `node --test` 6개 통과, 장학 기금 pytest 16개 통과, 학습실 backend pytest 12개 통과(추적 중인 DB 변경 없음), `progress-summary.sh` 4개 프로젝트 집계(47/20/76/66%)
- Codex CLI: VS Code 확장 내장 `codex-cli 0.171.0-alpha.13`, ChatGPT 로그인 상태 확인. `codex-run.sh` 실제 실행은 사용량이 들어 하지 않음(미검증)
- T2 화면: 헤드리스 Chromium으로 스테이지 1 렌더링 확인(3칸 맵, 로봇, 도착). TASKS 체크는 QC 마무리 때 반영 예정

## 2026-11-20 — T2 구현 (Codex, Claude QC 대기)

- 스테이지 1~8과 정답, CSS Grid 지도 및 방향 표시를 구현. 스테이지 초안과 6~8 블록 제한은 잠정.
- `npm run verify`: lint 통과, 테스트 4개 파일 22개 통과, 빌드 통과. 브라우저 스크린샷은 미검증(Claude QC 예정).
- Context7 사용 불가 및 네트워크 제한으로 라이브러리 문서 조회 미검증. 커밋·push는 Claude QC 후 예정.

## 2026-11-20 — D1 결정 및 T1 Codex 구현

- 사용자가 D1을 A안(로봇 기준 왼쪽/오른쪽 회전)으로 확정하여 기존 잠정안을 확정으로 변경.
- Codex 구현: 순수 TypeScript 게임 엔진, 블록 트리 편집 함수 및 단위 테스트.
- 로컬 `npm run verify` 통과: lint, 테스트 11개, build. Claude QC 및 커밋은 대기.


새 기록은 위에 추가합니다. 검증 결과는 실제로 실행한 것만 적습니다.

---

## 다중 프로젝트 병렬 오케스트레이션, 플레이북 초안 (2026-11-20)

- 4개 Codex 작업 동시 실행(playX-mas 기획·뼈대, 장학 기금 카뱅 가져오기 계획, 학습실 상태 정리, 이 레포 플레이북)
- 추가: `scripts/codex-run.sh`(Codex 실행 + `~/workspace/_progress/PROGRESS.md` 진행 기록. 시작/종료는 스크립트, 단계는 Codex 자기 보고. Codex 쓰기는 대상 레포+진행 폴더만)
- 시행착오: 백그라운드 `codex exec`가 stdin 입력 대기로 멈춤 → `< /dev/null`로 해결, 재실행 후 4개 모두 exit=0
- 추가(Codex 작성): `docs/playbook/`. Claude QC: 개인정보 노출 없음 확인. 내용 세부 검토는 미실시

---

## T0b 환경 구성 스크립트 — Codex 구현, Claude 검증 (2026-11-20)

- 사용자 방침: Claude 토큰은 최소로, GPT(Codex)는 최대한 활용. 실행은 Claude가 `codex exec`로 함(사용자 승인)
- Codex: `.claude/settings.json` 읽기 전용 검토 → 맨 앞 `//` 주석 때문에 JSON이 깨져 설정 전체가 무시됨을 발견(사용자가 수정 예정). 패턴 기반 deny는 우회 가능하므로 GitHub 브랜치 보호 권장
- Codex: `scripts/setup.sh`, `scripts/setup.ps1`(UTF-8 BOM), README 절 작성. 스스로 요구사항 1을 미충족, 나머지 대부분을 미검증으로 정직하게 보고
- Claude 검증: Linux 전체 실행 통과(npm ci, 브라우저, PATH, verify), Windows PowerShell 5.1 `-Check` 정상 동작. 점검 모드가 conda env의 Node를 못 찾는 문제 발견 → Codex에 수정 지시 → 재검증에서 전 항목 OK
- 미검증: macOS 전체, Windows 전체 설치 실행

---

## 모델 간 오케스트레이션 구성(Claude ↔ Codex) (2026-11-20)

- 사용자 요청: 환경 구성 스크립트는 GPT에게 작업을 맡겨 수행해 보기(Claude는 오케스트레이션 담당)
- 이 PC에 Codex CLI(`codex-cli 0.162.0-alpha`, VS Code 확장에 포함)가 있음을 확인. 인증 파일은 읽지 않음
- 추가: `AGENTS.md`(Codex용 안내 — 규칙은 CLAUDE.md, 커밋·push·작업 문서 수정 금지), `docs/handoff/T0b.md`(첫 작업 지시서), TASKS.md T0b, CLAUDE.md 7-1절(지시 → 실행 → 검증 → 교차 검토 → 기록)
- Claude가 먼저 만들었던 스크립트 초안은 레포에서 빼서 세션 임시 폴더에 보관(Codex가 독립적으로 구현한 뒤 비교용)
- 실행 방식(A: 사용자가 Codex 창에 입력 / B: Claude가 `codex exec`)은 사용자 결정 대기

---

## MCP 서버 구성 (2026-11-20)

- 사용자 요청: context7(라이브러리 문서), playwright(화면 검증)를 프로젝트 범위 `.mcp.json`으로 구성. context7이 보안 문제로 안 되면 공식 출처로 대체
- `context7`: 원격 HTTP 엔드포인트 사용. 로컬에서 패키지 코드를 실행하지 않아 공급망 위험이 작음. API 키 없음(비밀 정보 없음)
  - 확인: `initialize`, `tools/list` 응답 정상(서버 4.7.3). `context7.com` 홈페이지는 이 PC에서 TLS 오류(`EE certificate key too weak`)가 나지만 MCP 엔드포인트는 정상이라 대체 서버는 추가하지 않음. 대신 CLAUDE.md 3-1절에 "Context7 불가 시 공식 문서" 규칙을 둠
- `playwright`: Microsoft 공식 `@playwright/mcp`, 2주 이상 지난 0.0.84로 고정(`@latest` 미사용). headless, 프로필은 메모리(`--isolated`), 출력은 `.playwright-mcp/`(gitignore)
  - 브라우저 설치: `install-browser chrome-for-testing`(Chrome for Testing 157, `~/.cache/ms-playwright`)
  - 확인: stdio로 직접 접속해 도구 25개 확인, `npm run dev` 화면을 `browser_navigate`로 열어 제목 "Lealnspire" 확인, 콘솔 오류 0건(React DevTools 안내 INFO 1건)
- `/mcp` 화면 확인: 미검증. 이 세션은 `.mcp.json` 생성 전에 시작돼 서버를 불러오지 않았음. 재시작 후 사용자가 승인하고 `/mcp`에서 확인 필요
- CLAUDE.md 3-1절(MCP 사용 규칙), README(MCP 설정), ARCHITECTURE D13 추가
- `.claude/settings.json` 권한 추가(npm/git 자동 허용)를 사용자 위임으로 다시 시도했으나 Claude Code 안전장치가 다시 거부. 사용자가 직접 추가해야 함

---

## 오케스트레이션 설정 마무리 (2026-11-20)

- 사용자 요청: 기능 구현 전에 AI 오케스트레이션을 실험해 볼 수 있게 설정 마무리
- 로컬 Node: 이 PC(WSL)에 Node가 없어 conda env `lealnspire`(Node 22.23.5)를 만들고 `.claude/settings.local.json`의 `env.PATH`로 연결(커밋 안 함, `.gitignore`에 추가)
- 추가: 저장 워크플로 `.claude/workflows/task-pipeline.js` — 계획 → 구현 → `reviewer` 2개(범위 / 정확성) 독립 검토 → 필수 지적 1회 수정·재검토 → 문서·커밋·push
  - 구현 역할을 서브에이전트로 따로 만들지 않음. 워크플로 단계 프롬프트로 충분하고, 검토만 `reviewer`를 재사용
  - 에이전트 최대 7개로 제한(사용량 절약). 훅·예약 실행은 넣지 않음
- 문서: CLAUDE.md 3절(Node 없을 때 처리)·8절(워크플로, 선택 기준), README(conda Node), ARCHITECTURE D12, NEXT_SESSION(실행 방법, 분기 기준)
- 시도했으나 적용 안 됨: `.claude/settings.json`에 npm/git 명령 자동 허용 추가 → Claude Code 안전장치가 AI의 권한 확대를 거부. 사용자가 직접 추가하도록 안내
- 검증(로컬, Node 22.23.5): `npm ci` 후 `npm run verify` 통과(lint 0건, 테스트 1개 통과, build 성공). 워크플로 스크립트는 문법 검사만 통과, 실제 실행은 미검증(첫 실행은 T1에서)

---

## push 자동화 설정 (2026-11-20)

- 사용자 요청: 시험용 레포이므로 이 PC에서의 push는 확인 없이 자동 처리
- 로컬 remote를 HTTPS → SSH로 변경(이 PC의 기존 `~/.ssh` 키, GitHub 인증 확인). `feature/T0-setup` push 성공
- `.claude/settings.json` 추가: `feature/*`, `bugfix/*` push 자동 허용 / force push, 브랜치 삭제, `develop`·`master` push 거부
- CLAUDE.md 5절에 push 규칙(브랜치 명시, 맨 `git push` 금지) 추가
- 남은 일(사용자): GitHub Rulesets로 `develop`·`master` 직접 push 금지를 서버에서도 강제(권장)

---

## 0단계를 feature 브랜치로 옮김 (2026-11-20)

- 사용자 결정: 0단계 결과를 git flow 규칙에 맞춰 `feature/T0-setup`으로 옮겨 진행(NEXT_SESSION 결정 대기 0번의 A안)
- `feature/T0-setup`은 `claude/blissful-keller-3yrx8x`(`b2d3f6c`)에서 그대로 분기. 코드 변경 없음, 문서만 갱신
- Kotlin(ARCore) 프로젝트는 보류. `develop`(`29f8b9a`)에 그대로 남아 있고, 이 브랜치를 병합하면 `develop`에서는 삭제되지만 히스토리로 복구 가능
- 참고: git은 클론할 때 모든 브랜치의 히스토리를 받으므로, 브랜치를 나눈다고 클론 크기가 줄지는 않음. 현재 저장소 크기는 약 0.5MB. 필요하면 `git clone --single-branch -b develop` 또는 `--depth 1`로 받을 수 있음
- 검증: 로컬 미검증(이 PC의 WSL에 Node 없음). 코드 변경이 없어 push 후 GitHub Actions 결과로 확인

---

## 브랜치 규칙을 git flow로 정함 (2026-11-20)

- 사용자가 로컬에서 `git flow init -d`로 구성(배포 `master`, 개발 `develop`, 접두어 feature/ bugfix/ release/ hotfix/ support/, 태그 접두어 없음)
- CLAUDE.md 5절에 브랜치 규칙 추가, `/next-task` 스킬과 `reviewer`에 반영, ARCHITECTURE.md D11 기록
- 0단계 작업은 세션 기본 브랜치 `claude/blissful-keller-3yrx8x`에 있음. `develop` 반영 방식은 사용자 결정 대기

---

## 0단계 마무리 — push와 CI 확인 (2026-11-20)

- GitHub 권한이 해결된 뒤 `599e085`를 작업 브랜치에 push(이전 시도들은 403으로 실패)
- GitHub Actions [run #1](https://github.com/jobchoi/Lealnspire/actions/runs/44645760569): 성공(lint, test, build). T0를 완료로 변경

---

## 0단계 — 프로젝트 뼈대, 문서, 자동화 (2026-11-19)

### 작업 전 확인

- 경로: `/home/user/Lealnspire`, 원격: `https://github.com/jobchoi/Lealnspire`
- 작업 브랜치: `claude/blissful-keller-3yrx8x` (원격 브랜치와 같은 커밋 `29f8b9a`)
- 원격 기본 브랜치: `develop` (`29f8b9a`, 작업 브랜치와 같음). `master`는 최초 커밋 `d5ca38e`만 있고 `develop`에 포함됨
- 커밋되지 않은 파일, 추적되지 않은 파일: 없음
- 결론: 삭제 대상(`MyApplication_kt/` 45개 파일, Android용 `.gitignore`)은 모두 원격 `develop`에 저장되어 있음

### 변경 사항

- 삭제: `MyApplication_kt/`(Android ARCore 샘플), 기존 `.gitignore`
- 추가: Vite React-TS 템플릿 기반 뼈대(데모 코드와 이미지는 제거하고 자리표시 화면으로 교체)
- 추가: Vitest와 렌더링 확인 테스트 1개(`src/App.test.tsx`)
- 추가: npm 스크립트 `lint`, `typecheck`, `test`, `test:watch`, `build`, `verify`
- 추가: GitHub Actions CI(`npm ci` → lint → test → build)
- 추가: README.md, CLAUDE.md, docs/ 문서 6개

- 추가(오케스트레이션): docs/TASKS.md(우선순위, 완료 조건), CLAUDE.md 작업 절차 개편, `/next-task` 스킬, `reviewer` 서브에이전트
- 보강: `.gitignore`에 `.env*` 추가(비밀 정보 커밋 방지)

### 결정

- D1 기존 Android 샘플 삭제, 루트에 웹 프로젝트(사용자 승인)
- D3 린트는 oxlint, D4 테스트는 Vitest(템플릿 기본 구성을 따름)
- 회전 방식은 미결정. 문서는 잠정 권장안(로봇 기준 돌기)으로 작성
- 서브에이전트는 읽기 전용 `reviewer` 하나만 둔다. 구현 역할을 나누면 이 규모에서는 문맥 전달 비용이 더 크다고 판단
- 자동 실행(예약 작업, AI를 호출하는 CI)은 넣지 않는다. CI는 무료인 lint/test/build만 실행

### 검증 결과(로컬, Node 22.23.5 / npm 10.9.9)

- `npm run lint`: 통과(0건). 일부러 `debugger` 문을 넣은 파일로 실패(exit 1)하는 것도 확인 후 제거
- `npm run test`: 통과(테스트 파일 1개, 테스트 1개)
- `npm run build`: 통과(`tsc -b` + `vite build`)
- `npm run dev`: 5173 포트에서 페이지 응답 확인
- 프로덕션 빌드(`vite preview`)를 헤드리스 Chromium으로 열어 제목 렌더링과 콘솔 오류 0건 확인
- GitHub Actions: 미검증. `git push`가 403(Claude GitHub 앱에 저장소 권한 없음)으로 실패해 원격 실행 전
