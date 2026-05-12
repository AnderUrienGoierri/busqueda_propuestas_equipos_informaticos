// ===========================================================
// NORM AMAZON - Solo paginas de producto + score de relevancia
// ===========================================================
// Acepta SOLO URLs con /dp/ASIN o /gp/product/ASIN (siempre directas).
// Devuelve TODOS los productos validos con score de relevancia.
// El nodo HTML decide el top 5 segun score+precio.

const STORE = 'Amazon';
const data = $input.item.json || {};
const products = [];

// Parametros del usuario para scoring
let pCfg = {};
try { pCfg = $('Preparar Busqueda').first().json || {}; } catch (e) {}
const must = Array.isArray(pCfg.must) ? pCfg.must : [];
const nice = Array.isArray(pCfg.nice) ? pCfg.nice : [];

const noAccent = (s) => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

const parseAmazonPrice = (p) => {
  if (!p) return 0;
  if (typeof p.value === 'number' && p.value > 0) return p.value;
  if (p.raw) {
    let n = String(p.raw).replace(/ /g, ' ').trim().replace(/[^0-9.,]/g, '');
    if (n.includes('.') && n.includes(',')) n = n.replace(/\./g, '').replace(',', '.');
    else if (n.includes(',')) n = n.replace(',', '.');
    const v = parseFloat(n);
    return isFinite(v) ? v : 0;
  }
  return 0;
};

// SOLO paginas de producto reales de Amazon
const isAmazonProduct = (url) => {
  if (!url) return false;
  const u = String(url).toLowerCase();
  return /\/dp\/[A-Z0-9]{8,12}/i.test(url) || /\/gp\/product\/[A-Z0-9]{8,12}/i.test(url);
};

// Limpia URL de tracking pero mantiene /dp/<ASIN> para que abra el producto
const cleanAmazonUrl = (url) => {
  try {
    const m = url.match(/(\/(?:dp|gp\/product)\/[A-Z0-9]{8,12})/i);
    if (m) return 'https://www.amazon.es' + m[1];
    return url.split('?')[0];
  } catch (e) { return url; }
};

const isJunkTitle = (title) => {
  if (!title || title.length < 12) return true;
  const t = noAccent(title);
  return ['resultados de', 'ofertas en', 'comprar online', 'amazon basics pack'].some(w => t.includes(w));
};

// Score: must=10, nice=3
const scoreProduct = (title, snippet) => {
  const text = noAccent(String(title) + ' ' + String(snippet || ''));
  let score = 0;
  must.forEach(m => { if (m && text.includes(noAccent(m))) score += 10; });
  nice.forEach(n => { if (n && text.includes(noAccent(n))) score += 3; });
  return score;
};

if (Array.isArray(data.search_results)) {
  data.search_results.forEach(r => {
    if (!r || !r.title || !r.link) return;
    if (!isAmazonProduct(r.link)) return;
    if (isJunkTitle(r.title)) return;
    if (r.is_sponsored && (!r.price || !r.price.value)) return;

    const price = parseAmazonPrice(r.price) || parseAmazonPrice(r.price_upper);
    if (price <= 0) return;

    const link = cleanAmazonUrl(r.link);
    const snippet = (r.bullet_points && Array.isArray(r.bullet_points) ? r.bullet_points.join(' ') : '')
                  + ' ' + (r.snippet || '');

    products.push({
      source: STORE,
      title: String(r.title).trim(),
      price,
      link,
      snippet,
      score: scoreProduct(r.title, snippet),
      image: r.image || ''
    });
  });
}

// Ordenar por relevancia DESC, luego precio ASC
products.sort((a, b) => (b.score - a.score) || (a.price - b.price));

return [{ json: { source: STORE, products } }];
