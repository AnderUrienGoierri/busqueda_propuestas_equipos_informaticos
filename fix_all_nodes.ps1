# Fix ALL nodes: HTML generation + 3 normalization nodes
$base = $PSScriptRoot
$jsonPath = Join-Path $base 'workflow_ofertas.json'
$jsonText = [System.IO.File]::ReadAllText($jsonPath, [System.Text.Encoding]::UTF8)
$wf = $jsonText | ConvertFrom-Json

# Map of node name -> JS file
$nodeFiles = @{
    'Procesar y Generar HTML' = 'html_node_code.js'
    'Norm PcComponentes'      = 'norm_pccomponentes.js'
    'Norm Coolmod'            = 'norm_coolmod.js'
    'Norm MediaMarkt'         = 'norm_mediamarkt.js'
}

foreach ($entry in $nodeFiles.GetEnumerator()) {
    $nodeName = $entry.Key
    $jsFile   = Join-Path $base $entry.Value
    
    if (!(Test-Path $jsFile)) {
        Write-Host "SKIP: $jsFile not found"
        continue
    }
    
    $node = $wf.nodes | Where-Object { $_.name -eq $nodeName }
    if (!$node) {
        Write-Host "SKIP: Node '$nodeName' not found in workflow"
        continue
    }
    
    $jsCode = [System.IO.File]::ReadAllText($jsFile, [System.Text.Encoding]::UTF8)
    $node.parameters.jsCode = $jsCode
    Write-Host "OK: Updated '$nodeName' from $($entry.Value)"
}

$outJson = $wf | ConvertTo-Json -Depth 100
[System.IO.File]::WriteAllText($jsonPath, $outJson, [System.Text.Encoding]::UTF8)
Write-Host "`nDone - workflow_ofertas.json updated successfully"
