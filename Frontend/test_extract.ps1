$content = Get-Content -Path "src\components\simulator\EmergencyFundTool.tsx" -Raw -Encoding UTF8
$matches = [regex]::Matches($content, 'style=\{\{\s*([^\{\}]+?)\s*\}\}')

$count = 0
$validCount = 0
foreach ($m in $matches) {
    $count++
    $inner = $m.Groups[1].Value
    # check if static (only contains string literals, numbers, colons, commas, spaces)
    if ($inner -notmatch "[\?\(\$\]|=>|[a-zA-Z0-9_]+\s*\?" -and $inner -match "^(\s*[a-zA-Z0-9_]+\s*:\s*('.*?'|".*?"|[0-9\.]+)\s*,?\s*)+$") {
        $validCount++
    }
}
Write-Host "Total styles: $count, Valid static styles: $validCount"
