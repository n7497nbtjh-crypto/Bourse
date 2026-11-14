const { chromium } = require("playwright");
(async () => { const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1080, height: 1920 } });
 for (let k=1;k<=6;k++){ await p.goto(`http://localhost:8796/tt.html#${k}`); await p.reload(); await p.waitForFunction(()=>document.title=='ok'); await p.evaluate(()=>document.fonts.ready); await p.waitForTimeout(400); await p.screenshot({path:`/tmp/cacw/enklair-cac40-${k}.png`}); }
 await b.close(); })();
