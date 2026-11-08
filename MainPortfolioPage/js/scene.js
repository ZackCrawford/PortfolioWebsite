// WebGL layer for the front page: particle field, monogram coin, DNA helix.
// main.js owns scroll measurement and calls update(state) once per frame.

import * as THREE from "three";

const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const smooth = (v, a, b) => {
  const t = clamp((v - a) / (b - a));
  return t * t * (3 - 2 * t);
};

// Colors are fed to the shaders as raw sRGB floats (no color management),
// so they match the CSS tokens exactly.
const hex = (h) => [((h >> 16) & 255) / 255, ((h >> 8) & 255) / 255, (h & 255) / 255];
const C = {
  violet: hex(0x9a7bff),
  teal: hex(0x4fe0c8),
  coral: hex(0xff6b7d),
  amber: hex(0xffc46b),
  ink: hex(0xece9f5),
};
function gradient(stops, t) {
  const s = clamp(t) * (stops.length - 1);
  const i = Math.min(Math.floor(s), stops.length - 2);
  const f = s - i;
  return stops[i].map((v, k) => v + (stops[i + 1][k] - v) * f);
}

/* ---------- shaders ---------- */
const POINT_VERT = /* glsl */ `
  attribute vec3 aColor;
  attribute float aSize;
  attribute float aSeed;
  uniform float uTime;
  uniform float uReveal;
  uniform float uHalf;
  uniform float uScale;
  uniform float uSpread;
  varying vec3 vColor;
  varying float vAlpha;
  void main() {
    vec3 p = position;
    p.xz *= uSpread;
    p.x += sin(uTime * 0.7 + aSeed * 31.0) * 0.015;
    p.y += cos(uTime * 0.5 + aSeed * 17.0) * 0.015;
    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    gl_PointSize = aSize * uScale / -mv.z;
    float edge = uReveal * uHalf;
    vAlpha = 1.0 - smoothstep(edge - 0.5, edge + 0.02, abs(position.y));
    vAlpha *= 0.6 + 0.4 * sin(uTime * 1.6 + aSeed * 50.0);
    vColor = aColor;
    gl_Position = projectionMatrix * mv;
  }
`;
const POINT_FRAG = /* glsl */ `
  uniform float uOpacity;
  varying vec3 vColor;
  varying float vAlpha;
  void main() {
    float d = length(gl_PointCoord - 0.5);
    if (d > 0.5) discard;
    float a = smoothstep(0.5, 0.0, d);
    gl_FragColor = vec4(vColor, a * a * vAlpha * uOpacity);
  }
`;
const LINE_VERT = /* glsl */ `
  attribute vec3 aColor;
  uniform float uReveal;
  uniform float uHalf;
  uniform float uSpread;
  varying vec3 vColor;
  varying float vAlpha;
  void main() {
    float edge = uReveal * uHalf;
    vAlpha = 1.0 - smoothstep(edge - 0.5, edge + 0.02, abs(position.y));
    vColor = aColor;
    vec3 p = position;
    p.xz *= uSpread;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
  }
`;
const LINE_FRAG = /* glsl */ `
  uniform float uOpacity;
  varying vec3 vColor;
  varying float vAlpha;
  void main() {
    gl_FragColor = vec4(vColor, vAlpha * uOpacity);
  }
`;

