// Particle cloud for the picoCTF pages. One set of points morphs between
// shapes (a flag, a globe, a padlock...) as the page asks for them. Between
// two shapes the points scatter outward and regather, like dust re-forming.
//
//   const cloud = await createParticles(canvas, { shapes: ["flag", "globe"], tints: [...], start: 0 });
//   cloud.update({ time, f, x, dim, mouseX, mouseY });   // once per frame
//
// f is a float index into `shapes`: 1.5 is halfway between shapes 1 and 2.

import * as THREE from "three";

const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const smooth = (t) => t * t * (3 - 2 * t);
const rnd = Math.random;
const range = (a, b) => a + rnd() * (b - a);

const PALETTE = [[0.604, 0.482, 1], [0.31, 0.878, 0.784], [1, 0.42, 0.49], [1, 0.769, 0.42]];
const INK = [0.93, 0.91, 0.96];

/* ---------- shape builders: each returns one [x, y, z] point ---------- */

function onSphere(r) {
  const u = rnd() * 2 - 1, a = rnd() * Math.PI * 2, s = Math.sqrt(1 - u * u);
  return [Math.cos(a) * s * r, u * r, Math.sin(a) * s * r];
}

// a point on the surface of an axis-aligned box, weighted by face area
function onBox(cx, cy, cz, w, h, d) {
  const areas = [w * h, w * h, w * d, w * d, h * d, h * d];
  let pick = rnd() * areas.reduce((a, b) => a + b), f = 0;
  while (pick > areas[f]) pick -= areas[f++];
  let x = range(-w / 2, w / 2), y = range(-h / 2, h / 2), z = range(-d / 2, d / 2);
  if (f < 2) z = f ? d / 2 : -d / 2;
  else if (f < 4) y = f === 3 ? h / 2 : -h / 2;
  else x = f === 5 ? w / 2 : -w / 2;
  return [cx + x, cy + y, cz + z];
}

function onSegment(a, b, jitter) {
  const t = rnd();
  return [0, 1, 2].map((k) => a[k] + (b[k] - a[k]) * t + range(-jitter, jitter));
}

// tube around a point on a line or ring
function tubeJitter(p, r) {
  const q = onSphere(r * Math.sqrt(rnd()));
  return [p[0] + q[0], p[1] + q[1], p[2] + q[2]];
}

