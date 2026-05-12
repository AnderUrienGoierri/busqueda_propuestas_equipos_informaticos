// =====================================================
// PROCESAMIENTO Y GENERACION DE HTML CORPORATIVO
// =====================================================
// CAMBIOS:
//  - Acepta el score que envia cada normalizador.
//  - Top 5 por tienda SIEMPRE que haya productos validos (no
//    filtra por must specs, solo por presupuesto).
//  - Ordena por score DESC, precio ASC.
//  - Top 3 global = mejores 3 por (score, precio) entre todas.
//  - Cualquier producto con URL valida (no categoria) se acepta.

const STORES = ['Amazon', 'PcComponentes', 'Coolmod', 'MediaMarkt'];

// 1) Recoger productos de las 4 fuentes
const allProducts = [];
$input.all().forEach(item => {
  if (item && item.json && Array.isArray(item.json.products)) {
    allProducts.push(...item.json.products);
  }
});

// 2) Parametros de la peticion
const params = $('Preparar Busqueda').first().json || {};
const pMax = Number(params.pMax) || 9999;
const pMin = Number(params.pMin) || 0;
const tipo = params.tipo || 'Equipo';
const query = params.q || '';
const must = Array.isArray(params.must) ? params.must : [];
const nice = Array.isArray(params.nice) ? params.nice : [];

// Helpers
const noAccent = (s) => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
const fmt = (n) => Number(n).toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €';
const esc = (s) => String(s == null ? '' : s)
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
const today = new Date().toLocaleDateString('es-ES', { day: '2-digit', month: 'long', year: 'numeric' });

// 3) Score (por si algun producto no trae score, lo recalculamos)
const scoreOf = (p) => {
  if (typeof p.score === 'number') return p.score;
  const text = noAccent((p.title || '') + ' ' + (p.snippet || ''));
  let s = 0;
  must.forEach(m => { if (m && text.includes(noAccent(m))) s += 10; });
  nice.forEach(n => { if (n && text.includes(noAccent(n))) s += 3; });
  return s;
};

// 4) Preparar pool de productos (IDENTIFICADOS como productos reales por los normalizadores)
// No filtramos por specs aqui para no quedarnos vacios, el score hara el trabajo.
const seen = new Set();
const pool = allProducts
  .filter(p => p && p.link && p.title && Number(p.price) > 0)
  // Dedup por link (sin query params)
  .filter(p => {
    const k = String(p.link).split('?')[0].toLowerCase();
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  })
  .map(p => {
    const s = scoreOf(p);
    const inBudget = Number(p.price) >= pMin && Number(p.price) <= pMax;
    return { ...p, _score: s, _inBudget: inBudget };
  })
  // ORDEN CRITICO: 
  // 1. Mayor Score (relevancia)
  // 2. En presupuesto (preferencia)
  // 3. Menor Precio (ahorro)
  .sort((a, b) => {
    if (b._score !== a._score) return b._score - a._score;
    if (b._inBudget !== a._inBudget) return b._inBudget ? 1 : -1; // b._inBudget true viene despues si usamos 1? No, queremos true primero.
    // Correccion: if (a._inBudget && !b._inBudget) return -1;
    if (a._inBudget !== b._inBudget) return a._inBudget ? -1 : 1;
    return a.price - b.price;
  });

// 5) Top 3 global (solo de los que estan en presupuesto si es posible)
const inBudgetPool = pool.filter(p => p._inBudget);
const top3 = inBudgetPool.length >= 3 ? inBudgetPool.slice(0, 3) : pool.slice(0, 3);

// 6) Top 5 por tienda
const byStore = {};
STORES.forEach(s => byStore[s] = []);
pool.forEach(p => { 
  if (byStore[p.source] && byStore[p.source].length < 5) {
    byStore[p.source].push(p); 
  }
});

const activeStores = STORES.filter(s => byStore[s].length > 0).length;
const bestPrice = inBudgetPool.length ? inBudgetPool[0].price : (pool.length ? pool[0].price : 0);
const saving = inBudgetPool.length ? Math.max(0, pMax - inBudgetPool[0].price) : 0;
const debugInfo = pool.length + ' productos identificados';

