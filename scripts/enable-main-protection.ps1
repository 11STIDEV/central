# Ativa proteção da branch main no GitHub (requer: gh auth login)
# Uso: .\scripts\enable-main-protection.ps1

$ErrorActionPreference = "Stop"

if (-not (Get-Command gh -ErrorAction SilentlyContinue)) {
    Write-Error "GitHub CLI (gh) não encontrado. Instale com: winget install GitHub.cli"
}

$authStatus = gh auth status 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Error "Faça login primeiro: gh auth login"
}

Write-Host "Configurando proteção da branch main em 11STIDEV/central..."

gh api `
    --method PUT `
    -H "Accept: application/vnd.github+json" `
    repos/11STIDEV/central/branches/main/protection `
    -f required_pull_request_reviews='{"required_approving_review_count":1,"dismiss_stale_reviews":true}' `
    -f enforce_admins=false `
    -f required_status_checks=null `
    -f restrictions=null `
    -f required_linear_history=false `
    -f allow_force_pushes=false `
    -f allow_deletions=false

if ($LASTEXITCODE -eq 0) {
    Write-Host "Proteção da main configurada com sucesso (PR obrigatório + 1 aprovação)."
} else {
    Write-Error "Falha ao configurar proteção. Tente pela interface: https://github.com/11STIDEV/central/settings/branches"
}