const SHAPES = {
  // capture-the-flag flag on a pole
  flag() {
    if (rnd() < 0.14) return tubeJitter([-1.15, range(-1.8, 1.55), 0], 0.05);
    const u = rnd(), v = rnd();
    return [-1.15 + u * 2.3, 0.1 + v * 1.4, Math.sin(u * 5.5 - 0.6) * 0.2 * u + range(-0.02, 0.02)];
  },

  // three-layer neural network
  network() {
    const layers = [[-1.4, 4], [0, 5], [1.4, 4]];
    const node = (l, k) => [layers[l][0], (k - (layers[l][1] - 1) / 2) * 0.7, 0];
    if (rnd() < 0.42) {
      const l = (rnd() * 3) | 0, k = (rnd() * layers[l][1]) | 0, c = node(l, k);
      const q = onSphere(0.17);
      return [c[0] + q[0], c[1] + q[1], c[2] + q[2]];
    }
    const l = rnd() < 0.5 ? 0 : 1;
    const a = node(l, (rnd() * layers[l][1]) | 0), b = node(l + 1, (rnd() * layers[l + 1][1]) | 0);
    return onSegment(a, b, 0.018);
  },

  // wireframe-ish globe with an orbit ring
  globe() {
    const r = 1.45, p = rnd();
    if (p < 0.42) {
      if (rnd() < 0.5) { // meridian
        const lon = ((rnd() * 12) | 0) * (Math.PI / 6), lat = range(-Math.PI / 2, Math.PI / 2);
        return [Math.cos(lat) * Math.cos(lon) * r, Math.sin(lat) * r, Math.cos(lat) * Math.sin(lon) * r];
      }
      const lat = (((rnd() * 5) | 0) - 2) * (Math.PI / 7), lon = rnd() * Math.PI * 2;
      return [Math.cos(lat) * Math.cos(lon) * r, Math.sin(lat) * r, Math.cos(lat) * Math.sin(lon) * r];
    }
    if (p < 0.86) return onSphere(r);
    const a = rnd() * Math.PI * 2, R = 1.95;
    const x = Math.cos(a) * R, z = Math.sin(a) * R;
    return [x, z * 0.28 + range(-0.02, 0.02), z * 0.96];
  },

  // padlock: body with a keyhole, plus the shackle
  padlock() {
    if (rnd() < 0.64) {
      for (;;) {
        const p = onBox(0, -0.5, 0, 1.75, 1.3, 0.55);
        const front = Math.abs(p[2] - 0.275) < 1e-6;
        const hole = Math.hypot(p[0], p[1] + 0.32) < 0.17 || (Math.abs(p[0]) < 0.065 && p[1] < -0.32 && p[1] > -0.82);
        if (!(front && hole)) return p;
      }
    }
    const R = 0.6, cy = 0.15;
    if (rnd() < 0.72) {
      const a = rnd() * Math.PI;
      return tubeJitter([Math.cos(a) * R, cy + Math.sin(a) * R, 0], 0.11);
    }
    return tubeJitter([rnd() < 0.5 ? -R : R, range(-0.15, cy), 0], 0.11);
  },

  // magnifying glass
  magnifier() {
    const cx = -0.3, cy = 0.35, R = 0.85, p = rnd();
    if (p < 0.5) {
      const a = rnd() * Math.PI * 2;
      return tubeJitter([cx + Math.cos(a) * R, cy + Math.sin(a) * R, 0], 0.12);
    }
    if (p < 0.64) {
      const a = rnd() * Math.PI * 2, rr = Math.sqrt(rnd()) * (R - 0.15);
      return [cx + Math.cos(a) * rr, cy + Math.sin(a) * rr, (1 - (rr / R) ** 2) * 0.12];
    }
    const dir = -Math.PI / 4, start = R + 0.08, t = range(start, start + 1.15);
    return tubeJitter([cx + Math.cos(dir) * t, cy + Math.sin(dir) * t, 0], 0.14);
  },

  // gear with ten teeth
  gear() {
    const teeth = 10, inner = 0.4, root = 1.02, tip = 1.34, depth = 0.4;
    let a, r;
    if (rnd() < 0.72) {
      a = rnd() * Math.PI * 2;
      r = Math.sqrt(range(inner * inner, root * root));
    } else {
      const k = (rnd() * teeth) | 0, half = (Math.PI / teeth) * 0.48;
      a = (k / teeth) * Math.PI * 2 + range(-half, half);
      r = range(root, tip);
    }
    const z = rnd() < 0.6 ? (rnd() < 0.5 ? -depth / 2 : depth / 2) : range(-depth / 2, depth / 2);
    return [Math.cos(a) * r, Math.sin(a) * r, z];
  },

  // terminal window with a ">_" prompt
  terminal() {
    const w = 2.9, h = 2.0, p = rnd();
    if (p < 0.3) { // window outline
      const t = rnd() * 2 * (w + h);
      let x, y;
      if (t < w) [x, y] = [-w / 2 + t, h / 2];
      else if (t < w + h) [x, y] = [w / 2, h / 2 - (t - w)];
      else if (t < 2 * w + h) [x, y] = [w / 2 - (t - w - h), -h / 2];
      else [x, y] = [-w / 2, -h / 2 + (t - 2 * w - h)];
      return [x + range(-0.02, 0.02), y + range(-0.02, 0.02), range(-0.04, 0.04)];
    }
    if (p < 0.36) { // title bar and its three buttons
      if (rnd() < 0.5) return [range(-w / 2, w / 2), h / 2 - 0.32, range(-0.02, 0.02)];
      const k = (rnd() * 3) | 0, q = onSphere(0.06);
      return [-w / 2 + 0.22 + k * 0.2 + q[0], h / 2 - 0.16 + q[1], q[2]];
    }
    const g = GLYPH[(rnd() * GLYPH.length) | 0];
    return [g[0] + range(-0.012, 0.012), g[1] + range(-0.012, 0.012), range(-0.08, 0.08)];
  },

  // memory stack overflowing: four crisp frames, the top one knocked loose,
  // and a stream of data bursting out of the top
  stack() {
    const W = 2.0, H = 0.36, D = 0.62, p = rnd();
    // a point on one of a box's 12 edges (outlines read far better than filled faces)
    const edge = (cx, cy, cz, tilt) => {
      const e = (rnd() * 12) | 0, t = rnd() - 0.5, sx = e & 1 ? 0.5 : -0.5, sy = e & 2 ? 0.5 : -0.5;
      let v;
      if (e < 4) v = [t * W, sx * H, sy * D];
      else if (e < 8) v = [sx * W, t * H, sy * D];
      else v = [sx * W, sy * H, t * D];
      const c = Math.cos(tilt), s = Math.sin(tilt);
      return [cx + v[0] * c - v[1] * s + range(-0.015, 0.015), cy + v[0] * s + v[1] * c + range(-0.015, 0.015), cz + v[2]];
    };
    const face = (cx, cy, cz) => [cx + range(-W / 2, W / 2), cy + range(-H / 2, H / 2), cz + D / 2];
    if (p < 0.56) {
      const i = (rnd() * 4) | 0, cy = -1.75 + i * 0.62;
      return rnd() < 0.72 ? edge(0, cy, 0, 0) : face(0, cy, 0);
    }
    if (p < 0.76) {   // the loose frame, shoved up and tilted
      return rnd() < 0.85 ? edge(0.4, 0.75, 0.05, 0.28) : face(0.4, 0.75, 0.05);
    }
    // overflow: data spraying up and out of the top
    const t = Math.pow(rnd(), 0.8);
    const spread = 0.06 + t * 0.4;
    return [-0.6 + t * 1.5 + range(-spread, spread), 1.05 + t * 1.05 - t * t * 0.35 + range(-spread, spread) * 0.6, range(-spread, spread)];
  },


  // three linked blocks
  chain() {
    const centers = [[-1.25, -0.7, 0], [0, 0, 0], [1.25, 0.7, 0]], s = 0.8, p = rnd();
    if (p < 0.14) {
      const k = rnd() < 0.5 ? 0 : 1;
      return onSegment(centers[k], centers[k + 1], 0.03);
    }
    const c = centers[(rnd() * 3) | 0];
    if (p < 0.72) { // cube edges
      const h = s / 2, axis = (rnd() * 3) | 0, sa = rnd() < 0.5 ? -h : h, sb = rnd() < 0.5 ? -h : h;
      const t = range(-h, h);
      const v = axis === 0 ? [t, sa, sb] : axis === 1 ? [sa, t, sb] : [sa, sb, t];
      return [c[0] + v[0] + range(-0.015, 0.015), c[1] + v[1] + range(-0.015, 0.015), c[2] + v[2]];
    }
    return onBox(c[0], c[1], c[2], s, s, s);
  },

  // a short DNA double helix, used to close the page
  dna() {
    const turns = 2.5, height = 3.4, R = 0.85;
    // the second strand trails by 0.72 of a half turn (DNA's major/minor groove),
    // so the rungs cut across instead of all meeting on the centre line
    const GAP = Math.PI * 0.72;
    if (rnd() < 0.72) {
      const t = rnd(), s = rnd() < 0.5 ? 0 : GAP, a = t * turns * Math.PI * 2 + s;
      return tubeJitter([Math.cos(a) * R, -height / 2 + t * height, Math.sin(a) * R], 0.06);
    }
    const t = (((rnd() * turns * 8) | 0) + 0.5) / (turns * 8), a = t * turns * Math.PI * 2, f = rnd();
    const ax = Math.cos(a) * R, az = Math.sin(a) * R, bx = Math.cos(a + GAP) * R, bz = Math.sin(a + GAP) * R;
    return [ax + (bx - ax) * f, -height / 2 + t * height + range(-0.02, 0.02), az + (bz - az) * f];
  },

  // soft glowing core
  core() {
    const q = onSphere(1);
    const r = Math.pow(rnd(), 0.6) * 1.5;
    return [q[0] * r, q[1] * r, q[2] * r];
  },
};

