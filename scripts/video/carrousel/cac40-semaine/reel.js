const { chromium } = require("playwright");
const DUR = [3.8, 5.2, 5.4, 5.2, 5.2, 4.8], FPS = 30;
(async () => { const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1080, height: 1920 } });
 for (let k = 1; k <= 6; k++) { await p.goto(`http://localhost:8796/tt.html#${k},r`); await p.reload(); await p.waitForFunction(() => document.title == 'ok'); await p.evaluate(() => document.fonts.ready); await p.waitForTimeout(300);
  const n = Math.round(DUR[k - 1] * FPS);
  for (let i = 0; i < n; i++) { await p.evaluate(v => Z(v), 1 + 0.07 * i / n); await p.screenshot({ path: `/tmp/cacw/fr/s${k}_${String(i).padStart(4, "0")}.jpg`, type: "jpeg", quality: 92 }); } }
 await b.close(); })();
