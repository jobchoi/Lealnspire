param([switch]$Check)
$ErrorActionPreference = 'Stop'
Set-Location (Join-Path $PSScriptRoot '..')
$failed = $false
function Ok($s) { Write-Host "[OK] $s" }
function Warn($s) { Write-Host "[WARN] $s" }
function Fail($s) { Write-Host "[FAIL] $s"; $script:failed = $true }
function Has($s) { return [bool](Get-Command $s -ErrorAction SilentlyContinue) }
function ValidNode {
    if (-not (Has 'node')) { return $false }
    try { $v = [version]((& node --version) -replace '^v',''); return (($v.Major -eq 20 -and $v.Minor -ge 19) -or ($v.Major -eq 22 -and $v.Minor -ge 12) -or $v.Major -gt 22) } catch { return $false }
}
if (-not (Has 'git')) { Fail 'git이 없습니다. https://git-scm.com/install 에서 설치하세요.'; exit 1 }
Ok 'git 사용 가능'
$major = (Get-Content .nvmrc -Raw).Trim()
if ($major -notmatch '^\d+$') { Fail '.nvmrc의 Node 버전이 잘못되었습니다.'; exit 1 }
# 기존 Node를 PATH, conda, nvm, Homebrew 순서로 탐색합니다.
if (-not (ValidNode)) {
    $bases = @()
    if (Has 'conda') { $bases += (& conda info --base) }
    $bases += (Join-Path $env:USERPROFILE 'miniconda3'), (Join-Path $env:USERPROFILE 'anaconda3')
    foreach ($base in $bases) {
        if (-not $base) { continue }
        $target = Join-Path $base 'envs\lealnspire'
        if (Test-Path (Join-Path $target 'node.exe')) {
            $oldPath = $env:PATH; $env:PATH = "$target;$target\Scripts;$target\Library\bin;$oldPath"
            if (ValidNode) { break }; $env:PATH = $oldPath
        }
    }
}
if (-not (ValidNode)) {
    $nvmRoot = if ($env:NVM_HOME) { $env:NVM_HOME } else { Join-Path $env:APPDATA 'nvm' }
    if (Test-Path $nvmRoot) {
        foreach ($dir in (Get-ChildItem $nvmRoot -Directory | Sort-Object Name -Descending)) {
            if (-not (Test-Path (Join-Path $dir.FullName 'node.exe'))) { continue }
            $oldPath = $env:PATH; $env:PATH = "$($dir.FullName);$oldPath"
            if (ValidNode) { break }; $env:PATH = $oldPath
        }
    }
}
if ((-not (ValidNode)) -and (Has 'brew')) {
    $prefix = & brew --prefix "node@$major" 2>$null
    if ($prefix -and (Test-Path (Join-Path $prefix 'bin/node'))) {
        $oldPath = $env:PATH; $env:PATH = "$(Join-Path $prefix 'bin');$oldPath"
        if (-not (ValidNode)) { $env:PATH = $oldPath }
    }
}
if (ValidNode) { Ok "Node $(& node --version) 사용 가능" }
elseif ($Check) { Warn '조건에 맞는 Node가 PATH에 없습니다.' }
else {
    if (Has 'conda') {
        $base = (& conda info --base).Trim()
        $envs = & conda env list --json | ConvertFrom-Json
        $target = Join-Path $base 'envs\lealnspire'
        if (-not ($envs.envs | Where-Object { $_ -eq $target })) { & conda create -y -n lealnspire -c conda-forge "nodejs=$major"; if ($LASTEXITCODE -ne 0) { Fail 'conda Node 설치 실패' } }
        $env:PATH = "$target;$target\Scripts;$target\Library\bin;$env:PATH"
        if (-not (ValidNode)) { & conda install -y -n lealnspire -c conda-forge "nodejs=$major"; if ($LASTEXITCODE -ne 0) { Fail 'conda Node 설치 실패' } }
    } elseif (Has 'winget') {
        # winget 패키지 버전을 고정해 설치합니다.
        & winget install --id OpenJS.NodeJS.LTS --version 22.14.0 --exact --accept-package-agreements --accept-source-agreements --scope user
        if ($LASTEXITCODE -ne 0) { Fail 'winget Node 설치 실패' }
        $env:PATH = "$env:LOCALAPPDATA\Programs\nodejs;$env:ProgramFiles\nodejs;$env:PATH"
    } else { Fail 'conda 또는 winget이 없습니다. Node를 직접 설치하세요.' }
    if (ValidNode) { Ok "Node $(& node --version) 준비됨" } else { Fail '조건에 맞는 Node를 준비하지 못했습니다.' }
}
if ((ValidNode) -and (Has 'npm')) {
    try {
        $mcp = Get-Content .mcp.json -Raw -Encoding UTF8 | ConvertFrom-Json
        $arg = @($mcp.mcpServers.playwright.args | Where-Object { $_ -match '^@playwright/mcp@\d' }) | Select-Object -First 1
        if (-not $arg) { throw '버전 없음' }
    } catch { Fail '.mcp.json에서 Playwright MCP 버전을 읽지 못했습니다.'; $arg = $null }
    if ($Check) {
        if (Test-Path node_modules) { Ok 'node_modules 존재' } else { Warn 'node_modules가 없습니다. npm ci가 필요합니다.' }
        $browserRoot = Join-Path $env:LOCALAPPDATA 'ms-playwright'
        $browser = if (Test-Path $browserRoot) { Get-ChildItem $browserRoot -Filter chrome.exe -Recurse -ErrorAction SilentlyContinue | Select-Object -First 1 }
        if ($browser) { Ok 'Playwright 브라우저 존재' } else { Warn 'Playwright 브라우저가 없습니다.' }
        try {
            $settings = Get-Content '.claude/settings.local.json' -Raw -Encoding UTF8 | ConvertFrom-Json
            $dir = Split-Path (Get-Command node).Source
            if ($settings.env.PATH -and @($settings.env.PATH -split ';') -contains $dir) { Ok 'Claude Code PATH에 Node 경로 포함' } else { Warn 'Claude Code PATH에 Node 경로가 없습니다.' }
        } catch { Warn 'Claude Code PATH 설정을 확인하지 못했습니다.' }
    } else {
        & npm ci; if ($LASTEXITCODE -eq 0) { Ok 'npm ci 완료' } else { Fail 'npm ci 실패' }
        if ($arg) { & npx -y $arg install-browser chrome-for-testing; if ($LASTEXITCODE -eq 0) { Ok 'Playwright 브라우저 준비됨' } else { Fail 'Playwright 브라우저 설치 실패' } }
        try {
            $file = '.claude/settings.local.json'
            if (Test-Path $file) { $settings = Get-Content $file -Raw -Encoding UTF8 | ConvertFrom-Json } else { $settings = [pscustomobject]@{} }
            if (-not $settings.env) { $settings | Add-Member -NotePropertyName env -NotePropertyValue ([pscustomobject]@{}) -Force }
            $old = $settings.env.PATH; if (-not $old) { $old = $env:PATH }
            $dir = Split-Path (Get-Command node).Source
            if (@($old -split ';') -notcontains $dir) { $old = "$dir;$old" }
            $settings.env | Add-Member -NotePropertyName PATH -NotePropertyValue $old -Force
            New-Item -ItemType Directory -Force .claude | Out-Null
            $json = $settings | ConvertTo-Json -Depth 100
            [IO.File]::WriteAllText((Join-Path (Get-Location) $file), $json + "`n", (New-Object System.Text.UTF8Encoding $false))
            Ok 'Claude Code PATH 설정 확인'
        } catch { Fail "Claude PATH 설정 실패: $_" }
    }
} elseif ($Check) { Warn 'Node/npm이 없어 npm 및 브라우저 상태를 확인할 수 없습니다.' } else { Fail 'npm을 사용할 수 없습니다.' }
if (Has 'ssh') {
    $oldPreference = $ErrorActionPreference; $ErrorActionPreference = 'Continue'
    $sshResult = (& ssh -T -o BatchMode=yes -o ConnectTimeout=5 -o StrictHostKeyChecking=yes git@github.com 2>&1 | Out-String)
    $ErrorActionPreference = $oldPreference
    if ($sshResult -match 'successfully authenticated') {
        Ok 'GitHub SSH 인증 확인'
        $origin = & git remote get-url origin 2>$null
        if ($origin -match '^https://github\.com/(.+)$') {
            if ($Check) { Warn 'origin이 HTTPS입니다. 전체 실행 시 SSH로 변경합니다.' }
            else { & git remote set-url origin "git@github.com:$($Matches[1])"; if ($LASTEXITCODE -eq 0) { Ok 'origin을 SSH로 변경' } else { Fail 'origin 변경 실패' } }
        }
    } else { Warn 'GitHub SSH 인증을 확인하지 못했습니다. 키 등록과 호스트 신뢰 설정을 확인하세요.' }
} else { Warn 'ssh가 없어 GitHub 인증을 확인하지 못했습니다.' }
if ($Check) { Warn 'npm run verify는 점검 모드에서 실행하지 않습니다.' }
elseif ((ValidNode) -and (Has 'npm')) { & npm run verify; if ($LASTEXITCODE -eq 0) { Ok '검증 통과' } else { Fail 'npm run verify 실패' } }
Warn '사용자가 직접 할 일: Claude Code 재시작, 프로젝트 MCP 서버(context7, playwright) 승인, /mcp로 연결 확인'
if ($failed) { exit 1 } else { exit 0 }
