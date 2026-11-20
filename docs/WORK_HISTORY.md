# 작업 기록 (WORK_HISTORY)

새 기록은 위에 추가합니다. 검증 결과는 실제로 실행한 것만 적습니다.

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