// 7) Parser de specs (AGRESIVO para evitar celdas vacias)
const parseSpecs = (title, snippet) => {
  const t = String(title || '') + ' ' + String(snippet || '');
  const tl = t.toLowerCase();

  // Brand
  const brandList = ['Acer', 'ASUS', 'Lenovo', 'HP', 'Dell', 'MSI', 'Gigabyte', 'Samsung', 'Apple', 'Huawei', 'Medion', 'LG', 'Razer', 'Microsoft', 'Dynabook', 'Chuwi', 'Xiaomi', 'Honor', 'Toshiba', 'Fujitsu'];
  let brand = '';
  for (const b of brandList) { if (tl.includes(b.toLowerCase())) { brand = b; break; } }
  if (!brand) {
    if (tl.includes('macbook') || tl.includes('ipad')) brand = 'Apple';
    if (tl.includes('thinkpad') || tl.includes('ideapad') || tl.includes('legion')) brand = 'Lenovo';
    if (tl.includes('victus') || tl.includes('pavilion') || tl.includes('omen')) brand = 'HP';
    if (tl.includes('vivobook') || tl.includes('zenbook') || tl.includes('rog') || tl.includes('tuf')) brand = 'ASUS';
  }

  // Pantalla (Pulgadas)
  let screen = '';
  const scrM = t.match(/(\d{2}[.,]\d)\s*["'”″]/) || 
               t.match(/(\d{2})\s*["'”″]/) || 
               t.match(/(\d{2}[.,]\d)\s*(?:pulg|p-)/i) ||
               t.match(/(\d{2}[.,]\d)\s*[']/);
  if (scrM) screen = (scrM[1] || '').replace(',', '.') + '"';
  if (!screen && tl.includes('15.6')) screen = '15.6"';
  if (!screen && tl.includes('14')) screen = '14"';
  if (!screen && tl.includes('17.3')) screen = '17.3"';

  // CPU (Procesador)
  let cpu = '';
  const cpuM = t.match(/Core\s+i([3579])[\s-]*(\d{4,5}\w*)/i) || 
               t.match(/Ryzen\s+([3579])\s+(\d{4}\w*)/i) ||
               t.match(/\bi([3579])[\s-]+(\d{4,5}\w*)/i) ||
               t.match(/\b(M[1234]\s*(?:Pro|Max|Ultra)?)\b/i) ||
               t.match(/([3579])\s*(\d{4,5}[HUK])/i); // Ej: 7 7735HS
  if (cpuM) {
    if (cpuM[1] && cpuM[2]) {
      const type = tl.includes('ryzen') ? 'R' : 'i';
      cpu = type + cpuM[1] + '-' + cpuM[2];
    } else {
      cpu = cpuM[1].trim();
    }
  }
  if (!cpu) {
    if (tl.includes('intel core i7')) cpu = 'i7';
    else if (tl.includes('intel core i5')) cpu = 'i5';
    else if (tl.includes('ryzen 7')) cpu = 'R7';
    else if (tl.includes('ryzen 5')) cpu = 'R5';
  }

  // RAM
  let ram = '';
  const ramM = t.match(/(\d{1,2})\s*GB\s*(?:RAM|DDR[45]|de RAM|LPDDR)/i) ||
               t.match(/[\s/](\d{1,2})GB[\s/]/i) ||
               t.match(/(\d{1,2})\s*GB\s*(?=\/|SSD|Disco|$)/i);
  if (ramM) ram = ramM[1] + 'GB';
  if (!ram && tl.includes('16gb')) ram = '16GB';
  if (!ram && tl.includes('8gb')) ram = '8GB';
  if (!ram && tl.includes('32gb')) ram = '32GB';

  // GPU (Gráfica)
  let gpu = '';
  const gpuM = t.match(/(RTX)\s*(\d{4})\s*(Ti|S(?:uper)?)?/i) || 
               t.match(/(GTX)\s*(\d{4})\s*(Ti)?/i) || 
               t.match(/(RX)\s*(\d{4})\s*(\w*)/i) ||
               t.match(/Graphics\s+(\w+\s*\w*)/i);
  if (gpuM) {
    gpu = gpuM[1].toUpperCase() + (gpuM[2] ? ' ' + gpuM[2] : '') + (gpuM[3] ? ' ' + gpuM[3] : '');
  }
  if (!gpu) {
    if (tl.includes('rtx 4060')) gpu = 'RTX 4060';
    else if (tl.includes('rtx 4050')) gpu = 'RTX 4050';
    else if (tl.includes('rtx 3050')) gpu = 'RTX 3050';
    else if (tl.includes('iris xe')) gpu = 'Iris Xe';
    else if (tl.includes('radeon')) gpu = 'Radeon';
  }
  gpu = gpu.trim();

  // Disco (SSD/HDD)
  let disk = '';
  const diskM = t.match(/(\d+)\s*TB\s*SSD/i) || 
                t.match(/(\d{3,4})\s*GB\s*SSD/i) || 
                t.match(/SSD\s*(?:de\s*)?(\d+)\s*(GB|TB)/i) || 
                t.match(/(\d+)\s*(GB|TB)\s*(?:NVMe|PCIe|M\.2)/i) ||
                t.match(/[\s/](\d+)(GB|TB)[\s/]/i);
  if (diskM) {
    const v = diskM[1]; const u = (diskM[2] || 'GB').toUpperCase();
    disk = v + u;
  }
  if (!disk) {
    if (tl.includes('512gb')) disk = '512GB';
    else if (tl.includes('1tb')) disk = '1TB';
    else if (tl.includes('256gb')) disk = '256GB';
  }

  return { brand, screen, cpu, ram, gpu, disk };
};

// 8) Iconos SVG
const ico = {
  globe: '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M2 12h20"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>',
  store: '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M3 9l1-5h16l1 5"/><path d="M5 9v11h14V9"/><path d="M9 22V13h6v9"/></svg>',
  link: '<svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M7 17L17 7"/><path d="M8 7h9v9"/></svg>',
  cube: '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg>',
  tag: '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7"/></svg>',
  trend: '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg>',
  spark: '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 15 9 22 10 17 15 18 22 12 19 6 22 7 15 2 10 9 9 12 2"/></svg>'
};

// 9) Header
const headerHtml = '<header class="hdr"><div class="hdr-row"><div class="brand"><div class="brand-mark">' + ico.cube + '</div><div class="brand-text"><div class="eyebrow">INFORME COMPARATIVO DE OFERTAS</div><h1>Propuesta de Hardware</h1></div></div><div class="hdr-meta"><div class="meta-row"><span class="k">Fecha</span><span class="v">' + esc(today) + '</span></div><div class="meta-row"><span class="k">Categoria</span><span class="v">' + esc(tipo) + '</span></div><div class="meta-row"><span class="k">Presupuesto</span><span class="v">' + fmt(pMax) + '</span></div><div class="meta-row"><span class="k">Terminos</span><span class="v">' + esc(query) + '</span></div></div></div></header>';

const summaryHtml = '<section class="summary">' +
  '<div class="card stat"><div class="stat-icon">' + ico.globe + '</div><div class="stat-body"><span class="stat-label">Ofertas analizadas</span><span class="stat-value">' + debugInfo + '</span></div></div>' +
  '<div class="card stat"><div class="stat-icon">' + ico.store + '</div><div class="stat-body"><span class="stat-label">Tiendas con resultados</span><span class="stat-value">' + activeStores + ' / ' + STORES.length + '</span></div></div>' +
  '<div class="card stat"><div class="stat-icon">' + ico.tag + '</div><div class="stat-body"><span class="stat-label">Mejor precio</span><span class="stat-value">' + (pool.length ? fmt(bestPrice) : '—') + '</span></div></div>' +
  '<div class="card stat"><div class="stat-icon">' + ico.trend + '</div><div class="stat-body"><span class="stat-label">Ahorro vs presupuesto</span><span class="stat-value">' + (pool.length ? fmt(saving) : '—') + '</span></div></div>' +
'</section>';

// 10) Top 3 global con specs
const specHeaders = '<th class="th-sm">Marca</th><th class="th-sm">Pant.</th><th class="th-sm">CPU</th><th class="th-sm">RAM</th><th class="th-sm">GPU</th><th class="th-sm">Disco</th>';

const top3Rows = top3.length
  ? top3.map((p, i) => {
      const sp = parseSpecs(p.title, p.snippet);
      const overTag = !p._inBudget ? '<span class="tag-warn">+presup.</span>' : '';
      return '<tr>' +
        '<td class="rank-cell"><span class="rank rank-' + (i + 1) + '">' + (i + 1) + '</span></td>' +
        '<td class="spec-cell brand-cell">' + esc(sp.brand || '-') + '</td>' +
        '<td class="spec-cell">' + esc(sp.screen || '-') + '</td>' +
        '<td class="spec-cell cpu-cell">' + esc(sp.cpu || '-') + '</td>' +
        '<td class="spec-cell">' + esc(sp.ram || '-') + '</td>' +
        '<td class="spec-cell gpu-cell">' + esc(sp.gpu || '-') + '</td>' +
        '<td class="spec-cell">' + esc(sp.disk || '-') + '</td>' +
        '<td class="store-cell"><span class="chip">' + esc(p.source) + '</span></td>' +
        '<td class="price-cell">' + fmt(p.price) + ' ' + overTag + '</td>' +
        '<td class="action-cell"><a class="btn-primary" href="' + esc(p.link) + '" target="_blank" rel="noopener">' + ico.link + '<span>Ver</span></a></td>' +
      '</tr>';
    }).join('')
  : '<tr><td colspan="10" class="empty">Sin resultados validos. Revisa la peticion o el presupuesto.</td></tr>';

const top3Html = '<section class="block hero">' +
  '<div class="block-hd"><div class="block-icon block-icon-primary">' + ico.spark + '</div><div><h2>Top 3 - Recomendacion global</h2><p class="sub">Las mejores ofertas por relevancia (specs) y precio encontradas.</p></div></div>' +
  '<table class="table table-specs">' +
    '<thead><tr><th class="th-rank">#</th>' + specHeaders + '<th class="th-sm">Tienda</th><th class="th-price">Precio</th><th class="th-act">Enlace</th></tr></thead>' +
    '<tbody>' + top3Rows + '</tbody>' +
  '</table>' +
'</section>';

// 11) Por tienda - top 5
const storeBlocks = STORES.map(store => {
  const items = byStore[store];
  const rows = items.length
    ? items.map((p, i) => {
        const sp = parseSpecs(p.title, p.snippet);
        const overTag = !p._inBudget ? '<span class="tag-warn">+presup.</span>' : '';
        return '<tr>' +
          '<td class="rank-cell"><span class="rank rank-store">' + (i + 1) + '</span></td>' +
          '<td class="spec-cell brand-cell">' + esc(sp.brand || '-') + '</td>' +
          '<td class="spec-cell">' + esc(sp.screen || '-') + '</td>' +
          '<td class="spec-cell cpu-cell">' + esc(sp.cpu || '-') + '</td>' +
          '<td class="spec-cell">' + esc(sp.ram || '-') + '</td>' +
          '<td class="spec-cell gpu-cell">' + esc(sp.gpu || '-') + '</td>' +
          '<td class="spec-cell">' + esc(sp.disk || '-') + '</td>' +
          '<td class="price-cell">' + fmt(p.price) + ' ' + overTag + '</td>' +
          '<td class="action-cell"><a class="btn-secondary" href="' + esc(p.link) + '" target="_blank" rel="noopener">' + ico.link + '<span>Abrir</span></a></td>' +
        '</tr>';
      }).join('')
    : '<tr><td colspan="9" class="empty">Sin productos directos encontrados en esta tienda.</td></tr>';
  return '<section class="block store-block">' +
    '<div class="block-hd"><div class="block-icon">' + ico.store + '</div><div><h3>' + esc(store) + ' <span class="muted">- Top 5</span></h3><p class="sub">' + items.length + ' producto(s) encontrado(s).</p></div></div>' +
    '<table class="table table-specs">' +
      '<thead><tr><th class="th-rank">#</th>' + specHeaders + '<th class="th-price">Precio</th><th class="th-act">Enlace</th></tr></thead>' +
      '<tbody>' + rows + '</tbody>' +
    '</table>' +
  '</section>';
}).join('');

const footerHtml = '<footer class="ftr"><div class="ftr-l">Generado automaticamente con n8n + Ollama (Llama 3.2) - Datos en tiempo real via Rainforest API y SerpApi.</div><div class="ftr-r">' + esc(today) + '</div></footer>';

const sectionTitle = '<div class="section-title">' + ico.store + '<span>Detalle por tienda - Top 5</span><span class="bar"></span></div>';

// 12) CSS
const css = ':root{--bg:#f5f7fa;--surface:#fff;--surface-2:#f1f5f9;--ink:#0f172a;--ink-soft:#334155;--muted:#64748b;--line:#e2e8f0;--accent:#2563eb;--accent-soft:#dbeafe;--price:#047857;--price-bg:#ecfdf5;--warn:#b45309;--warn-bg:#fef3c7;--r:10px;--r-sm:6px}'
+ '*{box-sizing:border-box}html,body{margin:0;padding:0;background:var(--bg);color:var(--ink);font-family:Inter,Segoe UI,-apple-system,sans-serif;font-size:10px;line-height:1.4;-webkit-font-smoothing:antialiased}'
+ '.page{max-width:1020px;margin:0 auto;padding:24px 28px 20px}'
+ '.hdr{background:linear-gradient(135deg,#0f172a 0%,#1e3a8a 100%);color:#fff;border-radius:var(--r);padding:20px 24px;margin-bottom:16px;box-shadow:0 8px 24px -12px rgba(15,23,42,.35)}'
+ '.hdr-row{display:flex;justify-content:space-between;align-items:flex-start;gap:20px}'
+ '.brand{display:flex;gap:12px;align-items:center}'
+ '.brand-mark{width:40px;height:40px;border-radius:8px;background:rgba(255,255,255,.08);border:1px solid rgba(255,255,255,.22);display:flex;align-items:center;justify-content:center;color:#fff}'
+ '.eyebrow{font-size:8.5px;letter-spacing:2px;color:#cbd5e1;font-weight:600;text-transform:uppercase}'
+ '.brand-text h1{margin:2px 0 0;font-size:19px;font-weight:700;letter-spacing:-.3px;color:#fff}'
+ '.hdr-meta{min-width:260px;background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.14);border-radius:var(--r-sm);padding:9px 12px}'
+ '.meta-row{display:flex;justify-content:space-between;gap:16px;padding:2px 0;font-size:10px}'
+ '.meta-row + .meta-row{border-top:1px solid rgba(255,255,255,.08)}'
+ '.meta-row .k{color:#94a3b8;font-weight:500}.meta-row .v{color:#fff;font-weight:600}'
+ '.summary{display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin-bottom:16px}'
+ '.card{background:var(--surface);border:1px solid var(--line);border-radius:var(--r);padding:12px 14px;box-shadow:0 1px 2px rgba(15,23,42,.04)}'
+ '.stat{display:flex;gap:10px;align-items:center}'
+ '.stat-icon{width:32px;height:32px;flex-shrink:0;border-radius:7px;background:var(--accent-soft);color:var(--accent);display:flex;align-items:center;justify-content:center}'
+ '.stat-body{display:flex;flex-direction:column;gap:1px}'
+ '.stat-label{font-size:8.5px;color:var(--muted);font-weight:600;letter-spacing:.4px;text-transform:uppercase}'
+ '.stat-value{font-size:16px;color:var(--ink);font-weight:700;letter-spacing:-.3px;font-variant-numeric:tabular-nums}'
+ '.block{background:var(--surface);border:1px solid var(--line);border-radius:var(--r);padding:14px 16px 10px;margin-bottom:12px;box-shadow:0 1px 2px rgba(15,23,42,.04);page-break-inside:avoid}'
+ '.block.hero{border-color:var(--accent-soft);box-shadow:0 4px 14px -8px rgba(37,99,235,.25)}'
+ '.block-hd{display:flex;align-items:center;gap:10px;margin-bottom:10px}'
+ '.block-icon{width:32px;height:32px;border-radius:7px;background:var(--surface-2);color:var(--ink-soft);display:flex;align-items:center;justify-content:center;border:1px solid var(--line);flex-shrink:0}'
+ '.block-icon-primary{background:var(--accent-soft);color:var(--accent);border-color:var(--accent-soft)}'
+ '.block-hd h2{margin:0;font-size:13px;font-weight:700;color:var(--ink)}'
+ '.block-hd h3{margin:0;font-size:12px;font-weight:700;color:var(--ink)}'
+ '.block-hd .muted{color:var(--muted);font-weight:500}'
+ '.sub{margin:1px 0 0;font-size:9.5px;color:var(--muted)}'
+ '.section-title{display:flex;align-items:center;gap:8px;margin:18px 0 8px;padding:0 4px;color:var(--ink);font-size:11px;font-weight:700;letter-spacing:.2px;text-transform:uppercase}'
+ '.section-title .bar{flex:1;height:1px;background:var(--line)}'
+ '.table{width:100%;border-collapse:separate;border-spacing:0}'
+ '.table-specs{font-size:9px}'
+ '.table th{text-align:left;font-weight:600;color:var(--muted);text-transform:uppercase;letter-spacing:.4px;font-size:8px;padding:6px 5px;border-bottom:1px solid var(--line);background:var(--surface-2);white-space:nowrap}'
+ '.table th:first-child{border-top-left-radius:var(--r-sm)}'
+ '.table th:last-child{border-top-right-radius:var(--r-sm)}'
+ '.table td{padding:7px 5px;border-bottom:1px solid var(--line);vertical-align:middle;color:var(--ink-soft)}'
+ '.table tbody tr:last-child td{border-bottom:none}'
+ '.th-rank{width:28px;text-align:center}'
+ '.th-sm{}'
+ '.th-price{width:90px;text-align:right}'
+ '.th-act{width:68px;text-align:right}'
+ '.rank-cell{text-align:center}'
+ '.rank{display:inline-flex;align-items:center;justify-content:center;width:20px;height:20px;border-radius:50%;font-weight:700;font-size:9px;color:#fff;background:var(--ink-soft)}'
+ '.rank-1{background:#0f172a}.rank-2{background:#334155}.rank-3{background:#64748b}'
+ '.rank-store{background:var(--accent);color:#fff}'
+ '.spec-cell{font-size:9px;color:var(--ink);white-space:nowrap}'
+ '.brand-cell{font-weight:600}'
+ '.cpu-cell,.gpu-cell{font-family:Consolas,Monaco,monospace;font-size:8.5px;color:var(--ink-soft)}'
+ '.price-cell{text-align:right;font-weight:700;color:var(--price);background:var(--price-bg);font-variant-numeric:tabular-nums;white-space:nowrap}'
+ '.action-cell{text-align:right}'
+ '.store-cell{}'
+ '.chip{display:inline-block;padding:2px 7px;border-radius:99px;background:var(--surface-2);border:1px solid var(--line);font-size:8.5px;font-weight:600;color:var(--ink-soft)}'
+ '.tag-warn{display:inline-block;padding:1px 5px;border-radius:99px;background:var(--warn-bg);color:var(--warn);font-size:7.5px;font-weight:700;margin-left:4px;vertical-align:middle}'
+ '.btn-primary,.btn-secondary{display:inline-flex;align-items:center;gap:4px;text-decoration:none;font-weight:600;font-size:8.5px;padding:4px 8px;border-radius:var(--r-sm);white-space:nowrap}'
+ '.btn-primary{background:var(--accent);color:#fff;border:1px solid var(--accent)}'
+ '.btn-secondary{background:#fff;color:var(--accent);border:1px solid #c7dafd}'
+ '.empty{text-align:center;color:var(--muted);font-style:italic;padding:14px}'
+ '.ftr{display:flex;justify-content:space-between;font-size:8.5px;color:var(--muted);margin-top:14px;padding-top:10px;border-top:1px solid var(--line);gap:20px}'
+ '@page{size:A4 landscape;margin:10mm}'
+ '@media print{.block,.summary,.hdr{break-inside:avoid}}';

const html = '<!DOCTYPE html><html lang="es"><head><meta charset="utf-8">' +
  '<title>Propuesta de Hardware - ' + esc(tipo) + '</title>' +
  '<style>' + css + '</style>' +
'</head><body><div class="page">' +
  headerHtml + summaryHtml + top3Html + sectionTitle + storeBlocks + footerHtml +
'</div></body></html>';

return [{
  json: {
    total: pool.length,
    totalRaw: allProducts.length,
    top3: top3.length,
    stores: STORES.map(s => ({ name: s, count: byStore[s].length })),
    presupuesto: pMax,
    precioMinimo: pMin,
    tipo, query, must, nice
  },
  binary: {
    index: {
      data: Buffer.from(html, 'utf-8').toString('base64'),
      mimeType: 'text/html',
      fileName: 'index.html'
    }
  }
}];
