const { chromium } = require("playwright"), { spawn } = require("child_process"), fs = require("fs");
const D = JSON.parse(fs.readFileSync("/tmp/v3/doigt.json")), FPS = 60, mode = process.argv[2], f = n => `file:///tmp/v3/f/${String(n).padStart(5, "0")}.jpg`;
(async () => {
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1080, height: 1920 } });
  await p.goto("file:///tmp/v3/stage6.html"); await p.waitForTimeout(2000); await p.evaluate(d => { setup(d); return document.fonts.ready; }, D);
  const FIN = await p.evaluate(() => FIN), DUR = FIN + 3.2, cuts = [D.marques.fiche, D.marques.comparer, D.marques.rapport];
  const frame = async t => { const i = await p.evaluate(t => frameAt(t), t); let s1 = null, op = null;
    for (const c of cuts) if (i > c && i <= c + 22) { s1 = f(c); op = (i - c) / 22; }
    await p.evaluate(async ([t, a, b, o]) => { render(t, a, b, o); await Promise.all([...document.querySelectorAll("#scr img")].map(x => x.decode().catch(() => 0))); }, [t, f(i), s1, op]); };
  if (mode === "stills") { for (const t of process.argv.slice(3)) { await frame(+t); await p.screenshot({ path: `/tmp/v3/st_${t}.jpg`, type: "jpeg", quality: 80 }); } }
  else { const out = "/tmp/v3/video.part.mp4";
    const ff = spawn("ffmpeg", ["-y", "-loglevel", "error", "-f", "image2pipe", "-framerate", String(FPS), "-c:v", "mjpeg", "-i", "-", "-c:v", "libx264", "-profile:v", "high", "-level", "4.2", "-crf", "16", "-preset", "medium", "-pix_fmt", "yuv420p", "-r", String(FPS), out]);
    for (let n = 0; n < Math.round(DUR * FPS); n++) { await frame(n / FPS); const buf = await p.screenshot({ type: "jpeg", quality: 93 }); if (!ff.stdin.write(buf)) await new Promise(r => ff.stdin.once("drain", r)); }
    ff.stdin.end(); const code = await new Promise(r => ff.on("close", r)); if (code === 0) fs.renameSync(out, "/tmp/v3/video.mp4"); console.log("fini", code, DUR); }
  await b.close();
})();
