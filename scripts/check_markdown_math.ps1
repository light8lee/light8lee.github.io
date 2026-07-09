param(
    [string]$PostsPath = "_posts",
    [string]$SitePath = "_site"
)

$ErrorActionPreference = "Stop"
$failures = @()
$categoryName = -join (0x5927, 0x6A21, 0x578B, 0x57FA, 0x7840, 0x77E5, 0x8BC6 | ForEach-Object { [char]$_ })
$bareMathSymbols = -join (
    0x03C0, 0x03B8, 0x03B2, 0x03C4, 0x03B1, 0x0394,
    0x221A, 0x2211, 0x220F, 0x221E, 0x2248, 0x2260,
    0x2264, 0x2265 | ForEach-Object { [char]$_ }
)
$bareMathPattern = "[$([regex]::Escape($bareMathSymbols))]"
$formulaOnlyImages = @(
    "20260504220018",
    "20260504220037",
    "20260504220153",
    "20260504222349",
    "20260504224052",
    "20260504224105",
    "20260506091613",
    "20260506091639",
    "20260506091711",
    "20260506091725",
    "20260505122330",
    "20260505122349",
    "20260505123639",
    "20260505123659",
    "20260505123829",
    "20260505124023"
)
$malformedPatterns = @(
    "RtotalRtotal",
    "RtRt",
    "AtAt",
    "AiAi",
    "riri",
    "stst",
    "Vϕ",
    "πθold",
    "πref",
    "πθ",
    "VV",
    "vv"
)

foreach ($post in Get-ChildItem $PostsPath -File -Filter "*.md") {
    $source = Get-Content $post.FullName -Raw -Encoding UTF8
    if ($source -notmatch ('category:\s*"{0}"' -f [regex]::Escape($categoryName))) {
        continue
    }

    $outsideCode = [regex]::Replace($source, '(?ms)^```.*?^```\s*', '')
    $plainProse = [regex]::Replace($outsideCode, '(?s)\$\$.*?\$\$', ' ')
    $plainProse = [regex]::Replace($plainProse, '(?s)\$[^$\r\n]+\$', ' ')
    $plainProse = [regex]::Replace($plainProse, 'https?://[^\s)]+', ' ')

    foreach ($imageId in $formulaOnlyImages) {
        if ($outsideCode -match "pasted-image-$imageId\.png") {
            $failures += "$($post.Name): formula-only image $imageId should be LaTeX"
        }
    }

    foreach ($pattern in $malformedPatterns) {
        if ($outsideCode.Contains($pattern)) {
            $failures += "$($post.Name): malformed math token '$pattern'"
        }
    }

    if ($outsideCode -match $bareMathPattern) {
        $failures += "$($post.Name): bare mathematical Unicode '$($Matches[0])' should be LaTeX"
    }

    $proseLines = $plainProse -split "\r?\n"
    for ($index = 0; $index -lt $proseLines.Count; $index++) {
        $duplicate = [regex]::Match(
            $proseLines[$index],
            '(?<![A-Za-z0-9_])([A-Za-z]{1,8})\1(?![A-Za-z0-9_])'
        )
        if ($duplicate.Success) {
            $failures += "$($post.Name):$($index + 1): duplicated variable '$($duplicate.Value)'"
        }
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

    if (Test-Path $htmlPath) {
        $rendered = Get-Content $htmlPath -Raw -Encoding UTF8
        if ($rendered -match 'MathJax Retry|mjx-merror|class="merror"') {
            $failures += "$($post.Name): generated page contains a MathJax error"
        }
    }
}

if ($failures.Count -gt 0) {
    $failures | ForEach-Object { Write-Output $_ }
    exit 1
}

Write-Output "All Markdown formulas are normalized for MathJax."
