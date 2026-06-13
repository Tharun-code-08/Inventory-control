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

# Colors
$colors = @{
    Red    = "`e[31m"
    Green  = "`e[32m"
    Yellow = "`e[33m"
    Blue   = "`e[34m"
    Reset  = "`e[0m"
}

function Log-Step {
    param([string]$Message)
    Write-Host "$($colors.Yellow)→$($colors.Reset) $Message"
}

function Log-Success {
    param([string]$Message)
    Write-Host "$($colors.Green)✓$($colors.Reset) $Message"
}

function Log-Error {
    param([string]$Message)
    Write-Host "$($colors.Red)✗$($colors.Reset) $Message"
    exit 1
}

function Log-Header {
    param([string]$Message)
    Write-Host ""
    Write-Host "$($colors.Blue)═══════════════════════════════════════$($colors.Reset)"
    Write-Host "$($colors.Blue)$Message$($colors.Reset)"
    Write-Host "$($colors.Blue)═══════════════════════════════════════$($colors.Reset)"
    Write-Host ""
}

# Generate request ID
$requestId = [guid]::NewGuid().ToString()

Log-Header "Phase 2: Live E2E Audit Journey"
Write-Host "API Base: $ApiUrl"
Write-Host "Admin: $Email"
Write-Host "Request ID: $requestId"
Write-Host ""

# Verify server is running
Log-Step "Checking server health..."
try {
    $null = Invoke-WebRequest -Uri "$ApiUrl/health" -ErrorAction Stop
    Log-Success "Server is responding"
} catch {
    Log-Error "Server not responding at $ApiUrl"
}
Write-Host ""

# ===== STEP 1: LOGIN =====
Log-Step "Step 1: LOGIN"
$loginBody = @{
    email    = $Email
    password = $Password
} | ConvertTo-Json

$loginResponse = Invoke-WebRequest -Uri "$ApiUrl/api/v1/auth/login" `
    -Method POST `
    -ContentType "application/json" `
    -Headers @{ "x-request-id" = $requestId } `
    -Body $loginBody -ErrorAction Stop

$loginData = $loginResponse.Content | ConvertFrom-Json
$accessToken = $loginData.data.accessToken
$userId = $loginData.data.user.id

if (-not $accessToken) {
    Log-Error "Login failed"
}
Log-Success "LOGIN successful (user: $userId)"
Write-Host ""

# ===== STEP 2: GET COMPANY & SHOP =====
Log-Step "Step 2: Resolving company and shop..."
$companiesResponse = Invoke-WebRequest -Uri "$ApiUrl/api/v1/companies" `
    -Headers @{
        "Authorization" = "Bearer $accessToken"
        "x-request-id"  = $requestId
    }

$companies = $companiesResponse.Content | ConvertFrom-Json
$companyId = $companies.data[0].id
Log-Success "Company ID: $companyId"

$shopsResponse = Invoke-WebRequest -Uri "$ApiUrl/api/v1/shops" `
    -Headers @{
        "Authorization" = "Bearer $accessToken"
        "x-request-id"  = $requestId
    }

$shops = $shopsResponse.Content | ConvertFrom-Json
$shopId = ($shops.data | Where-Object { $_.shopNumber -eq "HQ-001" })[0].id
if (-not $shopId) {
    $shopId = $shops.data[0].id
}
Log-Success "Shop ID: $shopId"