// ">_" sampled from a canvas, mapped into world units
let GLYPH = [];
function buildGlyph(fontFamily) {
  const c = document.createElement("canvas");
  c.width = 260; c.height = 140;
  const g = c.getContext("2d");
  g.fillStyle = "#fff";
  g.font = `700 120px ${fontFamily}`;
  g.textBaseline = "middle";
  g.fillText(">_", 20, 74);
  const data = g.getImageData(0, 0, c.width, c.height).data;
  const pts = [];
  for (let y = 0; y < c.height; y += 2) {
    for (let x = 0; x < c.width; x += 2) {
      if (data[(y * c.width + x) * 4 + 3] > 128) pts.push([(x - 130) / 105 - 0.05, -(y - 70) / 105 - 0.18]);
    }
  }
  GLYPH = pts.length ? pts : [[0, 0]];
}

/* ---------- shaders ---------- */
const VERT = /* glsl */ `
  attribute vec3 aColor;
  attribute float aSize;
  attribute float aSeed;
  attribute float aGlow;   // 0 at rest, 1 when blown far from home (set by the simulation)
  uniform float uTime;
  uniform float uScale;
  uniform vec3 uTint;
  uniform float uTintAmt;
  uniform float uSizeMul;  // 1 for the particles, larger for the soft halo pass
  varying vec3 vColor;
  varying float vTwinkle;
  varying float vNear;
  varying float vGlow;
  void main() {
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    gl_PointSize = min(aSize * uScale / -mv.z * (1.0 + aGlow * 0.45) * uSizeMul, 28.0 * uSizeMul);
    vNear = smoothstep(0.15, 1.3, -mv.z);
    // the more disturbed a particle is, the closer it burns to white
    vColor = mix(mix(aColor, uTint, uTintAmt), vec3(1.0), aGlow * 0.7);
    vTwinkle = 0.65 + 0.35 * sin(uTime * 1.7 + aSeed * 40.0);
    vGlow = aGlow;
    gl_Position = projectionMatrix * mv;
  }
`;
const FRAG = /* glsl */ `
  uniform float uOpacity;
  uniform float uAlphaMul;
  uniform float uSoft;     // 0 = crisp dot, 1 = wide soft disc (halo)
  varying vec3 vColor;
  varying float vTwinkle;
  varying float vNear;
  varying float vGlow;
  void main() {
    float d = length(gl_PointCoord - 0.5);
    if (d > 0.5) discard;
    float a = mix(smoothstep(0.5, 0.0, d), 1.0 - d * 2.0, uSoft);
    gl_FragColor = vec4(vColor, a * a * (vTwinkle + vGlow * 0.35) * uOpacity * vNear * uAlphaMul);
  }
`;

// Cursor "wind". The cursor drags the particles it passes over along its own
// path; a soft spring then pulls each one home over a couple of seconds.
// ---------- backdrop: horizontal DNA strands + layered dust for depth ----------
// Its own shader: colour flows along each strand and a bright pulse travels
// down it, so the background is always gently alive without moving around.
const BACK_VERT = /* glsl */ `
  attribute vec3 aColor;
  attribute float aSize;
  attribute float aSeed;
  attribute float aT;      // position along a strand (0..1); -1 for loose dust
  uniform float uTime;
  uniform float uScale;
  uniform vec3 uTint;
  varying vec3 vColor;
  varying float vA;
  varying float vSoft;
  const vec3 V = vec3(0.604, 0.482, 1.0);
  const vec3 T = vec3(0.31, 0.878, 0.784);
  const vec3 C = vec3(1.0, 0.42, 0.49);
  const vec3 A = vec3(1.0, 0.769, 0.42);
  vec3 cycle(float p) {
    p = fract(p) * 4.0;
    if (p < 1.0) return mix(V, T, p);
    if (p < 2.0) return mix(T, C, p - 1.0);
    if (p < 3.0) return mix(C, A, p - 2.0);
    return mix(A, V, p - 3.0);
  }
  uniform float uFocus;   // distance that is sharp; nearer and farther go soft
  void main() {
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    float dist = -mv.z;
    float blur = clamp(abs(dist - uFocus) / (uFocus * 1.6), 0.0, 1.0);
    float pulse;
    if (aT < -1.5) {
      // out-of-focus blobs drifting in the fluid
      vColor = mix(aColor, uTint, 0.3);
      vA = 0.1 + 0.05 * sin(uTime * 0.4 + aSeed * 30.0);
      gl_PointSize = min(aSize * uScale / dist, 260.0);
      gl_Position = projectionMatrix * mv;
      vSoft = 1.0;
      return;
    }
    if (aT >= 0.0) {
      // colour drifts along the strand; two waves of light travel through it
      vColor = mix(cycle(aT * 1.6 - uTime * 0.05), uTint, 0.25);
      float w1 = pow(0.5 + 0.5 * sin(aT * 26.0 - uTime * 1.6), 6.0);
      float w2 = pow(0.5 + 0.5 * sin(aT * 9.0 + uTime * 0.7 + aSeed), 4.0);
      pulse = 0.35 + 0.9 * w1 + 0.35 * w2;
    } else {
      vColor = mix(aColor, uTint, 0.35);
      pulse = 0.45 + 0.35 * sin(uTime * 0.9 + aSeed * 50.0);
    }
    // strands fade in and out at their ends instead of stopping dead
    if (aT >= 0.0) pulse *= smoothstep(0.0, 0.12, aT) * smoothstep(1.0, 0.88, aT);
    // depth of field: soft, larger and fainter away from the focus distance
    vA = pulse * (1.0 - blur * 0.65);
    vSoft = blur;
    gl_PointSize = min(aSize * uScale / dist * (0.8 + pulse * 0.4) * (1.0 + blur * 2.2), 40.0);
    gl_Position = projectionMatrix * mv;
  }
`;
const BACK_FRAG = /* glsl */ `
  uniform float uOpacity;
  varying vec3 vColor;
  varying float vA;
  varying float vSoft;
  void main() {
    float d = length(gl_PointCoord - 0.5);
    if (d > 0.5) discard;
    // sharp points are crisp dots; soft ones are wide, gentle discs
    float a = mix(smoothstep(0.5, 0.0, d), 1.0 - smoothstep(0.0, 0.5, d), vSoft);
    gl_FragColor = vec4(vColor, a * a * vA * uOpacity);
  }
`;

