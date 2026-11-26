#!/usr/bin/env bash
# macOS 기본 Bash 3.2에서도 실행합니다.
set -u
set -o pipefail
cd "$(dirname "$0")/.." || exit 1
check=0
if [ "${1:-}" = "--check" ] && [ "$#" -eq 1 ]; then check=1
elif [ "$#" -ne 0 ]; then printf '[FAIL] 사용법: bash scripts/setup.sh [--check]\n'; exit 1; fi
failed=0
ok() { printf '[OK] %s\n' "$1"; }
warn() { printf '[WARN] %s\n' "$1"; }
fail() { printf '[FAIL] %s\n' "$1"; failed=1; }
has() { command -v "$1" >/dev/null 2>&1; }
valid_node() { has node && node -e 'const [a,b]=process.versions.node.split(".").map(Number); process.exit((a===20&&b>=19)||(a===22&&b>=12)||a>22?0:1)' >/dev/null 2>&1; }
if ! has git; then fail 'git이 없습니다. https://git-scm.com/install 에서 설치하세요.'; exit 1; fi
ok 'git 사용 가능'
node_major=$(tr -d '[:space:]' < .nvmrc)
case "$node_major" in ''|*[!0-9]*) fail '.nvmrc의 Node 버전이 잘못되었습니다.'; exit 1;; esac
# PATH, conda 환경, nvm, Homebrew 순서로 기존 Node를 찾습니다.
if ! valid_node; then
  conda_base=''
  if has conda; then conda_base=$(conda info --base 2>/dev/null || :); fi
  for base in "$conda_base" "$HOME/miniconda3" "$HOME/anaconda3"; do
    [ -n "$base" ] || continue
    if [ -x "$base/envs/lealnspire/bin/node" ]; then
      old_path=$PATH; PATH="$base/envs/lealnspire/bin:$PATH"; export PATH
      if valid_node; then break; fi
      PATH=$old_path; export PATH
    fi
  done
