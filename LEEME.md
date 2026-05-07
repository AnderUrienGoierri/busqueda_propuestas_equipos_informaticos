# 🤖 Sistema Inteligente de Búsqueda de Ofertas IT (n8n + Ollama)

Este proyecto implementa un flujo de trabajo automatizado en **n8n** que procesa peticiones en lenguaje natural para buscar, filtrar y comparar ofertas de equipos informáticos en las principales plataformas de e-commerce de España.

---

## 🎯 Objetivo del Proyecto
Automatizar la recepción de requerimientos técnicos (vía archivos de texto), utilizar Inteligencia Artificial local para entender la demanda y realizar una búsqueda masiva en tiempo real para generar un informe comparativo con las mejores opciones de compra.

---

## 🛠️ Tecnologías Utilizadas
*   **n8n**: Orquestador del flujo de trabajo (corriendo en Docker).
*   **Ollama (Llama 3.1)**: IA local para la extracción de entidades (tipo de equipo, specs, presupuesto) desde texto libre.
*   **SerpApi**: Para realizar scraping profesional en **PcComponentes**, **Coolmod** y **MediaMarkt**.
*   **Rainforest API**: Para obtener datos estructurados y precisos directamente de **Amazon.es**.
*   **Docker Desktop**: Entorno de ejecución para n8n y Ollama.

---

## 🏗️ Arquitectura del Workflow (Paso a Paso)

1.  **Local File Trigger**: Monitoriza la carpeta `peticiones_oferta`. Utiliza **Polling** para garantizar la detección de archivos en sistemas Docker sobre Windows.
2.  **Read Text File**: Lee el contenido del archivo `.txt` detectado.
3.  **Ollama Extract (IA)**: Envía el texto a Ollama (`llama3.1`) para convertir una frase como *"Quiero un portátil de 800€"* en un JSON estructurado: `{"tipo": "portátil", "presupuesto": 800}`.
4.  **Preparar Búsqueda**: Limpia los datos y genera una query optimizada para los buscadores.
5.  **Búsqueda en Paralelo**: Lanza 4 peticiones simultáneas a las APIs de:
    *   Amazon (Rainforest)
    *   PcComponentes (SerpApi)
    *   Coolmod (SerpApi)
    *   MediaMarkt (SerpApi)
6.  **Unificar y Filtrar**: Un nodo de código JavaScript consolida los resultados, elimina duplicados, filtra por presupuesto máximo y ordena por precio.
7.  **Escribir Archivo**: Genera un reporte detallado en la carpeta `propuestas_generadas`.

---

## 📋 Formato del Informe Generado
El sistema genera un archivo `.txt` con la siguiente estructura:
*   **Sección ⭐ TOP 3 GLOBAL**: Las 3 mejores ofertas encontradas entre todas las tiendas.
*   **Sección 🏢 DETALLE POR TIENDA**: El Top 5 individual de Amazon, PcComponentes, Coolmod y MediaMarkt.

---

## ⚙️ Configuración y Credenciales

### Rutas de Carpeta (Docker)
*   **Entrada**: `/n8n-watch/busqueda_ofertas_equipos/peticiones_oferta`  
    *(Mapeado en Windows a: `C:\Users\innovatek\n8n-watch\busqueda_ofertas_equipos\peticiones_oferta`)*
*   **Salida**: `/n8n-watch/busqueda_ofertas_equipos/propuestas_generadas`  
    *(Mapeado en Windows a: `C:\Users\innovatek\n8n-watch\busqueda_ofertas_equipos\propuestas_generadas`)*

### APIs Keys Configuradas
*   **SerpApi**: `52fcdd105cf07cc0a4d0f69bde6ce978fdcbd4deb98db0667866f6a21be74594`
*   **Rainforest**: `8531EA9640A248D0B0C517E23131F9A5`

---

## 🚀 Instrucciones de Inicio Rápido
1.  Asegúrate de que el contenedor de **Ollama** tiene el modelo `llama3.1` cargado (`ollama pull llama3.1`).
2.  Importa el archivo `workflow_ofertas.json` en n8n.
3.  Activa el workflow (**Switch "Active"**).
4.  Crea un archivo `.txt` en la carpeta de peticiones.
5.  ¡Espera unos segundos y revisa tus resultados en la carpeta de propuestas!

---
*Documentación actualizada el 07 de Mayo de 2026.*
