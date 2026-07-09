param(
    [string]$SitePath = "_site",
    [string]$CssPath = "css/main.css"
)

$ErrorActionPreference = "Stop"
$failures = @()
$articleCount = 0

if (-not (Test-Path $SitePath)) {
    Write-Output "Generated site is missing: $SitePath"
    exit 1
}

$requiredPatterns = [ordered]@{
    'class="post-layout"' = "post layout hook is missing"
    'class="post-toc"' = "post directory hook is missing"
    'class="post-toc-toggle"' = "post directory toggle is missing"
    'data-post-content' = "post content hook is missing"
}

foreach ($file in Get-ChildItem $SitePath -Recurse -File -Filter "*.html") {
    $html = Get-Content $file.FullName -Raw -Encoding UTF8
    if ($html -notmatch '<article class="post">') {
        continue
    }

    $articleCount++
    foreach ($entry in $requiredPatterns.GetEnumerator()) {
        if ($html -notmatch [regex]::Escape($entry.Key)) {
            $failures += "$($file.FullName): $($entry.Value)"
        }
    }

    if ($html -notmatch '/assets/js/post-navigation\.js') {
        $failures += "$($file.FullName): post navigation script is missing"
    }

    $contentMatch = [regex]::Match(
        $html,
        '<div class="post-content"[^>]*data-post-content[^>]*>(?<content>[\s\S]*?)</div>\s*</article>'
    )
    if ($contentMatch.Success) {
        $ids = [regex]::Matches(
            $contentMatch.Groups["content"].Value,
            '<h[1-3][^>]*\sid="([^"]+)"'
        ) | ForEach-Object { $_.Groups[1].Value }

        foreach ($duplicate in $ids | Group-Object | Where-Object Count -gt 1) {
            $failures += "$($file.FullName): duplicate heading id '$($duplicate.Name)'"
        }
    }
}

if ($articleCount -eq 0) {
    $failures += "No generated article pages were found."
}

if (-not (Test-Path $CssPath)) {
    $failures += "Stylesheet is missing: $CssPath"
} else {
    $css = Get-Content $CssPath -Raw -Encoding UTF8
    $requiredCssMarkers = @(
        ".post-layout",
        ".post-toc",
        ".post-toc-link.is-active",
        ".post-toc-toggle",
        ".post-content pre"
    )
    foreach ($marker in $requiredCssMarkers) {
        if ($css -notmatch [regex]::Escape($marker)) {
            $failures += "$($CssPath): missing CSS marker '$marker'"
        }
    }
}

if ($failures.Count -gt 0) {
    $failures | ForEach-Object { Write-Output $_ }
    exit 1
}

Write-Output "All article rendering checks passed ($articleCount article pages)."
