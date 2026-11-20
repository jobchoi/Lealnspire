#!/usr/bin/env bash
# 프로젝트별 진행률: 각 레포 TASKS 파일의 체크박스([x] / 전체)로 계산해 _progress/SUMMARY.md에 씁니다.
#   bash scripts/progress-summary.sh
# 기준: 체크박스는 Claude QC로 실제 확인된 항목만 체크하는 규칙이므로, 이 비율 = "검증된 완료 비율"입니다.
set -uo pipefail
W="${WORKSPACE:-$HOME/workspace}"
OUT="${AI_PROGRESS_DIR:-$W/_progress}/SUMMARY.md"
mkdir -p "$(dirname "$OUT")"

# 이름|TASKS 파일 경로
PROJECTS="Lealnspire (학습 게임)|$W/Lealnspire/docs/TASKS.md
playX-mas (성탄 챌린지)|$W/playX-mas/docs/TASKS.md
장학 기금 (Rt_journeyPrjNum1)|$W/Rt_journeyPrjNum1/TASKS.md
학습실 공간활용 (HowToEasy)|$W/utilProject/toyproject-HowToEasy/docs/space-utilization/TASKS.md"

bar() { local p=$1 n=$(( $1 / 5 )); printf '%s%s' "$(printf '█%.0s' $(seq 1 $n) 2>/dev/null)" "$(printf '░%.0s' $(seq 1 $((20-n))) 2>/dev/null)"; }

{
  echo "# 프로젝트 진행률"
  echo
  echo "갱신: $(date '+%Y-%m-%d %H:%M') · 기준: 각 TASKS 파일의 체크박스(검증된 항목만 체크)"
  echo
  echo "| 프로젝트 | 진행률 | 완료/전체 | 브랜치 |"
  echo "|---|---|---|---|"
  echo "$PROJECTS" | while IFS='|' read -r name file; do
    if [ ! -f "$file" ]; then echo "| $name | - | TASKS 없음 | - |"; continue; fi
    done_n=$(grep -cE '^\s*[-*] \[[xX]\]' "$file")
    todo_n=$(grep -cE '^\s*[-*] \[ \]' "$file")
    total=$((done_n + todo_n))
    pct=0; [ "$total" -gt 0 ] && pct=$((done_n * 100 / total))
    br=$(git -C "$(dirname "$file")" branch --show-current 2>/dev/null)
    echo "| $name | \`$(bar $pct)\` **${pct}%** | $done_n/$total | \`$br\` |"
  done
  echo
  echo "> 체크박스가 없는 작업(기획 문서 등)은 비율에 들어가지 않습니다. 작업이 추가되면 전체 수가 늘어 비율이 내려갈 수 있습니다."
} > "$OUT"
cat "$OUT"
