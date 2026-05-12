# 🤖 Sistema Inteligente de Compras B2B (Hardware Procurement Pipeline)

Este proyecto implementa un flujo de trabajo altamente automatizado de grado empresarial en **n8n** para procesar peticiones en lenguaje natural, buscar hardware informático en múltiples tiendas, evaluar su viabilidad técnica mediante Inteligencia Artificial Local (Ollama) y generar informes de propuestas de compra profesionales en PDF.

---

## 🎯 Objetivo del Proyecto

Optimizar, estabilizar y escalar el departamento de compras B2B. El sistema automatiza la recepción de requerimientos técnicos (vía Webhook o archivo de texto), utiliza una Inteligencia Artificial avanzada para interpretar y clasificar la demanda, lanza búsquedas en tiempo real en los catálogos B2B y retail (Amazon, PcComponentes, DMI, Esprinet) y finalmente emplea un agente analista IA experto para extraer especificaciones técnicas con total fiabilidad y sin "alucinaciones", elaborando una propuesta final en formato PDF listo para presentar a cliente o dirección.

---

## 🛠️ Tecnologías Utilizadas

*   **n8n**: Orquestador principal del flujo de trabajo (Docker).
*   **Ollama (Modelo qwen2.5:14b)**: Motor de IA local. Se utiliza en dos fases:
    1.  *Clasificación de Petición:* Entiende el presupuesto, restricciones y requerimientos (Must/Nice).
    2.  *Agente Analista Experto:* Infiere especificaciones técnicas detalladas (CPU, RAM, GPU, Disco, Pantalla) leyendo descripciones y URLs.
*   **Gotenberg**: Contenedor Docker para convertir HTML a PDF de forma robusta e inyectando estilos CSS modernos y logos.
*   **SerpApi**: Motor de scraping profesional para catálogos.
*   **JavaScript (ES6+)**: Lógica pesada de los nodos n8n, expresiones regulares, mecanismos anti-alucinaciones y normalización de catálogos.

---

## 🏗️ Arquitectura del Workflow (v6 - Actual)

El sistema procesa la información en las siguientes fases críticas:

### 1. Ingesta y Comprensión
El usuario introduce una petición (ej. "Necesito un portátil para diseño con RTX 4070, mínimo 32GB RAM y presupuesto de 2100€"). El modelo *qwen2.5:14b* parsea esto a un JSON estructurado calculando presupuestos mínimos (65%) y separando palabras clave de características obligatorias (`must`).

### 2. Scraping y Búsqueda Simultánea
Genera peticiones en paralelo a:
*   **Amazon** (Retail general)
*   **PcComponentes** (Retail / B2B)
*   **Esprinet** (Mayorista B2B oficial)
*   **DMI** (Mayorista B2B oficial)

### 3. Normalización y Filtrado de Calidad (Sanitization)
Cada tienda tiene su propio script de normalización en JavaScript que:
*   Realiza una limpieza de URL extrema: Elimina parámetros de tracking (`?gclid=`), sufijos (`/opiniones`, `/caracteristicas`) para asegurar que el enlace vaya directo a la compra.
*   Filtra basura: Descarta fundas, accesorios, memorias sueltas o maletines mediante un sistema de scoring y penalizaciones ponderadas (`JUNK_WORDS`).
*   Aplica Expresiones Regulares (RegEx) estrictas para capturar precios que SerpApi haya omitido (exigiendo obligatoriamente sufijos como "€" para no confundir RAM con precio).

### 4. Inteligencia de Datos y Anti-Alucinaciones
Aquí entra la magia real del flujo. Los 12 mejores productos globales pasan al **AI Agent**:
*   **Mega-Prompt Exhaustivo:** El bot no tiene permitido dejar campos vacíos ni usar términos genéricos como "Gaming Laptop". Si el título no contiene la RAM o el Disco, el bot las lee directamente de la estructura de guiones de la URL.
*   **Cruce de Seguridad (Anti-Hallucination Mechanism):** Se separa la responsabilidad. La IA extrae las especificaciones (CPU, RAM...), pero los nodos posteriores fusionan (*merge spread syntax*) estos datos con los precios, títulos y enlaces **originales**. Esto impide matemáticamente que la IA rompa enlaces, invente productos o modifique precios.

### 5. Renderizado Profesional en PDF
Se genera un documento HTML embebido y estilizado:
*   Logos corporativos integrados en formato Base64 / SVG inline para asegurar visibilidad en Docker.
*   Indicadores clave en cabecera: Productos rastreados (volumen de esfuerzo real), ahorro estimado, match de precio.
*   Tablas comparativas "Top 3 Global" y "Detalle por tienda".
*   Inyección hacia Gotenberg para renderizar un PDF final ultra-nítido que se guarda en `/propuestas_generadas/`.

---

## 📁 Estructura del Directorio

*   `workflow_ofertas_v6.json`: El cerebro del proyecto.
*   `peticiones_ejemplo/peticiones_ejemplo.txt`: Plantillas y prompts de ejemplo para simular compras corporativas complejas (Workstations, ofimática, portátiles de viajantes, etc.).
*   `prompt_agente_ia.txt`: Documentación interna con las reglas maestras de actuación del LLM y su mega-prompt.
*   `imagenes/`: Repositorio local de logos.
*   `propuestas_generadas/`: Carpeta de salida de los documentos PDF finales generados.

---

## ⚙️ Configuración

*   El sistema requiere acceso a Ollama local (`http://ip-ollama:11434`) y a Gotenberg (`http://gotenberg:3000`).
*   Las URLs, presupuestos y umbrales son configurables en el nodo de **Parsear Peticion**.
*   **Paso pendiente (Integración API Mayoristas):** Actualmente Esprinet y DMI se resuelven vía SerpApi. Cuando se disponga de los tokens B2B correspondientes, los nodos HTTP reemplazarán la URI de búsqueda manteniendo intacto el resto de la normalización.

---
*Desarrollo y Estabilización: Mayo 2026. Versión 6.0.*
