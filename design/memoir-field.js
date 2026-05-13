/* ============================================================
   memoir field — 3D scene + state
   ============================================================ */

(() => {
  const PAPER = 0xF4F4F1;
  const INK   = 0x0A0A0A;
  const INK70 = 0x3D3D3D;
  const INK50 = 0x6B6B6B;
  const INK30 = 0xA8A8A6;
  const INK20 = 0xC9C9C5;
  const RED   = 0xF74737;
  const MINT  = 0x05E9A5;

  /* ---------- deterministic rng ---------- */
  function hashStr(s) {
    let h = 2166136261 >>> 0;
    for (let i = 0; i < s.length; i++) {
      h ^= s.charCodeAt(i);
      h = Math.imul(h, 16777619) >>> 0;
    }
    return h >>> 0;
  }
  function mulberry32(a) {
    return function () {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  /* ---------- state ---------- */
  const STORAGE_KEY = 'memoir-field-v2';

  const seedTrees = [
    {
      id: 'p1', name: 'interactive editor', year: '2024', lead: 'sohye',
      desc: 'a small webgl text editor with cursor-trailing motion. learned more about animation curves than text.',
      x: -6, z: -3, seed: hashStr('interactive editor'),
      memos: [
        { author: 'jun', text: 'the cursor easing took us 3 weekends. worth it.', t: 1716000000000 },
        { author: 'mira', text: 'first time i shipped something with a custom shader.', t: 1718500000000 },
      ]
    },
    {
      id: 'p2', name: 'portfolio v3', year: '2025', lead: 'sohye',
      desc: 'this very site, in its third lifetime. fewer pages, more silence.',
      x: 4, z: -7, seed: hashStr('portfolio v3'),
      memos: [
        { author: 'sohye', text: 'cut everything until only the work was left. that took the longest.', t: 1735600000000 },
      ]
    },
    {
      id: 'p3', name: 'thread reader', year: '2025', lead: 'lin',
      desc: 'a calmer way to read long forum threads. weekend sketch that grew.',
      x: -2, z: 6, seed: hashStr('thread reader'),
      memos: [
        { author: 'lin', text: 'the typography was the entire product, in the end.', t: 1738500000000 },
        { author: 'jun', text: 'reading-pace pacing felt magic.', t: 1739500000000 },
        { author: 'sohye', text: '14px source code pro carried us.', t: 1740500000000 },
      ]
    },
    {
      id: 'p4', name: 'console log', year: '2026', lead: 'sohye',
      desc: 'an internal tool for the team. a memoir of every project we shipped.',
      x: 9, z: 2, seed: hashStr('console log'),
      memos: []
    },
  ];

  let state = loadState();

  function loadState() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const s = JSON.parse(raw);
        if (s && Array.isArray(s.trees)) {
          if (s.trees.length > 0 && !s.onboarded) s.onboarded = true;
          return s;
        }
      }
    } catch (e) { /* fallthrough */ }
    return { admin: false, onboarded: false, mode: null, trees: [], fallen: [] };
  }
  // ensure fallen exists on older saves
  if (!Array.isArray(state.fallen)) state.fallen = [];
  // purge anything older than 30 days
  const THIRTY_DAYS = 30 * 24 * 60 * 60 * 1000;
  state.fallen = state.fallen.filter(f => Date.now() - f.fellAt < THIRTY_DAYS);
  function saveState() {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch (e) {}
  }

  /* ---------- THREE setup ---------- */
  const canvas = document.getElementById('scene');
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setClearColor(PAPER, 1);
  renderer.shadowMap.enabled = false;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(PAPER);
  scene.fog = new THREE.Fog(PAPER, 18, 70);

  const camera = new THREE.PerspectiveCamera(60, 1, 0.1, 200);
  camera.position.set(0, 1.7, 8);

  function resize() {
    const w = window.innerWidth, h = window.innerHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }
  window.addEventListener('resize', resize);
  resize();

  /* ---------- ground ---------- */
  // ground texture: subtle radial gradient + grain so it doesn't read flat
  function makeGroundTexture() {
    const W = 1024;
    const c = document.createElement('canvas');
    c.width = W; c.height = W;
    const ctx = c.getContext('2d');
    // very light base
    ctx.fillStyle = '#F2F1ED';
    ctx.fillRect(0, 0, W, W);
    // pronounced darkening toward edges — reads like ambient occlusion
    const g = ctx.createRadialGradient(W/2, W/2, W*0.08, W/2, W/2, W*0.7);
    g.addColorStop(0, 'rgba(248,247,243,1.0)');
    g.addColorStop(0.35, 'rgba(220,219,213,0.9)');
    g.addColorStop(0.7, 'rgba(168,166,160,0.85)');
    g.addColorStop(1, 'rgba(110,108,103,0.95)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, W);
    // large soft blobs — organic ground variation
    for (let i = 0; i < 24; i++) {
      const x = Math.random() * W;
      const y = Math.random() * W;
      const r = 60 + Math.random() * 180;
      const v = 130 + Math.floor(Math.random() * 90);
      const grd = ctx.createRadialGradient(x, y, 0, x, y, r);
      grd.addColorStop(0, `rgba(${v},${v},${v-6},${0.06 + Math.random()*0.08})`);
      grd.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = grd;
      ctx.fillRect(x-r, y-r, r*2, r*2);
    }
    for (let i = 0; i < 1800; i++) {
      const x = Math.random() * W;
      const y = Math.random() * W;
      const r = 0.5 + Math.random() * 1.6;
      const v = 200 + Math.floor(Math.random() * 40);
      ctx.fillStyle = `rgba(${v},${v},${v - 4},${0.05 + Math.random() * 0.12})`;
      ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
    }
    for (let i = 0; i < 90; i++) {
      ctx.strokeStyle = `rgba(160,160,156,${0.03 + Math.random() * 0.05})`;
      ctx.lineWidth = 0.8 + Math.random() * 1.2;
      const x = Math.random() * W;
      const y = Math.random() * W;
      const len = 30 + Math.random() * 80;
      const a = Math.random() * Math.PI * 2;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + Math.cos(a) * len, y + Math.sin(a) * len);
      ctx.stroke();
    }
    const tex = new THREE.CanvasTexture(c);
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(3, 3);
    tex.anisotropy = 8;
    return tex;
  }
  // big vignette overlay plane — stronger center-bright, edge-darker effect
  function makeVignetteTexture() {
    const W = 1024;
    const c = document.createElement('canvas');
    c.width = W; c.height = W;
    const ctx = c.getContext('2d');
    ctx.clearRect(0, 0, W, W);
    const g = ctx.createRadialGradient(W/2, W/2, W*0.05, W/2, W/2, W*0.55);
    g.addColorStop(0, 'rgba(255,254,250,0.45)');
    g.addColorStop(0.4, 'rgba(244,244,241,0.0)');
    g.addColorStop(0.75, 'rgba(120,118,112,0.18)');
    g.addColorStop(1, 'rgba(60,58,54,0.55)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, W);
    const tex = new THREE.CanvasTexture(c);
    return tex;
  }
  const groundMat = new THREE.MeshBasicMaterial({ map: makeGroundTexture() });
  const groundGeo = new THREE.PlaneGeometry(400, 400);
  const ground = new THREE.Mesh(groundGeo, groundMat);
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = 0;
  scene.add(ground);

  // big radial vignette overlay so the field reads volumetric, not flat
  const vignetteMat = new THREE.MeshBasicMaterial({
    map: makeVignetteTexture(),
    transparent: true,
    depthWrite: false,
  });
  const vignette = new THREE.Mesh(new THREE.PlaneGeometry(220, 220), vignetteMat);
  vignette.rotation.x = -Math.PI / 2;
  vignette.position.y = 0.002;
  scene.add(vignette);

  // hairline grid (architectural) — very subtle
  const grid = new THREE.GridHelper(200, 100, 0xC9C9C5, 0xE0E0DC);
  grid.position.y = 0.001;
  grid.material.transparent = true;
  grid.material.opacity = 0.10;
  scene.add(grid);

  // lighting — lit materials so trunks have form
  const hemi = new THREE.HemisphereLight(0xffffff, 0xbab8b2, 0.85);
  scene.add(hemi);
  const sun = new THREE.DirectionalLight(0xffffff, 0.9);
  sun.position.set(8, 12, 5);
  scene.add(sun);
  const fill = new THREE.DirectionalLight(0xd9d8d2, 0.35);
  fill.position.set(-6, 4, -8);
  scene.add(fill);

  // a single bold horizon line — section divider feel
  const horizonGeo = new THREE.BufferGeometry().setFromPoints([
    new THREE.Vector3(-200, 0.005, 0),
    new THREE.Vector3(200, 0.005, 0),
  ]);
  // skip — fog handles horizon

  /* ---------- materials ---------- */
  // shared bark texture (procedural, monochrome) reused across all trunks
  function makeBarkTexture() {
    const W = 256, H = 1024;
    const c = document.createElement('canvas');
    c.width = W; c.height = H;
    const ctx = c.getContext('2d');
    ctx.fillStyle = '#2a2826';
    ctx.fillRect(0, 0, W, H);
    // vertical streaks
    for (let i = 0; i < 240; i++) {
      const x = Math.random() * W;
      const w = 0.6 + Math.random() * 2.4;
      const v = 20 + Math.floor(Math.random() * 80);
      ctx.fillStyle = `rgba(${v},${v-3},${v-6},${0.25 + Math.random()*0.5})`;
      ctx.fillRect(x, 0, w, H);
    }
    // horizontal short cracks
    for (let i = 0; i < 700; i++) {
      const x = Math.random() * W;
      const y = Math.random() * H;
      const len = 4 + Math.random() * 18;
      const v = Math.floor(Math.random() * 40);
      ctx.strokeStyle = `rgba(${v},${v},${v},${0.15 + Math.random()*0.35})`;
      ctx.lineWidth = 0.5 + Math.random() * 0.8;
      ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + len, y + (Math.random()-0.5)*2); ctx.stroke();
    }
    // soft mottled patches
    for (let i = 0; i < 60; i++) {
      const x = Math.random() * W;
      const y = Math.random() * H;
      const r = 8 + Math.random() * 30;
      const v = 30 + Math.floor(Math.random() * 60);
      const g = ctx.createRadialGradient(x, y, 0, x, y, r);
      g.addColorStop(0, `rgba(${v},${v},${v-4},${0.18 + Math.random()*0.18})`);
      g.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = g;
      ctx.fillRect(x-r, y-r, r*2, r*2);
    }
    const tex = new THREE.CanvasTexture(c);
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    tex.anisotropy = 8;
    return tex;
  }
  const barkTex = makeBarkTexture();
  function trunkMaterialFor(seed) {
    const r = mulberry32(seed >>> 0)();
    // gray range from #0F0E0D to ~#48433d (warmer, like bark)
    const v = Math.floor(15 + r * 55);
    const warm = Math.floor(v * 0.88);
    const hex = (v << 16) | (v << 8) | warm;
    return new THREE.MeshStandardMaterial({
      color: hex,
      map: barkTex,
      roughness: 0.95,
      metalness: 0.0,
    });
  }
  const trunkMat = trunkMaterialFor(0);
  const trunkMatHover = new THREE.MeshStandardMaterial({ color: 0x3a3833, roughness: 0.95 });
  const stringMat = new THREE.LineBasicMaterial({ color: INK70, transparent: true, opacity: 0.6 });
  const ringMatBase = new THREE.LineBasicMaterial({ color: INK20, transparent: true, opacity: 0.7 });
  const ringMatHover = new THREE.LineBasicMaterial({ color: MINT });
  const ringMatActive = new THREE.LineBasicMaterial({ color: RED });

  /* ---------- tree generator ---------- */
  function makeTreeMesh(seed) {
    const rng = mulberry32(seed >>> 0);
    const group = new THREE.Group();
    const tips = [];
    const myTrunkMat = trunkMaterialFor(seed ^ 0x9E3779B1);

    function branch(start, dir, length, thickness, depth) {
      const segs = 1;
      const end = start.clone().add(dir.clone().multiplyScalar(length));

      const r1 = Math.max(0.012, thickness * 0.7);
      const r2 = Math.max(0.014, thickness);
      // more radial segments for rounded silhouette + a tiny taper-bend via slight curve
      const geo = new THREE.CylinderGeometry(r1, r2, length, 12, 3, false);
      // bend the geometry slightly to remove the perfect-cylinder feel
      {
        const pos = geo.attributes.position;
        const bendAmt = (rng() - 0.5) * 0.06 * length;
        const bendDir = rng() * Math.PI * 2;
        const bx = Math.cos(bendDir) * bendAmt;
        const bz = Math.sin(bendDir) * bendAmt;
        for (let pi = 0; pi < pos.count; pi++) {
          const py = pos.getY(pi);
          const t = (py / length + 0.5);
          const k = Math.sin(t * Math.PI);
          pos.setX(pi, pos.getX(pi) + bx * k);
          pos.setZ(pi, pos.getZ(pi) + bz * k);
        }
        pos.needsUpdate = true;
        geo.computeVertexNormals();
      }
      const mesh = new THREE.Mesh(geo, myTrunkMat);
      // position at midpoint between start and end
      const mid = start.clone().add(end).multiplyScalar(0.5);
      mesh.position.copy(mid);
      // orient: cylinder default axis is +Y. rotate to dir.
      const up = new THREE.Vector3(0, 1, 0);
      const q = new THREE.Quaternion().setFromUnitVectors(up, dir.clone().normalize());
      mesh.quaternion.copy(q);
      group.add(mesh);

      if (depth <= 0) {
        // tip — record a point a touch beyond the end for hanging
        tips.push(end.clone());
        return;
      }

      // 2-3 child branches — one is a "leader" that continues mostly straight,
      // others diverge. this prevents the trunk from looking broken at the first split.
      const n = 2 + (rng() < 0.45 ? 1 : 0);
      for (let i = 0; i < n; i++) {
        const isLeader = (i === 0);
        const angleSpread = isLeader ? 0.18 : (0.55 + rng() * 0.5);
        const newDir = dir.clone();
        const perp1 = new THREE.Vector3();
        if (Math.abs(newDir.y) < 0.99) {
          perp1.crossVectors(newDir, up).normalize();
        } else {
          perp1.set(1, 0, 0);
        }
        const perp2 = new THREE.Vector3().crossVectors(newDir, perp1).normalize();
        const a = rng() * Math.PI * 2;
        const tilt = isLeader ? (rng() * 0.18) : (0.45 + rng() * angleSpread);
        const offset = perp1.clone().multiplyScalar(Math.cos(a) * tilt)
          .add(perp2.clone().multiplyScalar(Math.sin(a) * tilt));
        newDir.add(offset);
        newDir.y += isLeader ? 0.05 : 0.1;
        newDir.normalize();
        const lenScale = isLeader ? (0.78 + rng() * 0.12) : (0.55 + rng() * 0.22);
        const thickScale = isLeader ? (0.82 + rng() * 0.08) : (0.55 + rng() * 0.12);
        branch(end, newDir, length * lenScale, thickness * thickScale, depth - 1);
      }
      // sometimes a tip directly off this junction
      if (rng() < 0.35) tips.push(end.clone());
    }

    // trunk: slight lean
    const leanX = (rng() - 0.5) * 0.18;
    const leanZ = (rng() - 0.5) * 0.18;
    const trunkDir = new THREE.Vector3(leanX, 1, leanZ).normalize();
    const trunkLen = 1.8 + rng() * 0.8;
    const trunkThick = 0.14 + rng() * 0.06;
    const depth = 6;
    branch(new THREE.Vector3(0, 0, 0), trunkDir, trunkLen, trunkThick, depth);

    // base ring (status indicator on the ground)
    const ringPts = [];
    const R = 0.85;
    for (let i = 0; i <= 64; i++) {
      const a = (i / 64) * Math.PI * 2;
      ringPts.push(new THREE.Vector3(Math.cos(a) * R, 0.005, Math.sin(a) * R));
    }
    const ringGeo = new THREE.BufferGeometry().setFromPoints(ringPts);
    const ring = new THREE.LineLoop(ringGeo, ringMatBase);
    group.add(ring);
    group.userData.ring = ring;
    group.userData.tips = tips;

    return group;
  }

  /* ---------- note (paper tag) ---------- */
  function makeNoteTexture(text, author, t) {
    const W = 256, H = 360;
    const canvas = document.createElement('canvas');
    canvas.width = W; canvas.height = H;
    const ctx = canvas.getContext('2d');
    // age in days (fallback to fresh if no timestamp)
    const ageDays = t ? Math.max(0, (Date.now() - t) / 86400000) : 0;
    // age curve 0..1 saturates around 180d
    const a = Math.min(1, ageDays / 180);
    // paper bg: fresh #F4F4F1 → aged warm cream
    const lerp = (x, y, k) => Math.round(x + (y - x) * k);
    const pr = lerp(244, 224, a), pg = lerp(244, 210, a), pb = lerp(241, 184, a);
    const paperBg = `rgb(${pr},${pg},${pb})`;
    // border: gray → tan
    const br = lerp(201, 178, a), bg = lerp(201, 158, a), bb = lerp(197, 124, a);
    const borderColor = `rgb(${br},${bg},${bb})`;
    // text ink: pure ink → softened
    const inkAlpha = 1 - a * 0.25;
    const inkColor = `rgba(10,10,10,${inkAlpha.toFixed(3)})`;
    // age stains intensity
    const stainAlpha = a * 0.18;

    ctx.fillStyle = paperBg;
    ctx.fillRect(0, 0, W, H);
    // foxing stains (only on aged paper)
    if (a > 0.15) {
      for (let i = 0; i < 6 + Math.floor(a * 10); i++) {
        const sx = Math.random() * W, sy = Math.random() * H;
        const sr = 20 + Math.random() * 60;
        const sg = ctx.createRadialGradient(sx, sy, 0, sx, sy, sr);
        sg.addColorStop(0, `rgba(150,110,60,${stainAlpha.toFixed(3)})`);
        sg.addColorStop(1, 'rgba(150,110,60,0)');
        ctx.fillStyle = sg;
        ctx.fillRect(sx - sr, sy - sr, sr*2, sr*2);
      }
    }
    ctx.strokeStyle = borderColor;
    ctx.lineWidth = 2;
    ctx.strokeRect(1, 1, W - 2, H - 2);
    ctx.fillStyle = `rgb(${lerp(236,210,a)},${lerp(236,196,a)},${lerp(232,172,a)})`;
    ctx.beginPath();
    ctx.arc(W/2, 18, 7, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = `rgb(${lerp(168,138,a)},${lerp(168,124,a)},${lerp(166,98,a)})`;
    ctx.lineWidth = 1.2;
    ctx.stroke();

    ctx.fillStyle = inkColor;
    ctx.font = '500 17px "Source Code Pro", monospace';
    ctx.textBaseline = 'top';
    const lines = wrap(ctx, text || '', W - 36);
    let y = 46;
    const maxLines = 9;
    for (let i = 0; i < Math.min(lines.length, maxLines); i++) {
      let line = lines[i];
      if (i === maxLines - 1 && lines.length > maxLines) line = line.slice(0, -1) + '…';
      ctx.fillText(line, 18, y);
      y += 22;
    }

    ctx.strokeStyle = `rgba(180,170,140,${0.55 + a * 0.2})`;
    ctx.beginPath();
    ctx.moveTo(18, H - 36); ctx.lineTo(W - 18, H - 36);
    ctx.stroke();
    ctx.font = '400 13px "Source Code Pro", monospace';
    ctx.fillStyle = `rgba(107,107,107,${(0.85 - a * 0.15).toFixed(3)})`;
    ctx.fillText('— ' + (author || 'anon'), 18, H - 28);

    const tex = new THREE.CanvasTexture(canvas);
    tex.anisotropy = 4;
    tex.minFilter = THREE.LinearFilter;
    tex.magFilter = THREE.LinearFilter;
    return tex;
  }
  function wrap(ctx, text, maxW) {
    const words = (text || '').split(/(\s+)/);
    const lines = [];
    let line = '';
    for (const w of words) {
      const test = line + w;
      if (ctx.measureText(test).width > maxW && line.trim().length > 0) {
        lines.push(line.trimEnd());
        line = w.trimStart();
      } else {
        line = test;
      }
    }
    if (line.trim().length) lines.push(line);
    return lines;
  }

  function makeNoteMesh(memo, anchor, rng, treeId, memoIdx) {
    const grp = new THREE.Group();
    // string
    const stringLen = 0.22 + rng() * 0.14;
    const noteW = 0.52, noteH = 0.74;
    const stringTop = anchor.clone();
    const noteCenter = anchor.clone();
    noteCenter.y -= stringLen + noteH / 2;
    // string drift
    noteCenter.x += (rng() - 0.5) * 0.05;
    noteCenter.z += (rng() - 0.5) * 0.05;

    const stringGeo = new THREE.BufferGeometry().setFromPoints([
      stringTop,
      new THREE.Vector3(noteCenter.x, anchor.y - stringLen, noteCenter.z),
    ]);
    const str = new THREE.Line(stringGeo, stringMat);
    grp.add(str);

    // paper plane (front)
    const tex = makeNoteTexture(memo.text, memo.author, memo.t);
    const ageDays = memo.t ? Math.max(0, (Date.now() - memo.t) / 86400000) : 0;
    const a = Math.min(1, ageDays / 180);
    const planeGeo = new THREE.PlaneGeometry(noteW, noteH);
    const planeMat = new THREE.MeshBasicMaterial({
      map: tex, side: THREE.DoubleSide, transparent: a > 0.5,
      opacity: 1 - a * 0.18,
    });
    const plane = new THREE.Mesh(planeGeo, planeMat);
    plane.position.copy(noteCenter);
    plane.userData.isMemo = true;
    plane.userData.treeId = treeId;
    plane.userData.memoIdx = memoIdx;

    // thin paper edge — a slightly smaller dark backing creates the perceived thickness
    const edgeGeo = new THREE.PlaneGeometry(noteW + 0.01, noteH + 0.01);
    const edgeMat = new THREE.MeshBasicMaterial({ color: 0xC9C9C5, side: THREE.DoubleSide });
    const edge = new THREE.Mesh(edgeGeo, edgeMat);
    edge.position.copy(noteCenter);
    edge.position.y -= 0.005;
    edge.position.x -= 0.005;
    edge.position.z -= 0.003;
    edge.userData.isMemoEdge = true;
    edge.userData.treeId = treeId;
    edge.userData.memoIdx = memoIdx;

    // initial sway anchor for animation
    grp.userData.plane = plane;
    grp.userData.edge = edge;
    grp.userData.swayPhase = rng() * Math.PI * 2;
    grp.userData.baseY = noteCenter.y;
    grp.userData.baseRotY = rng() * Math.PI * 2;
    grp.userData.anchorTop = stringTop.clone();
    grp.userData.noteCenter = noteCenter.clone();
    plane.rotation.y = grp.userData.baseRotY;
    plane.rotation.x = (rng() - 0.5) * 0.08;
    edge.rotation.copy(plane.rotation);
    grp.add(edge);
    grp.add(plane);

    return grp;
  }

  /* ---------- ambient (background) trees ---------- */
  function makeAmbientForest() {
    const grp = new THREE.Group();
    // sparse ring of distant trees, simpler/lower depth
    const rng = mulberry32(424242);
    const placed = [];
    function tooClose(x, z, min) {
      // also avoid project tree positions
      for (const t of state.trees) {
        const dx = t.x - x, dz = t.z - z;
        if (dx*dx + dz*dz < min*min) return true;
      }
      for (const p of placed) {
        const dx = p.x - x, dz = p.z - z;
        if (dx*dx + dz*dz < 6*6) return true;
      }
      return false;
    }
    let count = 0;
    let tries = 0;
    while (count < 60 && tries < 1500) {
      tries++;
      const r = 14 + rng() * 40;
      const a = rng() * Math.PI * 2;
      const x = Math.cos(a) * r;
      const z = Math.sin(a) * r;
      if (tooClose(x, z, 4.5)) continue;
      const t = makeAmbientTree(hashStr('amb-' + count + '-' + Math.floor(x*10) + ',' + Math.floor(z*10)));
      t.position.set(x, 0, z);
      // sink slightly into fog
      grp.add(t);
      placed.push({ x, z });
      count++;
    }
    return grp;
  }
  function makeAmbientTree(seed) {
    // simpler tree: thinner, fewer branches, no notes, no ring
    const rng = mulberry32(seed >>> 0);
    const group = new THREE.Group();

    function branch(start, dir, length, thickness, depth) {
      const end = start.clone().add(dir.clone().multiplyScalar(length));
      const r1 = Math.max(0.008, thickness * 0.7);
      const r2 = Math.max(0.01, thickness);
      const geo = new THREE.CylinderGeometry(r1, r2, length, 5, 1, false);
      const mesh = new THREE.Mesh(geo, trunkMat);
      const mid = start.clone().add(end).multiplyScalar(0.5);
      mesh.position.copy(mid);
      const up = new THREE.Vector3(0, 1, 0);
      const q = new THREE.Quaternion().setFromUnitVectors(up, dir.clone().normalize());
      mesh.quaternion.copy(q);
      group.add(mesh);
      if (depth <= 0) return;
      const n = 2 + (rng() < 0.3 ? 1 : 0);
      for (let i = 0; i < n; i++) {
        const newDir = dir.clone();
        const perp1 = new THREE.Vector3();
        if (Math.abs(newDir.y) < 0.99) perp1.crossVectors(newDir, up).normalize();
        else perp1.set(1, 0, 0);
        const perp2 = new THREE.Vector3().crossVectors(newDir, perp1).normalize();
        const a = rng() * Math.PI * 2;
        const tilt = 0.4 + rng() * 0.5;
        const offset = perp1.clone().multiplyScalar(Math.cos(a) * tilt)
          .add(perp2.clone().multiplyScalar(Math.sin(a) * tilt));
        newDir.add(offset).add(new THREE.Vector3(0, 0.1, 0));
        newDir.normalize();
        branch(end, newDir, length * (0.6 + rng() * 0.18), thickness * 0.65, depth - 1);
      }
    }
    const trunkDir = new THREE.Vector3((rng()-0.5)*0.2, 1, (rng()-0.5)*0.2).normalize();
    branch(new THREE.Vector3(), trunkDir, 1.4 + rng()*0.6, 0.08 + rng()*0.04, 4);
    // scale for variety
    const s = 0.85 + rng() * 0.5;
    group.scale.set(s, s, s);
    return group;
  }

  // ambient forest disabled — the field starts and stays as the user planted it
  // scene.add(makeAmbientForest());

  /* ---------- project tree management ---------- */
  const treeGroups = new Map(); // id -> THREE.Group (full project tree, includes notes)
  const treeData = new Map();   // id -> tree obj (live ref)

  function buildTreeNotes(group, tree) {
    // remove previous notes
    if (group.userData.notesGrp) {
      group.remove(group.userData.notesGrp);
      group.userData.notesGrp.traverse(o => {
        if (o.geometry) o.geometry.dispose();
        if (o.material) {
          if (o.material.map) o.material.map.dispose();
          o.material.dispose();
        }
      });
    }
    const notesGrp = new THREE.Group();
    const tips = group.userData.tips || [];
    if (tips.length === 0) { group.add(notesGrp); group.userData.notesGrp = notesGrp; return; }
    const rng = mulberry32(tree.seed >>> 0);
    // shuffle tips deterministically per tree, then assign memos in order
    const tipOrder = [...tips].map((p, i) => ({ p, k: rng() })).sort((a, b) => a.k - b.k).map(o => o.p);
    for (let i = 0; i < tree.memos.length; i++) {
      const memo = tree.memos[i];
      const tip = tipOrder[i % tipOrder.length];
      const noteRng = mulberry32(hashStr(tree.id + ':' + i));
      const note = makeNoteMesh(memo, tip, noteRng, tree.id, i);
      notesGrp.add(note);
    }
    // ghost hint note on empty trees — invites the first memo
    if (tree.memos.length === 0) {
      const tip = tipOrder[0];
      const ghostRng = mulberry32(hashStr(tree.id + ':ghost'));
      const ghost = makeNoteMesh(
        { text: 'tie the first memo here.', author: '— hint', t: Date.now() },
        tip, ghostRng, tree.id, -1
      );
      ghost.userData.isGhost = true;
      ghost.traverse(o => {
        if (o.material) {
          o.material.transparent = true;
          o.material.opacity = 0.45;
          o.material.depthWrite = false;
        }
      });
      notesGrp.add(ghost);
    }
    group.add(notesGrp);
    group.userData.notesGrp = notesGrp;
  }

  function plantTree(tree) {
    const g = makeTreeMesh(tree.seed);
    g.position.set(tree.x, 0, tree.z);
    g.userData.id = tree.id;
    buildTreeNotes(g, tree);
    scene.add(g);
    treeGroups.set(tree.id, g);
    treeData.set(tree.id, tree);
  }
  function rebuildAll() {
    for (const [id, g] of treeGroups) scene.remove(g);
    treeGroups.clear();
    treeData.clear();
    for (const t of state.trees) plantTree(t);
  }
  rebuildAll();

  /* ---------- camera + controls ---------- */
  const ctrl = {
    yaw: 0,
    pitch: -0.05,
    pos: new THREE.Vector3(0, 1.7, 8),
    keys: { w:false, a:false, s:false, d:false, shift:false },
    dragging: false,
    lastX: 0, lastY: 0,
    targetTreeId: null, // when set, animate camera to that tree
    flyT: 0,
    flyFrom: null, flyTo: null, flyTarget: null,
  };

  function onMouseDown(e) {
    if (e.target !== canvas) return;
    if (modal.classList.contains('open')) return;
    ctrl.dragging = true;
    ctrl.lastX = e.clientX;
    ctrl.lastY = e.clientY;
    cursor.classList.add('drag');
  }
  function onMouseUp() {
    if (ctrl.dragging) {
      ctrl.dragging = false;
      cursor.classList.remove('drag');
    }
  }
  function onMouseMove(e) {
    cursor.style.left = e.clientX + 'px';
    cursor.style.top = e.clientY + 'px';
    if (ctrl.dragging) {
      const dx = e.clientX - ctrl.lastX;
      const dy = e.clientY - ctrl.lastY;
      ctrl.lastX = e.clientX;
      ctrl.lastY = e.clientY;
      ctrl.yaw -= dx * 0.0035;
      ctrl.pitch -= dy * 0.0025;
      ctrl.pitch = Math.max(-0.6, Math.min(0.4, ctrl.pitch));
      // cancel any auto-fly when user takes control
      ctrl.flyTo = null;
    }
    // hover detection (only when not dragging)
    if (!ctrl.dragging) hoverPick(e.clientX, e.clientY);
  }
  window.addEventListener('mousedown', onMouseDown);
  window.addEventListener('mouseup', onMouseUp);
  window.addEventListener('mousemove', onMouseMove);

  // wheel / trackpad zoom — walk forward/back along the look direction.
  // smoothed via a velocity term that decays each frame.
  ctrl.zoomVel = 0;
  canvas.addEventListener('wheel', (e) => {
    if (modal.classList.contains('open')) return;
    if (onboard && onboard.classList.contains('open')) return;
    if (e.target !== canvas) return;
    e.preventDefault();
    // normalize: pixel mode (trackpad) → ~10px, line mode (mouse wheel) → ~100px
    const unit = e.deltaMode === 1 ? 16 : (e.deltaMode === 2 ? window.innerHeight : 1);
    const dy = e.deltaY * unit;
    // negative dy = scroll up = zoom in (forward)
    ctrl.zoomVel += -dy * 0.012;
    // cap velocity so a fast flick doesn't fling
    ctrl.zoomVel = Math.max(-12, Math.min(12, ctrl.zoomVel));
    // user took control → cancel auto-fly
    ctrl.flyTo = null;
  }, { passive: false });

  // touch
  canvas.addEventListener('touchstart', (e) => {
    if (modal.classList.contains('open')) return;
    if (e.touches.length === 1) {
      ctrl.dragging = true;
      ctrl.lastX = e.touches[0].clientX;
      ctrl.lastY = e.touches[0].clientY;
    }
  }, { passive: true });
  canvas.addEventListener('touchmove', (e) => {
    if (!ctrl.dragging) return;
    const t = e.touches[0];
    const dx = t.clientX - ctrl.lastX;
    const dy = t.clientY - ctrl.lastY;
    ctrl.lastX = t.clientX; ctrl.lastY = t.clientY;
    ctrl.yaw -= dx * 0.0035;
    ctrl.pitch -= dy * 0.0025;
    ctrl.pitch = Math.max(-0.6, Math.min(0.4, ctrl.pitch));
  }, { passive: true });
  canvas.addEventListener('touchend', () => { ctrl.dragging = false; });

  // keys
  window.addEventListener('keydown', (e) => {
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
    const k = e.key.toLowerCase();
    if (k === 'w' || k === 'arrowup') ctrl.keys.w = true;
    if (k === 'a' || k === 'arrowleft') ctrl.keys.a = true;
    if (k === 's' || k === 'arrowdown') ctrl.keys.s = true;
    if (k === 'd' || k === 'arrowright') ctrl.keys.d = true;
    if (k === 'shift') ctrl.keys.shift = true;
    if (k === 'escape') {
      closeMemoView();
      closeDetail();
      closeModal();
    }
  });
  window.addEventListener('keyup', (e) => {
    const k = e.key.toLowerCase();
    if (k === 'w' || k === 'arrowup') ctrl.keys.w = false;
    if (k === 'a' || k === 'arrowleft') ctrl.keys.a = false;
    if (k === 's' || k === 'arrowdown') ctrl.keys.s = false;
    if (k === 'd' || k === 'arrowright') ctrl.keys.d = false;
    if (k === 'shift') ctrl.keys.shift = false;
  });

  // click select (raycast)
  const raycaster = new THREE.Raycaster();
  const ndc = new THREE.Vector2();
  let hoveredTreeId = null;

  function pickInteractive(clientX, clientY) {
    const rect = canvas.getBoundingClientRect();
    ndc.x = ((clientX - rect.left) / rect.width) * 2 - 1;
    ndc.y = -(((clientY - rect.top) / rect.height) * 2 - 1);
    raycaster.setFromCamera(ndc, camera);
    const meshes = [];
    for (const [id, g] of treeGroups) {
      g.traverse(c => {
        if (!c.isMesh) return;
        if (c.userData.isMemo || c.userData.isMemoEdge) {
          c.userData.treeId = c.userData.treeId || id;
          meshes.push(c);
        } else if (c.geometry && c.geometry.type === 'CylinderGeometry') {
          c.userData.treeId = id;
          c.userData.isTrunk = true;
          meshes.push(c);
        }
      });
    }
    const hits = raycaster.intersectObjects(meshes, false);
    if (hits.length === 0) return null;
    const o = hits[0].object;
    if (o.userData.isMemo || o.userData.isMemoEdge) {
      return { kind: 'memo', treeId: o.userData.treeId, memoIdx: o.userData.memoIdx };
    }
    return { kind: 'tree', treeId: o.userData.treeId };
  }
  function pickTree(clientX, clientY) {
    const r = pickInteractive(clientX, clientY);
    if (r && r.kind === 'tree') return r.treeId;
    return null;
  }
  function hoverPick(x, y) {
    if (modal.classList.contains('open')) { setHover(null); return; }
    const r = pickInteractive(x, y);
    if (r && r.kind === 'memo') {
      setHover(null);
      cursor.classList.add('hot');
      return;
    }
    setHover(r ? r.treeId : null);
  }
  function setHover(id) {
    if (id === hoveredTreeId) return;
    if (hoveredTreeId) {
      const g = treeGroups.get(hoveredTreeId);
      if (g && g.userData.ring) {
        const isActive = state.selected === hoveredTreeId;
        g.userData.ring.material = isActive ? ringMatActive : ringMatBase;
      }
    }
    hoveredTreeId = id;
    if (id) {
      const g = treeGroups.get(id);
      if (g && g.userData.ring) g.userData.ring.material = ringMatHover;
      cursor.classList.add('hot');
    } else {
      cursor.classList.remove('hot');
    }
  }

  canvas.addEventListener('click', (e) => {
    if (modal.classList.contains('open')) return;
    const r = pickInteractive(e.clientX, e.clientY);
    if (r && r.kind === 'memo') {
      openMemoView(r.treeId, r.memoIdx);
      return;
    }
    if (r && r.kind === 'tree') {
      selectTree(r.treeId, true);
    } else {
      // clicking sky/ground deselects
      closeMemoView();
      selectTree(null, false);
    }
  });

  /* ---------- camera fly-to ---------- */
  function flyToTree(id) {
    const tree = treeData.get(id);
    if (!tree) return;
    // place camera ~3.5 units in front of tree, on the side facing current camera direction
    const treePos = new THREE.Vector3(tree.x, 1.4, tree.z);
    const offset = new THREE.Vector3(ctrl.pos.x - tree.x, 0, ctrl.pos.z - tree.z);
    if (offset.lengthSq() < 0.01) offset.set(0, 0, 1);
    offset.normalize().multiplyScalar(3.6);
    const target = new THREE.Vector3(tree.x + offset.x, 1.7, tree.z + offset.z);
    ctrl.flyFrom = ctrl.pos.clone();
    ctrl.flyTo = target;
    ctrl.flyTarget = treePos;
    ctrl.flyT = 0;
  }

  /* ---------- DOM refs ---------- */
  const cursor = document.getElementById('cursor');
  const modal = document.getElementById('modal');
  const detail = document.getElementById('detail');
  const idxList = document.getElementById('idx-list');
  const idxCount = document.getElementById('idx-count');
  const projCounter = document.getElementById('proj-counter');
  const plantBtn = document.getElementById('plant-btn');
  const roleToggle = document.getElementById('role-toggle');
  const roleLabel = document.getElementById('role-label');
  const roleStatus = document.getElementById('role-status');
  const dNum = document.getElementById('d-num');
  const dName = document.getElementById('d-name');
  const dYear = document.getElementById('d-year');
  const dLead = document.getElementById('d-lead');
  const dDesc = document.getElementById('d-desc');
  const dMemos = document.getElementById('d-memos');
  const dCount = document.getElementById('d-count');
  const memoList = document.getElementById('memo-list');
  const memoAuthor = document.getElementById('memo-author');
  const memoText = document.getElementById('memo-text');
  const memoSubmit = document.getElementById('memo-submit');
  const memoCountRem = document.getElementById('memo-count-rem');
  const dClose = document.getElementById('d-close');
  const memoView = document.getElementById('memo-view');
  const mvNum = document.getElementById('mv-num');
  const mvProject = document.getElementById('mv-project');
  const mvText = document.getElementById('mv-text');
  const mvAuthor = document.getElementById('mv-author');
  const mvDate = document.getElementById('mv-date');
  const mvCounter = document.getElementById('mv-counter');
  const mvPrev = document.getElementById('mv-prev');
  const mvNext = document.getElementById('mv-next');
  const mvClose = document.getElementById('mv-close');
  const fName = document.getElementById('f-name');
  const fYear = document.getElementById('f-year');
  const fLead = document.getElementById('f-lead');
  const fDesc = document.getElementById('f-desc');
  const fSubmit = document.getElementById('f-submit');
  const fCancel = document.getElementById('f-cancel');
  const clockEl = document.getElementById('clock');
  const coordX = document.getElementById('coord-x');
  const coordZ = document.getElementById('coord-z');
  const needle = document.getElementById('needle');
  const resetCam = document.getElementById('reset-cam');
  const toastEl = document.getElementById('toast');

  /* ---------- text-zone cursor ---------- */
  document.querySelectorAll('input, textarea').forEach(el => {
    el.addEventListener('mouseenter', () => cursor.classList.add('text-zone'));
    el.addEventListener('mouseleave', () => cursor.classList.remove('text-zone'));
  });
  document.querySelectorAll('button, .idx-item').forEach(el => {
    el.addEventListener('mouseenter', () => cursor.classList.add('hot'));
    el.addEventListener('mouseleave', () => cursor.classList.remove('hot'));
  });
  // delegate for dynamically added items
  document.body.addEventListener('mouseover', (e) => {
    const el = e.target.closest('.idx-item, button');
    if (el) cursor.classList.add('hot');
  });
  document.body.addEventListener('mouseout', (e) => {
    const el = e.target.closest('.idx-item, button');
    if (el && !e.relatedTarget?.closest('.idx-item, button')) cursor.classList.remove('hot');
  });

  /* ---------- memo viewer ---------- */
  let mvCurrent = null; // { treeId, memoIdx }
  function openMemoView(treeId, memoIdx) {
    const tree = treeData.get(treeId);
    if (!tree) return;
    if (memoIdx == null || memoIdx < 0 || memoIdx >= tree.memos.length) return;
    const memo = tree.memos[memoIdx];
    mvCurrent = { treeId, memoIdx };
    const i = state.trees.findIndex(t => t.id === treeId);
    mvNum.textContent = String(i + 1).padStart(2, '0') + '.' + String(memoIdx + 1).padStart(2, '0');
    mvProject.textContent = tree.name;
    mvText.textContent = memo.text || '';
    mvAuthor.textContent = '— ' + (memo.author || 'anon');
    mvDate.textContent = formatDate(memo.t);
    mvCounter.textContent = String(memoIdx + 1).padStart(2, '0') + ' / ' + String(tree.memos.length).padStart(2, '0');
    mvPrev.disabled = (memoIdx <= 0);
    mvNext.disabled = (memoIdx >= tree.memos.length - 1);
    memoView.classList.add('open');
    memoView.setAttribute('aria-hidden', 'false');
  }
  function closeMemoView() {
    mvCurrent = null;
    memoView.classList.remove('open');
    memoView.setAttribute('aria-hidden', 'true');
  }
  function stepMemo(d) {
    if (!mvCurrent) return;
    const tree = treeData.get(mvCurrent.treeId);
    if (!tree) return;
    const next = mvCurrent.memoIdx + d;
    if (next < 0 || next >= tree.memos.length) return;
    openMemoView(mvCurrent.treeId, next);
  }
  mvClose.addEventListener('click', closeMemoView);
  mvPrev.addEventListener('click', () => stepMemo(-1));
  mvNext.addEventListener('click', () => stepMemo(1));

  /* ---------- deletion + recently fallen ---------- */
  const fallenToggle = document.getElementById('fallen-toggle');
  const fallenTray = document.getElementById('fallen-tray');
  const fallenClose = document.getElementById('fallen-close');
  const fallenBody = document.getElementById('fallen-body');
  const fallenBadge = document.getElementById('fallen-badge');
  const mvDelete = document.getElementById('mv-delete');
  const dDelete = document.getElementById('d-delete');
  const confirmModal = document.getElementById('confirm-modal');
  const confirmTitle = document.getElementById('confirm-title');
  const confirmBody = document.getElementById('confirm-body');
  const confirmHelp = document.getElementById('confirm-help');
  const confirmYes = document.getElementById('confirm-yes');
  const confirmCancel = document.getElementById('confirm-cancel');
  let _confirmCb = null;
  function askConfirm({ title, body, help, confirmLabel }, cb) {
    confirmTitle.textContent = title || 'let this go?';
    confirmBody.textContent = body || '';
    confirmHelp.textContent = help || '';
    confirmYes.textContent = confirmLabel || 'let it fall';
    _confirmCb = cb;
    confirmModal.classList.add('open');
  }
  confirmCancel.addEventListener('click', () => confirmModal.classList.remove('open'));
  confirmModal.addEventListener('click', (e) => { if (e.target === confirmModal) confirmModal.classList.remove('open'); });
  confirmYes.addEventListener('click', () => {
    confirmModal.classList.remove('open');
    const cb = _confirmCb; _confirmCb = null;
    if (cb) cb();
  });

  function fmtAgo(t) {
    const ms = Date.now() - t;
    const m = Math.floor(ms / 60000);
    if (m < 1) return 'just now';
    if (m < 60) return m + 'm ago';
    const h = Math.floor(m / 60);
    if (h < 24) return h + 'h ago';
    const d = Math.floor(h / 24);
    return d + 'd ago';
  }
  function renderFallenBadge() {
    const n = state.fallen.length;
    fallenBadge.textContent = String(n);
    fallenToggle.classList.toggle('empty', n === 0);
  }
  function renderFallen() {
    if (state.fallen.length === 0) {
      fallenBody.innerHTML = '<div class="fallen-empty"><div class="leaf">∈</div>nothing has fallen here yet.<br>memos and trees you let go will rest here<br>for thirty days before turning to soil.</div>';
      return;
    }
    const items = [...state.fallen].sort((a,b) => b.fellAt - a.fellAt);
    fallenBody.innerHTML = '';
    for (const f of items) {
      const el = document.createElement('div');
      el.className = 'fallen-item';
      const isTree = f.type === 'tree';
      const kindLabel = isTree ? 'tree' : 'memo';
      const project = isTree ? f.snapshot.name : (f.snapshot.parentName || '—');
      const body = isTree
        ? (f.snapshot.desc || '—')
        : (f.snapshot.text || '');
      const meta = isTree
        ? (f.snapshot.memos?.length || 0) + ' memo' + ((f.snapshot.memos?.length || 0) === 1 ? '' : 's') + ' · lead ' + (f.snapshot.lead || '—')
        : '— ' + (f.snapshot.author || 'anon') + ' · on ' + project;
      el.innerHTML = `
        <div class="kind">↓ ${kindLabel} <span class="ago">${fmtAgo(f.fellAt)}</span></div>
        <div class="body">${escapeHtml(body)}</div>
        <div class="meta">${escapeHtml(meta)}</div>
        <div class="actions">
          <button class="mini" data-act="restore">↑ lift back up</button>
          <button class="mini danger" data-act="purge">turn to soil</button>
        </div>
      `;
      el.querySelector('[data-act="restore"]').addEventListener('click', () => restoreFallen(f.id));
      el.querySelector('[data-act="purge"]').addEventListener('click', () => purgeFallen(f.id));
      fallenBody.appendChild(el);
    }
  }
  function openFallen() {
    renderFallen();
    fallenTray.classList.add('open');
    fallenTray.setAttribute('aria-hidden', 'false');
  }
  function closeFallen() {
    fallenTray.classList.remove('open');
    fallenTray.setAttribute('aria-hidden', 'true');
  }
  fallenToggle.addEventListener('click', () => {
    if (fallenTray.classList.contains('open')) closeFallen(); else openFallen();
  });
  fallenClose.addEventListener('click', closeFallen);

  /* falling-paper animation: spawns at world coords, falls + spins to ground */
  function spawnFallingPaper(worldVec3) {
    const v = worldVec3.clone().project(camera);
    if (v.z > 1) return; // behind camera
    const sx = (v.x * 0.5 + 0.5) * window.innerWidth;
    const sy = (-v.y * 0.5 + 0.5) * window.innerHeight;
    const el = document.createElement('div');
    el.className = 'fall-overlay';
    el.style.left = (sx - 18) + 'px';
    el.style.top = sy + 'px';
    document.body.appendChild(el);
    const drift = (Math.random() - 0.5) * 60;
    const fallY = window.innerHeight - sy - 40;
    const spin = (Math.random() - 0.5) * 180;
    requestAnimationFrame(() => {
      el.style.transform = `translate(${drift}px, ${fallY}px) rotate(${spin}deg)`;
      el.style.opacity = '0';
    });
    setTimeout(() => el.remove(), 1200);
  }

  function deleteMemo(treeId, memoIdx, opts = {}) {
    const tree = treeData.get(treeId);
    if (!tree) return;
    if (memoIdx < 0 || memoIdx >= tree.memos.length) return;
    const memo = tree.memos[memoIdx];
    // try to anchor falling animation at the note's world position
    const g = treeGroups.get(treeId);
    if (g && g.userData.notesGrp && g.userData.notesGrp.children[memoIdx]) {
      const note = g.userData.notesGrp.children[memoIdx];
      const wp = new THREE.Vector3();
      note.getWorldPosition(wp);
      spawnFallingPaper(wp);
    }
    // push to fallen
    state.fallen.push({
      id: 'f' + Date.now().toString(36) + Math.random().toString(36).slice(2,6),
      type: 'memo',
      fellAt: Date.now(),
      parentTreeId: treeId,
      snapshot: { ...memo, parentName: tree.name, originalIdx: memoIdx },
    });
    tree.memos.splice(memoIdx, 1);
    saveState();
    if (g) buildTreeNotes(g, tree);
    if (state.selected === treeId) renderMemos(tree);
    renderFallenBadge();
    if (fallenTray.classList.contains('open')) renderFallen();
    // adjust memo viewer
    if (mvCurrent && mvCurrent.treeId === treeId) {
      if (tree.memos.length === 0) closeMemoView();
      else if (mvCurrent.memoIdx >= tree.memos.length) openMemoView(treeId, tree.memos.length - 1);
      else openMemoView(treeId, mvCurrent.memoIdx);
    }
    if (!opts.silent) toast('memo let fall · in recently fallen');
  }

  function deleteTree(treeId) {
    const tree = treeData.get(treeId);
    if (!tree) return;
    const g = treeGroups.get(treeId);
    // wither animation: desaturate + sink + fade. handled in three by tagging userData, then remove.
    if (g) {
      g.userData.withering = { start: performance.now(), duration: 1400 };
    }
    state.fallen.push({
      id: 'f' + Date.now().toString(36) + Math.random().toString(36).slice(2,6),
      type: 'tree',
      fellAt: Date.now(),
      snapshot: JSON.parse(JSON.stringify(tree)),
    });
    // close panels that reference it
    if (state.selected === treeId) closeDetail();
    if (mvCurrent && mvCurrent.treeId === treeId) closeMemoView();
    // remove from state right away so it's gone from index
    state.trees = state.trees.filter(t => t.id !== treeId);
    saveState();
    renderIndex();
    renderFallenBadge();
    if (fallenTray.classList.contains('open')) renderFallen();
    // physically remove after wither finishes
    setTimeout(() => {
      const gg = treeGroups.get(treeId);
      if (gg) { scene.remove(gg); treeGroups.delete(treeId); }
      treeData.delete(treeId);
    }, 1500);
    toast('tree withered · in recently fallen');
  }

  function restoreFallen(fid) {
    const i = state.fallen.findIndex(f => f.id === fid);
    if (i < 0) return;
    const f = state.fallen[i];
    if (f.type === 'memo') {
      const tree = treeData.get(f.parentTreeId);
      if (!tree) {
        toast('its tree is gone — cannot restore the memo');
        return;
      }
      const memo = { ...f.snapshot };
      delete memo.parentName; delete memo.originalIdx;
      tree.memos.push(memo);
      const g = treeGroups.get(tree.id);
      if (g) buildTreeNotes(g, tree);
      if (state.selected === tree.id) renderMemos(tree);
      toast('memo restored');
    } else if (f.type === 'tree') {
      const tree = JSON.parse(JSON.stringify(f.snapshot));
      state.trees.push(tree);
      plantTree(tree);
      renderIndex();
      toast('tree restored');
    }
    state.fallen.splice(i, 1);
    saveState();
    renderFallenBadge();
    renderFallen();
  }
  function purgeFallen(fid) {
    const i = state.fallen.findIndex(f => f.id === fid);
    if (i < 0) return;
    state.fallen.splice(i, 1);
    saveState();
    renderFallenBadge();
    renderFallen();
    toast('turned to soil');
  }

  mvDelete.addEventListener('click', () => {
    if (!mvCurrent || !state.admin) return;
    const { treeId, memoIdx } = mvCurrent;
    askConfirm({
      title: 'let this memo fall?',
      body: 'it will drift to the ground. you can lift it back up from recently fallen for 30 days.',
      help: '',
      confirmLabel: '↓ let it fall',
    }, () => deleteMemo(treeId, memoIdx));
  });
  dDelete.addEventListener('click', () => {
    if (!state.selected || !state.admin) return;
    const tree = treeData.get(state.selected);
    if (!tree) return;
    const n = tree.memos?.length || 0;
    askConfirm({
      title: 'let “' + tree.name + '” wither?',
      body: 'the tree turns gray and falls quiet. ' + (n ? ('all ' + n + ' memo' + (n===1?'':'s') + ' fall with it. ') : '') + 'everything sits in recently fallen for 30 days, then returns as soil.',
      help: '',
      confirmLabel: '↓ let it wither',
    }, () => deleteTree(state.selected));
  });
  // arrow keys cycle memos when viewer is open
  window.addEventListener('keydown', (e) => {
    if (!mvCurrent) return;
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
    if (e.key === 'ArrowLeft') { stepMemo(-1); e.preventDefault(); }
    else if (e.key === 'ArrowRight') { stepMemo(1); e.preventDefault(); }
  });

  /* ---------- toast ---------- */
  let toastTimer = null;
  function toast(msg) {
    toastEl.textContent = msg;
    toastEl.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toastEl.classList.remove('show'), 2400);
  }

  /* ---------- folded note (empty / error states) ---------- */
  const NOTE_COPY = {
    'empty-field-visitor': {
      eyebrow: 'an empty field',
      body: 'this field is still empty. come back soon — something will grow here.',
    },
    'empty-field-admin': {
      eyebrow: 'an empty field',
      body: 'no trees yet. plant the first one when you\'re ready.',
      action: { label: 'plant a tree', onClick: () => { try { openModal && openModal(); } catch (e) {} } },
    },
    'empty-tree': {
      eyebrow: 'a quiet tree',
      body: 'no memos yet. tie the first one to start a memoir.',
    },
    'save-failed': {
      eyebrow: 'didn\'t catch that',
      body: 'something slipped on the way. try again in a breath.',
    },
    'no-results': {
      eyebrow: 'nothing here',
      body: 'no memos match. try a softer word.',
    },
    'removed': {
      eyebrow: 'taken down',
      body: 'it\'ll fade from view in a moment. you can bring it back from recently fallen.',
    },
    'no-permission': {
      eyebrow: 'reading hands',
      body: 'you can read this field, but planting is the keeper\'s hands.',
    },
  };
  const noteEl = document.getElementById('note');
  const noteEyebrow = document.getElementById('note-eyebrow');
  const noteBody = document.getElementById('note-body');
  const noteDismiss = document.getElementById('note-dismiss');
  const noteAction = document.getElementById('note-action');
  let _noteActionHandler = null;
  function showNote(key) {
    const c = NOTE_COPY[key];
    if (!c) return;
    const paper = noteEl.querySelector('.note-paper');
    paper.classList.remove('closing');
    // force reflow so animation replays
    void paper.offsetWidth;
    noteEyebrow.textContent = c.eyebrow;
    noteBody.textContent = c.body;
    if (c.action) {
      noteAction.hidden = false;
      noteAction.textContent = c.action.label;
      _noteActionHandler = () => { hideNote(); c.action.onClick && c.action.onClick(); };
    } else {
      noteAction.hidden = true;
      _noteActionHandler = null;
    }
    noteEl.classList.add('open');
  }
  function hideNote() {
    const paper = noteEl.querySelector('.note-paper');
    paper.classList.add('closing');
    setTimeout(() => {
      noteEl.classList.remove('open');
      paper.classList.remove('closing');
    }, 460);
  }
  noteDismiss.addEventListener('click', hideNote);
  noteAction.addEventListener('click', () => { _noteActionHandler && _noteActionHandler(); });
  // expose so other code can call
  window.__showNote = showNote;
  window.__hideNote = hideNote;

  /* ---------- search ---------- */
  const searchInput = document.getElementById('search-input');
  const searchWrap = document.getElementById('search-wrap');
  const searchClear = document.getElementById('search-clear');
  const searchResults = document.getElementById('search-results');
  const idxListEl = document.getElementById('idx-list');
  let searchQ = '';

  function escapeHtml2(s) { return String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
  function highlight(text, q) {
    if (!q) return escapeHtml2(text);
    const esc = escapeHtml2(text);
    const re = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
    return esc.replace(re, m => `<span class="search-hit">${m}</span>`);
  }
  function snippet(text, q, max = 90) {
    const i = text.toLowerCase().indexOf(q.toLowerCase());
    if (i < 0) return text.slice(0, max) + (text.length > max ? '…' : '');
    const start = Math.max(0, i - 30);
    const end = Math.min(text.length, i + q.length + 50);
    return (start > 0 ? '…' : '') + text.slice(start, end) + (end < text.length ? '…' : '');
  }

  function runSearch(q) {
    searchQ = q.trim();
    searchWrap.classList.toggle('has-q', searchQ.length > 0);
    if (!searchQ) {
      searchResults.hidden = true;
      idxListEl.hidden = false;
      return;
    }
    idxListEl.hidden = true;
    searchResults.hidden = false;
    searchResults.innerHTML = '';
    const Q = searchQ.toLowerCase();
    const treeHits = [];
    const memoHits = [];
    state.trees.forEach((t, ti) => {
      const fields = [t.name, t.desc || '', t.lead || '', t.year || ''].join(' ').toLowerCase();
      if (fields.includes(Q)) treeHits.push({ tree: t, ti });
      (t.memos || []).forEach((m, mi) => {
        const hay = ((m.text || '') + ' ' + (m.author || '')).toLowerCase();
        if (hay.includes(Q)) memoHits.push({ tree: t, ti, memo: m, mi });
      });
    });

    if (treeHits.length === 0 && memoHits.length === 0) {
      const li = document.createElement('li');
      li.className = 'search-empty';
      li.textContent = 'nothing here matches. try a softer word.';
      searchResults.appendChild(li);
      return;
    }

    if (treeHits.length) {
      const head = document.createElement('li');
      head.className = 'search-group';
      head.innerHTML = `<span>trees</span><span>${String(treeHits.length).padStart(2,'0')}</span>`;
      searchResults.appendChild(head);
      treeHits.forEach(({tree, ti}) => {
        const li = document.createElement('li');
        li.className = 'search-row';
        const num = String(ti + 1).padStart(2,'0');
        const desc = tree.desc ? `<div class="search-snippet">${highlight(snippet(tree.desc, searchQ, 100), searchQ)}</div>` : '';
        li.innerHTML = `
          <span class="search-glyph-row">${num}</span>
          <div>
            <div class="search-title">${highlight(tree.name, searchQ)}</div>
            <div class="search-meta">tree · ${tree.memos.length} memo${tree.memos.length === 1 ? '' : 's'}</div>
            ${desc}
          </div>
        `;
        li.addEventListener('click', () => {
          selectTree(tree.id, true);
        });
        searchResults.appendChild(li);
      });
    }

    if (memoHits.length) {
      const head = document.createElement('li');
      head.className = 'search-group';
      head.innerHTML = `<span>memos</span><span>${String(memoHits.length).padStart(2,'0')}</span>`;
      searchResults.appendChild(head);
      memoHits.forEach(({tree, ti, memo, mi}) => {
        const li = document.createElement('li');
        li.className = 'search-row';
        const num = String(mi + 1).padStart(2,'0');
        li.innerHTML = `
          <span class="search-glyph-row">${num}</span>
          <div>
            <div class="search-title">${highlight(snippet(memo.text || '', searchQ, 80), searchQ)}</div>
            <div class="search-meta">${escapeHtml2(memo.author || 'anon')} · on ${escapeHtml2(tree.name)}</div>
          </div>
        `;
        li.addEventListener('click', () => {
          selectTree(tree.id, true);
          if (typeof openMemoView === 'function') {
            setTimeout(() => openMemoView(tree.id, mi), 320);
          }
        });
        searchResults.appendChild(li);
      });
    }
  }

  searchInput.addEventListener('input', (e) => runSearch(e.target.value));
  searchInput.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') { searchInput.value = ''; runSearch(''); searchInput.blur(); }
  });
  searchClear.addEventListener('click', () => {
    searchInput.value = ''; runSearch(''); searchInput.focus();
  });
  // global shortcut: '/' focuses search
  window.addEventListener('keydown', (e) => {
    if (e.key === '/' && !['INPUT','TEXTAREA'].includes(document.activeElement?.tagName)) {
      e.preventDefault();
      searchInput.focus();
    }
  });

  /* ---------- index list ---------- */
  function renderIndex() {
    idxList.innerHTML = '';
    state.trees.forEach((t, i) => {
      const li = document.createElement('li');
      li.className = 'idx-item' + (state.selected === t.id ? ' active' : '');
      li.dataset.id = t.id;
      const num = String(i + 1).padStart(2, '0');
      li.innerHTML = `
        <span class="idx-num">${num}</span>
        <span class="idx-name">${escapeHtml(t.name)}</span>
        <span class="idx-meta">${t.memos.length}</span>
      `;
      li.addEventListener('click', () => {
        selectTree(t.id, true);
      });
      idxList.appendChild(li);
    });
    idxCount.textContent = String(state.trees.length).padStart(2, '0');
    projCounter.textContent = (state.selected
      ? String(state.trees.findIndex(t => t.id === state.selected) + 1).padStart(2, '0')
      : '—') + ' / ' + String(state.trees.length).padStart(2, '0');
  }
  function escapeHtml(s) {
    return s.replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  }

  /* ---------- detail panel ---------- */
  function selectTree(id, fly) {
    state.selected = id || null;
    if (id) {
      const tree = treeData.get(id);
      if (tree) {
        const i = state.trees.findIndex(t => t.id === id);
        dNum.textContent = String(i + 1).padStart(2, '0');
        dName.textContent = tree.name;
        dYear.textContent = tree.year || '—';
        dLead.textContent = tree.lead || '—';
        dMemos.textContent = String(tree.memos.length);
        dDesc.textContent = tree.desc || '';
        renderMemos(tree);
        memoAuthor.value = '';
        memoText.value = '';
        updateMemoCharCount();
        detail.classList.add('open');
        if (fly) flyToTree(id);
      }
    } else {
      detail.classList.remove('open');
    }
    // refresh ring colors
    for (const [tid, g] of treeGroups) {
      if (!g.userData.ring) continue;
      g.userData.ring.material = (tid === state.selected) ? ringMatActive
        : (tid === hoveredTreeId ? ringMatHover : ringMatBase);
    }
    renderIndex();
  }
  function closeDetail() {
    if (state.selected) selectTree(null, false);
  }
  dClose.addEventListener('click', () => closeDetail());

  function renderMemos(tree) {
    memoList.innerHTML = '';
    if (tree.memos.length === 0) {
      const li = document.createElement('li');
      li.className = 'memo-empty';
      li.textContent = 'no memos yet — be first to tie one.';
      memoList.appendChild(li);
    } else {
      // most recent first
      const sorted = [...tree.memos].sort((a, b) => (b.t||0) - (a.t||0));
      sorted.forEach((m, i) => {
        const li = document.createElement('li');
        li.className = 'memo';
        const idx = String(tree.memos.length - i).padStart(2, '0');
        li.innerHTML = `
          <div class="head">
            <span>${idx}</span>
            <span>${formatDate(m.t)}</span>
          </div>
          <div class="body">${escapeHtml(m.text)}</div>
          <div class="author">— ${escapeHtml(m.author || 'anon')}</div>
        `;
        memoList.appendChild(li);
      });
    }
    dCount.textContent = String(tree.memos.length).padStart(2, '0');
  }
  function formatDate(t) {
    if (!t) return '—';
    const d = new Date(t);
    return d.getFullYear() + '.' + String(d.getMonth()+1).padStart(2,'0') + '.' + String(d.getDate()).padStart(2,'0');
  }
  function updateMemoCharCount() {
    memoCountRem.textContent = String(180 - memoText.value.length);
  }
  memoText.addEventListener('input', updateMemoCharCount);

  memoSubmit.addEventListener('click', () => {
    if (!state.selected) return;
    const tree = treeData.get(state.selected);
    if (!tree) return;
    const text = memoText.value.trim();
    const author = memoAuthor.value.trim() || 'anon';
    if (!text) {
      toast('write something first');
      memoText.focus();
      return;
    }
    tree.memos.push({ author, text, t: Date.now() });
    saveState();
    if (window.__audio) window.__audio.chime();
    // rebuild this tree's notes
    const g = treeGroups.get(tree.id);
    if (g) buildTreeNotes(g, tree);
    renderMemos(tree);
    dMemos.textContent = String(tree.memos.length);
    memoText.value = '';
    memoAuthor.value = '';
    updateMemoCharCount();
    renderIndex();
    toast('memo tied · ' + tree.name);
    // surface the new memo in the viewer
    openMemoView(tree.id, tree.memos.length - 1);
  });

  /* ---------- create tree modal ---------- */
  function openModal() {
    if (!state.admin) return;
    modal.classList.add('open');
    fName.value = ''; fYear.value = String(new Date().getFullYear()); fLead.value = ''; fDesc.value = '';
    setTimeout(() => fName.focus(), 50);
  }
  function closeModal() {
    modal.classList.remove('open');
  }
  plantBtn.addEventListener('click', openModal);
  fCancel.addEventListener('click', closeModal);
  modal.addEventListener('click', (e) => { if (e.target === modal) closeModal(); });

  fSubmit.addEventListener('click', () => {
    const name = fName.value.trim();
    if (!name) { toast('name required'); fName.focus(); return; }
    const year = fYear.value.trim() || String(new Date().getFullYear());
    const lead = fLead.value.trim() || 'sohye';
    const desc = fDesc.value.trim();
    // place new tree at a free spot near current camera focus
    const pos = pickPlantingSpot();
    const tree = {
      id: 'p' + Date.now().toString(36),
      name, year, lead, desc,
      x: pos.x, z: pos.z, seed: hashStr(name + ':' + Date.now()),
      memos: []
    };
    state.trees.push(tree);
    saveState();
    plantTree(tree);
    renderIndex();
    closeModal();
    toast('planted · ' + name);
    // fly to new tree
    selectTree(tree.id, true);
  });
  function pickPlantingSpot() {
    // around the current camera position, 3-6 units forward
    const fwd = new THREE.Vector3(-Math.sin(ctrl.yaw), 0, -Math.cos(ctrl.yaw));
    for (let r = 4; r < 14; r += 1) {
      for (let trial = 0; trial < 8; trial++) {
        const a = (trial / 8) * Math.PI * 2;
        const cos = Math.cos(a), sin = Math.sin(a);
        const fx = fwd.x * cos - fwd.z * sin;
        const fz = fwd.x * sin + fwd.z * cos;
        const x = ctrl.pos.x + fx * r;
        const z = ctrl.pos.z + fz * r;
        let ok = true;
        for (const t of state.trees) {
          const dx = t.x - x, dz = t.z - z;
          if (dx*dx + dz*dz < 4*4) { ok = false; break; }
        }
        if (ok) return { x: Math.round(x*10)/10, z: Math.round(z*10)/10 };
      }
    }
    // fallback random
    return { x: (Math.random()-0.5)*30, z: (Math.random()-0.5)*30 };
  }

  /* ---------- role toggle ---------- */
  function updateRoleBody() {
    const isAdmin = !!state.admin;
    const perm = state.share?.perm || 'read';
    document.body.classList.toggle('is-admin', isAdmin);
    document.body.classList.toggle('can-write', isAdmin || perm === 'memo' || perm === 'plant');
    document.body.classList.toggle('can-plant', isAdmin || perm === 'plant');
  }
  function setAdmin(v) {
    state.admin = !!v;
    saveState();
    updateRoleBody();
    roleToggle.classList.toggle('admin', state.admin);
    roleLabel.textContent = state.admin ? 'admin' : 'visitor';
    plantBtn.disabled = !state.admin && !(state.share?.perm === 'plant');
    renderFallenBadge();
  }
  roleToggle.addEventListener('click', () => {
    if (state.admin) {
      setAdmin(false);
      toast('signed out');
    } else {
      const m = document.getElementById('auth-modal');
      m.classList.add('open');
      const idEl = document.getElementById('auth-id');
      const pwEl = document.getElementById('auth-pw');
      const msg = document.getElementById('auth-msg');
      idEl.value = ''; pwEl.value = '';
      msg.textContent = 'demo · use admin / admin';
      msg.style.color = '';
      setTimeout(() => idEl.focus(), 50);
    }
  });
  document.getElementById('auth-cancel').addEventListener('click', () => {
    document.getElementById('auth-modal').classList.remove('open');
  });
  document.getElementById('auth-modal').addEventListener('click', (e) => {
    if (e.target.id === 'auth-modal') e.currentTarget.classList.remove('open');
  });
  function tryAuth() {
    const id = document.getElementById('auth-id').value.trim();
    const pw = document.getElementById('auth-pw').value;
    const msg = document.getElementById('auth-msg');
    if (id === 'admin' && pw === 'admin') {
      document.getElementById('auth-modal').classList.remove('open');
      setAdmin(true);
      toast('welcome, admin');
    } else {
      msg.textContent = 'invalid credentials';
      msg.style.color = 'var(--red)';
    }
  }
  document.getElementById('auth-submit').addEventListener('click', tryAuth);
  document.getElementById('auth-modal').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') tryAuth();
  });
  setAdmin(state.admin);

  /* ---------- mobile chrome wiring ---------- */
  const mTreenav = document.getElementById('m-treenav');
  const mPrev = document.getElementById('m-prev');
  const mNext = document.getElementById('m-next');
  const mTreeIdx = document.getElementById('m-tree-idx');
  const mTreeName = document.getElementById('m-tree-name');
  const mFab = document.getElementById('m-fab');
  function isMobile() { return window.matchMedia('(max-width: 760px)').matches; }
  function renderMobileNav() {
    const trees = state.trees;
    if (!isMobile() || trees.length === 0) {
      mTreenav.classList.add('hidden');
      mFab.classList.add('hidden');
      return;
    }
    mTreenav.classList.remove('hidden');
    let i = trees.findIndex(t => t.id === state.selected);
    if (i < 0) i = 0;
    const tree = trees[i];
    mTreeIdx.textContent = String(i + 1).padStart(2, '0') + ' / ' + String(trees.length).padStart(2, '0');
    mTreeName.textContent = tree.name;
    mPrev.disabled = (i <= 0);
    mNext.disabled = (i >= trees.length - 1);
    // FAB only when a tree is open AND user can write
    const canWrite = state.admin || (state.share && (state.share.perm === 'memo' || state.share.perm === 'plant'));
    mFab.classList.toggle('hidden', !state.selected || !canWrite);
  }
  function mobileStep(dir) {
    const trees = state.trees;
    if (!trees.length) return;
    let i = trees.findIndex(t => t.id === state.selected);
    if (i < 0) i = 0;
    const next = Math.max(0, Math.min(trees.length - 1, i + dir));
    if (next !== i || !state.selected) {
      selectTree(trees[next].id, true);
    }
  }
  mPrev.addEventListener('click', () => mobileStep(-1));
  mNext.addEventListener('click', () => mobileStep(1));
  mFab.addEventListener('click', () => {
    if (state.selected) {
      detail.classList.add('open');
      setTimeout(() => memoText.focus(), 80);
    } else if (state.trees.length > 0) {
      selectTree(state.trees[0].id, true);
      setTimeout(() => { detail.classList.add('open'); memoText.focus(); }, 200);
    }
  });
  // re-render on resize + on every selectTree call (hooked via wrapper)
  window.addEventListener('resize', renderMobileNav);
  const _origSelectTree = selectTree;
  selectTree = function(id, fly) { _origSelectTree(id, fly); renderMobileNav(); };
  // touch swipe on canvas to step trees
  let touchStart = null;
  const canvasHost = document.getElementById('canvas-host') || document.body;
  canvasHost.addEventListener('touchstart', (e) => {
    if (!isMobile() || e.touches.length !== 1) return;
    touchStart = { x: e.touches[0].clientX, y: e.touches[0].clientY, t: Date.now() };
  }, { passive: true });
  canvasHost.addEventListener('touchend', (e) => {
    if (!touchStart) return;
    const t = e.changedTouches[0];
    const dx = t.clientX - touchStart.x;
    const dy = t.clientY - touchStart.y;
    const dt = Date.now() - touchStart.t;
    touchStart = null;
    if (dt < 500 && Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy) * 1.6) {
      mobileStep(dx < 0 ? 1 : -1);
    }
  }, { passive: true });
  // initial
  renderMobileNav();
  const share = state.share = state.share || {
    access: 'private',   // 'private' | 'unlisted' | 'public'
    perm: 'read',        // 'read' | 'memo' | 'plant'
    pwOn: false,
    password: '',
    slug: 'sohye/2026-wishes',
  };
  const shareModal = document.getElementById('share-modal');
  const shareToggle = document.getElementById('share-toggle');
  const shareCancel = document.getElementById('share-cancel');
  const shareDone = document.getElementById('share-done');
  const shareUrl = document.getElementById('share-url');
  const shareCopy = document.getElementById('share-copy');
  const sharePwRow = document.getElementById('share-pw-row');
  const sharePwSwitch = document.getElementById('share-pw-toggle-switch');
  const sharePwInput = document.getElementById('share-pw');
  const sharePwEye = document.getElementById('share-pw-eye');
  const shareStatus = document.getElementById('share-status');

  function renderShare() {
    document.querySelectorAll('#share-access .share-opt').forEach(el => {
      el.classList.toggle('selected', el.dataset.access === share.access);
    });
    document.querySelectorAll('#share-perm .share-opt').forEach(el => {
      el.classList.toggle('selected', el.dataset.perm === share.perm);
    });
    sharePwSwitch.classList.toggle('on', share.pwOn);
    sharePwRow.classList.toggle('disabled', !share.pwOn);
    sharePwInput.value = share.password || '';
    const base = 'memoir.field/' + share.slug;
    if (share.access === 'private') {
      shareUrl.value = '— link disabled —';
      shareStatus.textContent = 'private';
    } else {
      shareUrl.value = base + (share.pwOn && share.password ? ' · 🔒' : '');
      shareStatus.textContent = share.access;
    }
    shareCopy.disabled = (share.access === 'private');
    shareCopy.style.opacity = (share.access === 'private') ? '0.4' : '';
  }

  function openShare() {
    renderShare();
    shareModal.classList.add('open');
  }
  function closeShare() { shareModal.classList.remove('open'); }

  shareToggle.addEventListener('click', openShare);
  shareCancel.addEventListener('click', closeShare);
  shareDone.addEventListener('click', () => { saveState(); updateRoleBody(); plantBtn.disabled = !state.admin && !(state.share?.perm === 'plant'); closeShare(); toast('share settings saved'); });
  shareModal.addEventListener('click', (e) => {
    if (e.target.id === 'share-modal') closeShare();
  });
  document.querySelectorAll('#share-access .share-opt').forEach(el => {
    el.addEventListener('click', () => { share.access = el.dataset.access; renderShare(); });
  });
  document.querySelectorAll('#share-perm .share-opt').forEach(el => {
    el.addEventListener('click', () => { share.perm = el.dataset.perm; renderShare(); });
  });
  sharePwSwitch.addEventListener('click', () => {
    share.pwOn = !share.pwOn;
    renderShare();
    if (share.pwOn) setTimeout(() => sharePwInput.focus(), 60);
  });
  sharePwInput.addEventListener('input', () => { share.password = sharePwInput.value; renderShare(); });
  sharePwEye.addEventListener('click', () => {
    const showing = sharePwInput.type === 'text';
    sharePwInput.type = showing ? 'password' : 'text';
    sharePwEye.textContent = showing ? '○' : '●';
  });
  shareCopy.addEventListener('click', async () => {
    if (share.access === 'private') return;
    try { await navigator.clipboard.writeText(shareUrl.value); } catch (e) {}
    shareCopy.classList.add('copied');
    shareCopy.textContent = 'copied';
    setTimeout(() => {
      shareCopy.classList.remove('copied');
      shareCopy.textContent = 'copy';
    }, 1400);
  });

  /* ---------- recenter ---------- */
  resetCam.addEventListener('click', () => {
    ctrl.flyFrom = ctrl.pos.clone();
    ctrl.flyTo = new THREE.Vector3(0, 1.7, 8);
    ctrl.flyTarget = new THREE.Vector3(0, 1.4, 0);
    ctrl.flyT = 0;
  });

  /* ---------- clock + environment (New York / Virginia local) ---------- */
  const TZ = 'America/New_York';
  function nyParts() {
    const d = new Date();
    const fmt = new Intl.DateTimeFormat('en-US', {
      timeZone: TZ,
      hour: '2-digit', minute: '2-digit', second: '2-digit',
      hour12: false,
      month: '2-digit', day: '2-digit', year: 'numeric'
    }).formatToParts(d);
    const o = {};
    fmt.forEach(p => { if (p.type !== 'literal') o[p.type] = p.value; });
    return o;
  }
  function tickClock() {
    const p = nyParts();
    const hh = (p.hour === '24' ? '00' : p.hour);
    clockEl.textContent = `${hh}:${p.minute}:${p.second} et`;
  }
  setInterval(tickClock, 1000);
  tickClock();

  // season + sun phase, displayed bottom-left
  const envSeason = document.getElementById('env-season');
  const envSeasonGlyph = document.getElementById('env-season-glyph');
  const envPhase = document.getElementById('env-phase');
  const envPhaseGlyph = document.getElementById('env-phase-glyph');
  const envStatTrees = document.getElementById('env-stat-trees');
  const envStatMemos = document.getElementById('env-stat-memos');

  function nySeason() {
    const p = nyParts();
    const m = parseInt(p.month, 10);
    const d = parseInt(p.day, 10);
    // meteorological-ish, simple
    if ((m === 3 && d >= 1) || m === 4 || (m === 5 && d <= 31)) return { name: 'spring', glyph: '◐' };
    if (m >= 6 && m <= 8) return { name: 'summer', glyph: '●' };
    if (m >= 9 && m <= 11) return { name: 'autumn', glyph: '◑' };
    return { name: 'winter', glyph: '○' };
  }
  function nyPhase() {
    const p = nyParts();
    const h = parseInt(p.hour, 10) % 24;
    if (h >= 5 && h < 8)  return { name: 'dawn',  glyph: '◒' };
    if (h >= 8 && h < 17) return { name: 'day',   glyph: '○' };
    if (h >= 17 && h < 20) return { name: 'dusk', glyph: '◓' };
    return { name: 'night', glyph: '●' };
  }
  // sky/fog palette per phase × season
  const PHASE_PALETTE = {
    dawn:  { sky: 0xF7E8D6, fog: 0xEDD9C4, fogNear: 16, fogFar: 68 },
    day:   { sky: 0xF4F4F1, fog: 0xF4F4F1, fogNear: 18, fogFar: 70 },
    dusk:  { sky: 0xE8C9B0, fog: 0xCFB39A, fogNear: 14, fogFar: 60 },
    night: { sky: 0x232936, fog: 0x1B2030, fogNear: 10, fogFar: 52 },
  };
  const SEASON_TINT = {
    spring: 0xF6F5EE, summer: 0xF0EFE6, fall: 0xE9DCC4, winter: 0xEFEFEC,
  };
  function lerpHex(a, b, t) {
    const ar = (a >> 16) & 255, ag = (a >> 8) & 255, ab = a & 255;
    const br = (b >> 16) & 255, bg = (b >> 8) & 255, bb = b & 255;
    return ((ar + (br-ar)*t)|0) << 16 | ((ag + (bg-ag)*t)|0) << 8 | ((ab + (bb-ab)*t)|0);
  }
  function applyEnvVisuals() {
    const ph = nyPhase();
    const s = nySeason();
    const p = PHASE_PALETTE[ph.name] || PHASE_PALETTE.day;
    const seasonHex = SEASON_TINT[s.name] || 0xF4F4F1;
    const sky = lerpHex(p.sky, seasonHex, 0.18);
    const fog = lerpHex(p.fog, seasonHex, 0.12);
    scene.background = new THREE.Color(sky);
    scene.fog = new THREE.Fog(fog, p.fogNear, p.fogFar);
    renderer.setClearColor(sky, 1);
    document.body.style.setProperty('--paper-tint', '#' + sky.toString(16).padStart(6, '0'));
  }
  function tickEnv() {
    const s = nySeason();
    const ph = nyPhase();
    envSeason.textContent = s.name;
    envSeasonGlyph.textContent = s.glyph;
    envPhase.textContent = ph.name;
    envPhaseGlyph.textContent = ph.glyph;
    const trees = state.trees.length;
    const memos = state.trees.reduce((a, t) => a + (t.memos?.length || 0), 0);
    envStatTrees.textContent = String(trees).padStart(2,'0') + ' tree' + (trees === 1 ? '' : 's');
    envStatMemos.textContent = String(memos).padStart(2,'0') + ' memo' + (memos === 1 ? '' : 's');
    applyEnvVisuals();
  }
  setInterval(tickEnv, 30 * 1000);
  tickEnv();
  // also refresh stats whenever index re-renders
  const _origRenderIndex = renderIndex;
  renderIndex = function() { _origRenderIndex(); tickEnv(); };

  /* ---------- main loop ---------- */
  let last = performance.now();
  function loop(now) {
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    update(dt, now / 1000);
    renderer.render(scene, camera);
    requestAnimationFrame(loop);
  }
  function update(dt, t) {
    // movement
    const speed = (ctrl.keys.shift ? 8 : 4);
    const fwd = new THREE.Vector3(-Math.sin(ctrl.yaw), 0, -Math.cos(ctrl.yaw));
    const right = new THREE.Vector3(Math.cos(ctrl.yaw), 0, -Math.sin(ctrl.yaw));
    const mv = new THREE.Vector3();
    if (ctrl.keys.w) mv.add(fwd);
    if (ctrl.keys.s) mv.sub(fwd);
    if (ctrl.keys.d) mv.add(right);
    if (ctrl.keys.a) mv.sub(right);
    if (mv.lengthSq() > 0) {
      mv.normalize().multiplyScalar(speed * dt);
      // collision: keep distance from any project tree base
      const next = ctrl.pos.clone().add(mv);
      for (const [id, g] of treeGroups) {
        const dx = g.position.x - next.x;
        const dz = g.position.z - next.z;
        if (dx*dx + dz*dz < 0.7*0.7) {
          // push out
          const d = Math.sqrt(dx*dx + dz*dz) || 0.01;
          next.x = g.position.x - (dx/d)*0.7;
          next.z = g.position.z - (dz/d)*0.7;
        }
      }
      ctrl.pos.copy(next);
      ctrl.flyTo = null;
    }

    // wheel zoom: move along view direction, with collision against trees
    if (Math.abs(ctrl.zoomVel) > 0.001) {
      const step = ctrl.zoomVel * dt * 4;
      const fwd2 = new THREE.Vector3(
        -Math.sin(ctrl.yaw) * Math.cos(ctrl.pitch),
        0, // keep zoom horizontal so we don't fly into the ground/sky
        -Math.cos(ctrl.yaw) * Math.cos(ctrl.pitch)
      ).normalize();
      const next = ctrl.pos.clone().addScaledVector(fwd2, step);
      for (const [id, g] of treeGroups) {
        const dx = g.position.x - next.x;
        const dz = g.position.z - next.z;
        if (dx*dx + dz*dz < 0.7*0.7) {
          const d = Math.sqrt(dx*dx + dz*dz) || 0.01;
          next.x = g.position.x - (dx/d)*0.7;
          next.z = g.position.z - (dz/d)*0.7;
        }
      }
      ctrl.pos.copy(next);
      // decay velocity (frame-rate independent)
      ctrl.zoomVel *= Math.pow(0.001, dt); // ~99% lost per second
    }

    // fly-to interpolation
    if (ctrl.flyTo) {
      ctrl.flyT += dt / 1.1; // ~1.1s
      const k = Math.min(1, ctrl.flyT);
      const e = easeOutCubic(k);
      ctrl.pos.lerpVectors(ctrl.flyFrom, ctrl.flyTo, e);
      // aim camera at tree top during fly
      const aim = new THREE.Vector3().copy(ctrl.flyTarget).sub(ctrl.pos);
      const targetYaw = Math.atan2(-aim.x, -aim.z);
      const targetPitch = Math.atan2(aim.y - 0, Math.sqrt(aim.x*aim.x + aim.z*aim.z)) * 0.4;
      ctrl.yaw = lerpAngle(ctrl.yaw, targetYaw, e * 0.18);
      ctrl.pitch = ctrl.pitch + (targetPitch - ctrl.pitch) * (e * 0.18);
      if (k >= 1) { ctrl.flyTo = null; }
    }

    // camera transform
    camera.position.copy(ctrl.pos);
    const lookDir = new THREE.Vector3(
      -Math.sin(ctrl.yaw) * Math.cos(ctrl.pitch),
      Math.sin(ctrl.pitch),
      -Math.cos(ctrl.yaw) * Math.cos(ctrl.pitch)
    );
    const lookAt = ctrl.pos.clone().add(lookDir);
    camera.lookAt(lookAt);

    // sway notes
    for (const [id, g] of treeGroups) {
      // wither pass: gray + sink + fade for trees being removed
      if (g.userData.withering) {
        const k = Math.min(1, (performance.now() - g.userData.withering.start) / g.userData.withering.duration);
        const e = k * k;
        g.traverse(c => {
          if (c.isMesh && c.material) {
            if (!c.userData._origColor && c.material.color) c.userData._origColor = c.material.color.clone();
            if (!c.material.transparent) { c.material.transparent = true; c.material.needsUpdate = true; }
            if (c.userData._origColor) {
              const oc = c.userData._origColor;
              const gray = 0.78;
              c.material.color.setRGB(
                oc.r * (1-e) + gray * e,
                oc.g * (1-e) + gray * e,
                oc.b * (1-e) + gray * e
              );
            }
            c.material.opacity = 1 - e * 0.85;
          }
        });
        g.position.y = -e * 0.4;
        g.rotation.z = e * 0.06;
      }
      const ng = g.userData.notesGrp;
      if (!ng) continue;
      ng.children.forEach((noteGrp, i) => {
        const plane = noteGrp.userData.plane;
        if (!plane) return;
        const phase = noteGrp.userData.swayPhase || 0;
        const baseRot = noteGrp.userData.baseRotY || 0;
        plane.rotation.y = baseRot + Math.sin(t * 0.7 + phase) * 0.12;
        plane.rotation.z = Math.sin(t * 0.9 + phase * 1.3) * 0.05;
        // ghost hint note: gentle pulse
        if (noteGrp.userData.isGhost) {
          const pulse = 0.35 + 0.18 * (0.5 + 0.5 * Math.sin(t * 1.6));
          noteGrp.traverse(o => { if (o.material && o.material.transparent) o.material.opacity = pulse; });
        }
      });
    }

    // hud
    coordX.textContent = ctrl.pos.x.toFixed(1);
    coordZ.textContent = ctrl.pos.z.toFixed(1);
    needle.style.transform = `translate(-50%, 0) rotate(${(-ctrl.yaw) * 180 / Math.PI}deg)`;
  }
  function easeOutCubic(t) { return 1 - Math.pow(1 - t, 3); }
  function lerpAngle(a, b, t) {
    let d = b - a;
    while (d > Math.PI) d -= 2*Math.PI;
    while (d < -Math.PI) d += 2*Math.PI;
    return a + d * t;
  }

  /* ---------- onboarding (first visit) ---------- */
  const onboard = document.getElementById('onboard');
  const modeListEl = document.getElementById('mode-list');
  const obName = document.getElementById('ob-name');
  const obDesc = document.getElementById('ob-desc');
  const obSubmit = document.getElementById('ob-submit');
  let chosenMode = null;

  const MODE_HINTS = {
    project: { name: 'e.g. interactive editor', desc: 'one or two lines. what is this project, in plain words.' },
    wish:    { name: 'e.g. 2026 wishes',         desc: 'a name for the wish tree. what year, what season, who for.' },
    diary:   { name: 'e.g. may 2026',            desc: 'one tree per month works well. or per week, per chapter.' },
    note:    { name: 'e.g. things i\u2019m reading', desc: 'a topic, a category, a thread you keep returning to.' },
  };
  const MODE_FIRST_DESC = {
    project: 'a project we\u2019re building together.',
    wish:    'a place to tie wishes \u2014 yoko ono\u2019s tree, in your own field.',
    diary:   'a small piece of the year. memos will become days.',
    note:    'a topic to think about over time.',
  };

  function refreshOnboardSubmit() {
    const ok = chosenMode && obName.value.trim().length > 0;
    obSubmit.disabled = !ok;
  }
  modeListEl.addEventListener('click', (e) => {
    const m = e.target.closest('.mode');
    if (!m) return;
    chosenMode = m.dataset.mode;
    modeListEl.querySelectorAll('.mode').forEach(el => el.classList.toggle('selected', el === m));
    const hints = MODE_HINTS[chosenMode] || MODE_HINTS.project;
    obName.placeholder = hints.name;
    obDesc.placeholder = hints.desc;
    if (!obDesc.value.trim()) obDesc.value = MODE_FIRST_DESC[chosenMode] || '';
    refreshOnboardSubmit();
    obName.focus();
  });
  obName.addEventListener('input', refreshOnboardSubmit);
  obSubmit.addEventListener('click', () => {
    if (obSubmit.disabled) return;
    const name = obName.value.trim();
    const desc = obDesc.value.trim();
    state.mode = chosenMode || 'project';
    state.onboarded = true;
    state.admin = true;
    const tree = {
      id: 'p' + Date.now().toString(36),
      name,
      year: String(new Date().getFullYear()),
      lead: '',
      desc,
      x: 0, z: -2,
      seed: hashStr(name + ':' + Date.now()),
      memos: [],
    };
    state.trees.push(tree);
    saveState();
    plantTree(tree);
    setAdmin(true);
    renderIndex();
    closeOnboard();
    selectTree(tree.id, true);
    setTimeout(() => toast('planted \u00b7 ' + name), 200);
  });
  function openOnboard() {
    onboard.classList.add('open');
    onboard.setAttribute('aria-hidden', 'false');
  }
  function closeOnboard() {
    onboard.classList.remove('open');
    onboard.setAttribute('aria-hidden', 'true');
  }
  /* ---------- ambient audio ---------- */
  (function setupAudio() {
    let ctx = null, windGain = null, masterGain = null, windNode = null;
    let muted = (function() {
      try { return localStorage.getItem('mf-muted') !== '0'; } catch { return true; }
    })();
    function ensureCtx() {
      if (ctx) return;
      try {
        const AC = window.AudioContext || window.webkitAudioContext;
        if (!AC) return;
        ctx = new AC();
        masterGain = ctx.createGain();
        masterGain.gain.value = 0.0;
        masterGain.connect(ctx.destination);
        // brownian noise wind
        const bufferSize = 2 * ctx.sampleRate;
        const noiseBuf = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
        const out = noiseBuf.getChannelData(0);
        let last = 0;
        for (let i = 0; i < bufferSize; i++) {
          const white = Math.random() * 2 - 1;
          last = (last + 0.02 * white) / 1.02;
          out[i] = last * 3.0;
        }
        windNode = ctx.createBufferSource();
        windNode.buffer = noiseBuf;
        windNode.loop = true;
        const lp = ctx.createBiquadFilter();
        lp.type = 'lowpass';
        lp.frequency.value = 420;
        const hp = ctx.createBiquadFilter();
        hp.type = 'highpass';
        hp.frequency.value = 80;
        windGain = ctx.createGain();
        windGain.gain.value = 0.18;
        windNode.connect(hp).connect(lp).connect(windGain).connect(masterGain);
        windNode.start();
        // slow LFO on filter cutoff for breath
        const lfo = ctx.createOscillator();
        const lfoGain = ctx.createGain();
        lfo.frequency.value = 0.08;
        lfoGain.gain.value = 180;
        lfo.connect(lfoGain).connect(lp.frequency);
        lfo.start();
      } catch (e) { ctx = null; }
    }
    function applyMute() {
      if (!ctx) return;
      const target = muted ? 0.0 : 0.6;
      const now = ctx.currentTime;
      masterGain.gain.cancelScheduledValues(now);
      masterGain.gain.linearRampToValueAtTime(target, now + 0.8);
    }
    function setMuted(v) {
      muted = !!v;
      try { localStorage.setItem('mf-muted', muted ? '1' : '0'); } catch {}
      ensureCtx();
      if (ctx && ctx.state === 'suspended') ctx.resume();
      applyMute();
      const lbl = document.getElementById('mute-label');
      if (lbl) lbl.textContent = muted ? '♪̸ wind' : '♪ wind';
      const btn = document.getElementById('mute-toggle');
      if (btn) btn.classList.toggle('admin', !muted);
    }
    function chime() {
      ensureCtx();
      if (!ctx) return;
      if (ctx.state === 'suspended') ctx.resume();
      const now = ctx.currentTime;
      // soft tied-paper sound: two-tone with quick decay
      const freqs = [523.25, 783.99]; // C5, G5
      freqs.forEach((f, i) => {
        const osc = ctx.createOscillator();
        const g = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.value = f;
        const t0 = now + i * 0.04;
        g.gain.setValueAtTime(0.0001, t0);
        g.gain.exponentialRampToValueAtTime(0.18, t0 + 0.01);
        g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.7);
        osc.connect(g).connect(masterGain);
        // chime always audible briefly, even when muted
        const tap = ctx.createGain();
        tap.gain.value = muted ? 0.55 : 0.9;
        g.disconnect();
        g.connect(tap).connect(ctx.destination);
        osc.start(t0);
        osc.stop(t0 + 0.8);
      });
    }
    const muteBtn = document.getElementById('mute-toggle');
    if (muteBtn) muteBtn.addEventListener('click', () => setMuted(!muted));
    // initialize state without auto-playing audio (waits for user gesture)
    const lbl = document.getElementById('mute-label');
    if (lbl) lbl.textContent = muted ? '♪̸ wind' : '♪ wind';
    if (!muted) {
      // browser autoplay policy — wait for first interaction
      const kick = () => { setMuted(false); window.removeEventListener('pointerdown', kick); window.removeEventListener('keydown', kick); };
      window.addEventListener('pointerdown', kick, { once: true });
      window.addEventListener('keydown', kick, { once: true });
    }
    window.__audio = { chime, setMuted };
  })();

  /* ---------- export / import ---------- */
  (function setupIO() {
    const exportBtn = document.getElementById('export-btn');
    const importBtn = document.getElementById('import-btn');
    const importFile = document.getElementById('import-file');
    if (exportBtn) exportBtn.addEventListener('click', () => {
      if (!state.admin) return;
      const payload = {
        version: 1,
        exportedAt: new Date().toISOString(),
        mode: state.mode,
        trees: state.trees,
      };
      const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      const stamp = new Date().toISOString().slice(0, 10);
      a.href = url;
      a.download = `memoir-field-${stamp}.json`;
      document.body.appendChild(a);
      a.click();
      setTimeout(() => { document.body.removeChild(a); URL.revokeObjectURL(url); }, 100);
      toast('exported · ' + state.trees.length + ' tree' + (state.trees.length === 1 ? '' : 's'));
    });
    if (importBtn) importBtn.addEventListener('click', () => {
      if (!state.admin) return;
      importFile.value = '';
      importFile.click();
    });
    if (importFile) importFile.addEventListener('change', async (e) => {
      const f = e.target.files && e.target.files[0];
      if (!f) return;
      try {
        const text = await f.text();
        const data = JSON.parse(text);
        if (!data || !Array.isArray(data.trees)) throw new Error('invalid format');
        askConfirm({
          title: 'import field',
          body: `replace current field with ${data.trees.length} tree${data.trees.length === 1 ? '' : 's'} from this file? current state will be saved to recently fallen.`,
          confirmLabel: 'import',
          danger: false,
          onConfirm: () => {
            // archive current trees to fallen
            const now = Date.now();
            for (const t of state.trees) {
              state.fallen.unshift({ type: 'tree', snapshot: JSON.parse(JSON.stringify(t)), fellAt: now });
            }
            // clear scene
            for (const [id, g] of treeGroups) scene.remove(g);
            treeGroups.clear(); treeData.clear();
            // load new trees
            state.trees = data.trees.map(t => ({
              ...t,
              memos: Array.isArray(t.memos) ? t.memos : [],
            }));
            if (data.mode) state.mode = data.mode;
            saveState();
            for (const t of state.trees) plantTree(t);
            renderIndex();
            renderFallenBadge();
            tickEnv();
            toast('imported · ' + state.trees.length + ' tree' + (state.trees.length === 1 ? '' : 's'));
          }
        });
      } catch (err) {
        toast('import failed · ' + (err.message || 'bad file'));
      }
    });
  })();

  if (!state.onboarded && state.trees.length === 0) {
    openOnboard();
  }

  requestAnimationFrame(loop);

  // initial render of UI
  renderIndex();
  // welcome toast
  setTimeout(() => {
    if (!onboard.classList.contains('open')) {
      if (state.trees.length === 0) {
        showNote(state.admin ? 'empty-field-admin' : 'empty-field-visitor');
      } else {
        toast('walk with [w·a·s·d] — click any tree');
      }
    }
  }, 600);
})();
