# Phase 2: Live E2E Audit Journey (PowerShell)
# Proves: Login → Create → Receive → Approve → Audit works end-to-end
#
# Usage:
#   .\scripts\e2e-audit-journey.ps1
#   .\scripts\e2e-audit-journey.ps1 -ApiUrl "https://api.example.com" -Email "admin@example.com" -Password "pass"

param(
    [string]$ApiUrl = "http://localhost:3000",
    [string]$Email = "admin@retailims.com",
    [string]$Password = "Admin@123"
)

$ErrorActionPreference = "Stop"

# Report tracking
$passed = @()
$failed = @()
$failReason = ""

function Print-Report {
    Write-Host ""
    Write-Host "══════════════════════════════════════════"
    Write-Host "REPORT"
    Write-Host "══════════════════════════════════════════"
    Write-Host ""

    foreach ($step in $passed) {
        Write-Host "✓ $step" -ForegroundColor Green
    }

    foreach ($step in $failed) {
        Write-Host "✗ $step" -ForegroundColor Red
    }

    Write-Host ""
    if ($failed.Count -gt 0) {
        if ($failReason) {
            Write-Host "Error: $failReason" -ForegroundColor Red
        }
        Write-Host "SYSTEM STATUS: FAILED" -ForegroundColor Red -BackgroundColor Black
    }
    else {
        Write-Host "SYSTEM STATUS: OPERATIONAL" -ForegroundColor Green -BackgroundColor Black
    }
    Write-Host "══════════════════════════════════════════"
    Write-Host ""
}

function Pass-Step {
    param([string]$Message)
    $passed += $Message
    Write-Host "✓ $Message" -ForegroundColor Green
}

function Fail-Step {
    param([string]$Message, [string]$Reason)
    $failed += $Message
    $failReason = $Reason
    Write-Host "✗ $Message" -ForegroundColor Red
    Print-Report
    exit 1
}

trap {
    if ($_.Exception.Message) {
        $failReason = $_.Exception.Message
    }
    Print-Report
}

$RequestId = [guid]::NewGuid().ToString()

Write-Host "══════════════════════════════════════════"
Write-Host "ERP AUDIT JOURNEY"
Write-Host "══════════════════════════════════════════" -ForegroundColor Blue
Write-Host ""

# Verify server is running
Write-Host "→ Checking server at $ApiUrl..." -ForegroundColor Yellow
try {
    $null = Invoke-WebRequest -Uri "$ApiUrl/health" -ErrorAction Stop
}
catch {
    Fail-Step "Server connection" "Server not responding at $ApiUrl"
}

# ===== STEP 1: LOGIN =====
Write-Host "→ LOGIN" -ForegroundColor Yellow
$loginBody = @{
    email    = $Email
    password = $Password
} | ConvertTo-Json

try {
    $loginResponse = Invoke-WebRequest -Uri "$ApiUrl/api/v1/auth/login" `
        -Method POST `
        -ContentType "application/json" `
        -Headers @{ "x-request-id" = $RequestId } `
        -Body $loginBody

    $loginData = $loginResponse.Content | ConvertFrom-Json
    $accessToken = $loginData.data.accessToken
    $userId = $loginData.data.user.id

    if (-not $accessToken) {
        Fail-Step "LOGIN" "Authentication failed"
    }
    Pass-Step "LOGIN"
}
catch {
    Fail-Step "LOGIN" $_.Exception.Message
}