# ===== STEP 3: GET STORAGE LOCATION =====
Log-Step "Step 3: Resolving storage location..."
$locationsResponse = Invoke-WebRequest -Uri "$ApiUrl/api/v1/storage-locations?shop_id=$shopId" `
    -Headers @{
        "Authorization" = "Bearer $accessToken"
        "x-request-id"  = $requestId
    }

$locations = $locationsResponse.Content | ConvertFrom-Json
$storageLocationId = ($locations.data | Where-Object { $_.code -eq "MAIN" })[0].id
if (-not $storageLocationId) {
    $storageLocationId = $locations.data[0].id
}
Log-Success "Storage Location ID: $storageLocationId"
Write-Host ""

# ===== STEP 4: CREATE PRODUCT =====
Log-Step "Step 4: CREATE PRODUCT"
$productCode = "E2E-SKU-$(Get-Date -Format 'yyyyMMddHHmmss')"
$createProductBody = @{
    productCode = $productCode
    description = "E2E Test Product"
    uom         = "PCS"
    category    = "e2e"
    purchasePrice = 100
    sellingPrice  = 150
    plants      = @(@{
        shopId         = $shopId
        openingStock   = 0
        minStockLevel  = 5
    })
} | ConvertTo-Json

$createProductResponse = Invoke-WebRequest -Uri "$ApiUrl/api/v1/products" `
    -Method POST `
    -ContentType "application/json" `
    -Headers @{
        "Authorization" = "Bearer $accessToken"
        "x-request-id"  = $requestId
    } `
    -Body $createProductBody

$productData = $createProductResponse.Content | ConvertFrom-Json
$productId = $productData.data.id
Log-Success "CREATE_PRODUCT: $productId"
Write-Host ""

# ===== STEP 5: RECEIVE GOODS =====
Log-Step "Step 5: RECEIVE GOODS"
$today = Get-Date -Format "yyyy-MM-dd"
$future = (Get-Date).AddYears(1).ToString("yyyy-MM-dd")

$createGrBody = @{
    grDate       = $today
    shopId       = $shopId
    supplierName = "E2E Test Supplier"
    items        = @(@{
        productId            = $productId
        storageLocationId    = $storageLocationId
        quantity             = 10
        purchaseRate         = 100
        uom                  = "PCS"
        expiryDate           = $future
    })
} | ConvertTo-Json -Depth 3

$createGrResponse = Invoke-WebRequest -Uri "$ApiUrl/api/v1/goods-receipts" `
    -Method POST `
    -ContentType "application/json" `
    -Headers @{
        "Authorization" = "Bearer $accessToken"
        "x-request-id"  = $requestId
    } `
    -Body $createGrBody

$grData = $createGrResponse.Content | ConvertFrom-Json
$grId = $grData.data.id
Log-Success "GR Draft created: $grId"

# Post the GR
Log-Step "Posting goods receipt..."
$postGrResponse = Invoke-WebRequest -Uri "$ApiUrl/api/v1/goods-receipts/$grId/post" `
    -Method POST `
    -Headers @{
        "Authorization" = "Bearer $accessToken"
        "x-request-id"  = $requestId
    }

$grStatus = ($postGrResponse.Content | ConvertFrom-Json).data.status
if ($grStatus -ne "POSTED") {
    Log-Error "GR post failed"
}
Log-Success "RECEIVE_GOODS: GR posted"
Write-Host ""

# ===== STEP 6: UPDATE PRODUCT PRICE =====
Log-Step "Step 6: UPDATE PRODUCT PRICE"
$updatePriceBody = @{ sellingPrice = 200 } | ConvertTo-Json

$updatePriceResponse = Invoke-WebRequest -Uri "$ApiUrl/api/v1/products/$productId/update-price" `
    -Method POST `
    -ContentType "application/json" `
    -Headers @{
        "Authorization" = "Bearer $accessToken"
        "x-request-id"  = $requestId
    } `
    -Body $updatePriceBody

$updatedPrice = ($updatePriceResponse.Content | ConvertFrom-Json).data.sellingPrice
if ($updatedPrice -ne 200) {
    Log-Error "Price update failed"
}
Log-Success "UPDATE_PRODUCT: price 150 → 200"
Write-Host ""

# ===== STEP 7: CREATE APPROVAL & APPROVE GR =====
Log-Step "Step 7: APPROVE GOODS RECEIPT"
$createApprovalBody = @{
    referenceId   = $grId
    approvalType  = "GOODS_RECEIPT"
    amount        = $null
} | ConvertTo-Json

$createApprovalResponse = Invoke-WebRequest -Uri "$ApiUrl/api/v1/approvals" `
    -Method POST `
    -ContentType "application/json" `
    -Headers @{
        "Authorization" = "Bearer $accessToken"
        "x-request-id"  = $requestId
    } `
    -Body $createApprovalBody

$approvalData = $createApprovalResponse.Content | ConvertFrom-Json
$approvalId = $approvalData.data.id
Log-Success "Approval request created: $approvalId"

# Approve the GR
$approveGrBody = @{ comment = "Verified quantities and dates" } | ConvertTo-Json

$approveGrResponse = Invoke-WebRequest -Uri "$ApiUrl/api/v1/approvals/$approvalId/approve" `
    -Method POST `
    -ContentType "application/json" `
    -Headers @{
        "Authorization" = "Bearer $accessToken"
        "x-request-id"  = $requestId
    } `
    -Body $approveGrBody

$approvalStatus = ($approveGrResponse.Content | ConvertFrom-Json).data.status
if ($approvalStatus -ne "APPROVED") {
    Log-Error "Approval failed"
}
Log-Success "APPROVE: GR approved"
Write-Host ""

# ===== STEP 8: GET /AUDIT =====
Log-Step "Step 8: GET /AUDIT"
$auditListResponse = Invoke-WebRequest -Uri "$ApiUrl/api/v1/audit?limit=20&sortBy=createdAt&sortOrder=desc" `
    -Headers @{
        "Authorization" = "Bearer $accessToken"
        "x-request-id"  = $requestId
    }

