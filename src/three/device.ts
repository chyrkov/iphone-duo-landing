import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { createMaterials, applyColorway, applyXray, type DeviceMaterials } from './materials';
import { createScreenMaterial, ScreenSet, type ScreenMaterial } from './screens';

/**
 * Procedural iPhone Duo. 1 scene unit = 100 mm.
 *
 *   device.root            ← position / scale (scroll state)
 *     spin                 ← turntable (world Y)
 *       orient             ← pose quaternion
 *         foldRoot         ← keeps the device centred while it folds
 *           rightPanel     ← fixed half (rear cameras on its back)
 *           leftPivot      ← rotates about the hinge (outer display on its back)
 *             leftPanel
 *           hingePivot → hingeCover (micro-blasted), hingeMech (100+ parts)
 *
 * Fold angle θ: 0 = closed, 180 = flat open. The hinge runs along local Y.
 */

export const DIM = {
  W: 0.823, // half width (open 164.6 mm)
  H: 1.178, // height 117.8 mm
  T: 0.052, // panel thickness (open 5.2 mm)
  GAP: 0.009, // closed: 2T + GAP = 11.3 mm
  R: 0.105, // free-side corner radius
  BZ_IN: 0.03, // inner display bezel
  BZ_OUT: 0.016, // outer display bezel
};
const { W, H, T, GAP, R, BZ_IN, BZ_OUT } = DIM;
const ZP = T / 2 + GAP / 2; // hinge axis sits just above the inner surface
const DEG = Math.PI / 180;

export const INNER_ASPECT = (2 * W - 2 * BZ_IN) / (H - 2 * BZ_IN);
export const OUTER_ASPECT = (W - 2 * BZ_OUT) / (H - 2 * BZ_OUT);

/** Rounded-rect outline with independent left/right corner radii (hinge side is square). */
function outline<T extends THREE.Path>(p: T, x0: number, x1: number, y0: number, y1: number, rL: number, rR: number): T {
  p.moveTo(x0 + rL, y0);
  p.lineTo(x1 - rR, y0);
  if (rR > 0) p.absarc(x1 - rR, y0 + rR, rR, -Math.PI / 2, 0, false);
  p.lineTo(x1, y1 - rR);
  if (rR > 0) p.absarc(x1 - rR, y1 - rR, rR, 0, Math.PI / 2, false);
  p.lineTo(x0 + rL, y1);
  if (rL > 0) p.absarc(x0 + rL, y1 - rL, rL, Math.PI / 2, Math.PI, false);
  p.lineTo(x0, y0 + rL);
  if (rL > 0) p.absarc(x0 + rL, y0 + rL, rL, Math.PI, Math.PI * 1.5, false);
  return p;
}

/** Panel outline inset by `i` (hinge side inset by `ih`). */
function panelShape(side: 1 | -1, i: number, ih = i): THREE.Shape {
  const x0 = side > 0 ? ih : -W + i;
  const x1 = side > 0 ? W - i : -ih;
  const r = Math.max(0, R - i);
  return outline(new THREE.Shape(), x0, x1, -H / 2 + i, H / 2 - i, side > 0 ? 0 : r, side > 0 ? r : 0);
}

function panelPath(side: 1 | -1, i: number, ih = i): THREE.Path {
  const x0 = side > 0 ? ih : -W + i;
  const x1 = side > 0 ? W - i : -ih;
  const r = Math.max(0, R - i);
  return outline(new THREE.Path(), x0, x1, -H / 2 + i, H / 2 - i, side > 0 ? 0 : r, side > 0 ? r : 0);
}

function setUV(geo: THREE.BufferGeometry, fn: (x: number, y: number) => [number, number]) {
  const pos = geo.attributes.position;
  const uv = new Float32Array(pos.count * 2);
  for (let i = 0; i < pos.count; i++) {
    const [u, v] = fn(pos.getX(i), pos.getY(i));
    uv[i * 2] = u;
    uv[i * 2 + 1] = v;
  }
  geo.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
}