function buildBackdrop(small) {
  const pos = [], col = [], size = [], seed = [], tpos = [];
  const push = (p, c, sz, t) => { pos.push(...p); col.push(...c); size.push(sz); seed.push(rnd()); tpos.push(t); };

  // a horizontal double helix (axis along x)
  function helix({ length, radius, turns, y, z, tilt, beads, rungs, haze, sizeK }) {
    const half = length / 2, ct = Math.cos(tilt), st = Math.sin(tilt);
    const place = (x, yy, zz) => [x * ct - yy * st, x * st + yy * ct + y, zz + z];
    const at = (strand, t) => {
      const a = t * turns * Math.PI * 2 + strand * Math.PI;
      return [-half + t * length, Math.cos(a) * radius, Math.sin(a) * radius];
    };
    for (let s = 0; s < 2; s++) {
      for (let i = 0; i < beads; i++) {
        const t = i / (beads - 1), p = at(s, t);
        push(place(p[0], p[1] + range(-0.06, 0.06), p[2] + range(-0.06, 0.06)), [1, 1, 1], range(0.07, 0.13) * sizeK, t);
      }
    }
    for (let r = 0; r < rungs; r++) {
      const t = (r + 0.5) / rungs, A = at(0, t), B = at(1, t);
      for (let k = 1; k < 9; k++) {
        const f = k / 9;
        push(place(A[0], A[1] + (B[1] - A[1]) * f, A[2] + (B[2] - A[2]) * f), [1, 1, 1], 0.05 * sizeK, t);
      }
    }
    for (let i = 0; i < haze; i++) {
      const s = rnd() < 0.5 ? 0 : 1, t = rnd(), p = at(s, t), q = onSphere(range(0.3, radius * 1.1));
      push(place(p[0] + q[0], p[1] + q[1], p[2] + q[2]), [1, 1, 1], range(0.03, 0.07) * sizeK, t);
    }
  }
  const k = small ? 0.55 : 1;
  // near strand, low across the screen
  helix({ length: 70, radius: 1.5, turns: 14, y: -3.2, z: -16, tilt: -0.1,
    beads: 1600 * k, rungs: 90, haze: 1400 * k, sizeK: 1 });
  // far strand, high and fainter, crossing the other way
  helix({ length: 110, radius: 2.6, turns: 16, y: 6.5, z: -34, tilt: 0.14,
    beads: 1500 * k, rungs: 80, haze: 1200 * k, sizeK: 1.5 });

  // dust in several depth layers so the space reads as deep, not flat black
  const dustN = small ? 1600 : 3200;
  for (let i = 0; i < dustN; i++) {
    const z = -6 - Math.pow(rnd(), 0.7) * 44;
    const spread = 0.42 * -z + 4;
    const c = rnd() < 0.55 ? PALETTE[(rnd() * 4) | 0] : INK.map((v) => v * 0.6);
    push([range(-spread * 1.8, spread * 1.8), range(-spread, spread), z], c, range(0.03, 0.09), -1);
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  geo.setAttribute("aColor", new THREE.Float32BufferAttribute(col, 3));
  geo.setAttribute("aSize", new THREE.Float32BufferAttribute(size, 1));
  geo.setAttribute("aSeed", new THREE.Float32BufferAttribute(seed, 1));
  geo.setAttribute("aT", new THREE.Float32BufferAttribute(tpos, 1));
  const mat = new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0 }, uScale: { value: 1 }, uOpacity: { value: 0.85 },
      uTint: { value: new THREE.Color() }, uFocus: { value: 25 },
      uSizeMul: { value: 1 }, uAlphaMul: { value: 1 }, uSoft: { value: 0 },
    },
    vertexShader: BACK_VERT, fragmentShader: BACK_FRAG,
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
  });
  const pts = new THREE.Points(geo, mat);
  pts.frustumCulled = false;
  const g = new THREE.Group();
  g.add(pts);
  g.userData.mat = mat;
  return g;
}

// Orbit mode (landing page). The camera sits just outside a vertical DNA helix
// at the centre of the world and looks outward; scrolling turns it around the
// helix. Category shapes wait at different directions around it.
const ORBIT = { camR: 5, dist: 7, helixR: 3.4, pitch: 2.8 };
// unit vector pointing outward at angle a (a = 0 looks down -z), and its right-hand side
const outward = (a, out) => out.set(Math.sin(a), 0, -Math.cos(a));
const rightOf = (a, out) => out.set(Math.cos(a), 0, Math.sin(a));

function backMaterial(opacity) {
  return new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0 }, uScale: { value: 1 }, uOpacity: { value: opacity },
      uTint: { value: new THREE.Color() }, uFocus: { value: 22 },
    },
    vertexShader: BACK_VERT, fragmentShader: BACK_FRAG,
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
  });
}

