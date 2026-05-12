// ============================================================
// NORM PCCOMPONENTES - Calidad de Producto & Specs
// ============================================================
const STORE = 'PcComponentes';
const DOMAIN = 'pccomponentes.com';

let inputData = {};
try { inputData = $input.first().json || {}; } catch (e) { inputData = {}; }

let pCfg = {};
try { pCfg = $('Preparar Busqueda').first().json || {}; } catch (e) {}
const must = Array.isArray(pCfg.must) ? pCfg.must : [];
const nice = Array.isArray(pCfg.nice) ? pCfg.nice : [];
const pMin = Number(pCfg.pMin) || 15;
const pMax = Number(pCfg.pMax) || 99999;
const tipo = String(pCfg.tipo || '').toLowerCase();

const noAccent = (s) => {
  if (!s) return '';
  return String(s).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
};

// Palabras prohibidas para evitar accesorios, servicios o piezas sueltas
const JUNK_WORDS = ['funda', 'maletin', 'mochila', 'seguro', 'garantia', 'montaje', 'instalacion', 'soporte', 'cable', 'adaptador', 'limpieza', 'reparacion', 'teclado para', 'bateria para', 'cargador'];

const extractPrices = (text) => {
  if (!text) return [];
  const out = [];
  const re = /(\d{1,3}(?:\.\d{3})*(?:,\d{1,2})?)\s*(?:€|euros|eur|(?=\s|$))/gi;
  let m;
  const str = String(text);
  while ((m = re.exec(str)) !== null) {
    let n = m[1].replace(/\./g, '').replace(',', '.');
    const v = parseFloat(n);
    if (!isNaN(v) && v > 5) out.push(v);
  }
  return out;
};

const scoreProduct = (title, snippet) => {
  const t = String(title || '');
  const s = String(snippet || '');
  const text = noAccent(t + ' ' + s);
  let score = 0;
  
  // Prioridad maxima al TIPO (Portatil, etc)
  if (tipo && text.indexOf(tipo) !== -1) score += 50;
  
  // Penalizacion por palabras sospechosas de ser accesorios
  for (var i = 0; i < JUNK_WORDS.length; i++) {
    if (noAccent(t).indexOf(JUNK_WORDS[i]) !== -1) { score -= 100; break; }
  }

  for (var i = 0; i < must.length; i++) {
    if (must[i] && text.indexOf(noAccent(must[i])) !== -1) score += 10;
  }
  for (var i = 0; i < nice.length; i++) {
    if (nice[i] && text.indexOf(noAccent(nice[i])) !== -1) score += 3;
  }
  return score;
};

const products = [];

// 1) Organic
const organic = inputData.organic_results;
if (organic && Array.isArray(organic)) {
  for (var i = 0; i < organic.length; i++) {
    const r = organic[i];
    if (!r || !r.link || !r.title) continue;
    const link = String(r.link).toLowerCase();
    if (link.indexOf('/category/') !== -1 || link.indexOf('/c/') !== -1 || link.indexOf('/buscar') !== -1) continue;

    let price = 0;
    if (r.rich_snippet && r.rich_snippet.top && r.rich_snippet.top.detected_extensions && r.rich_snippet.top.detected_extensions.price) {
      price = Number(r.rich_snippet.top.detected_extensions.price);
    } else if (r.rich_snippet && r.rich_snippet.bottom && r.rich_snippet.bottom.detected_extensions && r.rich_snippet.bottom.detected_extensions.price) {
      price = Number(r.rich_snippet.bottom.detected_extensions.price);
    }
    if (!price) {
      const ps = extractPrices(String(r.title) + ' ' + String(r.snippet || ''));
      if (ps.length > 0) price = ps[0];
    }
    if (price <= 0) continue;

    products.push({
      source: STORE, title: String(r.title).trim(), price: price, link: r.link, snippet: r.snippet || '',
      score: scoreProduct(r.title, r.snippet || '')
    });
  }
}

// 2) Shopping
const shopping = inputData.shopping_results;
if (shopping && Array.isArray(shopping)) {
  for (var i = 0; i < shopping.length; i++) {
    const r = shopping[i];
    if (!r || !r.link || !r.title) continue;
    const merchant = String(r.source || '').toLowerCase();
    if (merchant.indexOf('pccomponentes') === -1 && String(r.link).toLowerCase().indexOf(DOMAIN) === -1) continue;
    const price = Number(r.extracted_price) || 0;
    if (price <= 0) continue;
    products.push({
      source: STORE, title: String(r.title).trim(), price: price, link: r.link, snippet: r.price || '',
      score: scoreProduct(r.title, r.title)
    });
  }
}

// Deduplicar y Filtrar Calidad
const seen = {};
const dedup = [];
for (var i = 0; i < products.length; i++) {
  const p = products[i];
  const key = String(p.link).split('?')[0].toLowerCase();
  if (!seen[key]) {
    seen[key] = true;
    // Si el score es negativo (es junk), lo saltamos a menos que no tengamos nada mas
    if (p.score < -20) continue; 
    dedup.push(p);
  }
}

// Ordenar: 1. Score (Relevancia), 2. Si esta cerca del presupuesto razonable, 3. Precio
dedup.sort((a, b) => {
  if (Math.abs(b.score - a.score) > 5) return b.score - a.score;
  // Priorizar los que estan por encima del pMin (suelo de precio real)
  const aValid = a.price >= pMin;
  const bValid = b.price >= pMin;
  if (aValid !== bValid) return aValid ? -1 : 1;
  return a.price - b.price;
});

return [{ json: { source: STORE, products: dedup, count: dedup.length } }];