function pill(w: number, h: number): THREE.Shape {
  const r = h / 2;
  const s = new THREE.Shape();
  s.moveTo(-w / 2 + r, -r);
  s.lineTo(w / 2 - r, -r);
  s.absarc(w / 2 - r, 0, r, -Math.PI / 2, Math.PI / 2, false);
  s.lineTo(-w / 2 + r, r);
  s.absarc(-w / 2 + r, 0, r, Math.PI / 2, Math.PI * 1.5, false);
  return s;
}

/** U-shaped case rim around the three free sides of the right half (mirror for left). */
function caseRim(e: number): THREE.Shape {
  const xh = 0.006, xf = W, yh = H / 2;
  const Ro = R + e;
  const s = new THREE.Shape();
  s.moveTo(xh, -yh - e);
  s.lineTo(xf + e - Ro, -yh - e);
  s.absarc(xf + e - Ro, -yh - e + Ro, Ro, -Math.PI / 2, 0, false);
  s.lineTo(xf + e, yh + e - Ro);
  s.absarc(xf + e - Ro, yh + e - Ro, Ro, 0, Math.PI / 2, false);
  s.lineTo(xh, yh + e);
  s.lineTo(xh, yh + 0.0006);
  s.lineTo(xf - R, yh + 0.0006);
  s.absarc(xf - R, yh - R, R + 0.0006, Math.PI / 2, 0, true);
  s.lineTo(xf + 0.0006, -yh + R);
  s.absarc(xf - R, -yh + R, R + 0.0006, 0, -Math.PI / 2, true);
  s.lineTo(xh, -yh - 0.0006);
  s.lineTo(xh, -yh - e);
  return s;
}

interface Layers {
  back: THREE.Group;
  internals: THREE.Group;
  frame: THREE.Group;
  plate: THREE.Group;
  oled: THREE.Group;
  glass: THREE.Group;
}

export class Device {
  readonly root = new THREE.Group();
  readonly spin = new THREE.Group();
  readonly orient = new THREE.Group();
  readonly foldRoot = new THREE.Group();
  readonly rightPanel = new THREE.Group();
  readonly leftPivot = new THREE.Group();
  readonly leftPanel = new THREE.Group();
  readonly hingePivot = new THREE.Group();
  readonly hingeCover: THREE.Mesh;
  readonly hingeMech = new THREE.Group();
  readonly kickPivot = new THREE.Group();
  readonly anchors: Record<string, THREE.Object3D> = {};
  readonly hull: THREE.Object3D[] = [];
  readonly m: DeviceMaterials;
  readonly innerMats: ScreenMaterial[] = [];
  readonly outerMats: ScreenMaterial[] = [];
  readonly inner: ScreenSet;
  readonly outer: ScreenSet;

  private layersL!: Layers;
  private layersR!: Layers;
  private internals: THREE.Group[] = [];
  private xrayEdges: THREE.Mesh[] = [];
  private vapor!: THREE.ShaderMaterial;
  private flow!: THREE.Points;
  private flowMat!: THREE.ShaderMaterial;
  private flare!: THREE.Sprite;

  constructor(opts: { hingeDetail: number }) {
    this.m = createMaterials();
    this.root.add(this.spin);
    this.spin.add(this.orient);
    this.orient.add(this.foldRoot);
    this.foldRoot.add(this.rightPanel, this.leftPivot, this.hingePivot);
    this.leftPivot.position.set(0, 0, ZP);
    this.leftPivot.add(this.leftPanel);
    this.leftPanel.position.z = -ZP;

    this.layersR = this.buildPanel(this.rightPanel, 1);
    this.layersL = this.buildPanel(this.leftPanel, -1);
    this.buildRearCameras(this.layersR.back);
    this.buildOuterDisplay(this.layersL.back);
    this.buildButtons(this.layersR.frame);
    this.buildInternals();

    // Hinge cover: a slim half-cylinder that tucks flush under the back when open
    // and becomes the rounded spine when closed.
    const rh = T + GAP / 2;
    const coverGeo = new THREE.CylinderGeometry(rh, rh, H - 0.006, 48, 1, false, Math.PI / 2 + 0.1, Math.PI - 0.2);
    this.hingeCover = new THREE.Mesh(coverGeo, this.m.hinge);
    this.hingeCover.castShadow = true;
    this.hingePivot.position.set(0, 0, ZP);
    this.hingePivot.add(this.hingeCover, this.hingeMech);
    this.hull.push(this.hingeCover);
    this.anchors.hinge = new THREE.Object3D();
    this.anchors.hinge.position.set(-0.02, -0.38, -rh);
    this.hingeCover.add(this.anchors.hinge);
    this.buildHingeMech(opts.hingeDetail);
    this.buildCase();

    this.inner = new ScreenSet(this.innerMats, [1418, 1000]);
    this.outer = new ScreenSet(this.outerMats, [690, 1000]);

    this.setFold(0);
  }

