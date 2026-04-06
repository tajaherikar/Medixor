# Medixor Launcher - PowerShell Version
# Opens Medixor web application

$Host.UI.RawUI.WindowTitle = "Medixor - Medical Inventory System"

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Medixor                             " -ForegroundColor Cyan
Write-Host "  Medical Inventory Management System " -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "  Opening Medixor in your browser..." -ForegroundColor Yellow
Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Open the Vercel app
Start-Process "https://medixor.vercel.app/"

Start-Sleep -Seconds 1

Write-Host "✓ App opened in your default browser!" -ForegroundColor Green
Write-Host ""
Write-Host "If the browser didn't open, go to:" -ForegroundColor Gray
Write-Host "https://medixor.vercel.app/" -ForegroundColor Cyan
Write-Host ""

Start-Sleep -Seconds 2
