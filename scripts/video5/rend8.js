const { chromium } = require("playwright"), { spawn } = require("child_process"), fs = require("fs");
const FPS = 60, DUR = 24, mode = process.argv[2];
(async () => {
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1080, height: 1920 } });
  await p.goto("file:///tmp/v5/stage8.html"); await p.waitForTimeout(1500); await p.evaluate(() => pret());
  const frame = t => p.evaluate(async t => { render(t); await Promise.all([...document.images].map(i => i.decode().catch(() => 0))); }, t);
  if (mode === "stills") { for (const t of process.argv.slice(3)) { await frame(+t); await p.screenshot({ path: `/tmp/v5/st_${t}.jpg`, type: "jpeg", quality: 80 }); } }
  else { const out = "/tmp/v5/video.part.mp4";
    const ff = spawn("ffmpeg", ["-y", "-loglevel", "error", "-f", "image2pipe", "-framerate", String(FPS), "-c:v", "mjpeg", "-i", "-", "-c:v", "libx264", "-profile:v", "high", "-level", "4.2", "-crf", "16", "-preset", "medium", "-pix_fmt", "yuv420p", "-r", String(FPS), out]);
    for (let n = 0; n < DUR * FPS; n++) { await frame(n / FPS); const buf = await p.screenshot({ type: "jpeg", quality: 93 }); if (!ff.stdin.write(buf)) await new Promise(r => ff.stdin.once("drain", r)); }
    ff.stdin.end(); const code = await new Promise(r => ff.on("close", r)); if (code === 0) fs.renameSync(out, "/tmp/v5/video.mp4"); console.log("fini", code); }
  await b.close();
})();