  // ------------------------------------------------------------------ build

  private buildPanel(parent: THREE.Group, side: 1 | -1): Layers {
    const L: Layers = {
      back: new THREE.Group(), internals: new THREE.Group(), frame: new THREE.Group(),
      plate: new THREE.Group(), oled: new THREE.Group(), glass: new THREE.Group(),
    };
    parent.add(L.back, L.internals, L.frame, L.plate, L.oled, L.glass);
    this.internals.push(L.internals);

    // Titanium frame: a bevelled ring so the interior can be revealed.
    const bs = 0.006, bt = 0.009, ring = 0.011;
    const shape = panelShape(side, bs);
    shape.holes.push(panelPath(side, bs + ring));
    const frameGeo = new THREE.ExtrudeGeometry(shape, {
      depth: T - 2 * bt, bevelEnabled: true, bevelThickness: bt, bevelSize: bs, bevelSegments: 6, curveSegments: 32,
    });
    frameGeo.translate(0, 0, -(T - 2 * bt) / 2);
    const frame = new THREE.Mesh(frameGeo, this.m.frame);
    frame.castShadow = true;
    L.frame.add(frame);
    this.hull.push(frame);
    const edge = new THREE.Mesh(frameGeo, this.m.xrayEdge);
    edge.visible = false;
    edge.renderOrder = 5;
    frame.add(edge);
    this.xrayEdges.push(edge);

    // Front: black glass border, then the inner display, then the nano-texture cover.
    const front = new THREE.ShapeGeometry(panelShape(side, 0.0025, 0), 24);
    const bezel = new THREE.Mesh(front, this.m.bezel);
    bezel.position.z = T / 2 + 0.0003;
    L.oled.add(bezel);

    const sx0 = side > 0 ? 0 : -W + BZ_IN;
    const sx1 = side > 0 ? W - BZ_IN : 0;
    const scrShape = outline(new THREE.Shape(), sx0, sx1, -H / 2 + BZ_IN, H / 2 - BZ_IN, side > 0 ? 0 : R - BZ_IN, side > 0 ? R - BZ_IN : 0);
    const scrGeo = new THREE.ShapeGeometry(scrShape, 24);
    setUV(scrGeo, (x, y) => [(x + W - BZ_IN) / (2 * W - 2 * BZ_IN), (y + H / 2 - BZ_IN) / (H - 2 * BZ_IN)]);
    const mat = createScreenMaterial({ gloss: 0.15, aspect: INNER_ASPECT, udc: [0.715, 0.945] });
    this.innerMats.push(mat);
    const scr = new THREE.Mesh(scrGeo, mat);
    scr.position.z = T / 2 + 0.0006;
    L.oled.add(scr);

    const glass = new THREE.Mesh(front, this.m.innerGlass);
    glass.position.z = T / 2 + 0.001;
    glass.renderOrder = 2;
    L.glass.add(glass);

    // Titanium plate behind the display.
    const plate = new THREE.Mesh(new THREE.ShapeGeometry(panelShape(side, 0.014), 16), this.m.plate);
    plate.material.side = THREE.DoubleSide;
    plate.position.z = T / 2 - 0.007;
    L.plate.add(plate);

    // Anchors for the exploded-view labels, on the left half's free edge.
    if (side < 0) {
      const a = (name: string, g: THREE.Group, x: number, y: number, z: number) => {
        const o = new THREE.Object3D();
        o.position.set(x, y, z);
        g.add(o);
        this.anchors[name] = o;
      };
      a('glass', L.glass, -W + 0.02, 0.42, T / 2);
      a('oled', L.oled, -W + 0.02, 0.2, T / 2);
      a('plate', L.plate, -W + 0.02, -0.02, T / 2 - 0.007);
      a('frame', L.frame, -W, -0.22, 0);
      a('back', L.back, -W + 0.02, -0.44, -T / 2);
    }
    return L;
  }