// Solid DNA: tubes and rods shaded by hand (no scene lights needed). A key light
// from the upper left, a rim highlight, a small specular glint, and a shadow on
// whatever sits behind the helix's axis, so front and back read clearly.
const MESH_VERT = /* glsl */ `
  attribute vec3 aColor;
  uniform float uReveal;
  uniform float uHalf;
  uniform float uSpread;
  varying vec3 vColor;
  varying vec3 vN;
  varying vec3 vPos;
  varying vec3 vLocal;
  varying float vAlpha;
  void main() {
  #ifdef INST
    vec4 lp = instanceMatrix * vec4(position, 1.0);
    vec3 nrm = mat3(instanceMatrix) * normal;
    vColor = instanceColor;
  #else
    vec4 lp = vec4(position, 1.0);
    vec3 nrm = normal;
    vColor = aColor;
  #endif
    float edge = uReveal * uHalf;
    vAlpha = 1.0 - smoothstep(edge - 0.5, edge + 0.02, abs(lp.y));
    lp.xz *= uSpread;
    vLocal = lp.xyz;
    vec4 mv = modelViewMatrix * lp;
    vN = normalize(normalMatrix * nrm);
    vPos = mv.xyz;
    gl_Position = projectionMatrix * mv;
  }
`;
const MESH_FRAG = /* glsl */ `
  uniform float uOpacity;
  uniform float uDepthC;
  uniform float uTime;
  uniform float uRadius;
  uniform float uSpread;
  uniform vec4 uHi[3];     // xyz: a project's attachment point (helix space), w: strength
  varying vec3 vColor;
  varying vec3 vN;
  varying vec3 vPos;
  varying vec3 vLocal;
  varying float vAlpha;
  void main() {
    vec3 n = normalize(vN);
    vec3 v = normalize(-vPos);
    if (dot(n, v) < 0.0) n = -n;
    vec3 L = normalize(vec3(-0.45, 0.6, 0.65));
    vec3 L2 = normalize(vec3(0.7, -0.2, 0.4));
    float diff = max(dot(n, L), 0.0);
    float fill = max(dot(n, L2), 0.0) * 0.25;
    float rim = pow(1.0 - max(dot(n, v), 0.0), 3.0);
    float spec = pow(max(dot(reflect(-L, n), v), 0.0), 40.0);
    // things behind the helix axis fall into shadow
    float behind = clamp((-vPos.z - uDepthC) / 1.3, -1.0, 1.0);
    float shade = mix(1.0, 0.2, smoothstep(-0.25, 0.9, behind));
    // the core of the helix is in its own shadow (cheap ambient occlusion)
    float rad = length(vLocal.xz) / max(uRadius * uSpread, 1e-3);
    float ao = mix(0.5, 1.0, smoothstep(0.05, 0.95, rad));
    // a gentle wave of light travelling down the strand
    float wave = pow(0.5 + 0.5 * sin(vLocal.y * 1.3 + uTime * 1.8), 4.0);
    vec3 col = vColor * (0.16 + 0.85 * diff + fill) * shade * ao
             + vColor * rim * 0.45 * shade
             + vec3(spec * 0.55 * shade);
    col *= 0.92 + 0.16 * wave;
    // attachment points of the projects glow
    float hi = 0.0;
    for (int i = 0; i < 3; i++) hi += uHi[i].w * (1.0 - smoothstep(0.16, 0.62, distance(vLocal, uHi[i].xyz)));
    hi = min(hi, 1.0) * (0.85 + 0.15 * sin(uTime * 5.0));
    col = mix(col, col * 1.5 + vColor * 0.35 + vec3(0.08), hi);
    gl_FragColor = vec4(col, vAlpha * uOpacity);
  }
`;
function meshMaterial(half, instanced = false) {
  const m = new THREE.ShaderMaterial({
    uniforms: {
      uReveal: { value: 100 }, uHalf: { value: half }, uSpread: { value: 1 },
      uOpacity: { value: 1 }, uDepthC: { value: 7 }, uTime: { value: 0 },
      uRadius: { value: HELIX.radius },
      uHi: { value: [new THREE.Vector4(0, 99, 0, 0), new THREE.Vector4(0, 99, 0, 0), new THREE.Vector4(0, 99, 0, 0)] },
    },
    vertexShader: MESH_VERT, fragmentShader: MESH_FRAG,
    transparent: true, depthWrite: true,
  });
  if (instanced) m.defines = { INST: 1 };
  return m;
}

function makeMaterial(vert, frag, extra = {}) {
  return new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
      uReveal: { value: 100 },
      uHalf: { value: 1 },
      uScale: { value: 1 },
      uOpacity: { value: 1 },
      uSpread: { value: 1 },
      ...extra,
    },
    vertexShader: vert,
    fragmentShader: frag,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
}

function pointGeometry(pos, col, size, seed) {
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute("aColor", new THREE.Float32BufferAttribute(col, 3));
  g.setAttribute("aSize", new THREE.Float32BufferAttribute(size, 1));
  g.setAttribute("aSeed", new THREE.Float32BufferAttribute(seed, 1));
  return g;
}

/* ---------- particle field ---------- */
function buildField(count) {
  const pos = [], col = [], size = [], seed = [];
  const palette = [C.violet, C.teal, C.coral, C.amber];
  for (let i = 0; i < count; i++) {
    pos.push((Math.random() - 0.5) * 26, (Math.random() - 0.5) * 18, -14 + Math.random() * 17);
    const c = Math.random() < 0.4
      ? palette[(Math.random() * palette.length) | 0]
      : C.ink.map((v) => v * 0.55);
    col.push(...c);
    size.push(0.012 + Math.random() * 0.04);
    seed.push(Math.random());
  }
  const mat = makeMaterial(POINT_VERT, POINT_FRAG);
  mat.uniforms.uOpacity.value = 0.85;
  return new THREE.Points(pointGeometry(pos, col, size, seed), mat);
}

/* ---------- DNA helix ---------- */
// Twist chosen so card k's spot on the strand sits exactly at its own height:
// one card lower = one full turn plus one card's share of the ring (10/9 turn).
const CARD = { SP: 1.85, LIFT: 0, N: 9 };
const HELIX_PITCH = CARD.SP * CARD.N / (CARD.N + 1);
const HELIX = { height: 40, radius: 1.1, turns: 40 / HELIX_PITCH };
// where each project card is anchored on the strand: card k sits SP lower than card k-1,
// LIFT above the camera's eye line so the anchor shows just above the front card
const cardAnchorY = (k) => CARD.LIFT - k * CARD.SP;
const CARD_B0 = Math.PI / 2 - ((HELIX.height / 2 + CARD.LIFT) / HELIX_PITCH) * Math.PI * 2;

// The second strand trails the first by a little under half a turn, which gives
// DNA its wide (major) and narrow (minor) grooves.
const GROOVE = Math.PI;   // strands directly opposite, as in the original line look

