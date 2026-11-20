# 시행착오에서 배운 점

| 상황 | 기록된 사례와 대응 |
|---|---|
| 클라우드 세션에서 push가 403 | Claude GitHub 앱에 저장소 권한이 없어 실패했습니다. 권한이 해결된 뒤 다시 push하고 GitHub Actions 결과를 확인했습니다. |
| Node를 찾지 못함 | WSL에서 conda 환경에 Node 22를 준비하고, 커밋하지 않는 `.claude/settings.local.json`의 `env.PATH`로 Claude Code에 연결했습니다. Node가 없으면 검증을 성공으로 기록하지 않습니다. |
| AI의 권한 자기 확대 차단 | npm·git 자동 허용을 AI가 추가하려는 시도가 안전장치에 거부됐습니다. 필요한 권한은 사용자가 직접 검토하고 설정합니다. |
| `settings.json` 주석 | 맨 앞의 `//` 주석으로 JSON이 깨져 설정 전체가 무시되는 문제가 발견됐습니다. 설정이 기대대로 작동하지 않으면 형식부터 확인합니다. |
| PowerShell과 BOM | Windows PowerShell 5.1에서 한글이 깨지지 않도록 `setup.ps1`을 UTF-8 BOM으로 저장하도록 지시했습니다. |
| Playwright 브라우저 종류 | 이 프로젝트의 MCP는 headless Chromium을 사용하며, 설치 명령은 `install-browser chrome-for-testing`입니다. 일반 브라우저가 설치됐다는 사실만으로 해당 브라우저 준비를 가정하지 말고 프로젝트 명령을 확인합니다. |
| context7 | 라이브러리 문서 조회에 사용합니다. 연결 실패나 보안 정책 차단 등으로 사용할 수 없으면 공식 문서를 확인하고 출처를 보고합니다. 질의에 코드나 비밀 정보를 넣지 않습니다. |
| 백그라운드 `codex exec` 멈춤 | 표준 입력 대기로 멈출 수 있어 실행 스크립트는 명령 끝에 `< /dev/null`을 넣어 입력을 닫습니다. 로그와 종료 코드도 확인합니다. |

T0b 검증에서는 Linux 전체 실행과 Windows PowerShell 5.1 점검 모드가 확인됐지만, macOS 전체와 Windows 전체 설치는 미검증으로 남았습니다. 다른 환경의 성공을 자기 환경의 성공으로 간주하지 마세요.