fi
if ! valid_node; then
  for candidate in "${NVM_DIR:-$HOME/.nvm}"/versions/node/*/bin; do
    [ -x "$candidate/node" ] || continue
    old_path=$PATH; PATH="$candidate:$PATH"; export PATH
    if valid_node; then break; fi
    PATH=$old_path; export PATH
  done
fi
if ! valid_node && has brew; then
  candidate=$(brew --prefix "node@$node_major" 2>/dev/null || :)
  if [ -n "$candidate" ] && [ -x "$candidate/bin/node" ]; then
    old_path=$PATH; PATH="$candidate/bin:$PATH"; export PATH
    if ! valid_node; then PATH=$old_path; export PATH; fi
  fi
fi
if valid_node; then ok "Node $(node --version) 사용 가능"
elif [ "$check" -eq 1 ]; then warn '조건에 맞는 Node가 PATH에 없습니다.'
else
  if has conda; then
    conda_base=$(conda info --base) || { fail 'conda 경로를 확인하지 못했습니다.'; exit 1; }
    # shellcheck disable=SC1091
    . "$conda_base/etc/profile.d/conda.sh"
    if ! conda env list | awk '{print $1}' | grep -Fxq lealnspire; then
      conda create -y -n lealnspire -c conda-forge "nodejs=$node_major" || fail 'conda Node 설치 실패'
    fi
    conda activate lealnspire || fail 'conda 환경 활성화 실패'
    if ! valid_node; then conda install -y -n lealnspire -c conda-forge "nodejs=$node_major" || fail 'conda Node 설치 실패'; fi
  elif [ "$(uname -s)" = Darwin ]; then
    if has brew; then
      brew list "node@$node_major" >/dev/null 2>&1 || brew install "node@$node_major" || fail 'Homebrew Node 설치 실패'
      node_prefix=$(brew --prefix "node@$node_major") && PATH="$node_prefix/bin:$PATH" && export PATH
    else fail 'Homebrew가 없습니다. https://brew.sh/ 에서 설치하세요.'; fi
  else
    export NVM_DIR="${NVM_DIR:-$HOME/.nvm}"
    if [ ! -s "$NVM_DIR/nvm.sh" ]; then
      if has curl; then curl -fsSL https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.3/install.sh | bash || fail 'nvm 설치 실패'
      else fail 'curl이 없습니다. 설치 후 다시 실행하세요.'; fi
    fi
    if [ -s "$NVM_DIR/nvm.sh" ]; then
      . "$NVM_DIR/nvm.sh"
      nvm install "$node_major" && nvm use "$node_major" || fail 'nvm Node 설치 실패'
    fi
  fi
  if valid_node; then ok "Node $(node --version) 준비됨"; else fail '조건에 맞는 Node를 준비하지 못했습니다.'; fi
fi
if valid_node && has npm; then
  mcp_version=$(node -e 'const a=require("./.mcp.json").mcpServers.playwright.args; const s=a.find(x=>/^@playwright\/mcp@\d/.test(x)); if(!s)process.exit(1); console.log(s.slice("@playwright/mcp@".length))') || mcp_version=''
  if [ -z "$mcp_version" ]; then fail '.mcp.json에서 Playwright MCP 버전을 읽지 못했습니다.'; fi
  if [ "$check" -eq 1 ]; then
    [ -d node_modules ] && ok 'node_modules 존재' || warn 'node_modules가 없습니다. npm ci가 필요합니다.'
    node -e 'try { const fs=require("fs"), path=require("path"), core=require("playwright-core"), browsers=require(path.join(path.dirname(require.resolve("playwright-core")),"browsers.json")); const executable=core.chromium.executablePath(), parts=executable.split(path.sep), i=parts.findIndex(x=>/^chromium-\d+$/.test(x)), revision=browsers.browsers.find(x=>x.name==="chromium-headless-shell").revision; if(i<0||!fs.existsSync(executable)) process.exit(1); const dir=path.join(parts.slice(0,i).join(path.sep)||path.sep,"chromium_headless_shell-"+revision), name=process.platform==="win32"?"chrome-headless-shell.exe":"chrome-headless-shell"; process.exit(fs.readdirSync(dir).some(x=>fs.existsSync(path.join(dir,x,name)))?0:1) } catch { process.exit(1) }' && ok 'E2E Chromium 및 헤드리스 셸 존재' || warn 'E2E Chromium 또는 헤드리스 셸이 없습니다. npx playwright install chromium이 필요합니다.'
    browser=$(find "$HOME/.cache/ms-playwright" -type f -name chrome 2>/dev/null | head -n 1)
    [ -n "$browser" ] && ok 'Playwright 브라우저 존재' || warn 'Playwright 브라우저가 없습니다.'
    NODE_SETUP_DIR="$(dirname "$(command -v node)")" node -e 'try { const s=require("./.claude/settings.local.json"); process.exit(typeof s.env?.PATH === "string" && s.env.PATH.split(require("path").delimiter).includes(process.env.NODE_SETUP_DIR) ? 0 : 1) } catch { process.exit(1) }' && ok 'Claude Code PATH에 Node 경로 포함' || warn 'Claude Code PATH에 Node 경로가 없습니다.' 
  else
    npm ci && ok 'npm ci 완료' || fail 'npm ci 실패'
    npx --no-install playwright install chromium && ok 'E2E Chromium 준비됨' || fail 'E2E Chromium 설치 실패'
    if [ -n "$mcp_version" ]; then npx -y "@playwright/mcp@$mcp_version" install-browser chrome-for-testing && ok 'Playwright 브라우저 준비됨' || fail 'Playwright 브라우저 설치 실패'; fi
    if [ "$(uname -s)" = Linux ]; then
      browser=$(find "${HOME}/.cache/ms-playwright" -type f \( -name chrome -o -name chrome-linux64 \) 2>/dev/null | head -n 1)
      if [ -n "$browser" ] && has ldd; then
        missing=$(ldd "$browser" 2>/dev/null | grep 'not found' || :)
        if [ -n "$missing" ]; then warn "브라우저 시스템 라이브러리가 누락되었습니다. 배포판에 맞게 설치하세요. 참고: sudo npx playwright install-deps chromium"; printf '%s\n' "$missing" | while IFS= read -r line; do warn "$line"; done; else ok '브라우저 시스템 라이브러리 확인'; fi
      else warn '브라우저 실행 파일 또는 ldd가 없어 시스템 라이브러리를 확인하지 못했습니다.'; fi
    fi
    node_dir=$(dirname "$(command -v node)")
    NODE_SETUP_DIR="$node_dir" node <<'NODE'
const fs = require('fs'); const path = require('path');
const file = '.claude/settings.local.json';
try {
  const settings = fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, 'utf8')) : {};
  if (!settings || typeof settings !== 'object' || Array.isArray(settings) || (settings.env != null && (typeof settings.env !== 'object' || Array.isArray(settings.env)))) throw Error('설정 형식 오류');
  settings.env ||= {};
  const old = settings.env.PATH || process.env.PATH || '';
  if (typeof old !== 'string') throw Error('PATH 형식 오류');
  const dir = process.env.NODE_SETUP_DIR;
  if (!old.split(path.delimiter).includes(dir)) settings.env.PATH = dir + path.delimiter + old;
  else if (!settings.env.PATH) settings.env.PATH = old;
  fs.mkdirSync('.claude', {recursive:true}); fs.writeFileSync(file, JSON.stringify(settings, null, 2) + '\n');
} catch (e) { console.error('[FAIL] Claude PATH 설정 실패: ' + e.message); process.exit(1); }
NODE
    [ "$?" -eq 0 ] && ok 'Claude Code PATH 설정 확인' || failed=1
  fi
else
  [ "$check" -eq 1 ] && warn 'Node/npm이 없어 npm 및 브라우저 상태를 확인할 수 없습니다.' || fail 'npm을 사용할 수 없습니다.'
fi
if has ssh; then
  ssh_result=$(ssh -T -o BatchMode=yes -o ConnectTimeout=5 -o StrictHostKeyChecking=yes git@github.com 2>&1 || :)
  case "$ssh_result" in *'successfully authenticated'*)
    ok 'GitHub SSH 인증 확인'
    origin=$(git remote get-url origin 2>/dev/null || :)
    case "$origin" in https://github.com/*)
      if [ "$check" -eq 1 ]; then warn 'origin이 HTTPS입니다. 전체 실행 시 SSH로 변경합니다.'
      else repo=${origin#https://github.com/}; git remote set-url origin "git@github.com:$repo" && ok 'origin을 SSH로 변경' || fail 'origin 변경 실패'; fi;; esac;;
    *) warn 'GitHub SSH 인증을 확인하지 못했습니다. 키 등록과 호스트 신뢰 설정을 확인하세요.';; esac
else warn 'ssh가 없어 GitHub 인증을 확인하지 못했습니다.'; fi
if [ "$check" -eq 1 ]; then warn 'npm run verify는 점검 모드에서 실행하지 않습니다.'
elif valid_node && has npm; then npm run verify && ok '검증 통과' || fail 'npm run verify 실패'; fi
printf '[WARN] 사용자가 직접 할 일: Claude Code 재시작, 프로젝트 MCP 서버(context7, playwright) 승인, /mcp로 연결 확인\n'
exit "$failed"
