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
  'data-search-input',
  'data-search-status',
  '/search.json',
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

$searchIndexPath = Join-Path $SiteDir "search.json"
if (-not (Test-Path $searchIndexPath)) {
  throw "Missing generated client search index at $searchIndexPath"
}

$searchIndex = Get-Content -LiteralPath $searchIndexPath -Raw -Encoding UTF8 | ConvertFrom-Json
if (-not $searchIndex -or -not $searchIndex[0].title -or -not $searchIndex[0].url) {
  throw "Generated client search index is empty or malformed."
}

Write-Host "Homepage filters and client search index verified."