// Line-drawn helix that still reads as 3D: each strand is a wireframe tube (a
// bright core with thin lines spiralling round it), base pairs are double-line
// bars, and everything behind the helix's axis fades darker.
const WIRE_VERT = /* glsl */ `
  attribute vec3 aColor;
  uniform float uReveal;
  uniform float uHalf;
  uniform float uSpread;
  varying vec3 vColor;
  varying vec3 vPos;
  varying vec3 vLocal;
  varying float vAlpha;
  void main() {
    vec3 p = position;
    float edge = uReveal * uHalf;
    vAlpha = 1.0 - smoothstep(edge - 0.5, edge + 0.02, abs(p.y));
    p.xz *= uSpread;
    vLocal = p;
    vColor = aColor;
    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    vPos = mv.xyz;
    gl_Position = projectionMatrix * mv;
  }
`;
const WIRE_FRAG = /* glsl */ `
  uniform float uOpacity;
  uniform float uDepthC;
  uniform float uTime;
  uniform vec4 uHi[3];
  varying vec3 vColor;
  varying vec3 vPos;
  varying vec3 vLocal;
  varying float vAlpha;
  void main() {
    // depth: front of the helix bright, the far side sinks into the dark
    float behind = clamp((-vPos.z - uDepthC) / 1.2, -1.0, 1.0);
    float depth = mix(1.25, 0.18, smoothstep(-0.9, 0.9, behind));
    // a gentle wave of light running down the strand
    float wave = pow(0.5 + 0.5 * sin(vLocal.y * 1.3 + uTime * 1.8), 4.0);
    // a soft pulse of colour travelling down the lines, cycling through the palette
    float cyc = fract(vLocal.y * 0.05 - uTime * 0.06) * 4.0;
    vec3 pc = cyc < 1.0 ? mix(vec3(0.31, 0.88, 0.78), vec3(0.6, 0.48, 1.0), cyc)
            : cyc < 2.0 ? mix(vec3(0.6, 0.48, 1.0), vec3(1.0, 0.42, 0.49), cyc - 1.0)
            : cyc < 3.0 ? mix(vec3(1.0, 0.42, 0.49), vec3(1.0, 0.77, 0.42), cyc - 2.0)
            : mix(vec3(1.0, 0.77, 0.42), vec3(0.31, 0.88, 0.78), cyc - 3.0);
    float band = pow(0.5 + 0.5 * sin(vLocal.y * 0.9 - uTime * 1.6), 6.0);
    vec3 col = mix(vColor, pc, 0.55 * band) * depth * (0.9 + 0.2 * wave + 0.25 * band);
    float hi = 0.0;
    for (int i = 0; i < 3; i++) hi += uHi[i].w * (1.0 - smoothstep(0.16, 0.62, distance(vLocal, uHi[i].xyz)));
    hi = min(hi, 1.0) * (0.85 + 0.15 * sin(uTime * 5.0));
    col = mix(col, col * 1.6 + vec3(0.12), hi);
    gl_FragColor = vec4(col, vAlpha * uOpacity);
  }
`;
function wireMaterial(half, opacity) {
  return new THREE.ShaderMaterial({
    uniforms: {
      uReveal: { value: 100 }, uHalf: { value: half }, uSpread: { value: 1 },
      uOpacity: { value: opacity }, uDepthC: { value: 7 }, uTime: { value: 0 },
      uHi: { value: [new THREE.Vector4(0, 99, 0, 0), new THREE.Vector4(0, 99, 0, 0), new THREE.Vector4(0, 99, 0, 0)] },
    },
    vertexShader: WIRE_VERT, fragmentShader: WIRE_FRAG,
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
  });
}

