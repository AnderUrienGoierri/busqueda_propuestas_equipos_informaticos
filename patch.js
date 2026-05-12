const fs = require('fs');
const logos = JSON.parse(fs.readFileSync('c:/Users/innovatek/n8n-watch/busqueda_ofertas_equipos/scratch_logos.json', 'utf8'));
const wfPath = 'c:/Users/innovatek/n8n-watch/busqueda_ofertas_equipos/workflow_ofertas_v6.json';
let wf = fs.readFileSync(wfPath, 'utf8');

const b64Amz = logos.amazon;
const svgPcc = logos.pcc.replace(/`/g, '\\`').replace(/\n/g, ' ').replace(/\r/g, '');
const svgDmi = logos.dmi.replace(/`/g, '\\`').replace(/\n/g, ' ').replace(/\r/g, '');
const svgEsp = logos.esp.replace(/`/g, '\\`').replace(/\n/g, ' ').replace(/\r/g, '');

const inject = `
const LOGO_AMZ = 'data:image/png;base64,${b64Amz}';
const SVG_PCC = \`${svgPcc}\`;
const SVG_DMI = \`${svgDmi}\`;
const SVG_ESP = \`${svgEsp}\`;
`;

// Insert the constants right before LOGO_B64
const target = `const LOGO_B64 = 'iVBORw0KGgoAAAANSUhEUgAAAR`;
const parts = wf.split(target);
if(parts.length === 2) {
  wf = parts[0] + inject + target + parts[1];
  
  // Now modify the HTML to add the distributors bar under the header
  const targetHtml = `<div class=\\"hdr-meta\\">`;
  
  const distributorsHtml = `
  <div class=\\"distributors\\">
    <div class=\\"dist-title\\">Distribuidores oficiales:</div>
    <div class=\\"dist-logos\\">
      \${SVG_DMI}
      \${SVG_ESP}
      \${SVG_PCC}
      <img src=\\"\${LOGO_AMZ}\\" alt=\\"Amazon\\">
    </div>
  </div>`;
  
  const cssTarget = `// ── CSS ───────────────────────────────────────────────────────\\nconst css = [`;
  const cssInject = `
  '.distributors{margin-top:12px;padding-top:12px;border-top:1px solid rgba(255,255,255,0.1);display:flex;align-items:center;gap:12px}',
  '.dist-title{font-size:8.5px;color:#94a3b8;text-transform:uppercase;font-weight:600;letter-spacing:0.5px}',
  '.dist-logos{display:flex;align-items:center;gap:16px}',
  '.dist-logos svg, .dist-logos img{height:16px;width:auto;opacity:0.8;filter:brightness(0) invert(1)}',
  `;
  
  wf = wf.replace(targetHtml, distributorsHtml + `\\n  </div>\\n  <div class=\\"hdr-meta\\">`);
  wf = wf.replace(cssTarget, cssTarget + cssInject);
  
  fs.writeFileSync(wfPath, wf);
  console.log('Injected logos successfully');
} else {
  console.log('Target string not found');
}
