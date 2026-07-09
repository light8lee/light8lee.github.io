param(
    [string]$PostsPath = "_posts",
    [string]$SitePath = "_site"
)

$ErrorActionPreference = "Stop"
$failures = @()
$categoryName = -join (0x5927, 0x6A21, 0x578B, 0x57FA, 0x7840, 0x77E5, 0x8BC6 | ForEach-Object { [char]$_ })
$looseLanguages = "python|text|yaml|json|bash|shell|javascript|typescript"

foreach ($post in Get-ChildItem $PostsPath -File -Filter "*.md") {
    $source = Get-Content $post.FullName -Raw -Encoding UTF8
    if ($source -notmatch ('category:\s*"{0}"' -f [regex]::Escape($categoryName))) {
        continue
    }

    $lines = $source -split "\r?\n"
    $inFence = $false
    $fenceLanguage = ""
    $fenceCount = 0

    for ($index = 0; $index -lt $lines.Count; $index++) {
        if ($lines[$index] -match '^\s*```([A-Za-z0-9_-]*)') {
            if (-not $inFence) {
                $inFence = $true
                $fenceLanguage = $Matches[1].ToLowerInvariant()
                $fenceCount++
            } else {
                $inFence = $false
                $fenceLanguage = ""
            }
            continue
        }

        if ($inFence -and $fenceLanguage -ne "mermaid" -and
            $lines[$index] -match '(\$\$|\$[^$\r\n]+\$|\\\(|\\\[)') {
            $failures += "$($post.Name):$($index + 1): math delimiter inside code fence"
        }

        if (-not $inFence -and $lines[$index] -match "^\s*($looseLanguages)\s*$") {
            $failures += "$($post.Name):$($index + 1): loose code language marker '$($Matches[1])'"
        }

        if (-not $inFence) {
            foreach ($inlineCode in [regex]::Matches($lines[$index], '`([^`]+)`')) {
                $code = $inlineCode.Groups[1].Value
                if ($code.Length -gt 55 -or $code -match '\b(def|class|return|import|for|while)\b') {
                    $failures += "$($post.Name):$($index + 1): block code is mixed into prose"
                }
            }
        }
    }

    if ($inFence) {
        $failures += "$($post.Name): unclosed fenced code block"
    }

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
        continue
    }

    $rendered = Get-Content $htmlPath -Raw -Encoding UTF8
    $renderedCodeCount = [regex]::Matches($rendered, '<pre(?:\s|>)').Count
    if ($renderedCodeCount -lt $fenceCount) {
        $failures += "$($post.Name): expected at least $fenceCount rendered code block(s), found $renderedCodeCount"
    }

    if ($rendered -match "<p>\s*($looseLanguages)\s*</p>") {
        $failures += "$($post.Name): generated page contains loose code marker '$($Matches[1])'"
    }
}

if ($failures.Count -gt 0) {
    $failures | ForEach-Object { Write-Output $_ }
    exit 1
}

Write-Output "All Markdown code blocks rendered successfully."