function buildHelix(small) {
  const { height, radius, turns } = HELIX;
  const half = height / 2;
  const strandStops = [
    [C.violet, C.coral, C.amber, C.coral, C.violet],
    [C.teal, C.violet, C.teal, C.amber, C.teal],
  ];
  const at = (s, t, r = radius) => {
    const a = t * turns * Math.PI * 2 + s * GROOVE;
    return [Math.cos(a) * r, -half + t * height, Math.sin(a) * r];
  };
  const group = new THREE.Group();

  // particles: beads on the backbone, dots across the rungs, and dust (the original look)
  const pos = [], col = [], size = [], seed = [];
  const push = (p, c, sz) => { pos.push(...p); col.push(...c); size.push(sz); seed.push(Math.random()); };
  const beads = small ? 600 : 1100;
  for (let s = 0; s < 2; s++) {
    for (let i = 0; i < beads; i++) {
      const t = i / (beads - 1);
      push(at(s, t).map((v) => v + (Math.random() - 0.5) * 0.05), gradient(strandStops[s], t), 0.035 + Math.random() * 0.03);
    }
  }
  const rungs = turns * 10;
  for (let r = 0; r < rungs; r++) {
    const t = (r + 0.5) / rungs, A = at(0, t), B = at(1, t);
    const ca = gradient(strandStops[0], t), cb = gradient(strandStops[1], t);
    for (let k = 1; k < 9; k++) {
      const f = k / 9;
      push(A.map((v, j) => v + (B[j] - v) * f), ca.map((v, j) => v + (cb[j] - v) * f), 0.022);
    }
  }
  const dust = small ? 1200 : 2400;
  for (let i = 0; i < dust; i++) {
    const s = Math.random() < 0.5 ? 0 : 1, t = Math.random();
    const spread = 0.12 + Math.random() ** 2 * 0.55;
    push(at(s, t).map((v) => v + (Math.random() - 0.5) * spread * 2), gradient(strandStops[s], t).map((v) => v * 0.8), 0.01 + Math.random() * 0.025);
  }
  const pointMat = makeMaterial(POINT_VERT, POINT_FRAG);
  pointMat.uniforms.uHalf.value = half;
  const pts = new THREE.Points(pointGeometry(pos, col, size, seed), pointMat);
  group.add(pts);

  const lineGeo = (P, Cc) => {
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(P, 3));
    g.setAttribute("aColor", new THREE.Float32BufferAttribute(Cc, 3));
    return g;
  };

  // backbones: bright core plus a wireframe tube of lines spiralling round it
  const coreMat = wireMaterial(half, 0.85), wireMat = wireMaterial(half, 0.42);
  const WIRES = small ? 3 : 4, TUBE = 0.075, n = small ? 900 : 1600;
  const T = new THREE.Vector3(), Nr = new THREE.Vector3(), Bn = new THREE.Vector3(), P0 = new THREE.Vector3(), P1 = new THREE.Vector3();
  for (let s = 0; s < 2; s++) {
    const cp = [], cc = [];
    for (let i = 0; i < n; i++) { const t = i / (n - 1); cp.push(...at(s, t)); cc.push(...gradient(strandStops[s], t)); }
    group.add(new THREE.Line(lineGeo(cp, cc), coreMat));
    for (let w = 0; w < WIRES; w++) {
      const wp = [], wc = [];
      for (let i = 0; i < n; i++) {
        const t = i / (n - 1);
        P0.set(...at(s, t)); P1.set(...at(s, Math.min(1, t + 1e-3)));
        T.subVectors(P1, P0).normalize();
        Nr.set(P0.x, 0, P0.z).normalize();
        Bn.crossVectors(T, Nr).normalize();
        // the wires twist slowly round the core, so the tube reads as round
        const ang = (w / WIRES) * Math.PI * 2 + t * turns * 6;
        const off = Nr.clone().multiplyScalar(Math.cos(ang) * TUBE).addScaledVector(Bn, Math.sin(ang) * TUBE);
        wp.push(P0.x + off.x, P0.y + off.y, P0.z + off.z);
        wc.push(...gradient(strandStops[s], t));
      }
      group.add(new THREE.Line(lineGeo(wp, wc), wireMat));
    }
  }

  // base pairs: each a double-line bar, coloured from one strand to the other
  const rp = [], rc = [];
  for (let r = 0; r < rungs; r++) {
    const t = (r + 0.5) / rungs, A = at(0, t), B = at(1, t);
    const ca = gradient(strandStops[0], t), cb = gradient(strandStops[1], t);
    for (const dy of [-0.03, 0.03]) {
      rp.push(A[0], A[1] + dy, A[2], B[0], B[1] + dy, B[2]);
      rc.push(...ca, ...cb);
    }
  }
  const rungMat = wireMaterial(half, 0.4);
  group.add(new THREE.LineSegments(lineGeo(rp, rc), rungMat));

  group.userData.materials = [pointMat, coreMat, wireMat, rungMat];
  group.userData.meshMats = [coreMat, wireMat, rungMat];
  group.userData.baseOpacity = [1, 0.85, 0.42, 0.4];
  return group;
}

