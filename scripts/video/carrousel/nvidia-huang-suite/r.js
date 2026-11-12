const { chromium } = require("/home/claude/bourse/node_modules/playwright");
(async () => { const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1080, height: 1920 } });
 for (let k=1;k<=6;k++){ await p.goto(`http://localhost:8792/tt.html#${k}`); await p.reload(); await p.waitForFunction(()=>document.title=='ok'); await p.evaluate(()=>document.fonts.ready); await p.waitForTimeout(350); await p.screenshot({path:`/tmp/h2/enklair-huang2-${k}.png`}); }
 await b.close(); })();
