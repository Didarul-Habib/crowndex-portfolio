[CmdletBinding()]
param(
    [Parameter(Mandatory = $true)]
    [string]$Url,

    [string]$Title,

    [string]$Category = 'AI Creations',

    [string]$Thumbnail,

    [switch]$Featured
)

$ErrorActionPreference = 'Stop'

$ProjectRoot = $PSScriptRoot
$DataPath = Join-Path $ProjectRoot 'src\data\works.json'

if (-not (Test-Path $DataPath)) {
    throw "Portfolio database not found."
}

$ParsedUri = $null

if (-not [uri]::TryCreate(
    $Url,
    [System.UriKind]::Absolute,
    [ref]$ParsedUri
)) {
    throw "Invalid X post URL."
}

$AllowedHosts = @(
    'x.com',
    'www.x.com',
    'twitter.com',
    'www.twitter.com'
)

if ($ParsedUri.Scheme -ne 'https' -or
    $AllowedHosts -notcontains $ParsedUri.Host.ToLowerInvariant()) {
    throw "Only HTTPS X/Twitter URLs are supported."
}

$PathMatch = [regex]::Match(
    $ParsedUri.AbsolutePath,
    '^/[^/]+/status/(\d+)/?$'
)

if (-not $PathMatch.Success -or $ParsedUri.Query -or $ParsedUri.Fragment) {
    throw "URL must point directly to an X post."
}

$CanonicalUrl = $ParsedUri.GetLeftPart(
    [System.UriPartial]::Path
).TrimEnd('/')

$Works = @(
    Get-Content $DataPath -Raw |
    ConvertFrom-Json -AsHashtable
)

$Duplicate = @(
    $Works | Where-Object {
        ([string]$_.url).TrimEnd('/') -eq $CanonicalUrl
    }
)

if ($Duplicate.Count -gt 0) {
    throw "This X post already exists in the portfolio."
}

$SequenceNumbers = @(
    foreach ($Item in $Works) {
        if ([string]$Item.id -match '^crowndex-work-(\d+)$') {
            [int]$Matches[1]
        }
    }
)

$NextNumber = 1

if ($SequenceNumbers.Count -gt 0) {
    $NextNumber = [int](
        ($SequenceNumbers | Measure-Object -Maximum).Maximum
    ) + 1
}

$NewWork = [ordered]@{
    id = 'crowndex-work-{0:D2}' -f $NextNumber
    url = $CanonicalUrl
    category = $Category.Trim()
    featured = [bool]$Featured
}

if (-not [string]::IsNullOrWhiteSpace($Title)) {
    $NewWork['title'] = $Title.Trim()
}

if (-not [string]::IsNullOrWhiteSpace($Thumbnail)) {

    if ($Thumbnail -notmatch '^/assets/[A-Za-z0-9._/-]+\.(png|jpe?g|webp|avif)$' -or
        $Thumbnail.Contains('..')) {
        throw "Thumbnail must use a safe /assets/ image path."
    }

    $ImagePath = Join-Path (
        Join-Path $ProjectRoot 'public'
    ) ($Thumbnail.TrimStart('/').Replace(
        '/',
        [System.IO.Path]::DirectorySeparatorChar
    ))

    if (-not (Test-Path $ImagePath -PathType Leaf)) {
        throw "Thumbnail file not found: $ImagePath"
    }

    $NewWork['thumbnail'] = $Thumbnail
}

$Works += [PSCustomObject]$NewWork

$Json = ConvertTo-Json -InputObject @($Works) -Depth 10

[System.IO.File]::WriteAllText(
    $DataPath,
    $Json + [Environment]::NewLine,
    $Utf8
)

Write-Host "`n================================" -ForegroundColor Green
Write-Host " PORTFOLIO PROJECT ADDED" -ForegroundColor Green
Write-Host "================================" -ForegroundColor Green

Write-Host "Project ID: $($NewWork.id)"
Write-Host "Title: $Title"
Write-Host "Category: $Category"
Write-Host "Featured: $($NewWork.featured)"

Write-Host "`nPortfolio database updated." -ForegroundColor Green