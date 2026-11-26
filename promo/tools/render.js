// Composite recorded game frames + captions into 1080x1920 frames.
// Usage: node render.js pv.json [fromSec toSec]
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');
(async () => {
  const cfg = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
  const FPS = 30;
  const timeline = []; let t = 0;
  for (const s of cfg.segments) { timeline.push({ ...s, t0: t, t1: t + s.dur }); t += s.dur; }
  const total = t;
  const from = Number(process.argv[3] || 0), to = Number(process.argv[4] || total);
  const out = path.join(__dirname, 'out'); fs.mkdirSync(out, { recursive: true });
  const b = await chromium.launch();
  const p = await (await b.newContext({ viewport: { width: 1080, height: 1920 }, deviceScaleFactor: 1 })).newPage();
  await p.goto('http://localhost:8766/comp/index.html');
  await p.evaluate(() => document.fonts.ready);
  await p.evaluate((c) => window.setup(c), cfg);
  const n0 = Math.round(from * FPS), n1 = Math.round(to * FPS);
  for (let n = n0; n < n1; n++) {
    const tt = n / FPS;
    const seg = timeline.find((s) => tt >= s.t0 && tt < s.t1) || timeline[timeline.length - 1];
    const dir = path.join(__dirname, 'frames', seg.clip);
    const count = fs.readdirSync(dir).length;
    const fi = Math.min(count - 1, Math.floor(seg.from + (tt - seg.t0) * FPS * (seg.speed || 1)));
    const src = `/frames/${seg.clip}/f${String(fi).padStart(4, '0')}.jpg`;
    const shake = (cfg.shakes || []).reduce((m, s) => (tt >= s.t && tt < s.t + s.d ? Math.max(m, s.a * (1 - (tt - s.t) / s.d)) : m), 0);
    const u = (tt - seg.t0) / seg.dur;
    const zoom = seg.zoom ? seg.zoom[0] + (seg.zoom[1] - seg.zoom[0]) * (u * u * (3 - 2 * u)) : 1;
    await p.evaluate(([tt, src, shake, full, zoom, origin]) => window.seek(tt, src, shake, full, zoom, origin), [tt, src, shake, !!seg.full, zoom, seg.origin || '50% 50%']);
    await p.screenshot({ path: path.join(out, `o${String(n).padStart(4, '0')}.jpg`), type: 'jpeg', quality: 93 });
    if (n % 60 === 0) console.log('t', tt.toFixed(1), '/', total.toFixed(1));
  }
  await b.close();
  console.log('total', total);
})();
