# Read the workflow JSON
$jsonText = [System.IO.File]::ReadAllText("$PSScriptRoot\workflow_ofertas.json", [System.Text.Encoding]::UTF8)
$wf = $jsonText | ConvertFrom-Json

# Find the node
$node = $wf.nodes | Where-Object { $_.name -eq 'Procesar y Generar HTML' }

# Read the clean JS code from file
$jsCode = [System.IO.File]::ReadAllText("$PSScriptRoot\html_node_code.js", [System.Text.Encoding]::UTF8)

# Set it
$node.parameters.jsCode = $jsCode

# Write back
$outJson = $wf | ConvertTo-Json -Depth 100
[System.IO.File]::WriteAllText("$PSScriptRoot\workflow_ofertas.json", $outJson, [System.Text.Encoding]::UTF8)

Write-Host "Done - HTML node code replaced successfully"