  private buildRearCameras(back: THREE.Group) {
    const shape = panelShape(1, 0.0025);
    const geo = new THREE.ShapeGeometry(shape, 24);
    geo.rotateX(Math.PI);
    const glass = new THREE.Mesh(geo, this.m.backGlass);
    glass.position.z = -T / 2 - 0.0003;
    glass.castShadow = true;
    back.add(glass);

    // Camera plateau — a raised pill in the top free-side corner.
    const pw = 0.5, ph = 0.2, cx = W - 0.045 - pw / 2, cy = 0.44;
    const pGeo = new THREE.ExtrudeGeometry(pill(pw, ph), {
      depth: 0.004, bevelEnabled: true, bevelThickness: 0.0035, bevelSize: 0.004, bevelSegments: 5, curveSegments: 32,
    });
    pGeo.rotateX(Math.PI);
    const plateau = new THREE.Mesh(pGeo, this.m.plateau);
    plateau.position.set(cx, cy, -T / 2 - 0.0005);
    plateau.castShadow = true;
    back.add(plateau);
    this.hull.push(plateau);

    const zl = -T / 2 - 0.012;
    const lens = (x: number) => {
      const g = new THREE.Group();
      g.position.set(x, cy, zl);
      const ring = new THREE.Mesh(new THREE.CylinderGeometry(0.068, 0.07, 0.009, 64).rotateX(Math.PI / 2), this.m.lensRing);
      const disc = new THREE.Mesh(new THREE.CylinderGeometry(0.058, 0.058, 0.0094, 64).rotateX(Math.PI / 2), this.m.lensGlass);
      const core = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.022, 0.0098, 48).rotateX(Math.PI / 2), this.m.lensCore);
      g.add(ring, disc, core);
      back.add(g);
      return g;
    };
    const main = lens(W - 0.145);
    lens(W - 0.305);
    this.anchors.lens = new THREE.Object3D();
    this.anchors.lens.position.set(0, 0, -0.01);
    main.add(this.anchors.lens);

    const flash = new THREE.Mesh(new THREE.CylinderGeometry(0.019, 0.019, 0.004, 32).rotateX(Math.PI / 2), this.m.flash);
    flash.position.set(cx - pw / 2 + 0.09, cy - 0.045, -T / 2 - 0.009);
    const mic = new THREE.Mesh(new RoundedBoxGeometry(0.036, 0.012, 0.004, 2, 0.002), this.m.mic);
    mic.position.set(cx - pw / 2 + 0.09, cy + 0.05, -T / 2 - 0.009);
    back.add(flash, mic);

    // Lens flare (additive sprite) for the camera macro shot.
    this.flare = new THREE.Sprite(new THREE.SpriteMaterial({
      map: flareTexture(), color: '#bfd6ff', transparent: true, opacity: 0,
      depthTest: false, depthWrite: false, blending: THREE.AdditiveBlending,
    }));
    this.flare.scale.setScalar(0.001);
    this.flare.renderOrder = 10;
    main.add(this.flare);
  }

  private buildOuterDisplay(back: THREE.Group) {
    const geo = new THREE.ShapeGeometry(panelShape(-1, 0.0025), 24);
    geo.rotateX(Math.PI);
    const bezel = new THREE.Mesh(geo, this.m.bezel);
    bezel.position.z = -T / 2 - 0.0003;
    bezel.castShadow = true;
    back.add(bezel);

    const xa = -W + BZ_OUT, xb = -BZ_OUT, ya = -H / 2 + BZ_OUT, yb = H / 2 - BZ_OUT;
    const sGeo = new THREE.ShapeGeometry(outline(new THREE.Shape(), xa, xb, ya, yb, R - BZ_OUT, 0), 24);
    sGeo.rotateX(Math.PI);
    setUV(sGeo, (x, y) => [(xb - x) / (xb - xa), (y - ya) / (yb - ya)]);
    const mat = createScreenMaterial({ gloss: 0.85, aspect: OUTER_ASPECT });
    this.outerMats.push(mat);
    const scr = new THREE.Mesh(sGeo, mat);
    scr.position.z = -T / 2 - 0.0006;
    back.add(scr);

    const hole = new THREE.Mesh(new THREE.CircleGeometry(0.0145, 32).rotateX(Math.PI), this.m.bezel);
    hole.position.set(xb - 0.9 * (xb - xa), ya + 0.935 * (yb - ya), -T / 2 - 0.0008);
    back.add(hole);

    const g2 = geo.clone();
    const glass = new THREE.Mesh(g2, this.m.outerGlass);
    glass.position.z = -T / 2 - 0.001;
    glass.renderOrder = 2;
    back.add(glass);
  }

  private buildButtons(frame: THREE.Group) {
    const mk = (w: number, h: number, d: number, x: number, y: number) => {
      const b = new THREE.Mesh(new RoundedBoxGeometry(w, h, d, 3, Math.min(w, h, d) * 0.45), this.m.frame);
      b.position.set(x, y, 0);
      frame.add(b);
      return b;
    };
    // Volume buttons on the top edge, Touch ID side button on the free edge.
    mk(0.1, 0.012, 0.022, 0.43, H / 2 + 0.002);
    mk(0.1, 0.012, 0.022, 0.57, H / 2 + 0.002);
    const touchId = mk(0.012, 0.2, 0.026, W + 0.002, 0.17);
    const ring = new THREE.Mesh(new RoundedBoxGeometry(0.004, 0.204, 0.03, 2, 0.0018), this.m.lensRing);
    ring.position.x = -0.004;
    touchId.add(ring);
  }

  private buildInternals() {
    const m = this.m;
    // Right half: logic board, A20 Pro, vapor chamber, battery.
    const R_ = this.layersR.internals;
    const board = new THREE.Mesh(new THREE.BoxGeometry(0.56, 0.4, 0.004), m.board);
    board.position.set(0.41, 0.26, -0.014);
    const chip = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.12, 0.006), m.chip);
    chip.position.set(0.3, 0.22, -0.008);
    const batR = new THREE.Mesh(new RoundedBoxGeometry(0.6, 0.52, 0.018, 2, 0.006), m.battery);
    batR.position.set(0.41, -0.27, -0.006);
    R_.add(board, chip, batR);

    this.vapor = new THREE.ShaderMaterial({
      uniforms: { uHeat: { value: 0 }, uOpacity: { value: 0 }, uTime: { value: 0 } },
      vertexShader: /* glsl */ `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
      fragmentShader: /* glsl */ `
        uniform float uHeat, uOpacity, uTime; varying vec2 vUv;
        void main(){
          vec2 p = (vUv - vec2(0.22, 0.4)) * vec2(1.3, 1.0);
          float d = length(p);
          float spread = mix(0.06, 0.95, uHeat);
          float amp = mix(1.0, 0.32, uHeat);
          float h = exp(-(d*d)/(spread*spread)) * amp;
          h += 0.04 * sin(vUv.x * 60.0 + uTime) * sin(vUv.y * 60.0);
          vec3 c = mix(vec3(0.04,0.18,0.85), vec3(0.75,0.12,0.7), smoothstep(0.0,0.35,h));
          c = mix(c, vec3(1.0,0.5,0.12), smoothstep(0.35,0.7,h));
          c = mix(c, vec3(1.0,0.95,0.65), smoothstep(0.7,1.0,h));
          float grid = step(0.94, fract(vUv.x * 24.0)) + step(0.94, fract(vUv.y * 18.0));
          float a = (0.18 + h * 0.9 + grid * 0.08) * uOpacity;
          gl_FragColor = vec4(c * (0.6 + h), a);
        }`,
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
    });
    const vapor = new THREE.Mesh(new THREE.PlaneGeometry(0.68, 0.5), this.vapor);
    vapor.position.set(0.41, 0.24, 0.006);
    vapor.renderOrder = 4;
    R_.add(vapor);

    // Left half: second battery.
    const batL = new THREE.Mesh(new RoundedBoxGeometry(0.62, 0.98, 0.018, 2, 0.006), m.battery);
    batL.position.set(-0.42, -0.02, -0.006);
    this.layersL.internals.add(batL);

    const anchor = (name: string, parent: THREE.Object3D, x: number, y: number, z: number) => {
      const o = new THREE.Object3D();
      o.position.set(x, y, z);
      parent.add(o);
      this.anchors[name] = o;
    };
    anchor('chip', chip, 0, 0, 0);
    anchor('vapor', vapor, 0.25, 0.18, 0);
    anchor('batteryR', batR, 0, 0, 0);
    anchor('batteryL', batL, 0, 0, 0);

    // Energy flow between the two cells, over the hinge.
    const N = 90;
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(N * 3), 3));
    geo.setAttribute('aSeed', new THREE.BufferAttribute(Float32Array.from({ length: N }, (_, i) => i / N), 1));
    this.flowMat = new THREE.ShaderMaterial({
      uniforms: { uOpacity: { value: 0 }, uSize: { value: 70 } },
      vertexShader: /* glsl */ `
        attribute float aSeed; uniform float uSize; varying float vA;
        void main(){ vec4 mv = modelViewMatrix * vec4(position,1.0); gl_Position = projectionMatrix * mv;
          gl_PointSize = uSize * (0.6 + 0.4 * fract(aSeed * 7.0)) / -mv.z; vA = 0.5 + 0.5 * fract(aSeed * 13.0); }`,
      fragmentShader: /* glsl */ `
        uniform float uOpacity; varying float vA;
        void main(){ float d = length(gl_PointCoord - 0.5); float a = smoothstep(0.5, 0.0, d);
          gl_FragColor = vec4(vec3(0.45, 0.95, 1.0) * (0.6 + a), a * uOpacity * vA); }`,
      transparent: true, depthWrite: false, depthTest: false, blending: THREE.AdditiveBlending,
    });
    this.flow = new THREE.Points(geo, this.flowMat);
    this.flow.frustumCulled = false;
    this.flow.renderOrder = 6;
    this.flow.visible = false;
    this.foldRoot.add(this.flow);
  }

  private buildHingeMech(detail: number) {
    const n = Math.max(8, Math.round(26 * detail));
    const gearGeo = new THREE.CylinderGeometry(0.017, 0.017, 0.022, 20);
    const linkGeo = new THREE.BoxGeometry(0.05, 0.014, 0.007);
    const pinGeo = new THREE.CylinderGeometry(0.005, 0.005, 0.03, 10);
    const gears = new THREE.InstancedMesh(gearGeo, this.m.hingeMech, n);
    const links = new THREE.InstancedMesh(linkGeo, this.m.hingeMech, n * 2);
    const pins = new THREE.InstancedMesh(pinGeo, this.m.hingeMech, n);
    const o = new THREE.Object3D();
    for (let i = 0; i < n; i++) {
      const y = -H / 2 + 0.05 + (i * (H - 0.1)) / (n - 1);
      o.position.set(0, y, -0.03);
      o.rotation.set(0, 0, 0);
      o.updateMatrix();
      gears.setMatrixAt(i, o.matrix);
      for (let s = 0; s < 2; s++) {
        o.position.set(s ? 0.03 : -0.03, y + 0.008, -0.03);
        o.rotation.set(0, 0, s ? 0.25 : -0.25);
        o.updateMatrix();
        links.setMatrixAt(i * 2 + s, o.matrix);
      }
      o.position.set(0, y, -0.05);
      o.rotation.set(Math.PI / 2, 0, 0);
      o.updateMatrix();
      pins.setMatrixAt(i, o.matrix);
    }
    this.hingeMech.add(gears, links, pins);
    this.hingeMech.visible = false;
  }

  private buildCase() {
    const e = 0.009;
    // Right part: back plate with camera cut-out + rim.
    const back = panelShape(1, -e, 0.006);
    back.holes.push(outline(new THREE.Path(), W - 0.045 - 0.5 - 0.012, W - 0.045 + 0.012, 0.44 - 0.112, 0.44 + 0.112, 0.112, 0.112));
    const backGeo = new THREE.ExtrudeGeometry(back, { depth: 0.003, bevelEnabled: true, bevelThickness: 0.0015, bevelSize: 0.0015, bevelSegments: 2, curveSegments: 24 });
    backGeo.translate(0, 0, -T / 2 - 0.0055);
    const rimGeo = new THREE.ExtrudeGeometry(caseRim(e), { depth: T + 0.004, bevelEnabled: true, bevelThickness: 0.002, bevelSize: 0.002, bevelSegments: 3, curveSegments: 24 });
    rimGeo.translate(0, 0, -T / 2 - 0.0055);
    const rimL = rimGeo.clone().scale(-1, 1, 1);

    const caseMat = this.m.caseMat;
    caseMat.side = THREE.DoubleSide;
    const rb = new THREE.Mesh(backGeo, caseMat);
    const rr = new THREE.Mesh(rimGeo, caseMat);
    const lr = new THREE.Mesh(rimL, caseMat);
    this.caseRight.add(rb, rr);
    this.caseLeft.add(lr);
    this.rightPanel.add(this.caseRight);
    this.leftPanel.add(this.caseLeft);

    // Folio kickstand on the right back.
    this.kickPivot.position.set(0.41, 0.08, -T / 2 - 0.0075);
    const kick = new THREE.Mesh(new RoundedBoxGeometry(0.46, 0.46, 0.006, 3, 0.0028), caseMat);
    kick.position.set(0, -0.23, -0.002);
    this.kickPivot.add(kick);
    this.caseRight.add(this.kickPivot);
    this.caseHull = [rb, rr, lr, kick];
    for (const p of this.caseHull) p.castShadow = true;
    this.caseRight.visible = this.caseLeft.visible = false;
  }
  private readonly caseRight = new THREE.Group();
  private readonly caseLeft = new THREE.Group();
  private caseHull: THREE.Mesh[] = [];

  // ------------------------------------------------------------------ state

  setFold(theta: number) {
    const phi = (180 - theta) * DEG;
    this.leftPivot.rotation.y = phi;
    this.hingePivot.rotation.y = phi / 2;
    const cx = 0.4115 * Math.min(1, 1 - Math.cos(phi));
    const cz = ZP * (1 - Math.cos(phi)) * 0.5;
    this.foldRoot.position.set(-cx, 0, -cz);
  }

  setExplode(e: number) {
    const off: [keyof Layers, number][] = [['back', -0.34], ['internals', -0.17], ['frame', 0], ['plate', 0.15], ['oled', 0.28], ['glass', 0.4]];
    for (const [k, z] of off) {
      this.layersR[k].position.z = z * e;
      this.layersL[k].position.z = z * e;
    }
    this.rightPanel.position.x = 0.07 * e;
    this.leftPanel.position.x = -0.07 * e;
    this.hingeCover.position.z = -0.3 * e;
    this.hingeMech.visible = e > 0.01;
    this.hingeMech.position.z = -0.1 * e;
  }

  setXray(x: number, explode: number) {
    applyXray(this.m, x);
    for (const mat of [...this.innerMats, ...this.outerMats]) {
      const on = x > 0.002;
      if (mat.transparent !== on) {
        mat.transparent = on;
        mat.depthWrite = !on;
        mat.needsUpdate = true;
      }
      mat.uniforms.uOpacity.value = 1 - 0.9 * x;
    }
    for (const e of this.xrayEdges) e.visible = x > 0.01;
    const show = x > 0.01 || explode > 0.01;
    for (const g of this.internals) g.visible = show;
    this.vapor.uniforms.uOpacity.value = x;
  }

  setInternals(s: { heat: number; battery: number; flow: number; time: number }) {
    this.vapor.uniforms.uHeat.value = s.heat;
    this.vapor.uniforms.uTime.value = s.time;
    const pulse = 0.5 + 0.5 * Math.sin(s.time * 4);
    this.m.battery.emissiveIntensity = s.battery * (1.6 + 1.2 * pulse);
    this.m.chip.emissiveIntensity = 0.15 + s.heat * 0.9;
    this.m.board.emissiveIntensity = s.battery * 0.3;
    this.flow.visible = s.flow > 0.01;
    this.flowMat.uniforms.uOpacity.value = s.flow;
    if (this.flow.visible) {
      const pos = this.flow.geometry.attributes.position as THREE.BufferAttribute;
      const seeds = this.flow.geometry.attributes.aSeed as THREE.BufferAttribute;
      const a = new THREE.Vector3(-0.42, -0.02, 0.02), b = new THREE.Vector3(0.41, -0.27, 0.02);
      for (let i = 0; i < pos.count; i++) {
        const sd = seeds.getX(i);
        const t = (sd + s.time * 0.35) % 1;
        const lane = ((i % 3) - 1) * 0.07;
        const x = a.x + (b.x - a.x) * t;
        const y = a.y + (b.y - a.y) * t + Math.sin(t * Math.PI) * 0.18 + lane;
        const z = 0.03 + Math.sin(t * Math.PI) * 0.05;
        pos.setXYZ(i, x, y, z);
      }
      pos.needsUpdate = true;
    }
  }

  setFlare(f: number) {
    (this.flare.material as THREE.SpriteMaterial).opacity = f;
    this.flare.scale.set(0.42 * f + 0.001, 0.21 * f + 0.001, 1);
  }

  setCase(c: number, kick: number) {
    const vis = c > 0.002;
    this.caseRight.visible = this.caseLeft.visible = vis;
    const off = (1 - c) * -0.6;
    this.caseRight.position.z = off;
    this.caseLeft.position.z = off;
    this.m.caseMat.opacity = Math.min(1, c * 1.6);
    const opaque = c >= 0.999;
    if (this.m.caseMat.transparent === opaque) {
      this.m.caseMat.transparent = !opaque;
      this.m.caseMat.depthWrite = opaque;
      this.m.caseMat.needsUpdate = true;
    }
    this.kickPivot.rotation.x = kick * 40 * DEG;
  }

  /** Replace the procedural shells with nodes from a supplied .glb (see model.ts). */
  useModel(parts: { left: THREE.Object3D; right: THREE.Object3D; hinge: THREE.Object3D | null }) {
    const hideMeshes = (g: THREE.Object3D, keep: (o: THREE.Object3D) => boolean = () => false) =>
      g.traverse((o) => { if ((o as THREE.Mesh).isMesh && !keep(o)) o.visible = false; });
    hideMeshes(this.layersR.frame);
    hideMeshes(this.layersL.frame);
    hideMeshes(this.layersR.back);
    hideMeshes(this.layersL.back, (o) => (o as THREE.Mesh).material instanceof THREE.ShaderMaterial);
    this.hingeCover.visible = false;

    const adopt = (node: THREE.Object3D, parent: THREE.Object3D, offset = new THREE.Vector3()) => {
      node.matrixWorld.decompose(node.position, node.quaternion, node.scale);
      node.position.sub(offset);
      parent.add(node);
      node.traverse((o) => { if ((o as THREE.Mesh).isMesh) o.castShadow = true; });
    };
    adopt(parts.right, this.layersR.frame);
    adopt(parts.left, this.layersL.frame);
    if (parts.hinge) adopt(parts.hinge, this.hingePivot, new THREE.Vector3(0, 0, ZP));
    this.hull.length = 0;
    this.hull.push(parts.left, parts.right);
    if (parts.hinge) this.hull.push(parts.hinge);
  }

  setColorway(t: number) {
    applyColorway(this.m, t);
  }

  /** Hull meshes used for grounding and shadows (case only when visible). */
  hullMeshes(): THREE.Object3D[] {
    return this.caseLeft.visible ? [...this.hull, ...this.caseHull] : this.hull;
  }
}

function flareTexture(): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 512;
  c.height = 256;
  const g = c.getContext('2d')!;
  const rad = g.createRadialGradient(256, 128, 0, 256, 128, 128);
  rad.addColorStop(0, 'rgba(255,255,255,1)');
  rad.addColorStop(0.15, 'rgba(200,220,255,.7)');
  rad.addColorStop(0.5, 'rgba(120,150,255,.12)');
  rad.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = rad;
  g.fillRect(0, 0, 512, 256);
  const streak = g.createLinearGradient(0, 0, 512, 0);
  streak.addColorStop(0, 'rgba(120,160,255,0)');
  streak.addColorStop(0.5, 'rgba(200,220,255,.9)');
  streak.addColorStop(1, 'rgba(120,160,255,0)');
  g.fillStyle = streak;
  g.fillRect(0, 124, 512, 8);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}
