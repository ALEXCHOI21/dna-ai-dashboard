# ==============================================================================
# DNA AI Dashboard & E-Contract GitHub Pages One-Click Deploy Script
# ==============================================================================

$PSScriptRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location -Path $PSScriptRoot

Write-Host "🚀 [1/4] Git 저장소 확인 및 브랜치 설정..." -ForegroundColor Cyan
if (!(Test-Path ".git")) {
    git init -b main
    git remote add origin https://github.com/ALEXCHOI21/dna-ai-dashboard.git
} else {
    git branch -M main
}

Write-Host "📦 [2/4] 전자계약 보안 시스템(contract/) 및 대시보드 변경사항 스테이징..." -ForegroundColor Cyan
git add index.html contract/ README.md robots.txt

Write-Host "✍️ [3/4] Git 커밋 생성..." -ForegroundColor Cyan
git commit -m "feat: Deploy DANI E-Contract suite with security gate (pwd: 1121) and Hometax/Drive integration"

Write-Host "☁️ [4/4] GitHub Pages (main) 원격 저장소 푸시..." -ForegroundColor Cyan
git push -u origin main

Write-Host "`n✅ [배포 완료] https://dnaai.co.kr/dna-ai-dashboard/ 및 https://dnaai.co.kr/dna-ai-dashboard/contract/ 에 반영되었습니다!" -ForegroundColor Green