/* ---------- coin ---------- */
function drawFace(fontReady, photo) {
  const S = 1024, c = document.createElement("canvas");
  c.width = c.height = S;
  const g = c.getContext("2d");
  const mid = S / 2;
  const mono = fontReady ? '"Martian Mono", monospace' : "monospace";

  const bg = g.createRadialGradient(mid, mid * 0.8, 40, mid, mid, mid);
  bg.addColorStop(0, "#1b2033");
  bg.addColorStop(1, "#07080d");
  g.fillStyle = bg;
  g.beginPath(); g.arc(mid, mid, mid, 0, Math.PI * 2); g.fill();

  // hex dot field behind the monogram
  g.save();
  g.beginPath(); g.arc(mid, mid, 400, 0, Math.PI * 2); g.clip();
  g.fillStyle = "rgba(154,123,255,0.18)";
  for (let y = 0; y < S; y += 22) {
    for (let x = (y / 22) % 2 ? 13 : 0; x < S; x += 26) {
      g.beginPath(); g.arc(x, y, 2.4, 0, Math.PI * 2); g.fill();
    }
  }
  g.restore();

  // ZC monogram (same geometry as the favicon, on a 64-unit grid)
  const u = S / 64;
  g.lineCap = "butt"; g.lineJoin = "miter";
  g.shadowBlur = 30;
  g.shadowColor = "rgba(79,224,200,0.6)";
  g.strokeStyle = "#ece9f5"; g.lineWidth = 3.4 * u;
  g.beginPath();
  g.moveTo(20 * u, 21 * u); g.lineTo(38 * u, 21 * u); g.lineTo(20 * u, 43 * u); g.lineTo(38 * u, 43 * u);
  g.stroke();
  g.shadowColor = "rgba(255,107,125,0.7)";
  g.strokeStyle = "#ff6b7d";
  const cx = 47 - Math.sqrt(81 - 64);
  const ang = Math.atan2(8, Math.sqrt(81 - 64));
  g.beginPath(); g.arc(cx * u, 32 * u, 9 * u, -ang, ang, true); g.stroke();
  g.shadowBlur = 0;

  // rims
  g.lineWidth = 10; g.strokeStyle = "#4fe0c8";
  g.beginPath(); g.arc(mid, mid, 500, 0, Math.PI * 2); g.stroke();
  g.lineWidth = 3; g.strokeStyle = "rgba(154,123,255,0.9)";
  g.beginPath(); g.arc(mid, mid, 402, 0, Math.PI * 2); g.stroke();

  // ticks
  g.strokeStyle = "rgba(236,233,245,0.55)";
  for (let i = 0; i < 120; i++) {
    const a = (i / 120) * Math.PI * 2;
    const long = i % 10 === 0;
    g.lineWidth = long ? 4 : 2;
    const r0 = long ? 462 : 472, r1 = 488;
    g.beginPath();
    g.moveTo(mid + Math.cos(a) * r0, mid + Math.sin(a) * r0);
    g.lineTo(mid + Math.cos(a) * r1, mid + Math.sin(a) * r1);
    g.stroke();
  }

  // circular legend
  const legend = "ZACK CRAWFORD · CYBERSECURITY · UNIVERSITY OF CINCINNATI · ";
  g.fillStyle = "rgba(236,233,245,0.85)";
  g.font = `500 25px ${mono}`;
  g.textAlign = "center"; g.textBaseline = "middle";
  const step = (Math.PI * 2) / legend.length;
  for (let i = 0; i < legend.length; i++) {
    const a = -Math.PI / 2 + i * step;
    g.save();
    g.translate(mid + Math.cos(a) * 432, mid + Math.sin(a) * 432);
    g.rotate(a + Math.PI / 2);
    g.fillText(legend[i], 0, 0);
    g.restore();
  }

  // the coin is fully greyscale: convert every pixel of the face to luminance
  const img = g.getImageData(0, 0, S, S), px = img.data;
  for (let i = 0; i < px.length; i += 4) {
    const l = px[i] * 0.299 + px[i + 1] * 0.587 + px[i + 2] * 0.114;
    px[i] = px[i + 1] = px[i + 2] = l;
  }
  g.putImageData(img, 0, 0);
  return c;
}

function buildCoin(fontReady, photo) {
  const group = new THREE.Group();
  const tex = new THREE.CanvasTexture(drawFace(fontReady, photo));
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;

  const T = 0.09;
  const edgeMat = new THREE.MeshBasicMaterial({ color: 0x5a5a5a, transparent: true });
  const body = new THREE.Mesh(new THREE.CylinderGeometry(1, 1, T, 96, 1, false), edgeMat);
  body.rotation.x = Math.PI / 2;
  group.add(body);

  const faceMat = new THREE.MeshBasicMaterial({ map: tex, transparent: true });
  const front = new THREE.Mesh(new THREE.CircleGeometry(1, 96), faceMat);
  front.position.z = T / 2 + 0.001;
  group.add(front);
  const back = front.clone();
  back.rotation.y = Math.PI;
  back.position.z = -front.position.z;
  group.add(back);

  const glowMat = new THREE.MeshBasicMaterial({
    color: 0xd8d8d8, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false,
  });
  const glow = new THREE.Mesh(new THREE.TorusGeometry(1.0, 0.014, 12, 160), glowMat);
  group.add(glow);

  // a loose orbit ring that drifts on its own axis
  const orbitMat = new THREE.MeshBasicMaterial({
    color: 0x9a7bff, transparent: true, opacity: 0.6, blending: THREE.AdditiveBlending, depthWrite: false,
  });
  const orbit = new THREE.Mesh(new THREE.TorusGeometry(1.32, 0.006, 8, 200), orbitMat);
  // Drawn after the coin and depth-tested against it, so the near half passes
  // in front of the face and the far half tucks behind.
  orbit.renderOrder = 2;
  group.add(orbit);

  group.userData = { edgeMat, faceMat, glowMat, orbitMat, orbit };
  return group;
}

