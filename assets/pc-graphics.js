/* Rendering adapters for the supplied Medjed PC model library. */
(() => {
  "use strict";

  const crowdFactories = {
    general: "createPCSoulGeneral", priest: "createPCSoulPriest", coffin: "createPCSoulCoffin",
    jackal: "createPCJackal", mummy: "createPCMummy", scarab: "createPCScarab",
    scorpion: "createPCScorpion", archer: "createPCArcher", ushabti: "createPCUshabti", wisp: "createPCWisp",
  };
  const bossFactories = {
    ammit: "createPCAmmit", set: "createPCSet", sphinx: "createPCSphinx", apep: "createPCApep",
  };

  function disposeModel(group) {
    const geometries = new Set();
    const materials = new Set();
    group.traverse((part) => {
      if (!part.isMesh && !part.isLine) return;
      geometries.add(part.geometry);
      materials.add(part.material);
    });
    for (const geometry of geometries) geometry.dispose();
    for (const material of materials) material.dispose();
  }

  function studioReflection(renderer) {
    const studio = new THREE.Scene();
    studio.background = new THREE.Color(0x282438);
    const wall = new THREE.Mesh(new THREE.SphereGeometry(12, 16, 12),
      new THREE.MeshBasicMaterial({ color: 0xffe4b0, side: THREE.BackSide }));
    studio.add(wall);
    for (const [color, x, y, z] of [[0xffffff, 5, 6, 5], [0x66aaff, -6, 4, -5]]) {
      const light = new THREE.Mesh(new THREE.PlaneGeometry(8, 8), new THREE.MeshBasicMaterial({ color }));
      light.position.set(x, y, z);
      light.lookAt(0, 0, 0);
      studio.add(light);
    }
    const generator = new THREE.PMREMGenerator(renderer);
    try {
      return generator.fromScene(studio, 0.04);
    } finally {
      generator.dispose();
      disposeModel(studio);
    }
  }

  function addCrowdTint(shader) {
    shader.vertexShader = shader.vertexShader
      .replace("#include <common>", "#include <common>\nattribute vec2 medjedTint;\nvarying vec2 vMedjedTint;")
      .replace("#include <begin_vertex>", "#include <begin_vertex>\nvMedjedTint = medjedTint;");
    shader.fragmentShader = shader.fragmentShader
      .replace("#include <common>", "#include <common>\nvarying vec2 vMedjedTint;")
      .replace("#include <tonemapping_fragment>", [
        "gl_FragColor.rgb += vec3(0.42, 0.25, 0.04) * vMedjedTint.y;",
        "gl_FragColor.rgb = mix(gl_FragColor.rgb, vec3(1.5, 0.84, 0.66), vMedjedTint.x * 0.68);",
        "#include <tonemapping_fragment>",
      ].join("\n"));
  }

  // Combine rigid pieces with the same material that move together as one part.
  function mergeParts(meshes) {
    const positions = [], normals = [], uvs = [], indices = [];
    const position = new THREE.Vector3(), normal = new THREE.Vector3();
    const normalMatrix = new THREE.Matrix3();
    for (const part of meshes) {
      const geometry = part.geometry;
      const { position: vertices, normal: directions, uv } = geometry.attributes;
      const offset = positions.length / 3;
      normalMatrix.getNormalMatrix(part.matrix);
      for (let i = 0; i < vertices.count; i++) {
        position.fromBufferAttribute(vertices, i).applyMatrix4(part.matrix);
        normal.fromBufferAttribute(directions, i).applyNormalMatrix(normalMatrix);
        positions.push(position.x, position.y, position.z);
        normals.push(normal.x, normal.y, normal.z);
        uvs.push(uv.getX(i), uv.getY(i));
      }
      const index = geometry.index;
      for (let i = 0; i < (index ? index.count : vertices.count); i++) {
        indices.push(offset + (index ? index.getX(i) : i));
      }
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
    geometry.setAttribute("normal", new THREE.Float32BufferAttribute(normals, 3));
    geometry.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
    geometry.setIndex(indices);
    return geometry;
  }

  class CrowdBatch {
    constructor(scene, model, capacity) {
      this.model = model;
      this.time = 0;
      this.parts = [];
      this.entries = [];
      this.poses = new Map();
      this.transform = new THREE.Object3D();
      this.matrix = new THREE.Matrix4();
      this.tint = new THREE.InstancedBufferAttribute(new Float32Array(capacity * 2), 2);
      this.tint.setUsage(THREE.DynamicDrawUsage);

      const source = [];
      model.group.traverse((part) => {
        if (!part.isMesh) return;
        part.updateMatrix();
        source.push({ part, initial: part.matrix.clone(), moves: false });
      });
      for (const [mode, time] of [["move", 0.27], ["move", 1.08], ["attack", 0.38], ["hit", 0.71], ["idle", 1.3]]) {
        model.update(0, mode, time);
        for (const item of source) {
          item.part.updateMatrix();
          item.moves ||= !item.initial.equals(item.part.matrix);
        }
      }

      const rigid = new Map();
      const materials = new Set();
      for (const { part, moves } of source) {
        materials.add(part.material);
        if (moves) this.addPart(scene, part, part.geometry, part.material, capacity);
        else {
          if (!rigid.has(part.parent)) rigid.set(part.parent, new Map());
          const siblings = rigid.get(part.parent);
          if (!siblings.has(part.material)) siblings.set(part.material, []);
          siblings.get(part.material).push(part);
        }
      }
      for (const [parent, siblings] of rigid) {
        for (const [material, meshes] of siblings) {
          this.addPart(scene, parent, mergeParts(meshes), material, capacity);
        }
      }
      for (const material of materials) material.onBeforeCompile = addCrowdTint;
    }

    addPart(scene, source, geometry, material, capacity) {
      geometry.setAttribute("medjedTint", this.tint);
      const mesh = new THREE.InstancedMesh(geometry, material, capacity);
      mesh.count = 0;
      mesh.frustumCulled = false;
      mesh.receiveShadow = !material.transparent;
      mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
      scene.add(mesh);
      this.parts.push({ source, mesh });
    }

    sync(dt, soul) {
      this.time += dt;
      const entries = this.entries;
      for (const { mesh } of this.parts) mesh.count = entries.length;
      if (!entries.length) return;
      for (const pose of this.poses.values()) pose.used = false;
      for (let i = 0; i < entries.length; i++) {
        const actor = entries[i];
        const mode = actor.flashTimer > 0 ? "hit" : actor.attackTimer > 0 ? "attack" : actor.stunTimer > 0 ? "idle" : "move";
        const phase = mode === "attack" ? Math.min(3, Math.floor(actor.attackTimer / 0.18)) : actor.index % 2;
        const key = mode + phase;
        if (!this.poses.has(key)) {
          this.poses.set(key, { used: false, matrices: this.parts.map(() => new THREE.Matrix4()) });
        }
        const pose = this.poses.get(key);
        if (!pose.used) {
          const time = mode === "attack" ? 0.08 + 0.15 * phase : this.time + phase * 0.47;
          this.model.update(0, mode, time);
          this.model.group.updateMatrixWorld(true);
          this.parts.forEach(({ source }, j) => pose.matrices[j].copy(source.matrixWorld));
          pose.used = true;
        }

        this.transform.position.set(actor.x, 0, actor.z);
        this.transform.rotation.y = soul ? Math.PI / 2 : actor.rotY;
        this.transform.scale.setScalar(actor.elite ? 1.5 : 1);
        this.transform.updateMatrix();
        this.tint.setXY(i, Math.min(1, actor.flashTimer / (soul ? 0.14 : 0.12)), actor.elite ? 1 : 0);
        this.parts.forEach(({ mesh }, j) => {
          this.matrix.multiplyMatrices(this.transform.matrix, pose.matrices[j]);
          mesh.setMatrixAt(i, this.matrix);
        });
      }
      entries.length = 0;
      this.tint.needsUpdate = true;
      for (const { mesh } of this.parts) mesh.instanceMatrix.needsUpdate = true;
    }
  }

  class CrowdModels {
    constructor(scene, models, capacity, soul) {
      this.scene = scene;
      this.models = models;
      this.batches = new Map();
      this.capacity = capacity;
      this.soul = soul;
      this.elapsed = 0;
      this.dirty = true;
    }

    sync(actors) {
      const dt = this.elapsed;
      if (!this.dirty && dt === 0) return;
      this.elapsed = 0;
      this.dirty = false;
      for (let i = 0; i < actors.length; i++) {
        const actor = actors[i];
        if (!actor.active) continue;
        if (!this.batches.has(actor.type)) {
          const model = this.models[crowdFactories[actor.type]]();
          this.batches.set(actor.type, new CrowdBatch(this.scene, model, this.capacity));
        }
        this.batches.get(actor.type).entries.push(actor);
      }
      for (const batch of this.batches.values()) batch.sync(dt, this.soul);
    }
  }

  function createBoss(models, type) {
    const model = models[bossFactories[type]]();
    const materials = new Map();
    model.group.traverse((part) => {
      if (!part.isMesh || !part.material.emissive) return;
      const material = part.material;
      if (!materials.has(material)) materials.set(material, {
        color: material.emissive.clone(), intensity: material.emissiveIntensity,
      });
    });
    return { ...model, materials };
  }

  function buildSolarBarque(models) {
    const model = models.createPCSolarBarque();
    const groups = [];
    model.group.traverse((part) => { if (part.isGroup) groups.push(part); });
    // Each group moves independently. Its rigid pieces can share a single draw per material.
    for (const group of groups) {
      const pieces = new Map();
      for (const part of group.children) {
        if (!part.isMesh) continue;
        part.castShadow = false;
        part.receiveShadow = false;
        if (!pieces.has(part.material)) pieces.set(part.material, []);
        pieces.get(part.material).push(part);
      }
      for (const [material, siblings] of pieces) {
        if (siblings.length === 1) continue;
        for (const part of siblings) part.updateMatrix();
        const geometry = mergeParts(siblings);
        group.remove(...siblings);
        group.add(new THREE.Mesh(geometry, material));
        for (const part of siblings) part.geometry.dispose();
      }
    }
    return model;
  }

  function useDetailedSkills(models, skills) {
    const effect = (id, level) => models.createSkillShowcase(id, id, { effectOnly: true, level });
    const eye = effect("eye_beam", 10).parts.rings[0];
    const rings = skills.beams.map((beam) => Array.from({ length: 4 }, (_, i) => {
      const ring = eye.clone();
      ring.position.z = (i + 1) / 5;
      ring.visible = false;
      beam.add(ring);
      return ring;
    }));

    const flame = effect("mouth_flame", 1).parts.flames[0].m;
    skills.flameMesh.geometry.dispose();
    skills.flameMesh.geometry = flame.geometry;
    const flameColors = [0xffe044, 0xff4500, 0x00f0ff, 0x0055ff].map((hex) => new THREE.Color(hex));

    const step = effect("invisible_step", 10).parts.rings;
    skills.shockwaveMesh.geometry.dispose();
    skills.shockwaveMesh.geometry = step[0].ring.geometry;
    const ripples = step.slice(1).map(({ ring }, i) => {
      const ripple = new THREE.Mesh(ring.geometry, ring.material);
      ripple.position.z = 0.06 * (i + 1);
      ripple.scale.setScalar(0.76 - i * 0.18);
      skills.shockwaveMesh.add(ripple);
      return ripple;
    });

    const scarab = effect("scarab_swarm", 1).parts.scarabs[0].sc;
    skills.scarabMesh.geometry.dispose();
    skills.scarabMesh.material.dispose();
    skills.scarabMesh.geometry = scarab.geometry;
    skills.scarabMesh.material = scarab.material;

    const scales = effect("anubis_scales", 1).parts.scales[0].bar;
    for (const slot of skills.scalesPool) {
      // The position and tilt follow the chosen target and hit timing.
      const detail = scales.clone();
      detail.position.copy(slot.bar.position);
      slot.g.remove(slot.bar);
      slot.bar.geometry.dispose();
      slot.g.add(detail);
      slot.bar = detail;
    }

    disposeModel(skills.barrierGroup);
    skills.barrierGroup.clear();
    const pyramids = [1, 5, 10].map((level) => {
      const { fx } = effect("pyramid_barrier", level);
      const bounds = new THREE.Box3().setFromObject(fx);
      const size = bounds.getSize(new THREE.Vector3());
      fx.scale.set(Math.SQRT2 / size.x, 2.2 / size.y, Math.SQRT2 / size.z);
      fx.position.y = -bounds.min.y * fx.scale.y;
      fx.visible = false;
      skills.barrierGroup.add(fx);
      return fx;
    });

    skills.nileMesh.geometry.dispose();
    skills.nileMesh.material.dispose();
    const waves = [1, 5, 10].map((level) => {
      const wave = effect("nile_flood", level).parts.wave.children[0];
      wave.updateMatrix();
      const geometry = wave.geometry;
      geometry.applyMatrix4(wave.matrix);
      geometry.center();
      geometry.computeBoundingBox();
      const size = geometry.boundingBox.getSize(new THREE.Vector3());
      geometry.scale(1 / size.x, 1.1 / size.y, 1.4 / size.z);
      return wave;
    });

    let elapsed = 0;
    return {
      update(dt) {
        elapsed += dt;
        const eyeLevel = skills.getLevel("eye_beam");
        eye.material.opacity = skills.beamOuterMat.opacity * 0.85;
        rings.forEach((row, i) => row.forEach((ring, j) => {
          ring.visible = skills.beams[i].visible && (eyeLevel === 10 || (eyeLevel >= 5 && j === 1));
          if (ring.visible) {
            ring.scale.z = skills.beams[i].scale.x / skills.beams[i].scale.z;
            ring.rotation.z = elapsed * 8 + j;
          }
        }));

        if (skills.flameMesh.count) {
          const palette = skills.getLevel("mouth_flame") === 10 ? 2 : 0;
          skills.flameMesh.material.color.setHex(0xffffff);
          for (let i = 0; i < skills.flameMesh.count; i++) skills.flameMesh.setColorAt(i, flameColors[palette + i % 2]);
          skills.flameMesh.instanceColor.needsUpdate = true;
        }

        const stepLevel = skills.getLevel("invisible_step");
        ripples.forEach((ripple, i) => {
          ripple.visible = stepLevel >= (i === 0 ? 5 : 10);
          ripple.material.opacity = skills.shockwaveMat.opacity * (0.74 - 0.17 * i);
        });

        const pyramidLevel = skills.getLevel("pyramid_barrier");
        const pyramidTier = pyramidLevel === 10 ? 2 : pyramidLevel >= 5 ? 1 : 0;
        pyramids.forEach((pyramid, i) => { pyramid.visible = i === pyramidTier; });

        const nileLevel = skills.getLevel("nile_flood");
        const wave = waves[nileLevel === 10 ? 2 : nileLevel >= 5 ? 1 : 0];
        skills.nileMesh.geometry = wave.geometry;
        skills.nileMesh.material = wave.material;
      },
    };
  }

  window.MedjedHighGraphics = { CrowdModels, createBoss, disposeModel, studioReflection, buildSolarBarque, useDetailedSkills };
})();
