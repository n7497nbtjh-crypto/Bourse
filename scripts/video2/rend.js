const { chromium } = require("playwright"), { spawn } = require("child_process"), fs = require("fs");
const [mode, ...args] = process.argv.slice(2), FPS = +(process.env.FPS || 60), DUR = 33.5;
(async () => {
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1080, height: 1920 } });
  await p.goto("file:///tmp/v2/stage2.html"); await p.waitForTimeout(2500); await p.evaluate(() => window.pret);
  if (mode === "stills") { for (const t of args) { await p.evaluate(t => render(+t), t); await p.screenshot({ path: `/tmp/v2/st_${t}.jpg`, type: "jpeg", quality: 80 }); } }
  else {
    const out = "/tmp/v2/video.part.mp4";
    const ff = spawn("ffmpeg", ["-y", "-loglevel", "error", "-f", "image2pipe", "-framerate", String(FPS), "-c:v", "mjpeg", "-i", "-", "-c:v", "libx264", "-profile:v", "high", "-level", "4.0", "-crf", "18", "-preset", "veryfast", "-pix_fmt", "yuv420p", "-r", String(FPS), out]);
    for (let i = 0; i < DUR * FPS; i++) { await p.evaluate(t => render(t), i / FPS); const buf = await p.screenshot({ type: "jpeg", quality: 92 }); if (!ff.stdin.write(buf)) await new Promise(r => ff.stdin.once("drain", r)); }
    ff.stdin.end(); const code = await new Promise(r => ff.on("close", r)); if (code === 0) fs.renameSync(out, "/tmp/v2/video.mp4"); console.log("fini", code);
  }
  await b.close();
})();
