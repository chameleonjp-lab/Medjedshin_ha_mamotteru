/**
 * メジェド神は守ってる — PC専用 超高精細PBR 3Dモデル＆全8スキルLv別演出ライブラリ（v2.0）
 * Three.js r128+ 対応 / 外部テクスチャ不要（512px プロシージャルPBR Diffuse+Bump+Roughness生成）
 *
 * 収録内容（全24エントリ）:
 *  - キャラクター＆敵＆ボス＆太陽の舟（16種）: 多層パーツ造形・多関節プロシージャルモーション
 *  - メジェド全8スキル演出（8種 × Lv1 / Lv5 / Lv10神格覚醒 の3段階ビジュアル切替）
 */
(function (global) {
  'use strict';

  // ============================================================
  // 512px 高精細プロシージャルPBRテクスチャ生成エンジン
  // ============================================================
  const TexCache = {};
  function mkTex(key, size, fn, rx = 1, ry = 1) {
    if (TexCache[key]) return TexCache[key];
    const c = document.createElement('canvas');
    c.width = size; c.height = size;
    const ctx = c.getContext('2d');
    fn(ctx, size);
    const t = new THREE.CanvasTexture(c);
    t.wrapS = THREE.RepeatWrapping; t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(rx, ry);
    t.anisotropy = 8;
    t.needsUpdate = true;
    TexCache[key] = t;
    return t;
  }

  function getLinenPBR() {
    const map = mkTex('v2_linen_m', 512, (ctx, s) => {
      ctx.fillStyle = '#f7f4ec'; ctx.fillRect(0, 0, s, s);
      for (let y = 0; y < s; y += 4) {
        ctx.fillStyle = y % 8 === 0 ? 'rgba(175,162,138,0.16)' : 'rgba(255,255,255,0.22)';
        ctx.fillRect(0, y, s, 2);
      }
      for (let x = 0; x < s; x += 4) {
        ctx.fillStyle = x % 8 === 0 ? 'rgba(165,152,128,0.14)' : 'rgba(255,255,255,0.14)';
        ctx.fillRect(x, 0, 2, s);
      }
    }, 3, 3);
    const bump = mkTex('v2_linen_b', 512, (ctx, s) => {
      ctx.fillStyle = '#808080'; ctx.fillRect(0, 0, s, s);
      for (let y = 0; y < s; y += 3) {
        ctx.fillStyle = y % 6 === 0 ? '#a8a8a8' : '#646464';
        ctx.fillRect(0, y, s, 1);
      }
      for (let x = 0; x < s; x += 3) {
        ctx.fillStyle = x % 6 === 0 ? '#9c9c9c' : '#6c6c6c';
        ctx.fillRect(x, 0, 1, s);
      }
    }, 4, 4);
    return { map, bump };
  }

  function getBandagePBR() {
    const map = mkTex('v2_band_m', 512, (ctx, s) => {
      ctx.fillStyle = '#d9cfb8'; ctx.fillRect(0, 0, s, s);
      for (let y = 0; y < s; y += 26) {
        const g = ctx.createLinearGradient(0, y, 0, y + 26);
        g.addColorStop(0, '#786246');
        g.addColorStop(0.12, '#efe7d4');
        g.addColorStop(0.7, '#d8ccb2');
        g.addColorStop(1, '#9c8566');
        ctx.fillStyle = g;
        ctx.fillRect(0, y, s, 26);
      }
      for (let i = 0; i < 1800; i++) {
        ctx.fillStyle = i % 2 ? 'rgba(85,68,45,0.12)' : 'rgba(255,248,232,0.12)';
        ctx.fillRect((i * 67) % s, (i * 113) % s, 5, 2);
      }
    }, 2, 3);
    const bump = mkTex('v2_band_b', 512, (ctx, s) => {
      ctx.fillStyle = '#888888'; ctx.fillRect(0, 0, s, s);
      for (let y = 0; y < s; y += 26) {
        ctx.fillStyle = '#242424'; ctx.fillRect(0, y, s, 4);
        ctx.fillStyle = '#e8e8e8'; ctx.fillRect(0, y + 4, s, 5);
      }
    }, 2, 3);
    return { map, bump };
  }

  function getStonePBR() {
    const map = mkTex('v2_stone_m', 512, (ctx, s) => {
      ctx.fillStyle = '#c4a678'; ctx.fillRect(0, 0, s, s);
      for (let i = 0; i < 6500; i++) {
        const x = (i * 53) % s, y = (i * 97) % s;
        ctx.fillStyle = i % 3 === 0 ? 'rgba(75,55,32,0.18)' : 'rgba(248,232,198,0.16)';
        ctx.fillRect(x, y, 3, 3);
      }
      // 古代エジプト壁画風の石彫ラインとヒエログリフ風帯
      ctx.strokeStyle = 'rgba(65,48,26,0.55)'; ctx.lineWidth = 3;
      for (let y = 48; y < s; y += 96) {
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(s, y); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(0, y + 26); ctx.lineTo(s, y + 26); ctx.stroke();
        for (let x = 16; x < s; x += 36) {
          ctx.strokeRect(x, y + 6, 18, 14);
        }
      }
    }, 2, 2);
    const bump = mkTex('v2_stone_b', 512, (ctx, s) => {
      ctx.fillStyle = '#888888'; ctx.fillRect(0, 0, s, s);
      for (let i = 0; i < 5000; i++) {
        const v = i % 2 === 0 ? 48 : 210;
        ctx.fillStyle = `rgb(${v},${v},${v})`;
        ctx.fillRect((i * 47) % s, (i * 89) % s, 3, 3);
      }
      ctx.strokeStyle = '#181818'; ctx.lineWidth = 4;
      for (let y = 48; y < s; y += 96) {
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(s, y); ctx.stroke();
      }
    }, 2, 2);
    return { map, bump };
  }

  function getGoldFiligreePBR() {
    const map = mkTex('v2_gold_m', 256, (ctx, s) => {
      const g = ctx.createLinearGradient(0, 0, s, s);
      g.addColorStop(0, '#f7d559'); g.addColorStop(0.5, '#d9a422'); g.addColorStop(1, '#ffe484');
      ctx.fillStyle = g; ctx.fillRect(0, 0, s, s);
      ctx.strokeStyle = 'rgba(130,85,10,0.35)'; ctx.lineWidth = 2;
      for (let y = 0; y < s; y += 16) {
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(s, y); ctx.stroke();
      }
    }, 2, 2);
    const bump = mkTex('v2_gold_b', 256, (ctx, s) => {
      ctx.fillStyle = '#808080'; ctx.fillRect(0, 0, s, s);
      ctx.strokeStyle = '#d8d8d8'; ctx.lineWidth = 3;
      for (let y = 0; y < s; y += 16) {
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(s, y); ctx.stroke();
      }
    }, 2, 2);
    return { map, bump };
  }

  function getNemesPBR() {
    const map = mkTex('v2_nemes_m', 512, (ctx, s) => {
      for (let y = 0; y < s; y += 24) {
        const isGold = (y / 24) % 2 === 0;
        const g = ctx.createLinearGradient(0, y, 0, y + 24);
        if (isGold) { g.addColorStop(0, '#ffe27a'); g.addColorStop(0.5, '#e2b22c'); g.addColorStop(1, '#a87c12'); }
        else { g.addColorStop(0, '#274fa8'); g.addColorStop(0.5, '#152d6e'); g.addColorStop(1, '#0b1942'); }
        ctx.fillStyle = g; ctx.fillRect(0, y, s, 24);
      }
    }, 1, 2);
    const bump = mkTex('v2_nemes_b', 512, (ctx, s) => {
      for (let y = 0; y < s; y += 24) {
        ctx.fillStyle = (y / 24) % 2 === 0 ? '#d0d0d0' : '#585858';
        ctx.fillRect(0, y, s, 24);
      }
    }, 1, 2);
    return { map, bump };
  }

  function getScalePBR(baseHex, edgeHex, key) {
    const map = mkTex(`v2_sc_m_${key}`, 512, (ctx, s) => {
      ctx.fillStyle = baseHex; ctx.fillRect(0, 0, s, s);
      for (let r = 0; r < 24; r++) {
        for (let c = 0; c < 24; c++) {
          const cx = c * 22 + (r % 2) * 11, cy = r * 22;
          ctx.beginPath(); ctx.arc(cx, cy, 11, 0, Math.PI);
          ctx.fillStyle = baseHex; ctx.fill();
          ctx.strokeStyle = edgeHex; ctx.lineWidth = 2; ctx.stroke();
        }
      }
    }, 2, 2);
    const bump = mkTex(`v2_sc_b_${key}`, 512, (ctx, s) => {
      ctx.fillStyle = '#505050'; ctx.fillRect(0, 0, s, s);
      for (let r = 0; r < 24; r++) {
        for (let c = 0; c < 24; c++) {
          const cx = c * 22 + (r % 2) * 11, cy = r * 22;
          ctx.beginPath(); ctx.arc(cx, cy, 10, 0, Math.PI);
          ctx.fillStyle = '#d4d4d4'; ctx.fill();
          ctx.strokeStyle = '#202020'; ctx.lineWidth = 2; ctx.stroke();
        }
      }
    }, 2, 2);
    return { map, bump };
  }

  function enableShadows(grp, receive = true) {
    grp.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = receive; } });
  }

  // 共通マテリアル生成ヘルパー
  function matGold(emissiveInt = 0.2) {
    const g = getGoldFiligreePBR();
    return new THREE.MeshStandardMaterial({ color: 0xf4c842, map: g.map, bumpMap: g.bump, bumpScale: 0.018, metalness: 0.88, roughness: 0.22, emissive: 0x4a2f00, emissiveIntensity: emissiveInt });
  }
  function matLapis() {
    return new THREE.MeshStandardMaterial({ color: 0x16347d, metalness: 0.38, roughness: 0.28, emissive: 0x061233, emissiveIntensity: 0.25 });
  }
  function matObsidian() {
    return new THREE.MeshStandardMaterial({ color: 0x181422, metalness: 0.65, roughness: 0.26 });
  }
  function matBronze() {
    return new THREE.MeshStandardMaterial({ color: 0x7c4e2a, metalness: 0.45, roughness: 0.42 });
  }
  function matBandage(tint = 0xe8e0cd) {
    const b = getBandagePBR();
    return new THREE.MeshStandardMaterial({ color: tint, map: b.map, bumpMap: b.bump, bumpScale: 0.04, roughness: 0.88 });
  }

  // 多関節手足ビルダー（上腕/前腕・太腿/脛＋関節球＋装飾カフス）
  function buildArticulatedLimb(upperMat, lowerMat, cuffMat, len1, len2, r1, r2) {
    const shoulder = new THREE.Group();
    const joint1 = new THREE.Mesh(new THREE.SphereGeometry(r1 * 1.12, 12, 10), upperMat);
    shoulder.add(joint1);
    const upper = new THREE.Mesh(new THREE.CylinderGeometry(r1, r2, len1, 12), upperMat);
    upper.position.y = -len1 * 0.5; shoulder.add(upper);

    const elbow = new THREE.Group(); elbow.position.y = -len1; shoulder.add(elbow);
    elbow.add(new THREE.Mesh(new THREE.SphereGeometry(r2 * 1.08, 12, 10), lowerMat));
    const lower = new THREE.Mesh(new THREE.CylinderGeometry(r2, r2 * 0.82, len2, 12), lowerMat);
    lower.position.y = -len2 * 0.5; elbow.add(lower);

    if (cuffMat) {
      const cuff = new THREE.Mesh(new THREE.CylinderGeometry(r2 * 1.05, r2 * 0.96, len2 * 0.34, 12), cuffMat);
      cuff.position.y = -len2 * 0.72; elbow.add(cuff);
    }
    const end = new THREE.Mesh(new THREE.SphereGeometry(r2 * 0.92, 10, 8), lowerMat);
    end.position.y = -len2; elbow.add(end);
    return { root: shoulder, elbow };
  }

  // ============================================================
  // 1. プレイヤー：メジェド神（高精細リネン一枚布＋裾なびき）
  // ============================================================
  function createPCMedjed() {
    const root = new THREE.Group();
    const pivot = new THREE.Group(); root.add(pivot);
    const linen = getLinenPBR();
    const uniforms = { uTime: { value: 0 }, uMoveSpeed: { value: 0 }, uFlash: { value: 0 } };

    const pts = [];
    for (let i = 0; i <= 40; i++) {
      const u = i / 40, y = 0.26 + 1.46 * u;
      const r = u < 0.72 ? 0.56 - 0.19 * (u / 0.72) : 0.37 * Math.sqrt(Math.max(0, 1 - ((u - 0.72) / 0.28) ** 2));
      pts.push(new THREE.Vector2(Math.max(0.001, r), y));
    }
    const cloakGeo = new THREE.LatheGeometry(pts, 64);
    const pos = cloakGeo.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i);
      const u = Math.max(0, Math.min(1, (y - 0.26) / 1.46));
      const fw = Math.pow(1 - u, 1.8), ang = Math.atan2(z, x), rad = Math.hypot(x, z);
      if (rad > 0.01) {
        const pleat = Math.sin(ang * 10) * 0.018 * fw + Math.cos(ang * 5) * 0.01 * fw;
        pos.setX(i, x + (x / rad) * pleat); pos.setZ(i, z + (z / rad) * pleat);
      }
    }
    cloakGeo.computeVertexNormals();

    const cloakMat = new THREE.MeshStandardMaterial({
      color: 0xf8f5ee, map: linen.map, bumpMap: linen.bump, bumpScale: 0.015,
      roughness: 0.84, metalness: 0.02, side: THREE.DoubleSide,
    });
    cloakMat.onBeforeCompile = (sh) => {
      sh.uniforms.uTime = uniforms.uTime; sh.uniforms.uMoveSpeed = uniforms.uMoveSpeed; sh.uniforms.uFlash = uniforms.uFlash;
      sh.vertexShader = sh.vertexShader
        .replace('#include <common>', '#include <common>\nuniform float uTime;\nuniform float uMoveSpeed;')
        .replace('#include <begin_vertex>', `#include <begin_vertex>
          float nY = clamp((transformed.y - 0.26) / 1.46, 0.0, 1.0);
          float w = pow(1.0 - nY, 2.0);
          float amp = mix(0.032, 0.088, uMoveSpeed); float freq = mix(3.2, 9.0, uMoveSpeed);
          transformed.x += sin(uTime * freq + transformed.x * 4.5 + transformed.z * 2.5) * amp * w;
          transformed.z += cos(uTime * freq * 0.85 + transformed.z * 4.0) * amp * 0.6 * w - 0.24 * uMoveSpeed * w;`);
      sh.fragmentShader = sh.fragmentShader
        .replace('#include <common>', '#include <common>\nuniform float uFlash;')
        .replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\ntotalEmissiveRadiance += vec3(1.0) * uFlash * 2.0;');
    };
    const cloak = new THREE.Mesh(cloakGeo, cloakMat); cloak.castShadow = true; cloak.receiveShadow = false;
    pivot.add(cloak);

    const eyeGroup = new THREE.Group(); eyeGroup.position.set(0, 1.25, 0.35);
    const kohl = new THREE.MeshStandardMaterial({ color: 0x0d0d10, roughness: 0.35, metalness: 0.15 });
    const scleraM = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.18 });
    const pupilMat = new THREE.MeshStandardMaterial({ color: 0x111114, roughness: 0.1, emissive: 0xffd700, emissiveIntensity: 0 });
    const pupils = [];
    for (const s of [-1, 1]) {
      const eg = new THREE.Group(); eg.position.set(s * 0.145, 0, 0); eg.rotation.y = s * 0.24;
      const rim = new THREE.SphereGeometry(0.118, 20, 16); rim.scale(1.26, 0.72, 0.35); eg.add(new THREE.Mesh(rim, kohl));
      const tail = new THREE.Mesh(new THREE.BoxGeometry(0.095, 0.022, 0.02), kohl); tail.position.set(s * 0.145, 0.01, -0.01); tail.rotation.z = s * -0.14; eg.add(tail);
      const bCurve = new THREE.CatmullRomCurve3([new THREE.Vector3(-0.09, 0.095, 0.015), new THREE.Vector3(0, 0.115, 0.02), new THREE.Vector3(0.09, 0.092, 0.012)]);
      eg.add(new THREE.Mesh(new THREE.TubeGeometry(bCurve, 12, 0.014, 8, false), kohl));
      const sc = new THREE.SphereGeometry(0.096, 20, 16); sc.scale(1.18, 0.62, 0.38); const sm = new THREE.Mesh(sc, scleraM); sm.position.z = 0.016; eg.add(sm);
      const pG = new THREE.SphereGeometry(0.058, 16, 14); pG.scale(1, 1, 0.65); const pm = new THREE.Mesh(pG, pupilMat); pm.position.z = 0.048; eg.add(pm);
      pupils.push(pm); eyeGroup.add(eg);
    }
    pivot.add(eyeGroup);

    const skinM = new THREE.MeshStandardMaterial({ color: 0xb9683a, roughness: 0.62 });
    const gM = matGold();
    const mkFoot = (ox) => {
      const f = new THREE.Group(); f.position.set(ox, 0.38, 0);
      const calf = new THREE.Mesh(new THREE.CylinderGeometry(0.058, 0.044, 0.32, 14), skinM); calf.position.y = -0.16; f.add(calf);
      const ank = new THREE.Mesh(new THREE.TorusGeometry(0.048, 0.012, 8, 16), gM); ank.rotation.x = Math.PI / 2; ank.position.y = -0.27; f.add(ank);
      const ft = new THREE.Mesh(new THREE.SphereGeometry(0.068, 14, 10), skinM); ft.scale.set(0.85, 0.55, 1.85); ft.position.set(0, -0.34, 0.07); f.add(ft);
      return f;
    };
    const footL = mkFoot(-0.18), footR = mkFoot(0.18); root.add(footL, footR);

    let t = 0;
    return {
      group: root, pivot, eyeGroup, pupils, pupilMat, cloakMat, uniforms, footL, footR,
      label: '01. メジェド神（プレイヤー）', category: 'プレイヤー',
      update(dt, mode) {
        t += dt; uniforms.uTime.value = t;
        const mv = mode === 'move';
        uniforms.uMoveSpeed.value += ((mv ? 1 : 0) - uniforms.uMoveSpeed.value) * Math.min(1, dt * 8);
        uniforms.uFlash.value = mode === 'hit' ? Math.abs(Math.sin(t * 24)) : 0;
        pivot.position.y = Math.sin(t * Math.PI) * 0.05;
        pivot.rotation.x = mv ? 0.21 : 0;
        if (mv) { const sw = Math.sin(t * 10) * 0.6; footL.rotation.x = sw; footR.rotation.x = -sw; }
        else { footL.rotation.x *= 0.85; footR.rotation.x *= 0.85; }
        const atk = mode === 'attack' ? (Math.sin(t * 8) * 0.5 + 0.5) : 0;
        eyeGroup.scale.set(1, 1 + 0.3 * atk, 1);
        pupils.forEach((p) => p.scale.setScalar(1 + 0.4 * atk));
        pupilMat.emissiveIntensity = 3.2 * atk;
      },
    };
  }

  // ============================================================
  // 2. 一般の死者（多層巻き包帯＋垂れ布＋多関節歩行＋霊魂の光）
  // ============================================================
  function createPCSoulGeneral() {
    const root = new THREE.Group();
    const bdM = matBandage(0xe8e0cd), darkBd = matBandage(0xb8ab90), gM = matGold(0.1);
    const body = new THREE.Group(); root.add(body);

    // 胸郭・腹部・骨盤の解剖学的3段構成＋斜め巻き包帯
    const pelvis = new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.19, 0.22, 16), darkBd); pelvis.position.y = 0.62; body.add(pelvis);
    const waist = new THREE.Mesh(new THREE.CylinderGeometry(0.19, 0.16, 0.26, 16), bdM); waist.position.y = 0.84; body.add(waist);
    const chest = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.19, 0.32, 16), bdM); chest.position.y = 1.08; body.add(chest);
    for (let i = 0; i < 4; i++) {
      const wrap = new THREE.Mesh(new THREE.TorusGeometry(0.21 + (i % 2) * 0.02, 0.028, 8, 22), i % 2 ? darkBd : bdM);
      wrap.rotation.set(Math.PI / 2 + (i % 2 ? 0.22 : -0.22), 0.15, 0); wrap.position.y = 0.72 + i * 0.13; body.add(wrap);
    }
    // 頭蓋＋顎＋包帯巻き頭巾＋光る霊魂の瞳
    const head = new THREE.Group(); head.position.set(0, 1.42, 0.02); body.add(head);
    const cranium = new THREE.Mesh(new THREE.SphereGeometry(0.18, 20, 16), bdM); cranium.scale.set(0.92, 1.05, 1.02); head.add(cranium);
    const jaw = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.12, 0.16), darkBd); jaw.position.set(0, -0.11, 0.04); head.add(jaw);
    const headWrap = new THREE.Mesh(new THREE.TorusGeometry(0.17, 0.032, 8, 20), bdM); headWrap.rotation.set(1.25, 0.2, 0); headWrap.position.y = 0.04; head.add(headWrap);
    const slit = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.055, 0.08), new THREE.MeshStandardMaterial({ color: 0x120f0c, roughness: 0.95 })); slit.position.set(0, 0.01, 0.14); head.add(slit);
    for (const s of [-1, 1]) {
      const eye = new THREE.Mesh(new THREE.SphereGeometry(0.022, 10, 8), new THREE.MeshBasicMaterial({ color: 0x7ef2ff }));
      eye.position.set(s * 0.055, 0.01, 0.185); head.add(eye);
    }
    // 垂れ下がる包帯リボン3本
    const ribbons = [];
    for (let i = 0; i < 3; i++) {
      const r = new THREE.Mesh(new THREE.BoxGeometry(0.055, 0.44, 0.015), darkBd);
      r.position.set((i - 1) * 0.12, 0.62, -0.19); body.add(r); ribbons.push(r);
    }
    // 多関節腕＆脚
    const armL = buildArticulatedLimb(bdM, darkBd, gM, 0.28, 0.26, 0.058, 0.048); armL.root.position.set(-0.27, 1.18, 0);
    const armR = buildArticulatedLimb(bdM, darkBd, gM, 0.28, 0.26, 0.058, 0.048); armR.root.position.set(0.27, 1.18, 0);
    armL.root.rotation.x = -1.1; armL.elbow.rotation.x = -0.35; armR.root.rotation.x = -1.1; armR.elbow.rotation.x = -0.35;
    body.add(armL.root, armR.root);
    const legL = buildArticulatedLimb(darkBd, bdM, null, 0.29, 0.28, 0.068, 0.055); legL.root.position.set(-0.1, 0.56, 0);
    const legR = buildArticulatedLimb(darkBd, bdM, null, 0.29, 0.28, 0.068, 0.055); legR.root.position.set(0.1, 0.56, 0);
    root.add(legL.root, legR.root);
    enableShadows(root);

    let t = 0;
    return {
      group: root, label: '02. 一般の死者（高精細包帯）', category: '死者',
      update(dt, mode, time) {
        t = time ?? t + dt;
        const spd = mode === 'move' ? 4.4 : 1.5, amp = mode === 'move' ? 0.42 : 0.05;
        const s = Math.sin(t * spd);
        legL.root.rotation.x = s * amp; legL.elbow.rotation.x = Math.max(0, -s * amp * 0.9);
        legR.root.rotation.x = -s * amp; legR.elbow.rotation.x = Math.max(0, s * amp * 0.9);
        body.position.y = Math.abs(s) * (mode === 'move' ? 0.045 : 0.01);
        body.rotation.x = mode === 'hit' ? -0.32 : 0.06;
        ribbons.forEach((rb, idx) => { rb.rotation.x = 0.18 + Math.sin(t * 4.5 + idx) * 0.22; });
      },
    };
  }

  // ============================================================
  // 3. 神官の死者（豪華ウセク宝飾襟＋双蛇アンク杖＋多重魔法陣）
  // ============================================================
  function createPCSoulPriest() {
    const base = createPCSoulGeneral();
    const root = base.group;
    const gM = matGold(0.3), lapM = matLapis(), turqM = new THREE.MeshStandardMaterial({ color: 0x16c2c2, metalness: 0.5, roughness: 0.25 });

    // 4段宝飾ウセク襟飾り
    for (let i = 0; i < 4; i++) {
      const m = i === 1 ? lapM : i === 2 ? turqM : gM;
      const ring = new THREE.Mesh(new THREE.TorusGeometry(0.22 + i * 0.036, 0.024, 10, 28), m);
      ring.rotation.x = Math.PI / 2; ring.position.y = 1.24 - i * 0.03; root.add(ring);
    }
    // 儀式用双蛇アンク杖
    const staff = new THREE.Group(); staff.position.set(0.36, 0.95, 0.26);
    staff.add(new THREE.Mesh(new THREE.CylinderGeometry(0.028, 0.022, 1.72, 12), gM));
    const cross = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.045, 0.045), gM); cross.position.y = 0.82; staff.add(cross);
    const loop = new THREE.Mesh(new THREE.TorusGeometry(0.125, 0.028, 12, 24), gM); loop.scale.set(0.85, 1.22, 1); loop.position.y = 0.98; staff.add(loop);
    const crystal = new THREE.Mesh(new THREE.OctahedronGeometry(0.075, 0), new THREE.MeshBasicMaterial({ color: 0x00f6ff })); crystal.position.y = 0.98; staff.add(crystal);
    root.add(staff);

    // 2重回転シアンバフ魔法陣
    const r1 = new THREE.Mesh(new THREE.RingGeometry(0.76, 0.88, 36), new THREE.MeshBasicMaterial({ color: 0x00e5ff, transparent: true, opacity: 0.55, side: THREE.DoubleSide, blending: THREE.AdditiveBlending, depthWrite: false }));
    r1.rotation.x = -Math.PI / 2; r1.position.y = 0.04;
    const r2 = new THREE.Mesh(new THREE.RingGeometry(0.54, 0.62, 6), new THREE.MeshBasicMaterial({ color: 0xffd700, transparent: true, opacity: 0.55, side: THREE.DoubleSide, blending: THREE.AdditiveBlending, depthWrite: false }));
    r2.rotation.x = -Math.PI / 2; r2.position.y = 0.05;
    root.add(r1, r2);
    enableShadows(root);

    let t = 0;
    return {
      group: root, label: '03. 神官の死者（豪華宝飾＆アンク杖）', category: '死者',
      update(dt, mode, time) {
        t = time ?? t + dt; base.update(dt, mode, time);
        r1.rotation.z = t * 1.4; r2.rotation.z = -t * 2.1;
        crystal.rotation.y = t * 3.5;
        staff.rotation.x = Math.sin(t * 2.8) * 0.07;
      },
    };
  }

  // ============================================================
  // 4. ファラオの棺（浮彫スカラベ胸飾り＋ヘカ＆ネハハ＋ネメス頭巾）
  // ============================================================
  function createPCSoulCoffin() {
    const root = new THREE.Group();
    const cof = new THREE.Group(); root.add(cof);
    const gM = matGold(0.35), lapM = matLapis(), nm = getNemesPBR();
    const nemesM = new THREE.MeshStandardMaterial({ map: nm.map, bumpMap: nm.bump, bumpScale: 0.025, metalness: 0.55, roughness: 0.3 });

    // 多段造形された黄金の人型棺
    const baseFoot = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.24, 0.52), gM); baseFoot.position.y = 0.32; cof.add(baseFoot);
    const lower = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.26, 1.12, 12), gM); lower.scale.set(1.08, 1, 0.85); lower.position.y = 0.96; cof.add(lower);
    for (let i = 0; i < 3; i++) {
      const band = new THREE.Mesh(new THREE.TorusGeometry(0.36 - i * 0.03, 0.028, 8, 20), i === 1 ? gM : lapM);
      band.rotation.x = Math.PI / 2; band.position.y = 0.68 + i * 0.24; cof.add(band);
    }
    // 黄金のファラオマスク＋ネメス頭巾＋コブラ＋付け髭
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.28, 22, 18), gM); head.scale.set(0.92, 1.12, 0.96); head.position.set(0, 1.72, 0.06); cof.add(head);
    const nemesTop = new THREE.Mesh(new THREE.SphereGeometry(0.36, 20, 14), nemesM); nemesTop.scale.set(1.38, 1.05, 0.92); nemesTop.position.set(0, 1.76, -0.05); cof.add(nemesTop);
    for (const s of [-1, 1]) {
      const lappet = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.52, 0.14), nemesM); lappet.position.set(s * 0.34, 1.44, 0.08); lappet.rotation.z = s * 0.12; cof.add(lappet);
      const brow = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.024, 0.04), lapM); brow.position.set(s * 0.08, 1.78, 0.31); cof.add(brow);
    }
    const cobra = new THREE.Mesh(new THREE.ConeGeometry(0.055, 0.22, 8), gM); cobra.position.set(0, 2.02, 0.24); cof.add(cobra);
    const beard = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.038, 0.3, 10), lapM); beard.rotation.x = 0.22; beard.position.set(0, 1.42, 0.3); cof.add(beard);
    // 胸の翼付きスカラベ＆交差する王笏（ヘカ＆ネハハ）
    const scarab = new THREE.Mesh(new THREE.SphereGeometry(0.09, 12, 10), lapM); scarab.scale.set(1.2, 0.8, 0.5); scarab.position.set(0, 1.28, 0.36); cof.add(scarab);
    const hCurve = new THREE.CatmullRomCurve3([new THREE.Vector3(-0.22, 0.96, 0.38), new THREE.Vector3(0.14, 1.32, 0.39), new THREE.Vector3(0.24, 1.4, 0.39), new THREE.Vector3(0.14, 1.44, 0.39)]);
    cof.add(new THREE.Mesh(new THREE.TubeGeometry(hCurve, 16, 0.024, 8, false), gM));
    const flail = new THREE.Mesh(new THREE.CylinderGeometry(0.024, 0.024, 0.62, 8), lapM); flail.rotation.z = 0.72; flail.position.set(0, 1.16, 0.39); cof.add(flail);

    const ring1 = new THREE.Mesh(new THREE.RingGeometry(0.66, 0.88, 36), new THREE.MeshBasicMaterial({ color: 0xffd700, transparent: true, opacity: 0.65, side: THREE.DoubleSide, blending: THREE.AdditiveBlending, depthWrite: false }));
    ring1.rotation.x = -Math.PI / 2; ring1.position.y = 0.06; root.add(ring1);
    enableShadows(root);

    let t = 0;
    return {
      group: root, label: '04. ファラオの棺（黄金王棺）', category: '死者',
      update(dt, mode, time) {
        t = time ?? t + dt;
        cof.position.y = Math.sin(t * 2.5) * 0.16; cof.rotation.y = Math.sin(t * 1.1) * 0.08;
        ring1.rotation.z = -t * 1.6;
        cof.position.x = mode === 'hit' ? Math.sin(t * 45) * 0.06 : 0;
      },
    };
  }

  // ============================================================
  // 5. ジャッカル兵（筋骨造形・肩鎧・シェンディト腰布・曲線コペシュ）
  // ============================================================
  function createPCJackal() {
    const root = new THREE.Group();
    const skinM = matObsidian(), brM = matBronze(), gM = matGold(0.2), clothM = new THREE.MeshStandardMaterial({ color: 0xf4ecda, map: getLinenPBR().map, roughness: 0.8 });
    const body = new THREE.Group(); root.add(body);

    // 鍛え上げられた胸筋・腹部・黄金ベルト・シェンディト腰布
    const chest = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.22, 0.42, 16), brM); chest.scale.set(1.1, 1, 0.85); chest.position.y = 1.08; body.add(chest);
    const abs = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.19, 0.24, 14), brM); abs.position.y = 0.78; body.add(abs);
    const collar = new THREE.Mesh(new THREE.TorusGeometry(0.25, 0.048, 10, 22), gM); collar.rotation.x = Math.PI / 2; collar.position.y = 1.28; body.add(collar);
    const kilt = new THREE.Mesh(new THREE.CylinderGeometry(0.21, 0.3, 0.38, 16), clothM); kilt.position.y = 0.56; body.add(kilt);
    const apron = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.42, 0.04), gM); apron.position.set(0, 0.54, 0.25); body.add(apron);
    for (const s of [-1, 1]) {
      const pauldron = new THREE.Mesh(new THREE.SphereGeometry(0.13, 12, 10), gM); pauldron.scale.set(1.2, 0.75, 1.1); pauldron.position.set(s * 0.36, 1.24, 0); body.add(pauldron);
    }

    // 精悍なアヌビス系ジャッカル頭部
    const head = new THREE.Group(); head.position.set(0, 1.48, 0.05); body.add(head);
    head.add(new THREE.Mesh(new THREE.SphereGeometry(0.17, 18, 14), skinM));
    const snout = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.1, 0.34, 12), skinM); snout.rotation.x = Math.PI / 2; snout.position.set(0, -0.02, 0.22); head.add(snout);
    const jaw = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.05, 0.26), skinM); jaw.position.set(0, -0.09, 0.18); head.add(jaw);
    for (const s of [-1, 1]) {
      const ear = new THREE.Mesh(new THREE.ConeGeometry(0.06, 0.36, 10), skinM); ear.position.set(s * 0.09, 0.27, -0.02); ear.rotation.z = s * -0.1; head.add(ear);
      const earIn = new THREE.Mesh(new THREE.ConeGeometry(0.032, 0.24, 8), gM); earIn.position.set(s * 0.09, 0.25, 0.02); earIn.rotation.z = s * -0.1; head.add(earIn);
      const eye = new THREE.Mesh(new THREE.SphereGeometry(0.026, 8, 8), new THREE.MeshBasicMaterial({ color: 0xff5500 })); eye.position.set(s * 0.072, 0.03, 0.145); head.add(eye);
    }

    const armL = buildArticulatedLimb(skinM, skinM, gM, 0.28, 0.26, 0.065, 0.052); armL.root.position.set(-0.36, 1.2, 0);
    const armR = buildArticulatedLimb(skinM, skinM, gM, 0.28, 0.26, 0.065, 0.052); armR.root.position.set(0.36, 1.2, 0);
    body.add(armL.root, armR.root);
    const legL = buildArticulatedLimb(skinM, skinM, gM, 0.3, 0.3, 0.08, 0.06); legL.root.position.set(-0.13, 0.56, 0);
    const legR = buildArticulatedLimb(skinM, skinM, gM, 0.3, 0.3, 0.08, 0.06); legR.root.position.set(0.13, 0.56, 0);
    root.add(legL.root, legR.root);

    // 曲線コペシュ（柄頭＋鍔＋湾曲ブレード）
    const kCurve = new THREE.CatmullRomCurve3([new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, 0, 0.28), new THREE.Vector3(0, 0.15, 0.56), new THREE.Vector3(0, 0.02, 0.82)]);
    const kopesh = new THREE.Mesh(new THREE.TubeGeometry(kCurve, 20, 0.036, 8, false), gM);
    kopesh.scale.set(0.35, 1.45, 1); kopesh.position.set(0, -0.26, 0.04);
    armR.elbow.add(kopesh);
    enableShadows(root);

    let t = 0;
    return {
      group: root, label: '05. ジャッカル兵（多関節＆コペシュ）', category: '雑魚敵',
      update(dt, mode, time) {
        t = time ?? t + dt;
        const mv = mode === 'move', s = Math.sin(t * (mv ? 8.5 : 2)), amp = mv ? 0.68 : 0.06;
        legL.root.rotation.x = s * amp; legL.elbow.rotation.x = Math.max(0, -s * amp * 0.8);
        legR.root.rotation.x = -s * amp; legR.elbow.rotation.x = Math.max(0, s * amp * 0.8);
        armL.root.rotation.x = -s * amp; armL.elbow.rotation.x = -0.35;
        if (mode === 'attack') {
          const p = (t * 1.6) % 1;
          armR.root.rotation.x = p < 0.35 ? THREE.MathUtils.lerp(0, -2.2, p / 0.35) : p < 0.58 ? THREE.MathUtils.lerp(-2.2, 1.15, (p - 0.35) / 0.23) : THREE.MathUtils.lerp(1.15, 0, (p - 0.58) / 0.42);
          armR.elbow.rotation.x = -0.3;
        } else { armR.root.rotation.x = s * amp; armR.elbow.rotation.x = -0.35; }
        body.rotation.x = mv ? 0.18 : 0.04;
      },
    };
  }

  // ============================================================
  // 6. ミイラ歩兵（重装古包帯＋肋骨巻き＋揺れるボロ布＋叩きつけ）
  // ============================================================
  function createPCMummy() {
    const root = new THREE.Group();
    const bdM = matBandage(0xcabfa6), darkBd = matBandage(0x8e7e64);
    const body = new THREE.Group(); root.add(body);
    const chest = new THREE.Mesh(new THREE.CylinderGeometry(0.38, 0.3, 0.56, 16), bdM); chest.scale.set(1.15, 1, 0.9); chest.position.y = 1.1; body.add(chest);
    const belly = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.32, 0.36, 16), darkBd); belly.position.y = 0.72; body.add(belly);
    for (let i = 0; i < 4; i++) {
      const rib = new THREE.Mesh(new THREE.TorusGeometry(0.34, 0.045, 8, 20), i % 2 ? bdM : darkBd);
      rib.rotation.set(Math.PI / 2 + 0.18, 0, 0); rib.position.y = 0.78 + i * 0.16; body.add(rib);
    }
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.24, 18, 14), bdM); head.position.set(0, 1.56, 0.05); body.add(head);
    for (const s of [-1, 1]) {
      const eye = new THREE.Mesh(new THREE.SphereGeometry(0.036, 10, 8), new THREE.MeshBasicMaterial({ color: 0xff1e1e })); eye.position.set(s * 0.08, 1.58, 0.22); body.add(eye);
    }
    const armL = buildArticulatedLimb(bdM, darkBd, null, 0.34, 0.34, 0.09, 0.075); armL.root.position.set(-0.44, 1.26, 0);
    const armR = buildArticulatedLimb(bdM, darkBd, null, 0.34, 0.34, 0.09, 0.075); armR.root.position.set(0.44, 1.26, 0);
    body.add(armL.root, armR.root);
    const legL = buildArticulatedLimb(darkBd, bdM, null, 0.32, 0.3, 0.11, 0.085); legL.root.position.set(-0.17, 0.58, 0);
    const legR = buildArticulatedLimb(darkBd, bdM, null, 0.32, 0.3, 0.11, 0.085); legR.root.position.set(0.17, 0.58, 0);
    root.add(legL.root, legR.root);
    const rags = [];
    for (let i = 0; i < 4; i++) {
      const rg = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.58, 0.02), i % 2 ? bdM : darkBd);
      rg.position.set((i - 1.5) * 0.16, 0.65, -0.3); body.add(rg); rags.push(rg);
    }
    enableShadows(root);

    let t = 0;
    return {
      group: root, label: '06. ミイラ歩兵（重装多関節タンク）', category: '雑魚敵',
      update(dt, mode, time) {
        t = time ?? t + dt;
        const spd = mode === 'move' ? 3.2 : 1.2, s = Math.sin(t * spd);
        body.rotation.z = s * (mode === 'move' ? 0.14 : 0.03);
        legL.root.rotation.x = s * 0.42; legR.root.rotation.x = -s * 0.42;
        if (mode === 'attack') {
          const p = (t * 1.4) % 1, a = p < 0.5 ? THREE.MathUtils.lerp(-1.2, -2.6, p / 0.5) : THREE.MathUtils.lerp(-2.6, -0.25, (p - 0.5) / 0.5);
          armL.root.rotation.x = a; armR.root.rotation.x = a; armL.elbow.rotation.x = -0.2; armR.elbow.rotation.x = -0.2;
        } else { armL.root.rotation.x = -1.25; armR.root.rotation.x = -1.25; armL.elbow.rotation.x = -0.35; armR.elbow.rotation.x = -0.35; }
        rags.forEach((rg, i) => { rg.rotation.x = 0.25 + Math.sin(t * 4 + i) * 0.22; });
      },
    };
  }

  // ============================================================
  // 7. スカラベ突撃虫（開閉式光沢鞘翅＋6本2節脚＋黄金角）
  // ============================================================
  function createPCScarab() {
    const root = new THREE.Group();
    const shellM = new THREE.MeshStandardMaterial({ color: 0x261048, metalness: 0.9, roughness: 0.14, emissive: 0x1a0636, emissiveIntensity: 0.35 });
    const gM = matGold(0.25);
    const wingM = new THREE.MeshStandardMaterial({ color: 0xc588ff, transparent: true, opacity: 0.58, side: THREE.DoubleSide, roughness: 0.15, emissive: 0x6622bb, emissiveIntensity: 0.5 });

    const body = new THREE.Group(); body.position.y = 0.46; root.add(body);
    // 頭部＋大顎＋黄金角
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.22, 16, 12), shellM); head.scale.set(1.1, 0.72, 1.0); head.position.set(0, -0.02, 0.48); body.add(head);
    const hornCurve = new THREE.CatmullRomCurve3([new THREE.Vector3(0, 0, 0.55), new THREE.Vector3(0, 0.04, 0.78), new THREE.Vector3(0, 0.24, 0.92)]);
    body.add(new THREE.Mesh(new THREE.TubeGeometry(hornCurve, 12, 0.042, 8, false), gM));
    // 前胸背板（黄金縁取り）
    const pronotum = new THREE.Mesh(new THREE.SphereGeometry(0.34, 18, 14), shellM); pronotum.scale.set(1.12, 0.65, 0.85); pronotum.position.set(0, 0.04, 0.22); body.add(pronotum);
    // 左右に開く鞘翅（エリトラ）＋内側の半透明羽
    const elytraL = new THREE.Group(), elytraR = new THREE.Group();
    elytraL.position.set(-0.04, 0.14, 0.12); elytraR.position.set(0.04, 0.14, 0.12);
    const wingL = new THREE.Mesh(new THREE.CircleGeometry(0.46, 16), wingM); wingL.scale.set(0.55, 1.35, 1); wingL.rotation.x = Math.PI / 2; wingL.position.set(-0.28, 0.14, -0.2);
    const wingR = wingL.clone(); wingR.position.x = 0.28;
    for (const [eg, s] of [[elytraL, -1], [elytraR, 1]]) {
      const cap = new THREE.Mesh(new THREE.SphereGeometry(0.38, 16, 12, 0, Math.PI), shellM);
      cap.scale.set(0.65, 0.6, 1.45); cap.rotation.y = s > 0 ? 0 : Math.PI; cap.position.set(s * 0.16, -0.04, -0.26);
      eg.add(cap); body.add(eg);
    }
    body.add(wingL, wingR);
    // 6本の2節関節脚
    const legs = [];
    for (const s of [-1, 1]) for (let i = 0; i < 3; i++) {
      const lg = buildArticulatedLimb(gM, shellM, null, 0.26, 0.26, 0.032, 0.022);
      lg.root.position.set(s * 0.32, -0.06, -0.26 + i * 0.28); lg.root.rotation.z = s * 0.95; lg.elbow.rotation.z = s * -0.75;
      body.add(lg.root); legs.push(lg);
    }
    enableShadows(root);

    let t = 0;
    return {
      group: root, label: '07. スカラベ突撃虫（開閉鞘翅＆6関節脚）', category: '雑魚敵',
      update(dt, mode, time) {
        t = time ?? t + dt;
        const flying = mode === 'move' || mode === 'attack';
        const open = flying ? 0.55 : 0.08;
        elytraL.rotation.y = -open; elytraL.rotation.z = open * 0.5;
        elytraR.rotation.y = open; elytraR.rotation.z = -open * 0.5;
        const buzz = Math.sin(t * 34) * (flying ? 0.65 : 0.05);
        wingL.rotation.z = 0.25 + buzz; wingR.rotation.z = -0.25 - buzz;
        body.position.y = 0.46 + Math.sin(t * 14) * (flying ? 0.08 : 0.02);
        body.rotation.z = mode === 'attack' ? t * 14 : 0;
      },
    };
  }

  // ============================================================
  // 8. 毒サソリ（甲殻6節尾＋毒嚢＋2関節ハサミ＋6本関節脚）
  // ============================================================
  function createPCScorpion() {
    const root = new THREE.Group();
    const sc = getScalePBR('#1d3a18', '#427536', 'scorp');
    const chitinM = new THREE.MeshStandardMaterial({ color: 0x264b20, map: sc.map, bumpMap: sc.bump, bumpScale: 0.035, metalness: 0.5, roughness: 0.3 });
    const venomM = new THREE.MeshStandardMaterial({ color: 0x39ff14, emissive: 0x22ee00, emissiveIntensity: 2.0, roughness: 0.15 });

    // 多段甲殻の胴体
    for (let i = 0; i < 4; i++) {
      const plate = new THREE.Mesh(new THREE.SphereGeometry(0.34 - i * 0.03, 16, 12), chitinM);
      plate.scale.set(1.2, 0.52, 0.78); plate.position.set(0, 0.34, 0.34 - i * 0.26); root.add(plate);
    }
    // 開閉する大型ハサミ2本
    const pincers = [];
    for (const s of [-1, 1]) {
      const p = new THREE.Group(); p.position.set(s * 0.34, 0.34, 0.46);
      const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.05, 0.46, 10), chitinM); arm.rotation.x = Math.PI / 2; arm.position.z = 0.2; p.add(arm);
      const c1 = new THREE.Mesh(new THREE.TorusGeometry(0.16, 0.045, 8, 16, Math.PI * 0.9), chitinM); c1.rotation.x = Math.PI / 2; c1.position.set(s * -0.02, 0, 0.5); p.add(c1);
      const c2 = new THREE.Mesh(new THREE.TorusGeometry(0.13, 0.035, 8, 14, Math.PI * 0.8), chitinM); c2.rotation.set(Math.PI / 2, 0, Math.PI); c2.position.set(s * 0.04, 0, 0.52); p.add(c2);
      root.add(p); pincers.push({ g: p, s });
    }
    // 6本関節脚
    const legs = [];
    for (const s of [-1, 1]) for (let i = 0; i < 3; i++) {
      const lg = buildArticulatedLimb(chitinM, chitinM, null, 0.28, 0.28, 0.035, 0.024);
      lg.root.position.set(s * 0.34, 0.28, 0.24 - i * 0.26); lg.root.rotation.z = s * 1.05; lg.elbow.rotation.z = s * -0.85;
      root.add(lg.root); legs.push({ lg, idx: i, s });
    }
    // 6節湾曲尾＋発光毒嚢＋湾曲毒針
    const tail = []; let par = root;
    for (let i = 0; i < 6; i++) {
      const seg = new THREE.Group(); seg.position.set(0, i === 0 ? 0.42 : 0.22, i === 0 ? -0.58 : 0);
      const m = new THREE.Mesh(new THREE.CylinderGeometry(0.095 - i * 0.01, 0.11 - i * 0.01, 0.24, 12), chitinM); m.position.y = 0.11; seg.add(m);
      par.add(seg); tail.push(seg); par = seg;
    }
    const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.11, 14, 12), venomM); bulb.position.y = 0.26; par.add(bulb);
    const barb = new THREE.Mesh(new THREE.ConeGeometry(0.05, 0.28, 10), venomM); barb.rotation.x = 1.4; barb.position.set(0, 0.3, 0.14); par.add(barb);
    enableShadows(root);

    let t = 0;
    return {
      group: root, label: '08. 毒サソリ（6節尾・発光毒嚢・関節脚）', category: '雑魚敵',
      update(dt, mode, time) {
        t = time ?? t + dt;
        pincers.forEach(({ g, s }) => { g.rotation.y = s * (0.18 + Math.sin(t * 5) * 0.16); });
        const bend = mode === 'attack' ? 0.46 + Math.sin(t * 7) * 0.18 : 0.3 + Math.sin(t * 2.5) * 0.04;
        tail.forEach((seg, i) => { seg.rotation.x = i === 0 ? -0.35 : bend; });
        legs.forEach(({ lg, idx, s }) => { lg.root.rotation.y = mode === 'move' ? Math.sin(t * 14 + idx * 2 + s) * 0.32 : 0; });
      },
    };
  }

  // ============================================================
  // 9. アヌビス弓兵（黄金複合弓＋矢筒＋引き絞りモーション）
  // ============================================================
  function createPCArcher() {
    const root = new THREE.Group();
    const arM = matObsidian(), gM = matGold(0.25), lapM = matLapis();
    const body = new THREE.Group(); root.add(body);
    const torso = new THREE.Mesh(new THREE.CylinderGeometry(0.26, 0.18, 0.72, 14), arM); torso.position.y = 0.94; body.add(torso);
    const chestPlate = new THREE.Mesh(new THREE.TorusGeometry(0.22, 0.045, 8, 20), gM); chestPlate.rotation.x = Math.PI / 2; chestPlate.position.y = 1.22; body.add(chestPlate);
    // 背中の矢筒＋羽根矢3本
    const quiver = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.06, 0.56, 10), lapM); quiver.rotation.z = 0.35; quiver.position.set(-0.12, 1.05, -0.24); body.add(quiver);
    // アヌビス兜
    const head = new THREE.Group(); head.position.set(0, 1.46, 0.02); body.add(head);
    head.add(new THREE.Mesh(new THREE.SphereGeometry(0.16, 16, 14), arM));
    for (const s of [-1, 1]) {
      const ear = new THREE.Mesh(new THREE.ConeGeometry(0.048, 0.3, 8), gM); ear.position.set(s * 0.08, 0.22, -0.02); head.add(ear);
    }
    const armL = buildArticulatedLimb(arM, arM, gM, 0.28, 0.26, 0.055, 0.046); armL.root.position.set(-0.28, 1.18, 0); armL.root.rotation.x = -1.45;
    const armR = buildArticulatedLimb(arM, arM, gM, 0.28, 0.26, 0.055, 0.046); armR.root.position.set(0.28, 1.18, 0); armR.root.rotation.x = -1.3;
    body.add(armL.root, armR.root);
    const legL = buildArticulatedLimb(arM, arM, gM, 0.3, 0.3, 0.072, 0.055); legL.root.position.set(-0.11, 0.58, 0);
    const legR = buildArticulatedLimb(arM, arM, gM, 0.3, 0.3, 0.072, 0.055); legR.root.position.set(0.11, 0.58, 0);
    root.add(legL.root, legR.root);

    // 複合黄金弓＋弦＋赤発光矢
    const bowG = new THREE.Group(); bowG.position.set(-0.26, 1.16, 0.5);
    const bowCurve = new THREE.CatmullRomCurve3([new THREE.Vector3(0, 0.52, -0.08), new THREE.Vector3(0, 0.26, 0.14), new THREE.Vector3(0, 0, 0.22), new THREE.Vector3(0, -0.26, 0.14), new THREE.Vector3(0, -0.52, -0.08)]);
    bowG.add(new THREE.Mesh(new THREE.TubeGeometry(bowCurve, 20, 0.028, 8, false), gM));
    const arrow = new THREE.Group();
    const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.014, 0.8, 8), gM); shaft.rotation.x = Math.PI / 2; arrow.add(shaft);
    const tip = new THREE.Mesh(new THREE.ConeGeometry(0.042, 0.16, 8), new THREE.MeshBasicMaterial({ color: 0xff2222 })); tip.rotation.x = Math.PI / 2; tip.position.z = 0.42; arrow.add(tip);
    bowG.add(arrow); body.add(bowG);
    enableShadows(root);

    let t = 0;
    return {
      group: root, label: '09. アヌビス弓兵（複合黄金弓＆矢筒）', category: '雑魚敵',
      update(dt, mode, time) {
        t = time ?? t + dt;
        const draw = mode === 'attack' ? (Math.sin(t * 4.5) * 0.5 + 0.5) : 0.15;
        arrow.position.z = 0.12 - draw * 0.32;
        armR.elbow.rotation.x = -0.3 - draw * 0.9;
        body.rotation.y = mode === 'attack' ? -0.38 : 0;
        const sw = mode === 'move' ? Math.sin(t * 7) * 0.5 : 0;
        legL.root.rotation.x = sw; legR.root.rotation.x = -sw;
      },
    };
  }

  // ============================================================
  // 10. ウシャブティ石像（彫刻砂岩PBR＋カルトゥーシュ胸板＋二重冠）
  // ============================================================
  function createPCUshabti() {
    const root = new THREE.Group();
    const st = getStonePBR(), stoneM = new THREE.MeshStandardMaterial({ color: 0xa6aab0, map: st.map, bumpMap: st.bump, bumpScale: 0.06, roughness: 0.86 });
    const gM = matGold(0.2), lapM = matLapis();
    const body = new THREE.Group(); root.add(body);

    const torso = new THREE.Mesh(new THREE.BoxGeometry(0.84, 1.18, 0.62), stoneM); torso.position.y = 1.05; body.add(torso);
    const cartouche = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.72, 0.08), gM); cartouche.position.set(0, 1.05, 0.32); body.add(cartouche);
    const head = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.52, 0.5), stoneM); head.position.y = 1.88; body.add(head);
    const crownBase = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.36, 0.24, 12), lapM); crownBase.position.y = 2.24; body.add(crownBase);
    const crownTop = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.24, 0.56, 12), gM); crownTop.position.y = 2.58; body.add(crownTop);
    const beard = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.32, 0.14), gM); beard.position.set(0, 1.56, 0.28); body.add(beard);

    const armL = buildArticulatedLimb(stoneM, stoneM, gM, 0.44, 0.42, 0.15, 0.13); armL.root.position.set(-0.56, 1.44, 0);
    const armR = buildArticulatedLimb(stoneM, stoneM, gM, 0.44, 0.42, 0.15, 0.13); armR.root.position.set(0.56, 1.44, 0);
    body.add(armL.root, armR.root);
    const legL = buildArticulatedLimb(stoneM, stoneM, gM, 0.34, 0.34, 0.16, 0.14); legL.root.position.set(-0.22, 0.58, 0);
    const legR = buildArticulatedLimb(stoneM, stoneM, gM, 0.34, 0.34, 0.16, 0.14); legR.root.position.set(0.22, 0.58, 0);
    root.add(legL.root, legR.root);
    enableShadows(root);

    let t = 0;
    return {
      group: root, label: '10. ウシャブティ石像（彫刻砂岩＆二重冠）', category: '雑魚敵',
      update(dt, mode, time) {
        t = time ?? t + dt;
        const sw = mode === 'move' ? Math.sin(t * 2.4) * 0.32 : 0;
        legL.root.rotation.x = sw; legR.root.rotation.x = -sw;
        if (mode === 'attack') {
          const p = Math.sin(t * 4);
          armL.root.rotation.x = -1.3 + p * 0.9; armR.root.rotation.x = -1.3 + p * 0.9;
        } else { armL.root.rotation.x = -sw; armR.root.rotation.x = sw; }
      },
    };
  }

  // ============================================================
  // 11. カオス・ウィスプ（多面体結晶＋3重ルーン輪＋周回欠片8個）
  // ============================================================
  function createPCWisp() {
    const root = new THREE.Group();
    const center = new THREE.Group(); center.position.y = 1.48; root.add(center);
    const core = new THREE.Mesh(new THREE.IcosahedronGeometry(0.4, 2), new THREE.MeshStandardMaterial({ color: 0x2c074e, emissive: 0x991aff, emissiveIntensity: 1.5, metalness: 0.6, roughness: 0.15 }));
    center.add(core);
    const gM = matGold(0.5);
    const r1 = new THREE.Mesh(new THREE.TorusGeometry(0.72, 0.045, 12, 36), new THREE.MeshBasicMaterial({ color: 0xe644ff }));
    const r2 = new THREE.Mesh(new THREE.TorusGeometry(0.58, 0.036, 12, 32), new THREE.MeshBasicMaterial({ color: 0x00e5ff }));
    const r3 = new THREE.Mesh(new THREE.TorusGeometry(0.86, 0.025, 10, 40), gM);
    center.add(r1, r2, r3);
    const shards = [];
    for (let i = 0; i < 8; i++) {
      const sh = new THREE.Mesh(new THREE.OctahedronGeometry(0.08, 0), new THREE.MeshBasicMaterial({ color: i % 2 ? 0xff44dd : 0x00e5ff }));
      center.add(sh); shards.push(sh);
    }

    let t = 0;
    return {
      group: root, label: '11. カオス・ウィスプ（3重ルーン＆欠片）', category: '雑魚敵',
      update(dt, mode, time) {
        t = time ?? t + dt;
        center.position.y = 1.48 + Math.sin(t * 3.2) * 0.2;
        r1.rotation.set(t * 1.8, t * 2.4, 0); r2.rotation.set(-t * 2.2, 0, t * 1.9); r3.rotation.set(0.6, t * 1.2, -t * 1.5);
        shards.forEach((sh, i) => {
          const a = t * 2.5 + (i / 8) * Math.PI * 2;
          sh.position.set(Math.cos(a) * 1.0, Math.sin(t * 4 + i) * 0.3, Math.sin(a) * 1.0);
        });
        core.scale.setScalar(mode === 'attack' ? 1.0 + Math.abs(Math.sin(t * 14)) * 0.5 : 1.0);
      },
    };
  }

  // ============================================================
  // 12. BOSS W10：アメミット（ワニ頭独立顎・16本牙・18房鬣・カバ下半身）
  // ============================================================
  function createPCAmmit() {
    const root = new THREE.Group();
    const sc = getScalePBR('#2a4822', '#4d7a3c', 'croc');
    const crocM = new THREE.MeshStandardMaterial({ color: 0x35582b, map: sc.map, bumpMap: sc.bump, bumpScale: 0.05, roughness: 0.55 });
    const lionM = new THREE.MeshStandardMaterial({ color: 0xc9923a, roughness: 0.72 });
    const maneM = new THREE.MeshStandardMaterial({ color: 0x6b3510, roughness: 0.88 });
    const hippoM = new THREE.MeshStandardMaterial({ color: 0x56444c, roughness: 0.65 });
    const toothM = new THREE.MeshStandardMaterial({ color: 0xfffaf0, roughness: 0.2 });

    const body = new THREE.Group(); root.add(body);
    const chest = new THREE.Mesh(new THREE.SphereGeometry(1.05, 20, 16), lionM); chest.scale.set(0.95, 0.88, 1.15); chest.position.set(0, 1.38, 0.45); body.add(chest);
    // 18房の立体ライオン鬣
    for (let i = 0; i < 18; i++) {
      const a = (i / 18) * Math.PI * 2;
      const spike = new THREE.Mesh(new THREE.ConeGeometry(0.24, 0.72, 6), maneM);
      spike.position.set(Math.cos(a) * 0.92, 1.44 + Math.sin(a) * 0.85, 1.18);
      spike.rotation.z = a - Math.PI / 2; spike.rotation.x = -0.35; body.add(spike);
    }
    const hind = new THREE.Mesh(new THREE.SphereGeometry(1.22, 20, 16), hippoM); hind.scale.set(1.02, 0.92, 1.2); hind.position.set(0, 1.2, -1.05); body.add(hind);

    // ワニ頭（上顎・下顎独立＋16本牙＋舌）
    const head = new THREE.Group(); head.position.set(0, 1.56, 1.42); body.add(head);
    const uJaw = new THREE.Mesh(new THREE.BoxGeometry(0.92, 0.4, 1.75), crocM); uJaw.position.set(0, 0.22, 0.78); head.add(uJaw);
    const lJaw = new THREE.Group(); lJaw.position.set(0, 0, 0.08);
    const ljM = new THREE.Mesh(new THREE.BoxGeometry(0.82, 0.24, 1.65), crocM); ljM.position.set(0, -0.1, 0.72); lJaw.add(ljM);
    for (let i = 0; i < 8; i++) for (const s of [-1, 1]) {
      const th = new THREE.Mesh(new THREE.ConeGeometry(0.048, 0.18, 6), toothM);
      th.position.set(s * 0.34, 0.08, 0.18 + i * 0.19); lJaw.add(th);
    }
    head.add(lJaw);
    for (const s of [-1, 1]) {
      const eye = new THREE.Mesh(new THREE.SphereGeometry(0.11, 12, 10), new THREE.MeshBasicMaterial({ color: 0xff1a1a }));
      eye.position.set(s * 0.42, 0.44, 0.42); head.add(eye);
    }
    const legs = [];
    for (const sx of [-0.78, 0.78]) for (const [sz, m] of [[0.82, lionM], [-1.02, hippoM]]) {
      const lg = buildArticulatedLimb(m, m, null, 0.62, 0.56, 0.28, 0.22); lg.root.position.set(sx, 1.12, sz); root.add(lg.root); legs.push({ lg, sz, sx });
    }
    enableShadows(root);

    let t = 0;
    return {
      group: root, label: '12. BOSS W10：アメミット（18鬣＆独立顎）', category: 'ボス',
      update(dt, mode) {
        t += dt;
        lJaw.rotation.x = mode === 'attack' ? 0.72 + Math.sin(t * 10) * 0.14 : 0.12 + Math.sin(t * 2.5) * 0.08;
        const mv = mode === 'move' || mode === 'attack';
        legs.forEach(({ lg, sz, sx }) => { lg.root.rotation.x = mv ? Math.sin(t * 8 + (sz > 0 ? 0 : Math.PI) + (sx > 0 ? 0.5 : 0)) * 0.48 : 0; });
      },
    };
  }

  // ============================================================
  // 13. BOSS W20：セト（漆黒金甲冑＋雷鳴オーラ＋ウアス杖＋なびくマント）
  // ============================================================
  function createPCSet() {
    const root = new THREE.Group();
    const arM = matObsidian(), gM = matGold(0.35), capeM = new THREE.MeshStandardMaterial({ color: 0x421366, roughness: 0.7, side: THREE.DoubleSide });
    const body = new THREE.Group(); root.add(body);
    const chest = new THREE.Mesh(new THREE.CylinderGeometry(0.66, 0.4, 1.55, 16), arM); chest.position.y = 1.75; body.add(chest);
    const belt = new THREE.Mesh(new THREE.TorusGeometry(0.44, 0.075, 10, 24), gM); belt.rotation.x = Math.PI / 2; belt.position.y = 1.05; body.add(belt);
    for (const s of [-1, 1]) {
      const sp = new THREE.Mesh(new THREE.ConeGeometry(0.34, 0.72, 6), gM); sp.rotation.z = s * -0.8; sp.position.set(s * 0.82, 2.38, 0); body.add(sp);
    }
    const head = new THREE.Group(); head.position.set(0, 2.86, 0.06); body.add(head);
    head.add(new THREE.Mesh(new THREE.SphereGeometry(0.34, 18, 14), arM));
    const snout = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.15, 0.64, 12), arM); snout.rotation.x = 1.88; snout.position.set(0, -0.1, 0.48); head.add(snout);
    for (const s of [-1, 1]) {
      const ear = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.96, 0.15), arM); ear.position.set(s * 0.22, 0.74, -0.04); head.add(ear);
      const trim = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.12, 0.17), gM); trim.position.set(s * 0.22, 1.18, -0.04); head.add(trim);
      const eye = new THREE.Mesh(new THREE.SphereGeometry(0.07, 10, 8), new THREE.MeshBasicMaterial({ color: 0xff2244 })); eye.position.set(s * 0.16, 0.08, 0.3); head.add(eye);
    }
    const scepter = new THREE.Group(); scepter.position.set(1.02, 1.95, 0.38);
    scepter.add(new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.045, 3.0, 12), gM));
    const gem = new THREE.Mesh(new THREE.OctahedronGeometry(0.3, 0), new THREE.MeshBasicMaterial({ color: 0xffd700 })); gem.position.y = 1.62; scepter.add(gem);
    const gemRing = new THREE.Mesh(new THREE.TorusGeometry(0.45, 0.035, 8, 24), new THREE.MeshBasicMaterial({ color: 0xff3366 })); gemRing.position.y = 1.62; scepter.add(gemRing);
    body.add(scepter);

    const cape = new THREE.Mesh(new THREE.PlaneGeometry(1.65, 2.35, 12, 14), capeM); cape.position.set(0, 1.4, -0.46); cape.rotation.x = 0.22; body.add(cape);
    enableShadows(root);

    let t = 0;
    return {
      group: root, label: '13. BOSS W20：セト（嵐の神・雷鳴甲冑）', category: 'ボス',
      update(dt, mode) {
        t += dt;
        body.position.y = 0.25 + Math.sin(t * 2.8) * 0.2;
        scepter.rotation.z = mode === 'attack' ? t * 9 : Math.sin(t * 2) * 0.12;
        gemRing.rotation.set(t * 3, t * 4, 0);
        cape.rotation.x = 0.24 + Math.sin(t * 8) * 0.16;
      },
    };
  }

  // ============================================================
  // 14. BOSS W30：大スフィンクス（2段神殿台座＋彫刻ライオン体＋レーザー）
  // ============================================================
  function createPCSphinx() {
    const root = new THREE.Group();
    const st = getStonePBR(), stoneM = new THREE.MeshStandardMaterial({ color: 0xc9a872, map: st.map, bumpMap: st.bump, bumpScale: 0.06, roughness: 0.85 });
    const nm = getNemesPBR(), nemesM = new THREE.MeshStandardMaterial({ map: nm.map, bumpMap: nm.bump, bumpScale: 0.03, roughness: 0.35, metalness: 0.45 });
    const gM = matGold(0.3);

    const p1 = new THREE.Mesh(new THREE.BoxGeometry(5.8, 0.45, 5.0), stoneM); p1.position.y = 0.225; root.add(p1);
    const p2 = new THREE.Mesh(new THREE.BoxGeometry(5.0, 0.42, 4.3), stoneM); p2.position.y = 0.66; root.add(p2);
    const body = new THREE.Mesh(new THREE.BoxGeometry(3.0, 1.85, 3.2), stoneM); body.position.set(0, 1.8, -0.2); root.add(body);
    for (const s of [-1, 1]) {
      const paw = new THREE.Mesh(new THREE.BoxGeometry(0.85, 0.68, 2.5), stoneM); paw.position.set(s * 1.08, 1.22, 2.05); root.add(paw);
      const cuff = new THREE.Mesh(new THREE.BoxGeometry(0.92, 0.24, 0.36), gM); cuff.position.set(s * 1.08, 1.24, 2.85); root.add(cuff);
    }
    const head = new THREE.Group(); head.position.set(0, 3.12, 1.08); root.add(head);
    head.add(new THREE.Mesh(new THREE.BoxGeometry(1.3, 1.44, 1.3), stoneM));
    const nemes = new THREE.Mesh(new THREE.BoxGeometry(2.65, 1.85, 1.05), nemesM); nemes.position.set(0, 0.08, -0.18); head.add(nemes);
    const cobra = new THREE.Mesh(new THREE.ConeGeometry(0.2, 0.62, 10), gM); cobra.position.set(0, 0.96, 0.68); head.add(cobra);
    const laserMat = new THREE.MeshBasicMaterial({ color: 0xff2244, transparent: true, opacity: 0.8, blending: THREE.AdditiveBlending, depthWrite: false });
    const laserGeo = new THREE.CylinderGeometry(0.08, 0.16, 7.0, 12, 1, true); laserGeo.rotateX(Math.PI / 2); laserGeo.translate(0, 0, 3.5);
    const lasers = [];
    for (const s of [-1, 1]) {
      const eye = new THREE.Mesh(new THREE.SphereGeometry(0.14, 12, 10), new THREE.MeshBasicMaterial({ color: 0xff1e44 })); eye.position.set(s * 0.35, 0.18, 0.66); head.add(eye);
      const lz = new THREE.Mesh(laserGeo, laserMat); lz.position.set(s * 0.35, 0.18, 0.72); lz.visible = false; head.add(lz); lasers.push(lz);
    }
    enableShadows(root);

    let t = 0;
    return {
      group: root, head, label: '14. BOSS W30：大スフィンクス（神殿彫刻＆レーザー）', category: 'ボス',
      update(dt, mode) {
        t += dt;
        const atk = mode === 'attack';
        head.rotation.y = atk ? Math.sin(t * 2.0) * 0.8 : Math.sin(t * 0.7) * 0.14;
        lasers.forEach((lz) => { lz.visible = atk; });
      },
    };
  }

  // ============================================================
  // 15. BOSS W40：大蛇アペプ（コブラ襟・独立顎・12節背棘・3結晶コア）
  // ============================================================
  function createPCApep() {
    const root = new THREE.Group();
    const sc = getScalePBR('#1d0f2e', '#6d2ca8', 'apep');
    const scM = new THREE.MeshStandardMaterial({ color: 0x2b1345, map: sc.map, bumpMap: sc.bump, bumpScale: 0.05, metalness: 0.45, roughness: 0.35 });
    const coreM = new THREE.MeshStandardMaterial({ color: 0xff22aa, emissive: 0xff0088, emissiveIntensity: 1.8, roughness: 0.12 });
    const gM = matGold(0.35);

    const segs = [], cores = [];
    const head = new THREE.Group();
    head.add(new THREE.Mesh(new THREE.BoxGeometry(1.55, 0.9, 1.95), scM));
    const lowerJaw = new THREE.Mesh(new THREE.BoxGeometry(1.3, 0.36, 1.7), scM); lowerJaw.position.set(0, -0.42, 0.1); head.add(lowerJaw);
    for (const s of [-1, 1]) {
      const hood = new THREE.Mesh(new THREE.BoxGeometry(0.75, 1.2, 0.25), scM); hood.position.set(s * 0.92, 0.05, -0.65); hood.rotation.y = s * -0.4; head.add(hood);
      const horn = new THREE.Mesh(new THREE.ConeGeometry(0.18, 0.88, 8), gM); horn.rotation.x = -0.6; horn.position.set(s * 0.56, 0.72, -0.3); head.add(horn);
      const fang = new THREE.Mesh(new THREE.ConeGeometry(0.08, 0.48, 8), new THREE.MeshStandardMaterial({ color: 0xffffff })); fang.rotation.x = Math.PI; fang.position.set(s * 0.38, -0.45, 0.84); head.add(fang);
      const eye = new THREE.Mesh(new THREE.SphereGeometry(0.14, 10, 8), new THREE.MeshBasicMaterial({ color: 0xff1e38 })); eye.position.set(s * 0.58, 0.22, 0.78); head.add(eye);
    }
    segs.push(head); root.add(head);

    for (let i = 1; i <= 12; i++) {
      const seg = new THREE.Group(), r = 0.88 - i * 0.045;
      seg.add(new THREE.Mesh(new THREE.SphereGeometry(r, 16, 14), scM));
      const spine = new THREE.Mesh(new THREE.ConeGeometry(r * 0.32, r * 0.9, 6), gM); spine.position.y = r * 0.95; seg.add(spine);
      if (i === 3 || i === 7 || i === 10) {
        const target = new THREE.Group(); target.position.y = r + 0.45; seg.add(target);
        const cm = new THREE.Mesh(new THREE.OctahedronGeometry(0.52, 0), coreM);
        const cr = new THREE.Mesh(new THREE.TorusGeometry(0.68, 0.04, 8, 20), new THREE.MeshBasicMaterial({ color: 0xff44cc }));
        target.add(cm, cr);
        cores.push({ cm, cr, target, segIndex: i });
      }
      segs.push(seg); root.add(seg);
    }
    enableShadows(root);

    let t = 0;
    return {
      group: root, segs, cores, label: '15. FINAL BOSS W40：大蛇アペプ（12節＆3コア）', category: 'ボス',
      update(dt, mode, followShowcasePath = true) {
        t += dt * (mode === 'attack' ? 1.8 : 1.0);
        lowerJaw.rotation.x = mode === 'attack' ? 0.48 : 0.08;
        for (let i = 0; followShowcasePath && i < segs.length; i++) {
          const ph = t * 1.8 - i * 0.42;
          segs[i].position.set(Math.sin(ph) * 2.2, 1.3 + Math.sin(ph * 1.4) * 0.28, 2.2 - i * 0.52);
        }
        cores.forEach(({ cm, cr }, idx) => { cm.rotation.y = t * 3 + idx; cr.rotation.set(t * 2, t * 3, 0); });
      },
    };
  }

  // ============================================================
  // 16. 太陽の舟（博物館級ロイヤルパピルス船＋12光条太陽円盤）
  // ============================================================
  function createPCSolarBarque() {
    const root = new THREE.Group();
    const boat = new THREE.Group(); boat.position.y = 0.85; root.add(boat);
    const gM = matGold(0.35), lapM = matLapis();
    const sunM = new THREE.MeshBasicMaterial({ color: 0xfff394 });
    const haloM = new THREE.MeshBasicMaterial({ color: 0xffb700, transparent: true, opacity: 0.65, side: THREE.DoubleSide, blending: THREE.AdditiveBlending, depthWrite: false });

    const curve = new THREE.CatmullRomCurve3([new THREE.Vector3(-1.42, 0.78, 0), new THREE.Vector3(-0.92, 0.14, 0), new THREE.Vector3(0, -0.08, 0), new THREE.Vector3(0.92, 0.14, 0), new THREE.Vector3(1.42, 0.78, 0)]);
    const hull = new THREE.Mesh(new THREE.TubeGeometry(curve, 36, 0.23, 14, false), gM); hull.scale.set(1, 0.78, 1.48); boat.add(hull);
    for (const s of [-1, 1]) {
      const lotus = new THREE.Mesh(new THREE.ConeGeometry(0.22, 0.46, 12), gM); lotus.rotation.z = s * -0.45; lotus.position.set(s * 1.5, 0.9, 0); boat.add(lotus);
      const bud = new THREE.Mesh(new THREE.SphereGeometry(0.12, 12, 10), lapM); bud.position.set(s * 1.58, 1.05, 0); boat.add(bud);
    }
    const deck = new THREE.Mesh(new THREE.BoxGeometry(1.3, 0.14, 0.6), lapM); deck.position.y = 0.14; boat.add(deck);
    for (const sx of [-0.45, 0.45]) for (const sz of [-0.2, 0.2]) {
      const col = new THREE.Mesh(new THREE.CylinderGeometry(0.038, 0.038, 0.6, 10), gM); col.position.set(sx, 0.46, sz); boat.add(col);
    }
    const roof = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.11, 0.58), gM); roof.position.y = 0.78; boat.add(roof);
    const sunG = new THREE.Group(); sunG.position.y = 1.3;
    sunG.add(new THREE.Mesh(new THREE.SphereGeometry(0.36, 24, 18), sunM));
    const halo = new THREE.Mesh(new THREE.RingGeometry(0.42, 0.62, 32), haloM); sunG.add(halo);
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2;
      const ray = new THREE.Mesh(new THREE.ConeGeometry(0.06, 0.34, 6), sunM);
      ray.position.set(Math.cos(a) * 0.58, Math.sin(a) * 0.58, 0); ray.rotation.z = a - Math.PI / 2;
      sunG.add(ray);
    }
    boat.add(sunG);
    enableShadows(root);

    let t = 0;
    return {
      group: root, label: '16. 太陽の舟（12光条・ロイヤル船体）', category: 'スキル単体',
      update(dt) { t += dt; boat.position.y = 0.85 + Math.sin(t * 2.5) * 0.14; sunG.rotation.z = t * 1.2; },
    };
  }

  // ============================================================
  // 17〜24. 全8スキル演出＆メジェド詠唱モーション（Lv1 / Lv5 / Lv10覚醒 3段階比較！）
  // ============================================================
  function createSkillShowcase(skillId, label, { effectOnly = false, level = 1 } = {}) {
    const root = new THREE.Group();
    const medjed = effectOnly ? null : createPCMedjed();
    if (medjed) root.add(medjed.group);
    const fx = new THREE.Group(); root.add(fx);

    let builtLv = 0;
    let t = 0;
    const parts = { rings: [], beams: [], flames: [], barques: [], clones: [], scarabs: [], scales: [], pyramids: [], wave: null };

    const clearFx = () => {
      const geometries = new Set(), materials = new Set();
      fx.traverse((part) => {
        if (!part.isMesh && !part.isLine) return;
        geometries.add(part.geometry); materials.add(part.material);
      });
      for (const geometry of geometries) geometry.dispose();
      for (const material of materials) material.dispose();
      fx.clear();
      for (const k of Object.keys(parts)) parts[k] = Array.isArray(parts[k]) ? [] : null;
    };

    const buildForLevel = (lv) => {
      clearFx();
      builtLv = lv;
      const isAw = lv === 10, isMid = lv === 5;

      if (skillId === 'eye_beam') {
        const count = isAw ? 4 : isMid ? 2 : 1;
        const w = isAw ? 2.4 : isMid ? 1.4 : 0.85;
        const coreM = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.95 });
        const outM = new THREE.MeshBasicMaterial({ color: isAw ? 0xffd700 : 0xffaa22, transparent: true, opacity: 0.6, blending: THREE.AdditiveBlending, depthWrite: false });
        for (let i = 0; i < count; i++) {
          const ang = count === 1 ? 0 : ((i / (count - 1)) - 0.5) * (isAw ? 0.95 : 0.45);
          const g = new THREE.Group(); g.position.set(0, 1.24, 0.42); g.rotation.y = ang;
          const cg = new THREE.CylinderGeometry(0.05 * w, 0.05 * w, 5.2, 12, 1, true); cg.rotateX(Math.PI / 2); cg.translate(0, 0, 2.6);
          const og = new THREE.CylinderGeometry(0.12 * w, 0.14 * w, 5.2, 16, 1, true); og.rotateX(Math.PI / 2); og.translate(0, 0, 2.6);
          g.add(new THREE.Mesh(cg, coreM), new THREE.Mesh(og, outM));
          if (isAw) {
            for (let r = 0; r < 4; r++) {
              const ring = new THREE.Mesh(new THREE.TorusGeometry(0.45, 0.04, 8, 20), outM);
              ring.position.z = 1.0 + r * 1.1; g.add(ring); parts.rings.push(ring);
            }
            const scorch = new THREE.Mesh(new THREE.PlaneGeometry(0.95, 5.0), new THREE.MeshBasicMaterial({ color: 0xff8800, transparent: true, opacity: 0.48, blending: THREE.AdditiveBlending, depthWrite: false }));
            scorch.rotation.x = -Math.PI / 2; scorch.position.set(0, -1.2, 2.6); g.add(scorch);
          }
          fx.add(g); parts.beams.push(g);
        }
      } else if (skillId === 'mouth_flame') {
        const cnt = isAw ? 42 : isMid ? 28 : 16;
        const spread = isAw ? 1.1 : isMid ? 0.65 : 0.42;
        const maxDist = isAw ? 5.6 : isMid ? 4.0 : 2.8;
        const col1 = isAw ? 0x00f0ff : 0xffe044, col2 = isAw ? 0x0055ff : 0xff4500;
        for (let i = 0; i < cnt; i++) {
          const m = new THREE.Mesh(new THREE.OctahedronGeometry(isAw ? 0.34 : 0.24, 0), new THREE.MeshBasicMaterial({ color: i % 2 ? col1 : col2, transparent: true, opacity: 0.85, blending: THREE.AdditiveBlending, depthWrite: false }));
          fx.add(m);
          parts.flames.push({ m, phase: i / cnt, ang: ((i % 9) / 8 - 0.5) * spread, maxDist });
        }
        if (isAw) {
          const pool = new THREE.Mesh(new THREE.CircleGeometry(2.1, 28), new THREE.MeshBasicMaterial({ color: 0x00c8ff, transparent: true, opacity: 0.4, side: THREE.DoubleSide, blending: THREE.AdditiveBlending, depthWrite: false }));
          pool.rotation.x = -Math.PI / 2; pool.position.set(0, 0.05, 3.2); fx.add(pool);
        }
      } else if (skillId === 'invisible_step') {
        const rCnt = isAw ? 3 : isMid ? 2 : 1;
        for (let i = 0; i < rCnt; i++) {
          const ring = new THREE.Mesh(new THREE.TorusGeometry(1.0, 0.08, 10, 36), new THREE.MeshBasicMaterial({ color: i === 0 ? 0x00e5ff : 0xffd700, transparent: true, opacity: 0.8, blending: THREE.AdditiveBlending, depthWrite: false }));
          ring.rotation.x = Math.PI / 2; ring.position.y = 0.25 + i * 0.2; fx.add(ring);
          parts.rings.push({ ring, phase: i / rCnt, maxR: isAw ? 3.8 : isMid ? 2.8 : 2.1 });
        }
        if (isAw) {
          const cM = new THREE.MeshBasicMaterial({ color: 0x00e5ff, transparent: true, opacity: 0.45, blending: THREE.AdditiveBlending, depthWrite: false });
          for (let i = 0; i < 3; i++) {
            const a = (i / 3) * Math.PI * 2;
            const cl = new THREE.Mesh(new THREE.ConeGeometry(0.48, 1.5, 16), cM);
            cl.position.set(Math.cos(a) * 1.9, 0.85, Math.sin(a) * 1.9); fx.add(cl); parts.clones.push(cl);
          }
        }
      } else if (skillId === 'solar_barque') {
        const cnt = isAw ? 6 : isMid ? 3 : 1;
        const rad = isAw ? 2.8 : isMid ? 2.3 : 1.9;
        for (let i = 0; i < cnt; i++) {
          const b = createPCSolarBarque(); b.group.scale.setScalar(0.55);
          fx.add(b.group); parts.barques.push({ b, idx: i, cnt, rad });
        }
      } else if (skillId === 'scarab_swarm') {
        const cnt = isAw ? 8 : isMid ? 4 : 2;
        const gM = matGold(0.45);
        for (let i = 0; i < cnt; i++) {
          const sc = new THREE.Mesh(new THREE.SphereGeometry(0.22, 12, 10), gM); sc.scale.set(0.9, 0.65, 1.35);
          fx.add(sc); parts.scarabs.push({ sc, phase: i / cnt, ang: (i / cnt) * Math.PI * 2 });
        }
      } else if (skillId === 'anubis_scales') {
        const cnt = isAw ? 3 : isMid ? 2 : 1;
        const gM = matGold(0.4);
        for (let i = 0; i < cnt; i++) {
          const sg = new THREE.Group(); sg.position.set((i - (cnt - 1) / 2) * 1.9, 2.2, 2.2);
          sg.add(new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 1.4, 10), gM));
          const bar = new THREE.Group(); bar.position.y = 0.55;
          bar.add(new THREE.Mesh(new THREE.BoxGeometry(1.3, 0.07, 0.07), gM));
          for (const s of [-0.58, 0.58]) {
            const pan = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.14, 0.1, 14), gM); pan.position.set(s, -0.35, 0); bar.add(pan);
          }
          sg.add(bar);
          const beam = new THREE.Mesh(new THREE.CylinderGeometry(isAw ? 0.9 : 0.45, isAw ? 1.2 : 0.6, 8, 16, 1, true), new THREE.MeshBasicMaterial({ color: isAw ? 0xffd700 : 0xffe888, transparent: true, opacity: 0.45, blending: THREE.AdditiveBlending, depthWrite: false }));
          beam.position.y = 1.6; sg.add(beam);
          fx.add(sg); parts.scales.push({ sg, bar, beam });
        }
      } else if (skillId === 'pyramid_barrier') {
        const cnt = isAw ? 3 : 1;
        for (let i = 0; i < cnt; i++) {
          const sc = isAw ? (i === 1 ? 1.55 : 1.05) : isMid ? 1.25 : 0.95;
          const pg = new THREE.Group(); pg.position.set((i - (cnt - 1) / 2) * 2.2, 0.05, 0);
          const cone = new THREE.ConeGeometry(1.5 * sc, 2.2 * sc, 4); cone.rotateY(Math.PI / 4); cone.translate(0, 1.1 * sc, 0);
          pg.add(
            new THREE.Mesh(cone, new THREE.MeshBasicMaterial({ color: 0xffd700, transparent: true, opacity: 0.18, side: THREE.DoubleSide, depthWrite: false })),
            new THREE.LineSegments(new THREE.EdgesGeometry(cone), new THREE.LineBasicMaterial({ color: isAw ? 0x00f0ff : 0xffe866 }))
          );
          fx.add(pg); parts.pyramids.push(pg);
        }
      } else if (skillId === 'nile_flood') {
        const w = isAw ? 6.2 : isMid ? 4.2 : 2.8, h = isAw ? 1.6 : isMid ? 1.1 : 0.75;
        const wg = new THREE.Group();
        const wave = new THREE.Mesh(new THREE.CylinderGeometry(h * 0.55, h * 0.85, w, 18, 1, false, 0, Math.PI), new THREE.MeshStandardMaterial({ color: isAw ? 0x00e5ff : 0x1ca8e6, transparent: true, opacity: 0.72, roughness: 0.15, metalness: 0.25 }));
        wave.rotation.z = Math.PI / 2; wave.position.y = h * 0.48; wg.add(wave);
        fx.add(wg); parts.wave = wg;
      }
    };

    buildForLevel(level);

    return {
      group: root, fx, parts, label, category: 'スキル演出(Lv1/5/10)', isSkillShowcase: true,
      update(dt, mode, skillLv = level) {
        if (skillLv !== builtLv) buildForLevel(skillLv);
        t += dt;
        medjed?.update(dt, skillId === 'eye_beam' ? 'attack' : mode);
        if (medjed && skillId === 'invisible_step') {
          medjed.cloakMat.transparent = true; medjed.cloakMat.opacity = 0.28 + Math.sin(t * 4) * 0.12;
        } else if (medjed) {
          medjed.cloakMat.transparent = false; medjed.cloakMat.opacity = 1.0;
        }
        if (skillId === 'eye_beam') {
          parts.rings.forEach((r, i) => { r.rotation.z = t * 8 + i; });
        } else if (skillId === 'mouth_flame') {
          parts.flames.forEach((f) => {
            const p = (t * 1.4 + f.phase) % 1;
            const d = 0.4 + p * f.maxDist;
            f.m.position.set(Math.sin(f.ang) * d, 0.85 + Math.sin(p * Math.PI) * 0.35, Math.cos(f.ang) * d);
            f.m.rotation.set(t * 7, t * 5, 0);
            f.m.scale.setScalar((0.5 + p * 1.4) * (1 - p));
          });
        } else if (skillId === 'invisible_step') {
          parts.rings.forEach((o) => {
            const p = (t * 0.9 + o.phase) % 1;
            o.ring.scale.setScalar(0.3 + p * o.maxR); o.ring.material.opacity = (1 - p) * 0.85;
          });
        } else if (skillId === 'solar_barque') {
          parts.barques.forEach(({ b, idx, cnt, rad }) => {
            const a = t * 1.6 + (idx / cnt) * Math.PI * 2;
            b.group.position.set(Math.cos(a) * rad, 0.25, Math.sin(a) * rad);
            b.group.rotation.y = -a + Math.PI / 2;
            b.update(dt);
          });
        } else if (skillId === 'scarab_swarm') {
          parts.scarabs.forEach((o) => {
            const p = (t * 1.2 + o.phase) % 1, r = 0.6 + p * 3.4;
            o.sc.position.set(Math.cos(o.ang + p * 2.5) * r, 0.8 + Math.sin(p * Math.PI) * 0.6, Math.sin(o.ang + p * 2.5) * r);
          });
        } else if (skillId === 'anubis_scales') {
          parts.scales.forEach(({ bar, beam }) => {
            bar.rotation.z = Math.sin(t * 3.5) * 0.42;
            beam.material.opacity = 0.25 + Math.abs(Math.sin(t * 3.5)) * 0.45;
          });
        } else if (skillId === 'pyramid_barrier') {
          parts.pyramids.forEach((pg, i) => { pg.rotation.y = t * (i % 2 ? -0.5 : 0.5); });
        } else if (skillId === 'nile_flood' && parts.wave) {
          const p = (t * 0.75) % 1;
          parts.wave.position.z = -1.2 + p * 5.2;
        }
      },
    };
  }

  global.MedjedPCModels = {
    createPCMedjed, createPCSoulGeneral, createPCSoulPriest, createPCSoulCoffin,
    createPCJackal, createPCMummy, createPCScarab, createPCScorpion, createPCArcher, createPCUshabti, createPCWisp,
    createPCAmmit, createPCSet, createPCSphinx, createPCApep, createPCSolarBarque,
    createSkillShowcase,
    listAllFactories() {
      return [
        createPCMedjed, createPCSoulGeneral, createPCSoulPriest, createPCSoulCoffin,
        createPCJackal, createPCMummy, createPCScarab, createPCScorpion, createPCArcher, createPCUshabti, createPCWisp,
        createPCAmmit, createPCSet, createPCSphinx, createPCApep, createPCSolarBarque,
        () => createSkillShowcase('eye_beam', '17. 眼光（ラーの審判光）'),
        () => createSkillShowcase('mouth_flame', '18. 口からの炎（ドゥアトの蒼炎）'),
        () => createSkillShowcase('invisible_step', '19. 不可視ステップ（虚無の残像）'),
        () => createSkillShowcase('solar_barque', '20. 太陽の舟（永遠の太陽舟）'),
        () => createSkillShowcase('scarab_swarm', '21. スカラベの群れ（黄金連鎖）'),
        () => createSkillShowcase('anubis_scales', '22. アヌビスの天秤（最終審判）'),
        () => createSkillShowcase('pyramid_barrier', '23. ピラミッド結界（ギザ聖域）'),
        () => createSkillShowcase('nile_flood', '24. ナイルの氾濫（ヌン大津波）'),
      ];
    },
  };
})(typeof window !== 'undefined' ? window : globalThis);
