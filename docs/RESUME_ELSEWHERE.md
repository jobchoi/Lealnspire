# 2026-11-26 갱신 — 가장 먼저 읽기

- **Lealnspire 최신 브랜치는 `feature/T52-logic-ui`**(6단원 논리까지, T50 → T58 → T51 → T52로 쌓임)입니다. 아래 2절 표의 `feature/T1-engine`은 11-20 기준이라 오래됐습니다. 최신 상태는 그 브랜치의 `docs/NEXT_SESSION.md`를 보세요.
- 어느 PC에서든 재개 순서: `git fetch origin --prune` → `git switch feature/T52-logic-ui`(이후에는 NEXT_SESSION.md의 작업 브랜치) → `bash scripts/setup.sh` → Claude Code 재시작·MCP 승인
- setup이 이제 E2E용 Chromium도 설치합니다(11-26 이전 setup으로 구성한 PC는 `npx playwright install chromium` 한 번 실행).
- 작업 방식: 12월 초까지 GPT(Codex) 중심, Claude는 지시·QC·기록. Codex는 `scripts/codex-run.sh`, 실행 파일이 PATH에 없으면 VS Code 확장의 codex를 자동으로 찾습니다.
- 원격 `develop`·`master`는 아직 옛 Android 코드입니다. 병합본 push는 사용자가 병합본이 있는 PC에서 실행합니다(NEXT_SESSION.md "병합·태그").

# 2026-11-23 갱신

| 프로젝트 | 작업 브랜치 | 상태 | 다음 |
|---|---|---|---|
| 학습실 HowToEasy | `feature/V1-user-select` | 이용자 셀프 선택 화면·키오스크·코드 인쇄 브라우저 QC 통과, 정책 5개 추천안 확정 | 실제 DB 적용 전 백업(마이그레이션 007·008 자동 적용), develop PR |
| duct-tape | 머지본 `feature/develop-merge-20261123` | 두 브랜치(ZIP 정리·키 화면 수정 / 배포 안전장치)를 develop에 머지한 커밋. 원격 develop push는 사용자가 수행 | `git switch develop && git merge --ff-only origin/feature/develop-merge-20261123 && git push origin develop` |
| duct-tape 운영 서버 | — | **배포 보류**: 운영 이미지가 develop과 계보가 달라(파일 다수 상이) 전체 빌드는 v1→v2 전환에 해당 | 결정 필요: 시험 서버 먼저 / 필요한 수정만 오버레이 / 백업·롤백 리허설 후 전환 |

- 운영 서버 접속 정보·현장 PC 정보는 공개 레포에 적지 않습니다(각 레포의 비공개 메모 또는 개인 노트 참고).
- 2026-11-23 교훈은 `docs/playbook/03-lessons.md`

# 다른 PC에서 이어서 작업하기 (2026-11-20 기준)

이 PC에서 진행한 4개 프로젝트의 상태와, 다른 PC에서 재개하는 방법입니다. 모든 작업은 GitHub에 push되어 있습니다.

## 1. 클론과 환경 구성

```bash
mkdir -p ~/workspace && cd ~/workspace
git clone git@github.com:jobchoi/Lealnspire.git
git clone git@github.com:jobchoi/playX-mas.git
git clone git@github.com:jobchoi/Rt_journeyPrjNum1.git
mkdir -p utilProject && git clone git@github.com:jobchoi/toyproject-HowToEasy.git utilProject/toyproject-HowToEasy
```

- 각 레포에서 아래 표의 **작업 브랜치**로 `git switch` 합니다.
- Lealnspire 환경: `bash scripts/setup.sh` (Windows: `powershell -ExecutionPolicy Bypass -File scripts\setup.ps1`)
- Claude Code 재시작 → MCP(context7, playwright) 승인 → `/mcp` 확인
- Codex 실행기·진행률: `scripts/codex-run.sh`, `scripts/progress-summary.sh`
  - 작업 폴더는 **Lealnspire가 들어 있는 상위 폴더**로 자동 인식합니다(예: 직장 PC `~/workspace`, 집 PC `~/project`). 다르게 쓰려면 `WORKSPACE=/경로`.
  - 진행 기록은 `<작업 폴더>/_progress/`에 쌓입니다(`AI_PROGRESS_DIR`로 변경 가능). 이전 기록은 `docs/progress/`
  - 학습실 레포는 `<작업 폴더>/utilProject/toyproject-HowToEasy` 또는 `<작업 폴더>/toyproject-HowToEasy` 어느 쪽이든 인식합니다.
- 프로젝트별 환경: 장학 기금 `python3 -m venv .venv && .venv/bin/pip install -r requirements.txt pytest`, 학습실 `conda create -n study-room python=3.12` 후 `backend/requirements.txt` 설치(문서의 `~/miniconda3` 경로는 PC에 따라 `~/miniforge3`일 수 있음), playX-mas는 `node --test`만 필요

## 2. 프로젝트별 상태

| 프로젝트 | 작업 브랜치 | 진행률(검증 기준) | 다음 작업 | 대기 중인 것 |
|---|---|---|---|---|
| Lealnspire | `feature/T1-engine` (T0→T0b→T0c→T1·T2가 차례로 쌓임) | 47% | T3 블록 편집기 | develop 병합(PR, 사용자) |
| playX-mas (Rt탐험대, 가칭) | `feature/P2-adventure` | 12% | 미션 콘텐츠 보강, 실제 폰·인쇄 QR 테스트, favicon | 교사 콘텐츠 검토, 행사 날짜·장소 |
| 장학 기금 (Rt_journeyPrjNum1) | `feature/bank-excel-import` | 76% | 남은 TASKS(취소·정정, 증빙, 결산 잠금) | 없음 |
| 학습실 (toyproject-HowToEasy) | `feature/space-utilization-v1` | 66% | 실제 운영 데이터 전환(승인 필요) | 실제 DB 백업 후 적용 |

## 3. 이 PC에만 있고 GitHub에 없는 것(의도적)

| 항목 | 이유 | 새 PC에서 |
|---|---|---|
| `Rt_journeyPrjNum1/samples/sample.xlsx` | 실제 거래내역(개인정보) | 필요하면 직접 복사. `.git/info/exclude`에 `samples/` 추가 |
| `Rt_journeyPrjNum1/.venv` | 가상환경 | `python3 -m venv .venv && .venv/bin/pip install -r requirements.txt pytest`, exclude에 `.venv/` |
| `.claude/settings.local.json` | PC별 Node 경로 | `scripts/setup.sh`가 생성 |
| conda env `lealnspire`, `study-room` | PC별 환경 | setup.sh / 학습실 HANDOFF 참고 |
| 학습실 실제 `backend/study_room.db` | 이미 git 추적 중(공개 레포) | **아래 주의 참고** |

## 4. 주의

- **4개 레포 모두 공개(public)입니다.** 학습실 레포는 `backend/study_room.db`(학생 58명 행)를 git에 추적합니다(2026-07 커밋). 더미 데이터인지 확인하고, 실제 데이터라면 레포를 비공개로 바꾸거나 DB를 추적에서 빼는 것을 검토하세요.
- 학습실 서버를 실제 DB로 켜면 새 테이블이 자동 추가됩니다. 켜기 전에 DB를 백업하세요.
- Claude 설정이 `develop`/`master` 직접 push를 막습니다. 병합은 GitHub PR로 직접 하세요.