function pointsFrom(data, mat) {
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.Float32BufferAttribute(data.pos, 3));
  geo.setAttribute("aColor", new THREE.Float32BufferAttribute(data.col, 3));
  geo.setAttribute("aSize", new THREE.Float32BufferAttribute(data.size, 1));
  geo.setAttribute("aSeed", new THREE.Float32BufferAttribute(data.seed, 1));
  geo.setAttribute("aT", new THREE.Float32BufferAttribute(data.tpos, 1));
  const p = new THREE.Points(geo, mat);
  p.frustumCulled = false;
  return p;
}

function bag() {
  const d = { pos: [], col: [], size: [], seed: [], tpos: [] };
  d.push = (p, c, sz, t) => { d.pos.push(...p); d.col.push(...c); d.size.push(sz); d.seed.push(rnd()); d.tpos.push(t); };
  return d;
}

// A DNA double helix along any direction: two backbones with base-pair rungs.
function addDNA(d, { c, u, length, radius, turns, sizeK = 1, k = 1 }) {
  // basis across the strand
  const ax = new THREE.Vector3(...u).normalize();
  const v = new THREE.Vector3(0, 1, 0).cross(ax);
  if (v.lengthSq() < 1e-4) v.set(1, 0, 0);
  v.normalize();
  const w = ax.clone().cross(v).normalize();
  const place = (along, p, q) => [
    c[0] + ax.x * along + v.x * p + w.x * q,
    c[1] + ax.y * along + v.y * p + w.y * q,
    c[2] + ax.z * along + v.z * p + w.z * q,
  ];
  const at = (s, t) => {
    const a = t * turns * Math.PI * 2 + s * Math.PI;
    return [-length / 2 + t * length, Math.cos(a) * radius, Math.sin(a) * radius];
  };
  const beads = Math.round(length * 10 * k);
  for (let s = 0; s < 2; s++) {
    for (let i = 0; i < beads; i++) {
      const t = i / (beads - 1), p = at(s, t);
      d.push(place(p[0], p[1] + range(-0.04, 0.04), p[2] + range(-0.04, 0.04)), [1, 1, 1], range(0.1, 0.15) * sizeK, t);
    }
  }
  const rungs = Math.round(turns * 9);
  for (let q = 0; q < rungs; q++) {
    const t = (q + 0.5) / rungs, A = at(0, t), B = at(1, t);
    for (let j = 1; j < 9; j++) {
      const f = j / 9;
      d.push(place(A[0], A[1] + (B[1] - A[1]) * f, A[2] + (B[2] - A[2]) * f), [1, 1, 1], 0.08 * sizeK, t);
    }
  }
}

// Background for the landing page: a microscope view of strands at every angle,
// filling the space around the camera's whole path.
function buildRing(small) {
  const d = bag(), k = small ? 0.4 : 1;
  const count = small ? 16 : 28;
  const c = new THREE.Vector3(), u = new THREE.Vector3(), tmp = new THREE.Vector3();
  let made = 0, tries = 0;
  while (made < count && tries < 2000) {
    tries++;
    const a = rnd() * Math.PI * 2, dist = 20 + Math.pow(rnd(), 0.7) * 44;
    c.set(Math.sin(a) * dist, range(-52, 22), -Math.cos(a) * dist);
    // mostly upright or lying along the ring, never pointing at the centre
    const tangent = tmp.set(Math.cos(a), 0, Math.sin(a));
    u.copy(tangent).multiplyScalar(range(-1, 1)).add(new THREE.Vector3(0, range(-1.2, 1.2), 0))
      .add(new THREE.Vector3(Math.sin(a), 0, -Math.cos(a)).multiplyScalar(range(-0.35, 0.35))).normalize();
    // keep strands clear of the camera path and the shapes (within ~10 of the axis)
    const length = range(60, 110);
    let near = Infinity;
    for (let t = -0.5; t <= 0.5; t += 0.05) {
      const px = c.x + u.x * length * t, pz = c.z + u.z * length * t;
      near = Math.min(near, Math.hypot(px, pz));
    }
    if (near < 17.5) continue;
    const sizeK = 0.9 + dist / 40;
    addDNA(d, { c: c.toArray(), u: u.toArray(), length, radius: range(1.0, 1.5) * (0.8 + dist / 70),
      turns: Math.round(length / range(7.5, 9.5)), sizeK, k });
    made++;
  }
  // fine dust in the fluid
  const n = Math.round(5000 * k);
  for (let i = 0; i < n; i++) {
    const a = rnd() * Math.PI * 2, dist = 7.5 + Math.pow(rnd(), 0.8) * 58;
    const col = rnd() < 0.55 ? PALETTE[(rnd() * 4) | 0] : INK.map((v) => v * 0.6);
    d.push([Math.sin(a) * dist, range(-55, 22), -Math.cos(a) * dist], col, range(0.03, 0.08), -1);
  }
  // large out-of-focus blobs, like cells drifting past the lens
  for (let i = 0; i < (small ? 40 : 90); i++) {
    const a = rnd() * Math.PI * 2, dist = range(9, 42);
    d.push([Math.sin(a) * dist, range(-55, 22), -Math.cos(a) * dist], PALETTE[(rnd() * 4) | 0], range(1.2, 3.5), -2);
  }
  const mat = backMaterial(0.5);
  const g = new THREE.Group();
  g.add(pointsFrom(d, mat));
  g.userData.mat = mat;
  return g;
}

const BRUSH = 0.085;     // brush radius in NDC units (screen height = 2)
const CARRY = 1.15;      // share of the cursor's speed a touched particle picks up
const SPRING = 2.2;      // pull back toward the shape
const DAMP = 3.0;        // drag; with SPRING this returns smoothly without wobbling
const MAX_SPEED = 14;    // local units per second