$auditData = $auditListResponse.Content | ConvertFrom-Json

# Count audit records
$userRecords = $auditData.data.records | Where-Object { $_.userId -eq $userId }
$loginCount = @($userRecords | Where-Object { $_.action -eq "LOGIN" }).Count
$createCount = @($userRecords | Where-Object { $_.action -eq "CREATE_PRODUCT" }).Count
$receiveCount = @($userRecords | Where-Object { $_.action -eq "RECEIVE_GOODS" }).Count
$updateCount = @($userRecords | Where-Object { $_.action -eq "UPDATE_PRODUCT" }).Count
$approveCount = @($userRecords | Where-Object { $_.action -eq "APPROVE" }).Count

Write-Host "Audit records for this user:"
Write-Host "  LOGIN: $loginCount"
Write-Host "  CREATE_PRODUCT: $createCount"
Write-Host "  RECEIVE_GOODS: $receiveCount"
Write-Host "  UPDATE_PRODUCT: $updateCount"
Write-Host "  APPROVE: $approveCount"

if ($createCount -lt 1 -or $receiveCount -lt 1 -or $updateCount -lt 1 -or $approveCount -lt 1) {
    Log-Error "Missing audit records"
}
Log-Success "All expected audit records present"
Write-Host ""

# ===== STEP 9: EXPORT AUDIT =====
Log-Step "Step 9: EXPORT AUDIT"
$exportAuditResponse = Invoke-WebRequest -Uri "$ApiUrl/api/v1/audit/export?format=json" `
    -Headers @{
        "Authorization" = "Bearer $accessToken"
        "x-request-id"  = $requestId
    }

$exportData = $exportAuditResponse.Content | ConvertFrom-Json
$exportRecords = @($exportData.records | Where-Object { $_.userId -eq $userId }).Count

if ($exportRecords -lt 5) {
    Log-Error "Export audit has insufficient records (got $exportRecords, expected ≥5)"
}
Log-Success "EXPORT AUDIT: $exportRecords records exported"
Write-Host ""

# ===== STEP 10: VERIFY REQUEST ID PROPAGATION =====
Log-Step "Step 10: VERIFY REQUEST ID PROPAGATION"
$approveAudit = $userRecords | Where-Object { $_.action -eq "APPROVE" } | Select-Object -First 1
if (-not $approveAudit -or -not $approveAudit.metadata.requestId) {
    Log-Error "RequestId not found in audit metadata"
}
Log-Success "RequestId propagated through audit system"
Write-Host ""

# ===== SUCCESS =====
Log-Header "✓ E2E Journey Complete"
Write-Host "Proof of System Health:"
Write-Host "  Login works ✓"
Write-Host "  Create Product works ✓"
Write-Host "  Receive Goods works ✓"
Write-Host "  Update Product works ✓"
Write-Host "  Approve GR works ✓"
Write-Host "  Audit records persisted ✓"
Write-Host "  RequestId propagated ✓"
Write-Host ""
Write-Host "System Status: OPERATIONAL"
Write-Host ""
