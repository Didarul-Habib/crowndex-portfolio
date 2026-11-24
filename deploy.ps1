[CmdletBinding()]
param(
    [switch]$Deploy,

    [switch]$Production,

    [switch]$Preview,

    [string]$SiteUrl
)

$ErrorActionPreference = 'Stop'

$ProjectRoot = $PSScriptRoot

Set-Location $ProjectRoot

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host " CROWNDEX DEPLOYMENT MANAGER" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan

if ($Production -and -not $Deploy) {
    throw "Production deployment requires -Deploy."
}

if ($Preview -and $Deploy) {
    throw "Choose either -Preview or -Deploy."
}

# ------------------------------------------
# 1. VERIFY PROJECT
# ------------------------------------------

if (-not (Test-Path '.\package.json')) {
    throw "package.json missing."
}

if (-not (Test-Path '.\src\App.tsx')) {
    throw "Main application file missing."
}

# ------------------------------------------
# 2. VALIDATE SITE URL
# ------------------------------------------

if ($SiteUrl) {

    $ParsedSiteUrl = $null

    if (-not [uri]::TryCreate(
        $SiteUrl,
        [System.UriKind]::Absolute,
        [ref]$ParsedSiteUrl
    )) {
        throw "Invalid SiteUrl."
    }

    if ($ParsedSiteUrl.Scheme -ne 'https' -or
        $ParsedSiteUrl.AbsolutePath -ne '/' -or
        $ParsedSiteUrl.Query -or
        $ParsedSiteUrl.Fragment) {
        throw "SiteUrl must be the HTTPS root URL of your website."
    }

    $SiteRoot = $ParsedSiteUrl.GetLeftPart(
        [System.UriPartial]::Authority
    )

    $EscapedUrl = [System.Security.SecurityElement]::Escape(
        $SiteRoot + '/'
    )

    $Sitemap = '<?xml version="1.0" encoding="UTF-8"?>' +
        "`n" +
        '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">' +
        "`n" +
        "  <url><loc>$EscapedUrl</loc><priority>1.0</priority></url>" +
        "`n</urlset>`n"

    [System.IO.File]::WriteAllText(
        (Join-Path $ProjectRoot 'public\sitemap.xml'),
        $Sitemap,
        [System.Text.UTF8Encoding]::new($false)
    )

    $Robots = "User-agent: *`nAllow: /`nSitemap: $SiteRoot/sitemap.xml`n"

}
else {

    $Robots = "User-agent: *`nAllow: /`n"

    $SitemapPath = Join-Path $ProjectRoot 'public\sitemap.xml'

    if (Test-Path $SitemapPath) {

        $ExistingSitemap = Get-Content $SitemapPath -Raw

        if ($ExistingSitemap -match 'crowndex-portfolio\.netlify\.app') {
            Remove-Item $SitemapPath -Force
            Write-Host "[FIXED] Removed unverified sitemap URL." -ForegroundColor Yellow
        }
    }
}

[System.IO.File]::WriteAllText(
    (Join-Path $ProjectRoot 'public\robots.txt'),
    $Robots,
    [System.Text.UTF8Encoding]::new($false)
)

Write-Host "[OK] Project configuration verified." -ForegroundColor Green

# ------------------------------------------
# 3. VERIFY NPM
# ------------------------------------------

$Npm = Get-Command npm.cmd -ErrorAction SilentlyContinue

if (-not $Npm) {
    $Npm = Get-Command npm -ErrorAction Stop
}

# ------------------------------------------
# 4. INSTALL DEPENDENCIES
# ------------------------------------------

if (-not (Test-Path '.\node_modules')) {

    Write-Host "`n[INSTALLING] Project dependencies..." -ForegroundColor Yellow

    & $Npm.Source install

    if ($LASTEXITCODE -ne 0) {
        throw "npm installation failed."
    }
}
else {
    Write-Host "[OK] Dependencies already installed." -ForegroundColor Green
}

# ------------------------------------------
# 5. PRODUCTION BUILD
# ------------------------------------------

Write-Host "`n[BUILDING] CrownDEX website..." -ForegroundColor Cyan

& $Npm.Source run build

if ($LASTEXITCODE -ne 0) {
    throw "Production build failed. Do not deploy."
}

if (-not (Test-Path '.\dist\index.html')) {
    throw "Production output is missing."
}

Write-Host "`n[SUCCESS] Production build completed." -ForegroundColor Green

# ------------------------------------------
# 6. LOCAL PREVIEW
# ------------------------------------------

if ($Preview) {

    Write-Host "`nStarting local preview..." -ForegroundColor Cyan

    & $Npm.Source run preview

    exit $LASTEXITCODE
}

# ------------------------------------------
# 7. NETLIFY DEPLOYMENT
# ------------------------------------------

if ($Deploy) {

    $Npx = Get-Command npx.cmd -ErrorAction SilentlyContinue

    if (-not $Npx) {
        $Npx = Get-Command npx -ErrorAction Stop
    }

    Write-Host "`n[VERIFYING] Netlify authentication..." -ForegroundColor Yellow

    & $Npx.Source --yes netlify-cli status

    if ($LASTEXITCODE -ne 0) {
        throw "Netlify authentication/status check failed. Run: npx --yes netlify-cli login"
    }

    $Arguments = @(
        '--yes',
        'netlify-cli',
        'deploy',
        '--dir',
        'dist'
    )

    if ($Production) {
        $Arguments += '--prod'
    }

    Write-Host "`n[DEPLOYING] CrownDEX..." -ForegroundColor Cyan

    & $Npx.Source @Arguments

    if ($LASTEXITCODE -ne 0) {
        throw "Netlify deployment failed."
    }

    Write-Host "`n[DEPLOYMENT COMMAND COMPLETED]" -ForegroundColor Green

}
else {

    Write-Host "`n[BUILD ONLY] No website was published." -ForegroundColor Yellow

}

Write-Host "`n========================================" -ForegroundColor Green
Write-Host " CROWNDEX PROCESS COMPLETED" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green