/* ---------- lock: clamp ring that drops onto the coin ---------- */
function buildLock() {
  // one colour, hairline strokes: a ring the coin sits in, and four latches
  const mat = new THREE.LineBasicMaterial({ color: 0xece9f5, transparent: true, opacity: 0.55 });
  const g = new THREE.Group();
  const circle = (r, from = 0, to = Math.PI * 2, n = 160) => {
    const pts = [];
    for (let i = 0; i <= n; i++) { const a = from + (to - from) * (i / n); pts.push(new THREE.Vector3(Math.cos(a) * r, Math.sin(a) * r, 0)); }
    return new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), mat);
  };
  // housing: two concentric hairlines with gaps where the latches sit
  for (let i = 0; i < 4; i++) {
    const a0 = i * (Math.PI / 2) + 0.16, a1 = (i + 1) * (Math.PI / 2) - 0.16;
    g.add(circle(1.1, a0, a1, 40));
    g.add(circle(1.22, a0, a1, 40));
  }
  // latches: a small hinged hook at each gap that swings shut over the coin's rim
  const latches = [];
  for (let i = 0; i < 4; i++) {
    const a = i * (Math.PI / 2);
    const pivot = new THREE.Group();
    pivot.position.set(Math.cos(a) * 1.22, Math.sin(a) * 1.22, 0);
    pivot.rotation.z = a;
    const hook = new THREE.Line(new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(0, -0.07, 0), new THREE.Vector3(-0.2, -0.07, 0), new THREE.Vector3(-0.2, 0.07, 0), new THREE.Vector3(0, 0.07, 0),
    ]), mat);
    const arm = new THREE.Group();
    arm.add(hook);
    pivot.add(arm);
    g.add(pivot);
    latches.push(arm);
  }
  g.userData = { mat, latches };
  return g;
}

// the coin's edge-on hand-off: a thin bright line that reads as a line from any angle
function buildLightLine() {
  const g = new THREE.Group();
  const core = new THREE.Mesh(new THREE.CylinderGeometry(0.011, 0.011, 1, 12, 1, true),
    new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }));
  const glow = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 1, 16, 1, true),
    new THREE.MeshBasicMaterial({ color: 0x4fe0c8, transparent: true, opacity: 0.35, blending: THREE.AdditiveBlending, depthWrite: false }));
  g.add(glow, core);
  g.userData = { core: core.material, glow: glow.material };
  return g;
}
const easeOutBack = (t) => { const c = 1.6; return 1 + (c + 1) * Math.pow(t - 1, 3) + c * Math.pow(t - 1, 2); };

