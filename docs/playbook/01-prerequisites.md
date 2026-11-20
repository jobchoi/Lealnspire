# 작업 전 준비물

아래는 Lealnspire 사례를 시작하기 위한 점검표입니다. 각 서비스의 계정과 사용량 조건은 사용자가 직접 확인합니다.

- [ ] **계정과 요금제**: GitHub와 Claude Code, Codex를 사용할 준비를 합니다. `codex exec`는 ChatGPT 요금제 사용량 또는 OpenAI API 과금이 들 수 있습니다. Claude가 실행할 때는 작업마다 사용자 승인을 받는 것이 이 저장소의 규칙입니다.
- [ ] **작업 환경**: VS Code의 Codex 창 또는 Codex CLI를 사용할 방식을 정합니다. 이 사례는 Linux/WSL과 Windows PowerShell을 사용했습니다. macOS 전체 설치는 기록상 미검증입니다.
- [ ] **Node와 Git**: Git과 Node를 준비합니다. 이 프로젝트의 Node 조건은 `^20.19.0 || >=22.12.0`이며 권장 버전은 22입니다. Node가 기본 PATH에 없으면 Claude Code용 로컬 PATH를 설정할 수 있습니다.
- [ ] **GitHub SSH 키**: 각 PC의 SSH 키로 GitHub 인증을 준비합니다. 키나 토큰은 저장소에 넣지 않습니다. 스크립트는 인증 여부를 확인하지만 키를 만들지는 않습니다.
- [ ] **저장소**: 저장소를 클론하고 프로젝트 폴더에서 작업합니다. 먼저 설치나 변경 없는 점검 모드를 실행합니다.

  ```bash
  # Linux, WSL, macOS
  bash scripts/setup.sh --check
  ```

  ```powershell
  # Windows PowerShell
  .\scripts\setup.ps1 -Check
  ```

- [ ] **환경 구성**: 점검 결과를 보고 `bash scripts/setup.sh` 또는 `./scripts/setup.ps1`을 실행합니다. 스크립트는 Node 준비, `npm ci`, 브라우저 설치, `npm run verify` 등을 수행합니다. 관리자 권한이나 sudo를 직접 실행하지 않습니다. Windows 전체 설치는 기록상 미검증입니다.
- [ ] **MCP 승인**: Claude Code를 재시작하고 프로젝트의 `context7`과 `playwright` 서버를 직접 승인한 뒤 `/mcp`에서 연결을 확인합니다. 설정 스크립트가 자동 승인하지는 않습니다.
- [ ] **권한 설정**: AI가 실행할 수 있는 명령과 거부할 명령을 사용자가 살펴봅니다. 권한 확대가 필요하면 사용자가 직접 설정합니다. 키와 비밀번호는 기록하지 않습니다.
- [ ] **비용**: AI 사용량과 요금제를 확인하고 작업 범위를 작게 정합니다. 여러 에이전트는 문맥을 각각 읽어 사용량이 늘 수 있습니다. 유료 API 호출이나 자동 실행을 추가하려면 방식과 예상 비용을 먼저 설명하고 승인을 받습니다.

자세한 실행 조건과 수동 설정은 [프로젝트 README](../../README.md)를 참고하세요.
