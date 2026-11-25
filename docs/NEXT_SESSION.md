# 다음 세션 안내 (NEXT_SESSION)

> 이 파일은 작업이 끝날 때마다 덮어씁니다. 작업 목록은 [TASKS.md](TASKS.md), 과거 기록은 [WORK_HISTORY.md](WORK_HISTORY.md)에 있습니다.

마지막 갱신: 2026-11-25 · 작업 브랜치 `feature/T14-t13-polish` · 버전 **v1.0.0(첫 제품)**

## 시작하는 법

- 먼저 [PROJECT_MAP.md](PROJECT_MAP.md) → 이 파일 → [TASKS.md](TASKS.md)
- 실행: `npm run dev` → http://localhost:5173
- 검증: `npm run verify`, `npm run e2e`, `npm run e2e:prod`(배포 빌드, 루트·/lealnspire/)
- 다른 PC에서 이어 갈 때: [RESUME_ELSEWHERE.md](RESUME_ELSEWHERE.md)

## 현재 상태

- **첫 제품 완성(v1.0.0)**: 1단원(순서·반복) 정규 8 + 보너스 2, 테마 월드 3종, 실패 지점 고치기, 요청형 2단계 힌트, 예측 도전, 반복 회차, 되돌리기, 저장 기록 안내·삭제, 교사·보호자 안내(`/guide.html`), 접근성 점검, 정적 배포 준비. 완성 정의 C1~C5는 [ROADMAP.md](ROADMAP.md) 라운드 2
- 작업 방식: Claude가 기획·지시서·E2E·QC·기록, Codex(GPT)가 구현. 기획과 검토는 GPT와 교차(ROADMAP 라운드 1·2)
- 모든 2단계 작업(T14~T28)은 [제안·잠정]. 사용자가 되돌릴 수 있게 TASKS·WORK_HISTORY에 근거를 남김

## 마지막 검증 결과 (2026-11-25, 집 PC WSL, Claude 실행)

| 항목 | 결과 |
|---|---|
| `npm run verify` | 통과(lint, 테스트 135개, build) |
| `npm run e2e` | 100개 통과, 4개 건너뜀(데스크톱 전용 키보드 테스트의 폰 실행분) |
| `npm run e2e:prod` | 4개 통과(루트·/lealnspire/ × 데스크톱·폰, 외부 요청·4xx 0) |
| GitHub Actions | 이 세션에서 확인 못 함(`gh` 없음) |
| 알려진 제한 | 실제 모바일 기기·사파리·파이어폭스 미검증, 결과 창 별이 빈 테두리, 예측 후보 라벨이 로봇을 가림, 배치 테스트 1건 간헐 실패(원인 미확정) |

## 병합·태그 (사용자 요청 2026-11-25)

- 로컬에서 `develop` 빨리 감기 병합, `release/1.0.0` → `master` 병합, 태그 `v0.1.0`(5170fa2)·`v0.2.0`(9e00dd6)·`v1.0.0`까지 준비. **develop·master·태그 push는 사용자가 실행**(`.claude/settings.json`이 AI의 develop·master push를 금지). 명령은 [RELEASE.md](RELEASE.md) 4단계와 마지막 보고 참고
- 병합하면 `develop`의 옛 Android(ARCore) 코드가 사라집니다(히스토리에는 남음)

## 사용자 결정 (2026-11-25) → 다음 작업

1. 연령 구분 안 함, 필요하면 함께 논의 → 연령별 모드 만들지 않음
2. **2단원부터 프로그래밍 기본 개념 모두**(조건·변수·함수 등), 글자 암기가 아닌 개념 → T30, 기획 라운드 3(Claude+GPT)
3. **영어는 AI 번역으로 세밀하게, 과한 한글화 지양** → T31, 개념어 표기 방침 라운드 3
4. 오프라인(PWA) → 보류(T32)
5. 배포 호스트는 라즈베리파이, 배포는 아직 → DEPLOY.md 메모만

## 다음 작업

1. 기획 라운드 3(2단원 이후 개념 지도, 개념어·영어 방침) → TASKS 등록 → 구현
2. 사소한 다듬기: 결과 창 별 채우기, 예측 후보 라벨 위치
3. 미검증: T0b macOS·Windows 전체 설치, 실제 모바일 기기
