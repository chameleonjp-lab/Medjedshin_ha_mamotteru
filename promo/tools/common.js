const { chromium } = require('playwright');
exports.open = async (w = 540, h = 675) => {
  const b = await chromium.launch({ args: ['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist'] });
  const ctx = await b.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 2 });
  await ctx.route(u => !u.href.startsWith('http://localhost:8765'), r => r.abort());
  await ctx.addInitScript(() => {
    // the recorder drives exactly one game frame per video frame
    window.__manual = true; window.__rafq = [];
    window.__flush = () => { const q = window.__rafq; window.__rafq = []; const t = performance.now(); q.forEach((cb) => cb(t)); };
    try { localStorage.setItem('medjed_audio_v1', JSON.stringify({ muted: true, bgm: 0, se: 0 })); } catch {}
  });
  const p = await ctx.newPage();
  p.on('pageerror', e => console.log('err:', e.message));
  await p.clock.install({ time: new Date('2026-01-01T00:00:00Z') });
  await p.clock.pauseAt(new Date('2026-01-01T00:00:01Z'));
  await p.goto('http://localhost:8765/index.html');
  await exports.step(p, 15);
  return { b, p };
};
exports.step = async (p, n = 1) => { for (let i = 0; i < n; i++) { await p.clock.runFor(1000 / 30); await p.evaluate(() => window.__flush()); } };