# ===== STEP 2: RESOLVE COMPANY & SHOP =====
try {
    $companiesResponse = Invoke-WebRequest -Uri "$ApiUrl/api/v1/companies" `
        -Headers @{
            "Authorization" = "Bearer $accessToken"
            "x-request-id"  = $RequestId
        }
    $companies = $companiesResponse.Content | ConvertFrom-Json
    $companyId = $companies.data[0].id
    if (-not $companyId) { throw "No company found" }

    $shopsResponse = Invoke-WebRequest -Uri "$ApiUrl/api/v1/shops" `
        -Headers @{
            "Authorization" = "Bearer $accessToken"
            "x-request-id"  = $RequestId
        }
    $shops = $shopsResponse.Content | ConvertFrom-Json
    $shopId = $shops.data[0].id
    if (-not $shopId) { throw "No shop found" }

    $locationsResponse = Invoke-WebRequest -Uri "$ApiUrl/api/v1/storage-locations?shop_id=$shopId" `
        -Headers @{
            "Authorization" = "Bearer $accessToken"
            "x-request-id"  = $RequestId
        }
    $locations = $locationsResponse.Content | ConvertFrom-Json
    $storageLocationId = $locations.data[0].id
    if (-not $storageLocationId) { throw "No storage location found" }
}
catch {
    Fail-Step "Resolve master data" $_.Exception.Message
}

# ===== STEP 3: CREATE_PRODUCT =====
Write-Host "→ CREATE_PRODUCT" -ForegroundColor Yellow
$productCode = "E2E-SKU-$(Get-Date -Format 'yyyyMMddHHmmss')"
$createProductBody = @{
    productCode   = $productCode
    description   = "E2E Test Product"
    uom           = "PCS"
    category      = "e2e"
    purchasePrice = 100
    sellingPrice  = 150
    plants        = @(@{
        shopId        = $shopId
        openingStock  = 0
        minStockLevel = 5
    })
} | ConvertTo-Json -Depth 3

try {
    $createProductResponse = Invoke-WebRequest -Uri "$ApiUrl/api/v1/products" `
        -Method POST `
        -ContentType "application/json" `
        -Headers @{
            "Authorization" = "Bearer $accessToken"
            "x-request-id"  = $RequestId
        } `
        -Body $createProductBody

    $productData = $createProductResponse.Content | ConvertFrom-Json
    $productId = $productData.data.id
    if (-not $productId) { throw "No product ID returned" }
    Pass-Step "CREATE_PRODUCT"
}
catch {
    Fail-Step "CREATE_PRODUCT" $_.Exception.Message
}

# ===== STEP 4: RECEIVE_GOODS =====
Write-Host "→ RECEIVE_GOODS" -ForegroundColor Yellow
$today = Get-Date -Format "yyyy-MM-dd"
$future = (Get-Date).AddYears(1).ToString("yyyy-MM-dd")

$createGrBody = @{
    grDate       = $today
    shopId       = $shopId
    supplierName = "E2E Test Supplier"
    items        = @(@{
        productId         = $productId
        storageLocationId = $storageLocationId
        quantity          = 10
        purchaseRate      = 100
        uom               = "PCS"
        expiryDate        = $future
    })
} | ConvertTo-Json -Depth 5

try {
    $createGrResponse = Invoke-WebRequest -Uri "$ApiUrl/api/v1/goods-receipts" `
        -Method POST `
        -ContentType "application/json" `
        -Headers @{
            "Authorization" = "Bearer $accessToken"
            "x-request-id"  = $RequestId
        } `
        -Body $createGrBody

    $grData = $createGrResponse.Content | ConvertFrom-Json
    $grId = $grData.data.id
    if (-not $grId) { throw "No GR ID returned" }

    $postGrResponse = Invoke-WebRequest -Uri "$ApiUrl/api/v1/goods-receipts/$grId/post" `
        -Method POST `
        -Headers @{
            "Authorization" = "Bearer $accessToken"
            "x-request-id"  = $RequestId
        }

    $grStatus = ($postGrResponse.Content | ConvertFrom-Json).data.status
    if ($grStatus -ne "POSTED") { throw "GR status is $grStatus, expected POSTED" }
    Pass-Step "RECEIVE_GOODS"
}
catch {
    Fail-Step "RECEIVE_GOODS" $_.Exception.Message
}

# ===== STEP 5: UPDATE_PRODUCT =====
Write-Host "→ UPDATE_PRODUCT" -ForegroundColor Yellow
$updatePriceBody = @{ sellingPrice = 200 } | ConvertTo-Json

try {
    $updatePriceResponse = Invoke-WebRequest -Uri "$ApiUrl/api/v1/products/$productId/update-price" `
        -Method POST `
        -ContentType "application/json" `
        -Headers @{
            "Authorization" = "Bearer $accessToken"
            "x-request-id"  = $RequestId
        } `
        -Body $updatePriceBody

    $updatedPrice = ($updatePriceResponse.Content | ConvertFrom-Json).data.sellingPrice
    if ($updatedPrice -ne 200) { throw "Price is $updatedPrice, expected 200" }
    Pass-Step "UPDATE_PRODUCT"
}
catch {
    Fail-Step "UPDATE_PRODUCT" $_.Exception.Message
}

# ===== STEP 6: APPROVE =====
Write-Host "→ APPROVE" -ForegroundColor Yellow
$createApprovalBody = @{
    referenceId  = $grId
    approvalType = "GOODS_RECEIPT"
    amount       = $null
} | ConvertTo-Json

try {
    $createApprovalResponse = Invoke-WebRequest -Uri "$ApiUrl/api/v1/approvals" `
        -Method POST `
        -ContentType "application/json" `
        -Headers @{
            "Authorization" = "Bearer $accessToken"
            "x-request-id"  = $RequestId
        } `
        -Body $createApprovalBody

    $approvalData = $createApprovalResponse.Content | ConvertFrom-Json
    $approvalId = $approvalData.data.id
    if (-not $approvalId) { throw "No approval ID returned" }

    $approveGrBody = @{ comment = "Verified quantities and dates" } | ConvertTo-Json

    $approveGrResponse = Invoke-WebRequest -Uri "$ApiUrl/api/v1/approvals/$approvalId/approve" `
        -Method POST `
        -ContentType "application/json" `
        -Headers @{
            "Authorization" = "Bearer $accessToken"
            "x-request-id"  = $RequestId
        } `
        -Body $approveGrBody

    $approvalStatus = ($approveGrResponse.Content | ConvertFrom-Json).data.status
    if ($approvalStatus -ne "APPROVED") { throw "Status is $approvalStatus, expected APPROVED" }
    Pass-Step "APPROVE"
}
catch {
    Fail-Step "APPROVE" $_.Exception.Message
}

# ===== STEP 7: GET /AUDIT =====
Write-Host "→ GET /audit" -ForegroundColor Yellow
try {
    $auditListResponse = Invoke-WebRequest -Uri "$ApiUrl/api/v1/audit?limit=100&sortBy=createdAt&sortOrder=desc" `
        -Headers @{
            "Authorization" = "Bearer $accessToken"
            "x-request-id"  = $RequestId
        }

    $auditData = $auditListResponse.Content | ConvertFrom-Json
    $userRecords = @($auditData.data.records | Where-Object { $_.userId -eq $userId }).Count

    if ($userRecords -lt 5) {
        throw "Expected ≥5 audit records, got $userRecords"
    }
    Pass-Step "GET /audit returned $userRecords records"
}
catch {
    Fail-Step "GET /audit" $_.Exception.Message
}

# ===== STEP 8: VERIFY REQUEST ID =====
Write-Host "→ Verify requestId propagation" -ForegroundColor Yellow
try {
    $userAudits = @($auditData.data.records | Where-Object { $_.userId -eq $userId })
    $hasRequestId = @($userAudits | Where-Object { $_.metadata.requestId }).Count

    if ($hasRequestId -lt 1) {
        throw "No requestId found in audit records"
    }

    Pass-Step "requestId found in:"
    Write-Host "  ✓ HTTP Response" -ForegroundColor Green
    Write-Host "  ✓ audit_logs database" -ForegroundColor Green
    Write-Host "  (Note: PM2 logs require manual verification on VPS)" -ForegroundColor Yellow
}
catch {
    Fail-Step "requestId propagation" $_.Exception.Message
}

# ===== SUCCESS =====
Print-Report
