$ErrorActionPreference = 'Stop'

$blockchainRoot = Split-Path -Parent $PSScriptRoot
$projectRoot = Split-Path -Parent $blockchainRoot
$apiEnvPath = Join-Path $projectRoot 'api\.env'
$rpcUrl = 'http://127.0.0.1:8545'

function Test-BlockchainPort {
  try {
    $connection = New-Object System.Net.Sockets.TcpClient
    $connection.Connect('127.0.0.1', 8545)
    $connection.Dispose()
    return $true
  }
  catch {
    return $false
  }
}

if (-not (Test-BlockchainPort)) {
  $stdout = Join-Path $env:TEMP 'agritrace-hardhat.log'
  $stderr = Join-Path $env:TEMP 'agritrace-hardhat-error.log'
  Start-Process `
    -FilePath 'npm.cmd' `
    -ArgumentList 'run', 'node' `
    -WorkingDirectory $blockchainRoot `
    -WindowStyle Hidden `
    -RedirectStandardOutput $stdout `
    -RedirectStandardError $stderr

  $ready = $false
  for ($attempt = 0; $attempt -lt 30; $attempt++) {
    Start-Sleep -Seconds 1
    if (Test-BlockchainPort) {
      $ready = $true
      break
    }
  }

  if (-not $ready) {
    throw "Hardhat node failed to start. See log: $stderr"
  }
}

$contractAddress = $null
if (Test-Path $apiEnvPath) {
  $addressLine = Get-Content $apiEnvPath |
    Where-Object { $_ -match '^CONTRACT_ADDRESS=' } |
    Select-Object -First 1
  if ($addressLine) {
    $contractAddress = ($addressLine -split '=', 2)[1].Trim()
  }
}

$contractReady = $false
if ($contractAddress) {
  $body = @{
    jsonrpc = '2.0'
    method = 'eth_getCode'
    params = @($contractAddress, 'latest')
    id = 1
  } | ConvertTo-Json -Compress
  $response = Invoke-RestMethod `
    -Uri $rpcUrl `
    -Method Post `
    -ContentType 'application/json' `
    -Body $body
  $contractReady = $response.result -and $response.result -ne '0x'
}

if (-not $contractReady) {
  $deployOutput = & npx.cmd hardhat run --no-compile scripts/deploy.ts --network localhost
  if ($LASTEXITCODE -ne 0) {
    throw 'Smart contract deployment failed.'
  }

  $newAddress = $deployOutput |
    Where-Object { $_ -match '^CONTRACT_ADDRESS=' } |
    Select-Object -Last 1
  if (-not $newAddress) {
    throw 'Smart contract deployment did not return CONTRACT_ADDRESS.'
  }

  $contractAddress = ($newAddress -split '=', 2)[1].Trim()
  if (Test-Path $apiEnvPath) {
    $envLines = Get-Content $apiEnvPath
    if ($envLines -match '^CONTRACT_ADDRESS=') {
      $envLines = $envLines | ForEach-Object {
        if ($_ -match '^CONTRACT_ADDRESS=') { "CONTRACT_ADDRESS=$contractAddress" } else { $_ }
      }
    } else {
      $envLines += "CONTRACT_ADDRESS=$contractAddress"
    }
    Set-Content -LiteralPath $apiEnvPath -Value $envLines -Encoding utf8
  }
}

Write-Host 'Local blockchain is ready at http://127.0.0.1:8545'
Write-Host "Contract: $contractAddress"
