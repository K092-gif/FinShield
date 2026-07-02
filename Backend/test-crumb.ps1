$response1 = Invoke-WebRequest -Uri "https://fc.yahoo.com" -UserAgent "Mozilla/5.0 (Windows NT 10.0; Win64; x64)" -ErrorAction SilentlyContinue
$cookie = ""
if ($response1.Headers["Set-Cookie"]) {
    $cookie = ($response1.Headers["Set-Cookie"] -split ';')[0]
}

Write-Host "Cookie: $cookie"

$response2 = Invoke-WebRequest -Uri "https://query1.finance.yahoo.com/v1/test/getcrumb" -Headers @{ "Cookie" = $cookie } -UserAgent "Mozilla/5.0 (Windows NT 10.0; Win64; x64)"
$crumb = $response2.Content
Write-Host "Crumb: $crumb"

$quoteUrl = "https://query1.finance.yahoo.com/v10/finance/quoteSummary/LWLG?modules=assetProfile&crumb=$crumb"
$response3 = Invoke-WebRequest -Uri $quoteUrl -Headers @{ "Cookie" = $cookie } -UserAgent "Mozilla/5.0 (Windows NT 10.0; Win64; x64)"
Write-Host "Data:"
$response3.Content | ConvertFrom-Json | ConvertTo-Json -Depth 5
