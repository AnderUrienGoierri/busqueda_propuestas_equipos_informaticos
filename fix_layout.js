const fs = require('fs');
const wfPath = 'c:/Users/innovatek/n8n-watch/busqueda_ofertas_equipos/workflow_ofertas_v6.json';
let wf = fs.readFileSync(wfPath, 'utf8');

// Wrap .brand and .distributors in .hdr-left
wf = wf.replace('<div class=\\"brand\\">', '<div class=\\"hdr-left\\">\\n    <div class=\\"brand\\">');
// Close .hdr-left before .hdr-meta
wf = wf.replace('<div class=\\"hdr-meta\\">', '</div>\\n  <div class=\\"hdr-meta\\">');

// Add .hdr-left flex rules
wf = wf.replace('.brand{display:flex;align-items:center;gap:12px}', '.hdr-left{display:flex;flex-direction:column;gap:12px}\\n  .brand{display:flex;align-items:center;gap:12px}');

fs.writeFileSync(wfPath, wf);
console.log('Fixed header layout');
