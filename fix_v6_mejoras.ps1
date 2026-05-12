$file = 'workflow_ofertas_v6.json'
$c = Get-Content $file -Raw -Encoding UTF8

# =============================================================
# FIX 1: PREPARAR PARA AGENTE — Prompt completo y robusto
# Incluye: snippets, prohibicion de inventar, todos los tipos HW
# =============================================================
$oldPrep = 'const listaTxt = products.slice(0, 5).map((p, i) =>\n  `${i+1}. TITULO: \"${p.title}\"\n   PRECIO: ${p.price}\u20ac | TIENDA: ${p.source}\n   DESCRIPCION: \"${String(p.snippet||'''').slice(0,200)}\"\n   URL: ${p.link}`\n).join(''\\n\\n'');'

# Buscar y reemplazar el bloque del prompt completo en Preparar para Agente
$oldPromptBlock = 'const listaTxt = products.slice(0, 5).map((p, i) =>\n  `${i+1}. TITULO: \"${p.title}\"\n   PRECIO: ${p.price}'

if ($c.Contains('TITULO: \\"${p.title}\\"')) {
    Write-Host "Encontrado bloque Preparar para Agente"
} else {
    Write-Host "Buscando patron alternativo..."
}

# =============================================================
# FIX 2: AI AGENT systemMessage — Reglas absolutas ampliadas
# =============================================================
$oldSystem = '"systemMessage\": \"Eres un tecnico experto en hardware informatico con 20 a\u00f1os de experiencia. Conoces de memoria las fichas tecnicas completas de todos los modelos de portatiles y sobremesas vendidos en Espa\u00f1a. Tu unica funcion es extraer y deducir especificaciones tecnicas a partir de titulos de productos. REGLAS ABSOLUTAS: (1) NUNCA escribas ''Ver ficha'' - si no aparece explicitamente, DEDUCE el dato de tu conocimiento del modelo. (2) NUNCA dejes un campo vacio o null. (3) Para GPU: si no hay GPU dedicada escribe ''Integrada'' seguido de la GPU integrada del procesador. (4) Para SO: si no aparece, escribe ''Windows 11 Home'' para portatiles consumer. (5) Responde UNICAMENTE con JSON valido, sin markdown, sin explicaciones.\"'

$newSystem = '"systemMessage\": \"Eres HARDWAREBOT, sistema experto en hardware informatico con acceso a fichas tecnicas de TODOS los productos informaticos vendidos en Espana: portatiles, sobremesas, servidores, componentes (CPU, GPU, RAM, SSD), perifericos, monitores, impresoras y redes. REGLAS ABSOLUTAS - INCUMPLIRLAS ES UN ERROR CRITICO: (1) NUNCA escribas Ver ficha en ningun campo. Si no aparece explicitamente, DEDUCE de tu base de conocimiento. (2) NUNCA inventes un producto. El campo title, price, link y source deben ser EXACTAMENTE los que recibiste en el input - no los modifiques. (3) NUNCA dejes un campo vacio, null o con puntos suspensivos. (4) GPU: si no hay dedicada pon la integrada del procesador (Intel Iris Xe, AMD Radeon Graphics, etc). (5) SO: si no se menciona en portatil consumer pon Windows 11 Home, en workstation/servidor pon Windows 11 Pro o Linux segun contexto. (6) Para componentes (SSD, RAM, CPU, GPU sueltos): PANTALLA=N/A, SO=N/A, adapta los campos al tipo de producto. (7) Responde SOLO JSON array valido sin markdown.\"'

if ($c.Contains('HARDWAREBOT')) {
    Write-Host "systemMessage ya actualizado"
} elseif ($c.Contains('Eres un tecnico experto en hardware informatico con 20')) {
    $c = $c.Replace(
        '"systemMessage": "Eres un tecnico experto en hardware informatico con 20 a\u00f1os de experiencia. Conoces de memoria las fichas tecnicas completas de todos los modelos de portatiles y sobremesas vendidos en Espa\u00f1a. Tu unica funcion es extraer y deducir especificaciones tecnicas a partir de titulos de productos. REGLAS ABSOLUTAS: (1) NUNCA escribas ''Ver ficha'' - si no aparece explicitamente, DEDUCE el dato de tu conocimiento del modelo. (2) NUNCA dejes un campo vacio o null. (3) Para GPU: si no hay GPU dedicada escribe ''Integrada'' seguido de la GPU integrada del procesador. (4) Para SO: si no aparece, escribe ''Windows 11 Home'' para portatiles consumer. (5) Responde UNICAMENTE con JSON valido, sin markdown, sin explicaciones."',
        '"systemMessage": "Eres HARDWAREBOT, sistema experto en hardware informatico con acceso a fichas tecnicas de TODOS los productos informaticos vendidos en Espana: portatiles, sobremesas, servidores, componentes (CPU, GPU, RAM, SSD), perifericos, monitores, impresoras y redes. REGLAS ABSOLUTAS - INCUMPLIRLAS ES UN ERROR CRITICO: (1) NUNCA escribas Ver ficha en ningun campo - DEDUCE de tu base de conocimiento. (2) NUNCA inventes un producto: title, price, link y source deben ser EXACTAMENTE los del input. (3) NUNCA dejes un campo vacio. (4) GPU sin dedicada: pon la integrada del procesador. (5) SO no mencionado en portatil consumer: Windows 11 Home. (6) Componentes sueltos (SSD, RAM, CPU): PANTALLA=N/A, SO=N/A. (7) Responde SOLO JSON array valido sin markdown."'
    )
    Write-Host "FIX 2 - systemMessage actualizado"
} else {
    Write-Host "ERROR: No se encontro el systemMessage original para reemplazar"
    $idx = $c.IndexOf('systemMessage')
    Write-Host "Indice systemMessage: $idx"
    Write-Host "Contexto: $($c.Substring([Math]::Max(0,$idx), 200))"
}

# Guardar si hubo cambios
Set-Content $file $c -Encoding UTF8 -NoNewline
Write-Host "Archivo guardado"
