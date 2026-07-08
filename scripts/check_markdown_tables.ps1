param(
    [string]$PostsPath = "_posts",
    [string]$SitePath = "_site"
)

$ErrorActionPreference = "Stop"
$failures = @()
$categoryName = -join (0x5927, 0x6A21, 0x578B, 0x57FA, 0x7840, 0x77E5, 0x8BC6 | ForEach-Object { [char]$_ })

foreach ($post in Get-ChildItem $PostsPath -File -Filter "*.md") {
    $source = Get-Content $post.FullName -Raw -Encoding UTF8
    if ($source -match ('category:\s*"{0}"' -f [regex]::Escape($categoryName))) {
        $sourceTableCount = [regex]::Matches(
            $source,
            '(?m)^\s*\|.*\|\s*\r?\n\s*\|(?:\s*:?-{2,}:?\s*\|)+'
        ).Count

        $frontMatter = $source -split "---", 3
        $dateMatch = [regex]::Match($frontMatter[1], '(?m)^date:\s*(\d{4})-(\d{2})-(\d{2})')
        $slug = $post.BaseName -replace '^\d{4}-\d{2}-\d{2}-', ''
        $htmlPath = Join-Path $SitePath (
            "{0}\{1}\{2}\{3}\{4}.html" -f
            $categoryName,
            $dateMatch.Groups[1].Value,
            $dateMatch.Groups[2].Value,
            $dateMatch.Groups[3].Value,
            $slug
        )

        if (-not (Test-Path $htmlPath)) {
            $failures += "$($post.Name): generated page is missing"
        } else {
            $rendered = Get-Content $htmlPath -Raw -Encoding UTF8
            $renderedTableCount = [regex]::Matches($rendered, '<table(?:\s|>)').Count
            if ($renderedTableCount -ne $sourceTableCount) {
                $failures += "$($post.Name): expected $sourceTableCount rendered table(s), found $renderedTableCount"
            }
        }
    }
}

if ($failures.Count -gt 0) {
    $failures | ForEach-Object { Write-Error $_ }
    exit 1
}

Write-Output "All Markdown tables rendered successfully."
