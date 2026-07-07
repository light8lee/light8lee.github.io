param(
  [string]$SiteDir = "_site"
)

$ErrorActionPreference = "Stop"

$indexPath = Join-Path $SiteDir "index.html"
if (-not (Test-Path $indexPath)) {
  throw "Missing built homepage at $indexPath. Run bundle exec jekyll build first."
}

$html = Get-Content -LiteralPath $indexPath -Raw -Encoding UTF8

$requiredSnippets = @(
  'data-video-filter-root',
  'data-filter-type="collection"',
  'data-filter-type="tag"',
  'data-collection="post-training"',
  'data-collection="agent"',
  'data-collection="dive-into-codex"',
  'post-training',
  'agent',
  'dive-into-codex'
)

foreach ($snippet in $requiredSnippets) {
  if (-not $html.Contains($snippet)) {
    throw "Homepage filter markup missing expected snippet: $snippet"
  }
}

Write-Host "Homepage filter markup verified."
