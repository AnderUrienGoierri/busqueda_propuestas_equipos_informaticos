const fs = require('fs');
const file = 'c:/Users/innovatek/n8n-watch/busqueda_ofertas_equipos/workflow_ofertas_v6.json';
let text = fs.readFileSync(file, 'utf8');

// Find the corrupted jsCode block
const startStr = '"name": "Generar HTML PDF",';
const startIdx = text.indexOf(startStr);
if (startIdx === -1) throw new Error("Could not find start");

const jsCodeStartStr = '"jsCode": "';
const jsCodeStart = text.indexOf(jsCodeStartStr, startIdx);
if (jsCodeStart === -1) throw new Error("Could not find jsCode");

const endStr = '      }\n    },\n    {\n      "id": "v5n25",';
const endIdx = text.indexOf(endStr, jsCodeStart);
if (endIdx === -1) throw new Error("Could not find end");

let before = text.substring(0, jsCodeStart + jsCodeStartStr.length);
let jsCodeContent = text.substring(jsCodeStart + jsCodeStartStr.length, endIdx);
let after = text.substring(endIdx);

// jsCodeContent currently contains actual unescaped newlines which breaks JSON.
// However, it also might contain properly escaped newlines (\\n).
// Wait, the original JSON file had actual proper escapes `\n` which are 2 characters `\` and `n`.
// The injected parts have actual newline characters `\r\n` or `\n`.
// We just need to replace literal newlines with `\\n` and literal carriage returns with nothing.
// But we must NOT replace the `\n` that are already escaped? No, literal newlines are literal newlines.
// If we replace literal newlines with `\\n`, it will fix the JSON string.

jsCodeContent = jsCodeContent.replace(/\r/g, '');
jsCodeContent = jsCodeContent.replace(/\n(?!")/g, '\\n'); // Be careful if the string ends with \n"

// Actually, to be absolutely safe, let's just replace all literal newlines with `\n` escaped.
// Wait, the end of the JSON string is `}];\n"\n        }\n      }`.
// So `endIdx` is right at `      }\n    },\n`.
// Let's find the closing quote of jsCode.
let closingQuoteIdx = jsCodeContent.lastIndexOf('"');
let innerString = jsCodeContent.substring(0, closingQuoteIdx);
let suffix = jsCodeContent.substring(closingQuoteIdx);

// Replace literal newlines with \n
innerString = innerString.replace(/\r\n/g, '\\n').replace(/\n/g, '\\n');

text = before + innerString + suffix + after;

// Verify if JSON is valid now
try {
  JSON.parse(text);
  fs.writeFileSync(file, text);
  console.log("JSON fixed successfully!");
} catch (e) {
  console.log("Still invalid: " + e.message);
  
  // Try an alternative fallback: read workflow_ofertas_v5.json and copy it, then we can apply the prompt changes again.
}
