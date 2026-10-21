// Exporta la tarjeta: PDF de imprenta (2 páginas, 96×56 mm con sangrado) y PNG a 600 ppp por cara.
// Uso: node render.mjs
import { createRequire } from 'node:module';
const { chromium } = createRequire(import.meta.url)('playwright');
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const aqui = path.dirname(fileURLToPath(import.meta.url));
const url = 'file://' + path.join(aqui, 'tarjeta-cyo.html');

const browser = await chromium.launch({ executablePath: process.env.CHROMIUM || '/opt/pw-browsers/chromium' });

const pdf = await browser.newPage();
await pdf.goto(url);
await pdf.emulateMedia({ media: 'print' });
await pdf.evaluate(() => document.fonts.ready);
await pdf.pdf({ path: path.join(aqui, 'tarjeta-cyo-imprenta.pdf'), width: '96mm', height: '56mm', printBackground: true, preferCSSPageSize: true });

// 600 ppp: 96 px CSS por pulgada -> factor 6.25
const png = await browser.newPage({ deviceScaleFactor: 600 / 96 });
await png.goto(url);
await png.emulateMedia({ media: 'print' });
await png.evaluate(() => document.fonts.ready);
await png.setViewportSize({ width: 363, height: 212 }); // 96 × 56 mm
for (const cara of ['frente', 'reverso']) {
  // una cara a la vez, pegada al origen, para que el recorte no tome nada de la otra
  await png.evaluate((c) => {
    for (const el of document.querySelectorAll('.cara')) el.style.display = el.classList.contains(c) ? 'block' : 'none';
  }, cara);
  await png.screenshot({ path: path.join(aqui, `tarjeta-cyo-${cara}-600ppp.png`), clip: { x: 0, y: 0, width: 96 / 25.4 * 96, height: 56 / 25.4 * 96 } });
}
await browser.close();
console.log('PDF y PNG listos');
