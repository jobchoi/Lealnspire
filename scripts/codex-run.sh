#!/usr/bin/env bash
# Codex(GPT) 작업 실행 + 진행 현황 기록
#
#   bash scripts/codex-run.sh <레포 경로> <작업 이름> <프롬프트>
#   예) bash scripts/codex-run.sh ~/workspace/playX-mas "기획 초안" "docs/handoff/P1.md 지시서대로 작업해줘"
#
# - 시작/종료/종료 코드는 이 스크립트가 기록(사실)
# - 단계별 진행은 Codex가 직접 한 줄씩 추가(자기 보고)
# - Codex 쓰기 권한: 대상 레포 + 진행 폴더(_progress)만
set -uo pipefail

REPO="$(cd "$1" && pwd)"; TASK="$2"; PROMPT="$3"
PROJ="$(basename "$REPO")"
PDIR="${AI_PROGRESS_DIR:-$HOME/workspace/_progress}"
BOARD="$PDIR/PROGRESS.md"
LOGS="$PDIR/logs"
mkdir -p "$LOGS"

if [ ! -f "$BOARD" ]; then
  cat > "$BOARD" <<'EOF'
# AI 작업 진행 현황

- **스크립트** 행: 시작·종료·종료 코드(사실). **GPT** 행: Codex의 단계별 자기 보고(참고용).
- 로그: `logs/<시각>-<프로젝트>.log`, Codex 최종 보고: `logs/<시각>-<프로젝트>.md`

| 시각 | 기록자 | 프로젝트 | 작업 | 상태 | 메모 |
|---|---|---|---|---|---|
EOF
fi

row() { printf '| %s | %s | %s | %s | %s | %s |\n' "$(date '+%m-%d %H:%M')" "$1" "$PROJ" "$TASK" "$2" "$3" >> "$BOARD"; }

CODEX="${CODEX_BIN:-$(command -v codex || ls -d "$HOME"/.vscode-server/extensions/openai.chatgpt-*/bin/linux-x86_64/codex 2>/dev/null | tail -1)}"
[ -x "$CODEX" ] || { echo "codex 실행 파일을 찾지 못했습니다(CODEX_BIN으로 지정)"; exit 1; }

STAMP="$(date '+%Y%m%d-%H%M%S')"
LOG="$LOGS/$STAMP-$PROJ.log"; OUT="$LOGS/$STAMP-$PROJ.md"

PROGRESS_RULE="

[진행 기록 규칙] 작업을 3~6단계로 나누고, 각 단계가 끝날 때마다 $BOARD 파일 끝에 아래 형식으로 한 줄만 추가하라(기존 줄 수정 금지):
| <MM-DD HH:MM> | GPT | $PROJ | $TASK | <완료 단계>/<전체 단계> | <한 줄 메모> |"

row "스크립트" "시작" "-"
"$CODEX" exec -s workspace-write -C "$REPO" --add-dir "$PDIR" -o "$OUT" "$PROMPT$PROGRESS_RULE" < /dev/null > "$LOG" 2>&1  # stdin을 닫지 않으면 백그라운드에서 입력 대기로 멈춤
CODE=$?
if [ $CODE -eq 0 ]; then row "스크립트" "완료" "exit=0, QC 대기"; else row "스크립트" "실패" "exit=$CODE, 로그 확인"; fi
echo "$PROJ / $TASK → exit=$CODE (보고: $OUT)"
exit $CODE
