// Real-time recording of the game's own WebAudio output, driven by a timeline.
// Usage: node audio.js timeline.json out.webm
const fs = require('fs');
const { chromium } = require('playwright');
(async () => {
  const [tlPath, out] = process.argv.slice(2);
  const tl = JSON.parse(fs.readFileSync(tlPath, 'utf8'));
  const b = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const ctx = await b.newContext({ viewport: { width: 160, height: 200 } });
  await ctx.route((u) => !u.href.startsWith('http://localhost:8765'), (r) => r.abort());
  const p = await ctx.newPage();
  p.on('pageerror', (e) => console.log('err:', e.message));
  p.on('console', (m) => { if (!m.text().includes('GL')) console.log('console:', m.text()); });
  await p.goto('http://localhost:8765/index.html');
  await p.waitForFunction(() => window.__pv);
  const data = await p.evaluate(async (tl) => {
    const a = __pv.audio;
    a.unlock(); a.muted = false; a.setVolumes(0.55, 0.75);
    await a.ctx.resume();
    // Drive the BGM sequencer with an accurate clock (independent of render fps).
    const orig = a.updateBgm.bind(a); a.updateBgm = () => {};
    // Freeze the game's own simulation so it makes no extra sounds.
    const dest = a.ctx.createMediaStreamDestination();
    a.masterGain.connect(dest);
    const rec = new MediaRecorder(dest.stream, { mimeType: 'audio/webm;codecs=opus', audioBitsPerSecond: 192000 });
    const chunks = []; rec.ondataavailable = (e) => chunks.push(e.data);
    const done = new Promise((r) => { rec.onstop = r; });
    rec.start();
    await new Promise((r) => setTimeout(r, 50));
    const t0 = performance.now();
    let last = t0; a.bgmTimer = 0; a.bgmStep = 0;
    const timers = [];
    timers.push(setInterval(() => { const n = performance.now(); if (a.bgmOn) orig((n - last) / 1000); last = n; }, 5));
    a.bgmOn = true;
    const loops = {};
    for (const ev of tl.events) {
      setTimeout(() => {
        if (ev.mode) { a.setBgmMode(ev.mode); if (ev.resetStep) { a.bgmStep = 0; a.bgmTimer = 0; } }
        if (ev.bgm === false) a.bgmOn = false;
        if (ev.bgm === true) { a.bgmOn = true; a.bgmTimer = 0; }
        if (ev.se) a[ev.se](...(ev.args || []));
        if (ev.battle !== undefined) {
          clearInterval(loops.battle);
          if (ev.battle > 0) {
            const lvl = ev.battle;
            loops.battle = setInterval(() => {
              const r = Math.random();
              if (r < 0.35 * lvl) a.playBeam(lvl > 1.5 && Math.random() < 0.3);
              if (Math.random() < 0.3 * lvl) a.playBoom();
              if (Math.random() < 0.45 * lvl) a.playGem();
              if (lvl > 1.2 && Math.random() < 0.12) a.playWave();
            }, 110);
          }
        }
      }, ev.t * 1000);
    }
    await new Promise((r) => setTimeout(r, tl.duration * 1000));
    timers.forEach(clearInterval); clearInterval(loops.battle);
    rec.stop(); await done;
    const blob = new Blob(chunks, { type: 'audio/webm' });
    const buf = new Uint8Array(await blob.arrayBuffer());
    let s = ''; for (let i = 0; i < buf.length; i += 0x8000) s += String.fromCharCode.apply(null, buf.subarray(i, i + 0x8000));
    return { b64: btoa(s), lag: performance.now() - t0 };
  }, tl);
  fs.writeFileSync(out, Buffer.from(data.b64, 'base64'));
  console.log('saved', out, 'elapsed', data.lag.toFixed(0));
  await b.close();
})();