export async function createParticles(canvas, { shapes, tints = [], start = 0, scale: sizeScale = 1, initial = {}, backdrop = false, orbit = false }) {
  const small = innerWidth < 720;
  const N = small ? 3600 : 7000;

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setClearColor(0x000000, 0);
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(40, 1, 0.1, 100);
  camera.position.set(0, 0, 7);

  try {
    await Promise.race([document.fonts.load('700 120px "Martian Mono"'), new Promise((r) => setTimeout(r, 1200))]);
  } catch (e) { /* system mono is fine */ }
  buildGlyph('"Martian Mono", monospace');

  // every shape uses the same N points, so point i in one shape morphs into point i of the next
  const targets = shapes.map((name) => {
    const make = SHAPES[name] || SHAPES.core;
    const arr = new Float32Array(N * 3);
    for (let i = 0; i < N; i++) arr.set(make(), i * 3);
    return arr;
  });

  const scatter = new Float32Array(N * 3);
  const colors = new Float32Array(N * 3);
  const sizes = new Float32Array(N);
  const seeds = new Float32Array(N);
  for (let i = 0; i < N; i++) {
    const q = onSphere(range(1.2, 3.2));
    scatter.set(q, i * 3);
    colors.set(rnd() < 0.45 ? PALETTE[(rnd() * 4) | 0] : INK.map((v) => v * range(0.55, 0.85)), i * 3);
    sizes[i] = range(0.022, 0.058);
    seeds[i] = rnd();
  }

  const positions = new Float32Array(targets[Math.min(start, targets.length - 1)]);
  const base = new Float32Array(positions);  // where each particle belongs this frame
  const offset = new Float32Array(N * 3);    // how far the cursor has blown it
  const vel = new Float32Array(N * 3);
  const glow = new Float32Array(N);
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.BufferAttribute(positions, 3).setUsage(THREE.DynamicDrawUsage));
  geo.setAttribute("aColor", new THREE.BufferAttribute(colors, 3));
  geo.setAttribute("aSize", new THREE.BufferAttribute(sizes, 1));
  geo.setAttribute("aSeed", new THREE.BufferAttribute(seeds, 1));
  geo.setAttribute("aGlow", new THREE.BufferAttribute(glow, 1).setUsage(THREE.DynamicDrawUsage));
  const mat = new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0 }, uScale: { value: 1 }, uOpacity: { value: 1 },
      uTint: { value: new THREE.Color() }, uTintAmt: { value: 0.3 },
      uSizeMul: { value: 1 }, uAlphaMul: { value: 1 }, uSoft: { value: 0 },
    },
    vertexShader: VERT, fragmentShader: FRAG,
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
  });
  // halo: the same points drawn again, much larger and very faint, so the glow
  // hugs the outline of whatever shape the particles form
  const haloMat = new THREE.ShaderMaterial({
    uniforms: { ...mat.uniforms, uSizeMul: { value: 4.5 }, uAlphaMul: { value: 0.05 }, uSoft: { value: 1 }, uTintAmt: { value: 0.75 } },
    vertexShader: VERT, fragmentShader: FRAG,
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
  });
  const halo = new THREE.Points(geo, haloMat);
  halo.frustumCulled = false;
  halo.renderOrder = -1;
  const cloud = new THREE.Points(geo, mat);
  cloud.frustumCulled = false;
  const group = new THREE.Group();
  group.add(halo);
  group.add(cloud);
  scene.add(group);
  const back = backdrop && !orbit ? buildBackdrop(small) : null;
  if (back) scene.add(back);
  const ring = orbit ? buildRing(small) : null;
  const core = null;
  if (ring) scene.add(ring);
  group.rotation.order = "YXZ";   // yaw to face the helix first, then tilt

  const tintColors = shapes.map((_, k) => new THREE.Color(tints[k] || "#ece9f5"));
  const tmpTint = new THREE.Color(tints[start] || "#ece9f5"), tintTarget = new THREE.Color();

  let halfW = 4, halfH = 2.5, baseScale = 1;
  function resize() {
    const w = innerWidth, h = innerHeight;
    renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    mat.uniforms.uScale.value = (renderer.getPixelRatio() * h) / (2 * Math.tan(THREE.MathUtils.degToRad(20)));
    for (const b of [back, ring, core]) if (b) b.userData.mat.uniforms.uScale.value = mat.uniforms.uScale.value;
    halfH = Math.tan(THREE.MathUtils.degToRad(20)) * camera.position.z;
    halfW = halfH * camera.aspect;
    baseScale = clamp(w / h / 1.0, 0.7, 1) * sizeScale;
  }
  resize();
  for (const b of [back, ring, core]) if (b) b.userData.mat.uniforms.uScale.value = mat.uniforms.uScale.value;

  const cur = { halo: 1, orbit: initial.orbit ?? 0, shapeAt: initial.orbit ?? 0, camY: initial.camY ?? 0, shapeY: initial.camY ?? 0, f: start, x: initial.x ?? 0, y: initial.y ?? 0, scale: initial.scale ?? 1, spin: 0, dim: initial.dim ?? 1, mx: 0, my: 0 };
  // cursor in NDC this frame and last frame
  const mouse = { x: 0, y: 0, px: 0, py: 0, on: false, was: false };
  const mvp = new THREE.Matrix4(), invWorld = new THREE.Matrix4();
  const v3 = new THREE.Vector3(), dir3 = new THREE.Vector3(), fwd3 = new THREE.Vector3();
  const oA = new THREE.Vector3(), rA = new THREE.Vector3(), oC = new THREE.Vector3(), rC = new THREE.Vector3();
  const pA = new THREE.Vector3(), pB = new THREE.Vector3();
  let active = false;   // skip the simulation while nothing is disturbed

  // the point under an NDC position on the plane through the shape, in the shape's own space
  function cursorLocal(nx, ny, out) {
    v3.set(nx, ny, 0.5).unproject(camera);
    dir3.copy(v3).sub(camera.position).normalize();
    camera.getWorldDirection(fwd3);
    const t = fwd3.dot(v3.copy(group.position).sub(camera.position)) / Math.max(1e-4, dir3.dot(fwd3));
    out.copy(camera.position).addScaledVector(dir3, t).applyMatrix4(invWorld);
    return out;
  }

  function simulate(dt) {
    const brushing = mouse.on && mouse.was && (mouse.x !== mouse.px || mouse.y !== mouse.py);
    if (!brushing && !active) return;
    camera.updateMatrixWorld();
    group.updateMatrixWorld();
    mvp.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse).multiply(group.matrixWorld);
    invWorld.copy(group.matrixWorld).invert();
    const m = mvp.elements, aspect = camera.aspect;

    // cursor velocity in the shape's local space, plus the screen segment it swept
    let cvx = 0, cvy = 0, cvz = 0, sx = 0, sy = 0, segX = 0, segY = 0, segLen2 = 1;
    if (brushing) {
      cursorLocal(mouse.px, mouse.py, pA);
      cursorLocal(mouse.x, mouse.y, pB);
      const inv = 1 / Math.max(dt, 1 / 240);
      cvx = (pB.x - pA.x) * inv; cvy = (pB.y - pA.y) * inv; cvz = (pB.z - pA.z) * inv;
      const sp = Math.hypot(cvx, cvy, cvz);
      if (sp > MAX_SPEED) { const k = MAX_SPEED / sp; cvx *= k; cvy *= k; cvz *= k; }
      sx = mouse.px * aspect; sy = mouse.py;
      segX = mouse.x * aspect - sx; segY = mouse.y - sy;
      segLen2 = segX * segX + segY * segY || 1e-9;
    }
    const r2 = BRUSH * BRUSH, pickup = Math.min(1, dt * 16);
    const decay = Math.exp(-DAMP * dt), pull = SPRING * dt;
    let maxOff = 0;

    for (let i = 0, j = 0; i < N; i++, j += 3) {
      let ox = offset[j], oy = offset[j + 1], oz = offset[j + 2];
      let vx = vel[j], vy = vel[j + 1], vz = vel[j + 2];
      if (brushing) {
        const x = base[j] + ox, y = base[j + 1] + oy, z = base[j + 2] + oz;
        const w = m[3] * x + m[7] * y + m[11] * z + m[15];
        if (w > 0.05) {
          const px = ((m[0] * x + m[4] * y + m[8] * z + m[12]) / w) * aspect;
          const py = (m[1] * x + m[5] * y + m[9] * z + m[13]) / w;
          // distance from this particle to the path the cursor covered this frame
          let t = ((px - sx) * segX + (py - sy) * segY) / segLen2;
          t = t < 0 ? 0 : t > 1 ? 1 : t;
          const dx = px - (sx + segX * t), dy = py - (sy + segY * t);
          const d2 = dx * dx + dy * dy;
          if (d2 < r2 * 4) {
            const k = Math.exp(-d2 / r2) * pickup;
            const jig = 0.75 + seeds[i] * 0.5;   // a little variety so the trail frays
            vx += (cvx * CARRY * jig - vx) * k;
            vy += (cvy * CARRY * jig - vy) * k;
            vz += (cvz * CARRY * jig + (seeds[i] - 0.5) * 1.2 - vz) * k;
          }
        }
      }
      // spring home with drag
      vx = (vx - ox * pull) * decay;
      vy = (vy - oy * pull) * decay;
      vz = (vz - oz * pull) * decay;
      ox += vx * dt; oy += vy * dt; oz += vz * dt;
      offset[j] = ox; offset[j + 1] = oy; offset[j + 2] = oz;
      vel[j] = vx; vel[j + 1] = vy; vel[j + 2] = vz;
      const o = Math.sqrt(ox * ox + oy * oy + oz * oz);
      if (o > maxOff) maxOff = o;
      const g = o * 1.25;
      glow[i] = g > 1 ? 1 : g;
    }
    active = maxOff > 0.002;
    geo.attributes.aGlow.needsUpdate = true;
  }
  // morphTo(k): go straight from whatever is on screen to shape k
  const direct = { from: new Float32Array(N * 3), to: start, t: 1 };
  function morphTo(k) {
    k = clamp(k, 0, targets.length - 1);
    if (k === direct.to && direct.t >= 1) return;
    direct.from.set(base);
    direct.to = k;
    direct.t = 0;
  }
  let lastT = 0;

  let lastTh = 0, bank = 0, snapNext = false;
  // jump the eased values straight to the page's targets (used after a warp)
  function snap() { snapNext = true; }
  function update(s) {
    const introE = s.intro === undefined ? 1 : smooth(clamp(s.intro));
    if (snapNext) {
      snapNext = false;
      if (s.f !== undefined) cur.f = clamp(s.f, 0, targets.length - 1);
      cur.x = s.x ?? cur.x; cur.y = s.y ?? cur.y; cur.scale = s.scale ?? cur.scale;
      cur.orbit = s.orbit ?? cur.orbit; cur.shapeAt = s.shapeAt ?? cur.shapeAt;
      cur.camY = s.camY ?? cur.camY; cur.shapeY = s.shapeY ?? cur.shapeY;
      lastTh = cur.orbit; bank = 0;
    }
    const dt = Math.min(0.1, s.time - lastT);
    lastT = s.time;
    const ease = (c, t, rate) => c + (t - c) * (1 - Math.exp(-dt * rate));
    if (s.f !== undefined) cur.f = ease(cur.f, clamp(s.f, 0, targets.length - 1), 2.2);
    const rate = s.rate ?? 2.6;   // pages raise this for the dive-in transition
    cur.x = ease(cur.x, s.x ?? 0, rate);
    cur.y = ease(cur.y, s.y ?? 0, rate);
    cur.scale = ease(cur.scale, s.scale ?? 1, rate);
    cur.spin = ease(cur.spin, s.spin ?? 0, 3);
    cur.dim = ease(cur.dim, s.dim ?? 1, s.rate ?? 3);
    cur.mx = ease(cur.mx, s.mouseX || 0, 2.5);
    cur.my = ease(cur.my, s.mouseY || 0, 2.5);

    let i0, i1, e;
    if (s.f === undefined) {
      // direct mode: from the last on-screen positions to the chosen shape
      direct.t = Math.min(1, direct.t + dt / 1.5);
      e = smooth(direct.t);
      const B = targets[direct.to], burst = Math.sin(Math.PI * e), F = direct.from;
      for (let i = 0; i < N * 3; i++) base[i] = F[i] + (B[i] - F[i]) * e + scatter[i] * burst;
      i0 = i1 = direct.to;
    } else {
      i0 = Math.min(Math.floor(cur.f), targets.length - 1);
      i1 = Math.min(i0 + 1, targets.length - 1);
      e = smooth(cur.f - i0);
      const burst = Math.sin(Math.PI * e), A = targets[i0], B = targets[i1];
      for (let i = 0; i < N * 3; i++) base[i] = A[i] + (B[i] - A[i]) * e + scatter[i] * burst;
    }
    mouse.px = mouse.x; mouse.py = mouse.y; mouse.was = mouse.on;
    mouse.on = s.pointerX !== undefined;
    if (mouse.on) { mouse.x = s.pointerX; mouse.y = s.pointerY; }

    tintTarget.copy(tintColors[i0]).lerp(tintColors[i1], e);
    tmpTint.lerp(tintTarget, 1 - Math.exp(-dt * 2.5));
    mat.uniforms.uTint.value.copy(tmpTint);
    mat.uniforms.uTime.value = s.time;
    mat.uniforms.uOpacity.value = cur.dim;
    cur.halo = ease(cur.halo, s.halo ?? 1, 3);
    haloMat.uniforms.uAlphaMul.value = 0.05 * cur.halo;

    // x is given as a fraction of the half screen width (-1 left edge, 1 right edge)
    // x and y are fractions of the half screen; on top of that the shape keeps
    // drifting in a slow loop so it never sits still
    const t = s.time;
    const drift = 1 / Math.max(1, cur.scale * 0.6);
    const dx = (Math.sin(t * 0.23) * 0.14 + Math.sin(t * 0.51) * 0.04) * drift;
    const dy = Math.sin(t * 0.31 + 1.3) * 0.1 * drift;
    const dz = Math.sin(t * 0.17) * 0.2 * drift;
    const sway = Math.sin(t * 0.35) * 0.55 + cur.mx * 0.3;
    group.scale.setScalar(baseScale * cur.scale);
    group.rotation.x = 0.1 + Math.sin(t * 0.27) * 0.07 + cur.my * 0.1;
    group.rotation.z = Math.sin(t * 0.19) * 0.08;

    if (orbit) {
      // camera turns around the central helix; the shape waits out at its own angle
      // the page gives angles (radians) and how far down we are; ease them all
      cur.orbit = ease(cur.orbit, s.orbit ?? 0, 2.2);
      cur.shapeAt = ease(cur.shapeAt, s.shapeAt ?? 0, 2.2);
      cur.camY = ease(cur.camY, s.camY ?? 0, 2.2);
      cur.shapeY = ease(cur.shapeY, s.shapeY ?? 0, 2.2);
      const th = cur.orbit, al = cur.shapeAt;
      outward(th, oC); rightOf(th, rC);
      // intro: the camera starts high above, tilted down, and sinks into place
      const lift = (1 - introE) * 16;
      camera.position.set(oC.x * ORBIT.camR, -cur.camY + lift, oC.z * ORBIT.camR);
      // bank into the turn, like riding round the helix
      const turnRate = (th - lastTh) / Math.max(dt, 1e-3);
      lastTh = th;
      bank = ease(bank, clamp(-turnRate * 0.22, -0.32, 0.32), 4);
      camera.up.set(rC.x * Math.sin(bank), Math.cos(bank), rC.z * Math.sin(bank));
      camera.lookAt(
        camera.position.x + oC.x * 10 + rC.x * cur.mx * 0.6,
        camera.position.y - cur.my * 0.4 - lift * 0.95,
        camera.position.z + oC.z * 10 + rC.z * cur.mx * 0.6,
      );
      outward(al, oA); rightOf(al, rA);
      const R = ORBIT.camR + ORBIT.dist + dz, side = cur.x * halfW + dx;
      group.position.set(oA.x * R + rA.x * side, -cur.shapeY + cur.y * halfH + dy, oA.z * R + rA.z * side);
      // the cloud swirls a half turn while it is scattered between shapes
      const mid = cur.f - Math.floor(cur.f);
      group.rotation.y = -al + sway + Math.sin(Math.PI * mid) * Math.PI * 0.6;
    } else {
      group.position.set(cur.x * halfW + dx, cur.y * halfH + dy, dz);
      // sway at rest (flat shapes stay readable), plus any spin the page asks for
      group.rotation.y = sway + cur.spin;
      camera.position.x = cur.mx * 0.25;
      camera.position.y = -cur.my * 0.18;
      camera.lookAt(0, 0, 0);
    }

    for (const b of [ring, core]) {
      if (!b) continue;
      b.userData.mat.uniforms.uTime.value = s.time;
      b.userData.mat.uniforms.uTint.value.copy(tmpTint);
    }
    if (back) {
      // stays put while scrolling; only a touch of mouse parallax for depth
      back.position.x = -cur.mx * 0.5;
      back.position.y = cur.my * 0.3;
      back.userData.mat.uniforms.uTime.value = s.time;
      back.userData.mat.uniforms.uTint.value.copy(tmpTint);
    }
    if (introE < 1) {
      // still arriving: the shape gathers out of a wide spread of dust
      const spread = Math.pow(1 - introE, 1.5) * 2.4;
      for (let i = 0; i < N * 3; i++) base[i] += scatter[i] * spread;
    }
    simulate(dt);
    for (let i = 0; i < N * 3; i++) positions[i] = base[i] + offset[i];
    geo.attributes.position.needsUpdate = true;
    renderer.render(scene, camera);
  }

  // compile shaders now, during loading, instead of on the first animated frame
  renderer.compile(scene, camera);
  return { update, resize, morphTo, snap };
}