/* ---------- scene ---------- */
export async function createScene(canvas) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: "high-performance" });
  renderer.setClearColor(0x000000, 0);

  const small = innerWidth < 720;
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(40, 1, 0.1, 100);
  camera.position.set(0, 0, 7);

  let fontReady = false;
  try {
    await Promise.race([
      document.fonts.load('500 25px "Martian Mono"').then(() => { fontReady = true; }),
      new Promise((r) => setTimeout(r, 1500)),
    ]);
  } catch (e) { /* fall back to system mono */ }

  const field = buildField(small ? 1200 : 2600);
  scene.add(field);

  const helix = buildHelix(small);
  scene.add(helix);

  const coin = buildCoin(fontReady, null);
  scene.add(coin);
  coin.userData.orbit.visible = false;
  const lock = buildLock();
  scene.add(lock);
  const line = buildLightLine();
  scene.add(line);
  let lockT0 = null, lockedSent = false;

  const pointMats = [field.material, helix.userData.materials[0]];

  function resize() {
    const w = innerWidth, h = innerHeight;
    renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    const scale = (renderer.getPixelRatio() * h) / (2 * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)));
    pointMats.forEach((m) => { m.uniforms.uScale.value = scale; });
    // keep the helix and coin a sensible size on narrow screens
    const fit = clamp(w / h / 0.9, 0.62, 1);
    coin.scale.setScalar(fit);
    helix.scale.setScalar(fit);
    coin.userData.fit = fit;
  }
  resize();

  const cam = { x: 0, y: 0 };
  let lastT = 0, turn = 0, introEase = 0, reveal = 0, spread = 0, scrollEase = 0, workEase = 0;
  let lastCamAng = 0;
  let orbitEase = 0, lastAng = 0, lastCamT = 0, roll = 0, descent = 0, hiAmt = 0, cardF = 0, cardN = 1;
  const cdir = new THREE.Vector3(), cright = new THREE.Vector3(), dir = new THREE.Vector3(), UPV = new THREE.Vector3(0, 1, 0);
  const ap = new THREE.Vector3(), aq = new THREE.Vector3();
  const centre = new THREE.Vector3();

  function update(s) {
    const t = s.time;
    field.material.uniforms.uTime.value = t;

    // Camera drifts toward the pointer for a little parallax.
    cam.x += (s.mouseX * 0.35 - cam.x) * 0.04;
    cam.y += (-s.mouseY * 0.25 - cam.y) * 0.04;
    // through the projects the camera circles to the left round the helix,
    // following the cards, and banks into the turn
    const cfNow = s.cardF ?? 0, cnNow = s.cardN ?? 1;
    const ang = -clamp(cfNow / Math.max(1, cnNow - 1)) * 1.15;
    lastCamAng = ang;
    const ca = Math.cos(ang), sa = Math.sin(ang);
    camera.position.set(sa * 7 + ca * cam.x, cam.y - descent, ca * 7 - sa * cam.x);
    const turnRate = (ang - lastAng) / Math.max(1e-3, t - lastCamT);
    lastAng = ang; lastCamT = t;
    roll = 0;   // cards are placed from this camera; no roll keeps them exactly aligned
    camera.up.set(Math.sin(roll) * ca, Math.cos(roll), -Math.sin(roll) * sa);
    camera.lookAt(0, -descent, 0);

    // Field
    field.rotation.y = t * 0.012;
    field.position.y = s.scrollY * 0.0009;

    const dt = Math.min(0.1, t - lastT);
    lastT = t;
    // Scroll-driven values chase their targets with easing, so a wheel click
    // glides instead of jumping, and reversing plays the same motion back.
    const ease = (cur, target, rate) => {
      const v = cur + (target - cur) * (1 - Math.exp(-dt * rate));
      return Math.abs(target - v) < 0.0005 ? target : v;
    };

    // Coin: idle wobble -> two flips -> edge-on light bar -> hands off to the helix
    const fit = coin.userData.fit;
    turn = ease(turn, s.heroP, 3);
    introEase = ease(introEase, s.introP, 3);
    // Only stretch once the coin is nearly edge-on, so a fast scroll can't
    // blow the face up to full screen height while it is still turning.
    const edgeOn = smooth(turn, 0.88, 1);
    const stretch = smooth(introEase, 0.02, 0.15) * edgeOn;
    // On narrow screens the intro copy spans the full width, so the bar bows out early.
    const fade = fit < 1 ? 1 - smooth(s.introP, 0.0, 0.12) : 1 - smooth(s.introP, 0.4, 0.55);
    coin.visible = fade > 0.001;
    // one full turn, then a quarter more so it lands edge-on as the center line
    // entrance: the coin falls in spinning, slows, and lands face-on in the lock
    if (lockT0 === null) lockT0 = t;
    const lt = t - lockT0, L = lock.userData;
    const FALL = 1.15;
    const fp = clamp(lt / FALL);
    const fall = (1 - fp) * (1 - fp);                 // eases to a stop on landing
    const settle = Math.sin(clamp((lt - FALL) / 0.35) * Math.PI) * 0.06 * (1 - clamp((lt - FALL) / 0.35));
    coin.position.y = fall * 6 - settle;
    // spin: several turns while falling, ending exactly face-on; scrolling turns it after that
    coin.rotation.y = fall * Math.PI * 6 + smooth(turn, 0, 1) * (Math.PI * 2.5);
    coin.rotation.x = 0;

    // latches swing shut just after the coin lands, and open again as you scroll
    const latch = smooth(lt, FALL + 0.05, FALL + 0.35);
    const release = smooth(turn, 0, 0.2);
    L.latches.forEach((arm) => { arm.rotation.z = (1 - latch + release) * 1.25; });
    const click = Math.exp(-Math.max(0, lt - FALL - 0.35) * 5) * smooth(lt, FALL + 0.25, FALL + 0.35);
    L.mat.opacity = (0.32 + 0.55 * click) * smooth(lt, 0.2, 0.7) * (1 - release) * fade;
    lock.scale.setScalar(fit * (1 + release * 0.25));
    lock.visible = L.mat.opacity > 0.002;
    if (!lockedSent && lt > FALL + 0.45) { lockedSent = true; window.dispatchEvent(new Event("coinlocked")); }
    coin.scale.setScalar(fit);
    const lineIn = smooth(turn, 0.9, 0.99);
    const lu = line.userData;
    line.visible = lineIn * fade > 0.002;
    line.scale.set(fit, fit * 2 * (1 + stretch * 5.5), fit);
    lu.core.opacity = lineIn * fade;
    lu.glow.opacity = 0.35 * lineIn * fade;
    const u = coin.userData;
    u.faceMat.opacity = fade * (1 - lineIn);
    u.edgeMat.opacity = fade * (1 - lineIn);
    u.edgeMat.color.setScalar(0.35 + stretch * 0.5);
    u.glowMat.opacity = fade * (1 - lineIn) * 0.7;
    u.orbitMat.opacity = fade * 0.7 * (1 - turn);
    u.orbit.rotation.x = 1.1 + Math.sin(t * 0.4) * 0.25;
    u.orbit.rotation.y = t * 0.5;

    // Helix: its particles first gather along the light bar (full height,
    // zero radius), then the two strands twist apart from it as the bar fades.
    reveal = ease(reveal, smooth(s.introP, 0.2, 0.36), 2.4);
    spread = ease(spread, smooth(s.introP, 0.4, 0.78), 2.4);
    const dim = 1 - 0.8 * smooth(s.recordP, 0, 0.9);
    helix.visible = reveal > 0.001;
    // turns only as the page scrolls, eased so it glides to a stop
    scrollEase = ease(scrollEase, s.scrollY, 5);
    workEase = ease(workEase, s.workP, 4);
    orbitEase = ease(orbitEase, s.workP, 2.6);
    // descend about one section per project card; it keeps going a little as the projects leave
    const cf = s.cardF ?? 0, cn = s.cardN ?? 1;
    descent = Math.min(Math.max(0, cf), cn - 1 + 1.6) * CARD.SP;
    cardF = cf; cardN = cn;
    hiAmt = ease(hiAmt, (s.workIn ?? 0) * (1 - smooth(s.recordP ?? 0, 0, 0.6)), 3);
    // locked to the card ring so each card stays on its own spot, like a limb;
    // before the projects it turns with the scroll in the same direction
    // (the intro's turn is a whole revolution, so card k faces the camera when it is in front)
    // once the projects are behind, the helix keeps turning on its own, easing in
    // in the Record section it sways gently back and forth instead of stopping dead
    const sway = Math.sin(t * 0.55) * 0.35 * smooth(s.recordP ?? 0, 0.15, 0.7);
    helix.rotation.y = lastCamAng - (cardF * (Math.PI * 2) / cardN + CARD_B0) - smooth(introEase, 0.25, 0.6) * Math.PI * 2 + sway;
    // upright while it sits on the bar, leaning slightly once unwound
    helix.rotation.z = 0;   // upright: cards hang off it, so a lean would push them off-centre
    helix.position.y = 0;
    helix.userData.materials.forEach((m, k) => {
      m.uniforms.uReveal.value = reveal * 1.04;
      m.uniforms.uSpread.value = 0.02 + spread * 0.98;
      // while collapsed onto the bar the strands glow softly instead of piling up
      m.uniforms.uOpacity.value = helix.userData.baseOpacity[k] * dim * (0.45 + 0.55 * spread);
    });
    // shade whatever sits behind the helix's axis, as seen from where the camera is now
    helix.updateMatrixWorld();
    camera.updateMatrixWorld();
    centre.setFromMatrixPosition(helix.matrixWorld).applyMatrix4(camera.matrixWorldInverse);
    helix.userData.meshMats.forEach((m) => {
      m.uniforms.uDepthC.value = -centre.z;
      m.uniforms.uTime.value = t;
      m.uniforms.uSpread.value = 0.02 + spread * 0.98;
    });
    // glow at the attachment points of the front card and its two neighbours
    const near = Math.round(cardF);
    for (let j = 0; j < 3; j++) {
      const k = near - 1 + j, slot = helix.userData.meshMats[0].uniforms.uHi.value[j];
      if (k < 0 || k >= cardN) { slot.w = 0; continue; }
      const L = attachLocal(k);
      dv.set(L.ux, 0, L.uz).transformDirection(helix.matrixWorld).transformDirection(camera.matrixWorldInverse);
      slot.set(L.x, L.y, L.z, hiAmt * smooth(dv.z, -0.1, 0.5) * 0.6);
    }
    helix.userData.meshMats.forEach((m) => { m.uniforms.uHi.value = helix.userData.meshMats[0].uniforms.uHi.value; });
    spreadNow = 0.02 + spread * 0.98;

    renderer.render(scene, camera);
  }

  // Card k is a limb fixed to the helix: it sticks straight out at azimuth
  // k*step (helix space), from the strand crossing nearest its height.
  const CARD_R = 2.35;                       // how far out from the axis the card's centre sits
  const loc = { x: 0, y: 0, z: 0, ux: 0, uz: 1 };
  function attachLocal(k) {
    // strand 0 passes height y at angle a(y); the card points straight out there
    const want = cardAnchorY(k);
    const a = ((want + HELIX.height / 2) / HELIX_PITCH) * Math.PI * 2;
    const ux = Math.sin(Math.PI / 2 - a), uz = Math.cos(Math.PI / 2 - a);
    const r = HELIX.radius * spreadNow;
    loc.x = ux * r; loc.y = want; loc.z = uz * r; loc.ux = ux; loc.uz = uz;
    return loc;
  }
  // screen position (CSS px) of card k's attachment dot
  let spreadNow = 1;
  const cv = new THREE.Vector3(), dv = new THREE.Vector3();
  function anchor(k, out) {
    const L = attachLocal(k);
    ap.set(L.x, L.y, L.z).applyMatrix4(helix.matrixWorld).project(camera);
    out.x = (ap.x + 1) / 2 * innerWidth;
    out.y = (1 - ap.y) / 2 * innerHeight;
    dv.set(L.ux, 0, L.uz).transformDirection(helix.matrixWorld).transformDirection(camera.matrixWorldInverse);
    out.facing = dv.z;
    out.ok = ap.z < 1 && out.facing > -0.15;
    return out;
  }
  // CSS 3D placement for card k that matches this camera exactly: its centre on
  // the same radial line as its dot, facing straight out from the helix.
  function cardPose(k, out) {
    const L = attachLocal(k);
    cv.set(L.ux * CARD_R, L.y, L.uz * CARD_R).applyMatrix4(helix.matrixWorld).applyMatrix4(camera.matrixWorldInverse);
    dv.set(L.ux, 0, L.uz).transformDirection(helix.matrixWorld).transformDirection(camera.matrixWorldInverse);
    const focal = (innerHeight / 2) / Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
    const dRef = 7 - CARD_R;                 // the front card's depth renders at its natural size
    const kpx = focal / dRef;
    out.persp = focal;
    out.x = cv.x * kpx;
    out.y = -cv.y * kpx;
    out.z = focal * (1 - (-cv.z) / dRef);
    out.rot = Math.atan2(dv.x, dv.z);
    out.cos = dv.z;
    return out;
  }

  return { update, resize, anchor, cardPose };
}
