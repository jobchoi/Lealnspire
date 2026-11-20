# AGENTS.md — Claude 외 AI 에이전트(Codex/GPT 등)용 안내

이 저장소의 작업 규칙은 **[CLAUDE.md](CLAUDE.md) 하나**입니다. 이름은 CLAUDE.md지만 모든 AI 에이전트에게 똑같이 적용됩니다. 먼저 CLAUDE.md를 끝까지 읽고 따르세요.

## 이 저장소에서의 역할 분담

- **Claude Code**: 오케스트레이터. 작업 지시서 작성, 결과 검증, 교차 검토, 문서 갱신, 커밋·push.
- **Codex(GPT)**: 지시서를 받은 작업의 **구현 담당**. 지시서는 `docs/handoff/<작업 ID>.md`에 있습니다.

## Codex가 지킬 것(CLAUDE.md에 더해)

1. 지시서(`docs/handoff/<작업 ID>.md`)에 적힌 **범위와 파일만** 만들거나 수정합니다.
2. **커밋, push, 브랜치 변경을 하지 않습니다.** 변경은 작업 트리에 남겨 두면 Claude가 검증하고 커밋합니다.
3. `docs/TASKS.md`, `docs/NEXT_SESSION.md`, `docs/WORK_HISTORY.md`는 수정하지 않습니다(Claude가 검증 결과와 함께 갱신).
4. 실행하지 못한 검증은 "미검증"으로 적습니다. 예: 네트워크가 막혀 설치를 못 했으면 그렇게 보고합니다.
5. 작업이 끝나면 지시서의 "보고 형식"대로 마지막 메시지를 작성합니다.
