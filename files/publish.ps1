# Run this script after installing Git and replacing the repository URL.

$repoUrl = Read-Host 'Enter your GitHub repository URL (e.g. https://github.com/your-username/your-repo.git)'

if (-not (Get-Command git -ErrorAction SilentlyContinue)) {
  Write-Host 'Git is not installed or not in PATH. Please install Git first:' -ForegroundColor Yellow
  Write-Host 'https://git-scm.com/downloads'
  exit 1
}

Set-Location $PSScriptRoot

git init
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

git add .
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

git commit -m 'Prepare static site for public deployment'
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

git remote add origin $repoUrl
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

git branch -M main
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

git push -u origin main
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

Write-Host 'Pushed to GitHub. Enable GitHub Pages from the repo settings to publish the site.' -ForegroundColor Green
