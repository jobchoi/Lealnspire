# 작업 지시서 T0b — 새 PC 환경 구성 스크립트

- 지시: Claude Code(오케스트레이터) · 구현: Codex(GPT) · 검증·검토: Claude Code
- 작업 브랜치: `feature/T0b-env-setup` (Claude가 미리 만들어 둠, 브랜치를 바꾸지 말 것)
- 먼저 읽을 것: `AGENTS.md`, `CLAUDE.md`, `README.md`, `.mcp.json`, `.nvmrc`, `package.json`

## 목적

사용자가 다른 PC(Windows 노트북, Linux/WSL, macOS)에서 저장소를 클론한 뒤 **스크립트 하나만 실행하면** 이 저장소의 개발·AI 작업 환경이 이 PC와 같아지게 합니다.

## 만들 파일

| 파일 | 대상 |
|---|---|
| `scripts/setup.sh` | Linux, WSL, macOS (bash 3.2 호환: macOS 기본 bash) |
| `scripts/setup.ps1` | Windows PowerShell 5.1과 PowerShell 7 모두. **UTF-8 BOM으로 저장**(5.1이 한글을 깨뜨리지 않도록) |
| `README.md` | "새 PC 환경 구성(자동)" 절 추가(실행 명령, 스크립트가 하는 일/하지 않는 일) |

## 요구사항(완료 조건)

1. **점검 모드**: `setup.sh --check`, `setup.ps1 -Check`는 아무것도 설치·변경하지 않고 각 항목의 상태만 출력합니다.
2. **여러 번 실행해도 안전**: 이미 준비된 항목은 건너뜁니다.
3. **git** 존재 확인. 없으면 설치 방법을 안내하고 종료.
4. **Node**: `package.json`의 `engines`(`^20.19.0 || >=22.12.0`)를 만족하는 Node가 기본 PATH에 있으면 그대로 사용. 없으면 OS별로 준비:
   - conda가 있으면 conda env `lealnspire`(conda-forge `nodejs=<.nvmrc 값>`)
   - 없으면 macOS는 Homebrew `node@<.nvmrc>`, Linux는 nvm(공식 설치 스크립트, **버전 고정**), Windows는 winget(`OpenJS.NodeJS.LTS`)
5. `npm ci`
6. **Playwright MCP 브라우저**: `.mcp.json`에 고정된 `@playwright/mcp` 버전을 파일에서 읽어 `npx -y @playwright/mcp@<버전> install-browser chrome-for-testing`. Linux는 브라우저 실행에 필요한 시스템 라이브러리가 빠졌는지 점검하고, 빠졌으면 `sudo` 명령을 **안내만** 합니다.
7. **Claude Code용 PATH**: Node가 기본 PATH 밖(conda env, nvm 등)에 있으면 `.claude/settings.local.json`의 `env.PATH` 앞에 Node 경로를 넣습니다. 파일의 다른 키는 보존합니다. (이 파일은 gitignore 대상)
8. **GitHub SSH**: `ssh -T git@github.com`으로 인증을 확인하고, 되면 `origin`이 HTTPS일 때 SSH 주소로 바꿉니다. 안 되면 경고만.
9. 마지막에 `npm run verify`를 실행하고 결과를 출력합니다.
10. 끝에 "사용자가 직접 할 일"을 출력합니다: Claude Code 재시작, 프로젝트 MCP 서버(context7, playwright) 승인, `/mcp`로 연결 확인.
11. 출력은 한국어, 항목마다 `[OK]` / `[WARN]` / `[FAIL]` 표시. `[FAIL]`이 있으면 종료 코드 1.

## 하지 말 것

- `sudo`, 관리자 권한 실행
- 비밀 정보(토큰, 키) 생성·저장·출력. `~/.codex`, `~/.ssh`의 키 파일 내용을 읽지 말 것
- `.claude/settings.json`(권한 설정) 수정, MCP 서버 자동 승인
- 버전을 `latest`로 두기(설치하는 도구는 버전 고정)
- 지시서에 없는 파일 수정, 커밋, push

## 검증(가능한 만큼 하고, 못 한 것은 미검증으로 보고)

- `bash -n scripts/setup.sh`
- `bash scripts/setup.sh --check`
- (가능하면) PowerShell 구문 확인

Claude가 이후에 Linux 전체 실행, Windows 점검 모드 실행(WSL에서 `powershell.exe`), 코드 검토를 합니다.

## 보고 형식(마지막 메시지)

1. 만든/수정한 파일
2. 요구사항 1~11 각각: 충족 / 미충족 / 미검증 + 한 줄 근거
3. 실행한 명령과 결과
4. 설계상 판단한 점, 확실하지 않은 점
