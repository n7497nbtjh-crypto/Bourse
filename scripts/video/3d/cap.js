// node cap.js images 0.2,3,9.5 | node cap.js video
const { chromium } = require("/home/claude/bourse/node_modules/playwright");
const { spawn } = require("child_process");
(async () => {
  const mode = process.argv[2], b = await chromium.launch({ args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"] });
  const p = await b.newPage({ viewport: { width: 1080, height: 1920 } }); p.on("pageerror", e => console.log("err:", e.message));
  await p.goto("http://localhost:8765/site/" + (process.env.PAGE || "micron.html")); await p.waitForFunction("window.pret", null, { timeout: 60000 }); await p.evaluate(() => document.fonts.ready);
  if (mode === "images") { for (const t of process.argv[3].split(",")) { await p.evaluate(t => window.frame(t), +t); await p.screenshot({ path: `/tmp/v3d/img_${t}.jpg`, type: "jpeg", quality: 85 }); } }
  else { const D = await p.evaluate(() => window.DUREE), N = Math.round(D * 30);
    const ff = spawn("ffmpeg", ["-v", "error", "-y", "-f", "image2pipe", "-framerate", "30", "-c:v", "mjpeg", "-i", "-", "-c:v", "libx264", "-preset", "veryfast", "-crf", "18", "-pix_fmt", "yuv420p", process.env.OUT ? process.env.OUT + ".tmp.mp4" : "/tmp/v3d/image.tmp.mp4"], { stdio: ["pipe", "inherit", "inherit"] });
    const A = +(process.env.FROM || 0), Z = +(process.env.TO || N);
    for (let i = A; i < Z; i++) { await p.evaluate(t => window.frame(t), i / 30); const buf = await p.screenshot({ type: "jpeg", quality: 92 }); if (!ff.stdin.write(buf)) await new Promise(r => ff.stdin.once("drain", r)); if (i % 150 === 0) console.log(i, "/", N); }
    ff.stdin.end(); await new Promise(r => ff.on("close", r)); require("fs").renameSync(process.env.OUT ? process.env.OUT + ".tmp.mp4" : "/tmp/v3d/image.tmp.mp4", process.env.OUT || "/tmp/v3d/image.mp4"); }
  await b.close(); })();
