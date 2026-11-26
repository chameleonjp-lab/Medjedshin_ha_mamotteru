// Usage: node record.js <scene>
const fs = require('fs');
const path = require('path');
const { open, step } = require('./common');

const ALL = ['eye_beam', 'mouth_flame', 'invisible_step', 'solar_barque', 'scarab_swarm', 'anubis_scales', 'pyramid_barrier', 'nile_flood'];

// In-page autopilot: moves Medjed toward the enemy that threatens the soul lane most.
const BOT = () => {
  const pv = window.__pv;
  window.__aim = window.__aim || { x: 0, z: 8 };
  window.__botTick = (opts = {}) => {
    const st = pv.state;
    if (st === 'BOSS_REWARD') { const b = document.querySelector('#br-grid button, #br-unlock-btn'); if (b) b.click(); return; }
    if (st === 'CHEST_ROULETTE') { const c = document.getElementById('chest-close-btn'); if (c && c.style.display !== 'none') c.click(); return; }
    if (st === 'LEVEL_UP' && !opts.holdLevelUp) { pv.selectSkillChoice(Math.floor(Math.random() * pv.choices.length)); return; }
    if (opts.god) { pv.player.hp = pv.player.maxHp || 200; pv.souls.casualtyCount = Math.min(pv.souls.casualtyCount, 6); }
    if (st !== 'PLAYING') return;
    const pp = pv.player.position;
    let tx = opts.homeX ?? 0, tz = opts.homeZ ?? 7, best = -1e9;
    if (pv.boss.active && opts.boss) { tx = pv.boss.x * 0.6; tz = pv.boss.z + 7; }
    else for (const e of pv.enemies.enemies) {
      if (!e.active) continue;
      const s = e.z * 1.0 - Math.hypot(e.x - pp.x, e.z - pp.z) * 0.35;
      if (s > best) { best = s; tx = e.x; tz = Math.min(10, e.z + 2.2); }
    }
    if (opts.wander) { const t = performance.now() / 1000; tx += Math.sin(t * 0.9) * opts.wander; }
    const a = window.__aim, k = 0.08;
    a.x += (tx - a.x) * k; a.z += (tz - a.z) * k;
    const v = new THREE.Vector3(a.x, 0, a.z).project(pv.sceneManager.camera);
    pv.input.mouse = { x: (v.x + 1) / 2 * innerWidth, y: (1 - v.y) / 2 * innerHeight };
  };
};

const setLevels = (p, lv, extra = {}, plv = 40) => p.evaluate(([ALL, lv, extra, plv]) => {
  const s = __pv.skills; ALL.forEach((id) => { s.levels[id] = lv; }); Object.assign(s.levels, extra);
  Object.keys(s.levels).forEach((k) => { if (!s.levels[k]) delete s.levels[k]; });
  __pv.lv = plv; __pv.renderSkillStrip(); __pv.updateExpHud();
}, [ALL, lv, extra, plv]);

const start = async (p) => { await p.evaluate(() => document.getElementById('btn-play').click()); await p.evaluate(BOT); };

const SCENES = {
  // 1. hook: late-game chaos, all skills awakened
  hook: { frames: 150, warm: 240, opts: { god: true }, async setup(p) {
    await start(p); await setLevels(p, 10); await p.evaluate(() => __pv.startWave(36));
  } },
  // 2. title screen
  title: { frames: 120, warm: 30, async setup(p) {
    await p.addStyleTag({ content: '#title-screen{opacity:0!important}' });
  } },
  // 3. early game: wave 1-2
  early: { frames: 180, warm: 150, opts: { god: true }, async setup(p) {
    await start(p); await setLevels(p, 0, { eye_beam: 3, mouth_flame: 2 }, 4); await p.evaluate(() => { __pv.startWave(2); });
  } },
  // 4. level up choice
  levelup: { frames: 120, warm: 200, opts: { god: true }, async setup(p) {
    await start(p); await setLevels(p, 0, { eye_beam: 3, mouth_flame: 2, solar_barque: 2 }, 8); await p.evaluate(() => { __pv.startWave(5); });
  }, async each(p, i) {
    if (i === 15) await p.evaluate(() => __pv.openLevelUpModal());
    if (i === 70) await p.evaluate(() => __pv.selectSkillChoice(1));
  }, holdLevelUp: (i) => i < 70 },
  // 5. awakening
  awaken: { frames: 150, warm: 240, opts: { god: true }, async setup(p) {
    await start(p); await setLevels(p, 9, {}, 52); await p.evaluate(() => { __pv.startWave(24); });
  }, async each(p, i) {
    if (i === 10) await p.evaluate(() => __pv.openLevelUpModal());
    if (i === 60) await p.evaluate(() => { const idx = __pv.choices.findIndex((c) => c.id === 'eye_beam'); __pv.selectSkillChoice(idx >= 0 ? idx : 0); });
  }, holdLevelUp: (i) => i < 60 },
  // 6. horde
  horde: { frames: 180, warm: 330, opts: { god: true, wander: 3 }, async setup(p) {
    await start(p); await setLevels(p, 7, { solar_barque: 10, nile_flood: 10 }, 66); await p.evaluate(() => __pv.startWave(39));
  } },
  // 7. bosses (intro + fight) — scene name boss_<type>
  boss_ammit: bossScene(10, 5, 24), boss_set: bossScene(20, 7, 41), boss_sphinx: bossScene(30, 9, 58),
  // 8. final boss defeat → victory result
  victory: { frames: 330, warm: 60, opts: { god: true, boss: true }, async setup(p) {
    await start(p); await setLevels(p, 10, {}, 80); await p.evaluate(() => __pv.startWave(40));
  }, async each(p, i) {
    if (i === 75) await p.evaluate(() => { const b = __pv.boss; b.apepCores.forEach((c) => { c.hp = Math.min(c.hp, 600); }); b.hp = Math.min(b.hp, 9000); });
  } },
};

function bossScene(wave, lv, plv) {
  return { frames: 150, warm: 6, opts: { god: true, boss: true }, async setup(p) {
    await start(p); await setLevels(p, lv, {}, plv); await p.evaluate((w) => __pv.startWave(w), wave);
  } };
}

(async () => {
  const name = process.argv[2];
  const sc = SCENES[name];
  const dir = path.join(__dirname, 'frames', name);
  fs.rmSync(dir, { recursive: true, force: true }); fs.mkdirSync(dir, { recursive: true });
  const { b, p } = await open();
  await sc.setup(p);
  const tick = (i) => p.evaluate(([o, hold]) => window.__botTick && window.__botTick({ ...o, holdLevelUp: hold }), [sc.opts || {}, sc.holdLevelUp ? sc.holdLevelUp(i) : false]);
  for (let i = 0; i < sc.warm; i++) { await tick(-1); await step(p); }
  const t0 = Date.now();
  for (let i = 0; i < sc.frames; i++) {
    if (sc.each) await sc.each(p, i);
    await tick(i);
    await step(p);
    await p.screenshot({ path: path.join(dir, `f${String(i).padStart(4, '0')}.jpg`), type: 'jpeg', quality: 92 });
    if (i % 30 === 0) console.log(name, i, ((Date.now() - t0) / (i + 1)).toFixed(0), 'ms/frame', JSON.stringify(await p.evaluate(() => ({ s: __pv.state, w: __pv.wave, n: __pv.enemies.getActiveCount() }))));
  }
  await b.close();
  console.log('done', name);
})();
