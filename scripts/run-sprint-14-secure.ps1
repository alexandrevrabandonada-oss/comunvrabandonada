param(
  [switch]$SetCloudflareDns,
  [switch]$PatchHosts,
  [switch]$SkipDeploy
)

$ErrorActionPreference = "Stop"

function Write-Step($Message) {
  Write-Host ""
  Write-Host "==> $Message" -ForegroundColor Cyan
}

function Read-SecretText($Prompt) {
  $secure = Read-Host -Prompt $Prompt -AsSecureString
  $bstr = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secure)
  try {
    [Runtime.InteropServices.Marshal]::PtrToStringBSTR($bstr)
  } finally {
    [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($bstr)
  }
}

function Test-Command($Command) {
  if (-not (Get-Command $Command -ErrorAction SilentlyContinue)) {
    throw "Comando ausente: $Command"
  }
}

Push-Location (Resolve-Path "$PSScriptRoot\..")
try {
  Test-Command npm
  Test-Command npx
  Test-Command git

  Write-Step "Coletando segredos sem gravar em arquivo"
  $env:SUPABASE_DB_PASSWORD = Read-SecretText "SUPABASE_DB_PASSWORD rotacionada"
  $env:SUPABASE_ACCESS_TOKEN = Read-SecretText "SUPABASE_ACCESS_TOKEN rotacionado"

  if ($SetCloudflareDns) {
    Write-Step "Configurando DNS Cloudflare nos adaptadores ativos"
    $adapters = Get-NetAdapter | Where-Object { $_.Status -eq "Up" }
    foreach ($adapter in $adapters) {
      try {
        Set-DnsClientServerAddress -InterfaceIndex $adapter.ifIndex -ServerAddresses ("1.1.1.1", "1.0.0.1")
        Write-Host "DNS atualizado: $($adapter.Name)"
      } catch {
        Write-Host "DNS nao atualizado em $($adapter.Name): $($_.Exception.Message)" -ForegroundColor Yellow
      }
    }
  }

  Write-Step "Validando DNS do Supabase"
  $supabaseUrlLine = Select-String -Path ".env.local" -Pattern "^NEXT_PUBLIC_SUPABASE_URL=" | Select-Object -First 1
  if (-not $supabaseUrlLine) {
    throw "NEXT_PUBLIC_SUPABASE_URL ausente em .env.local"
  }
  $supabaseUrl = $supabaseUrlLine.Line -replace "^NEXT_PUBLIC_SUPABASE_URL=", ""
  $supabaseHost = ([Uri]$supabaseUrl).Host
  $resolved = Resolve-DnsName $supabaseHost -ErrorAction SilentlyContinue | Where-Object { $_.IPAddress } | Select-Object -First 2
  if (-not $resolved) {
    Write-Host "DNS padrao nao resolveu $supabaseHost; tentando 1.1.1.1..." -ForegroundColor Yellow
    $resolved = Resolve-DnsName $supabaseHost -Server 1.1.1.1 -ErrorAction SilentlyContinue | Where-Object { $_.IPAddress } | Select-Object -First 2
  }
  if (-not $resolved) {
    throw "Nao foi possivel resolver $supabaseHost nem pelo DNS padrao nem por 1.1.1.1"
  }
  $resolved | Select-Object Name, IPAddress, Type | Format-Table

  if ($PatchHosts) {
    Write-Step "Aplicando fallback temporario no hosts"
    $hostsPath = "$env:SystemRoot\System32\drivers\etc\hosts"
    try {
      $hostsContent = Get-Content -LiteralPath $hostsPath -Raw
      $marker = "# COMUN temporary Supabase DNS fallback"
      $ip = ($resolved | Where-Object { $_.Type -eq "A" } | Select-Object -First 1).IPAddress
      if (-not $ip) {
        throw "Nenhum registro A encontrado para patch do hosts"
      }
      if ($hostsContent -notmatch [Regex]::Escape($supabaseHost)) {
        Add-Content -LiteralPath $hostsPath -Value "`r`n$marker`r`n$ip $supabaseHost`r`n"
        Write-Host "hosts atualizado temporariamente para $supabaseHost"
      } else {
        Write-Host "hosts ja contem entrada para $supabaseHost"
      }
    } catch {
      Write-Host "Nao foi possivel editar hosts: $($_.Exception.Message)" -ForegroundColor Yellow
      Write-Host "Continuando sem patch de hosts; se a CLI falhar em DNS, rode o PowerShell como Administrador." -ForegroundColor Yellow
    }
  }

  Write-Step "Aplicando migration remota"
  npx supabase db push --linked --yes

  Write-Step "Rodando verify"
  npm run verify

  Write-Step "Subindo servidor local para smokes HTTP"
  $port = 4026
  $server = Start-Process -FilePath "npm.cmd" -ArgumentList "run", "dev", "--", "-p", "$port" -WorkingDirectory (Get-Location) -WindowStyle Hidden -PassThru
  try {
    Start-Sleep -Seconds 8
    $env:NEXT_PUBLIC_SITE_URL = "http://localhost:$port"
    Invoke-WebRequest -Uri "$env:NEXT_PUBLIC_SITE_URL/comun" -UseBasicParsing | Out-Null

    Write-Step "Rodando smokes locais"
    npm run smoke:comun
    npm run smoke:admin-auth
    npm run smoke:no-leak-http
    npm run smoke:public-ui
    npm run smoke:protocol-follow
    npm run smoke:protocol-rate-limit
    npm run smoke:quick-report
    npm run smoke:attachment-curation
    npm run smoke:attachments-queue
    npm run smoke:attachments-ops
    npm run smoke:official-protocol
  } finally {
    Stop-Process -Id $server.Id -ErrorAction SilentlyContinue
  }

  Write-Step "Preparando commit"
  git status --short
  git add app/actions.ts app/comun/acompanhar/[protocol]/page.tsx app/comun/acompanhar/[protocol]/ouvidoria app/comun/admin/relatos/[id]/page.tsx app/comun/protocolo-popular app/comun/relatar/confirmacao/page.tsx app/comun/seguranca/page.tsx docs/deploy-checklist.md docs/operacao-comun.md docs/protocolo-popular.md lib/official-channels.ts lib/official-protocols.ts lib/types.ts package.json reports/estado-comun-sprint-14-protocolo-popular.md scripts/smoke-comun-official-protocol.mjs supabase/migrations/202607070001_official_protocols.sql
  git commit -m "feat: adiciona protocolo popular assistido"
  git push

  if (-not $SkipDeploy) {
    Write-Step "Deploy de producao"
    npx vercel deploy --prod --yes

    Write-Step "Smokes de producao"
    $env:NEXT_PUBLIC_SITE_URL = "https://comunvrabandonada.vercel.app"
    npm run smoke:no-leak-http
    npm run smoke:public-ui
    npm run smoke:protocol-follow
    npm run smoke:official-protocol
  }

  Write-Step "Concluido"
} finally {
  $env:SUPABASE_DB_PASSWORD = $null
  $env:SUPABASE_ACCESS_TOKEN = $null
  Pop-Location
}
