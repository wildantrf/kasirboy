$ErrorActionPreference = 'Stop'
Set-Location -LiteralPath $PSScriptRoot
$nodeCommand = Get-Command node -ErrorAction SilentlyContinue
if ($nodeCommand) {
    & $nodeCommand.Source 'node_modules/next/dist/bin/next' dev --hostname 127.0.0.1 --port 3100
} else {
    $bundledNode = Join-Path $env:USERPROFILE '.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node.exe'
    if (-not (Test-Path -LiteralPath $bundledNode)) { throw 'Node.js 24 is required. Install Node.js and run this launcher again.' }
    & $bundledNode 'node_modules/next/dist/bin/next' dev --hostname 127.0.0.1 --port 3100
}
