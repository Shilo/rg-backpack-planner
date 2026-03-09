# Collect commits and touched files since last tag (or a given ref).
# Usage: .\collect_release_changes.ps1 [since_ref] [until_ref]
# Example: .\collect_release_changes.ps1 v1.2.3 HEAD

param(
    [string]$SinceRef = "",
    [string]$UntilRef = "HEAD"
)

$ErrorActionPreference = "Stop"

if (-not $SinceRef) {
    $tag = git describe --tags --abbrev=0 2>$null
    if ($LASTEXITCODE -eq 0 -and $tag) {
        $SinceRef = $tag.Trim()
    }
}

$range = if ($SinceRef) { "$SinceRef..$UntilRef" } else { $UntilRef }
$repoRoot = (git rev-parse --show-toplevel).Trim()

Write-Host "Repo: $repoRoot"
if ($SinceRef) {
    Write-Host "Range: $SinceRef..$UntilRef"
} else {
    Write-Host "Range: start..$UntilRef (no tags found)"
}

Write-Host ""
Write-Host "== Commits =="
git log --reverse --date=short --pretty=format:'%h|%ad|%s' $range

Write-Host ""
Write-Host ""
Write-Host "== Files Touched =="
git log --reverse --name-only --pretty=format:'--- %h %s' $range | Where-Object { $_.Trim() -ne "" }
