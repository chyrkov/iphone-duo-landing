import * as THREE from 'three';
import { Device } from './device';
import { createLights, createStudioEnvironment } from './lights';
import { CameraPath, type CamStop } from './camera-path';
import { createPostFX } from './postfx';
import { slot } from '../config/media';
import type { Tier } from './quality';
import type { SceneState } from '../scroll/chapters.config';

const DEG = Math.PI / 180;
const GROUND_Y = -0.66;

export interface FrameInput {
  state: SceneState;
  time: number; // seconds
  storyTime: number; // timeline units
  colorT: number; // 0 Star White … 1 Night Sky
  parallax: { x: number; y: number };
  drag: { yaw: number; pitch: number }; // user drag-to-rotate offset (radians)
  intro: number; // 0..1 load-in
}

export class Scene3D {
  readonly renderer: THREE.WebGLRenderer;
  readonly scene = new THREE.Scene();
  readonly camera = new THREE.PerspectiveCamera(30, 1, 0.05, 60);
  readonly device: Device;
  private readonly path: CameraPath;
  private readonly lights: ReturnType<typeof createLights>;
  private readonly bg: THREE.ShaderMaterial;
  private readonly groundMat: THREE.ShadowMaterial;
  private readonly blob: THREE.Mesh<THREE.PlaneGeometry, THREE.MeshBasicMaterial>;
  private readonly floorGlow: THREE.Mesh<THREE.PlaneGeometry, THREE.MeshBasicMaterial>;
  private readonly postfx?: ReturnType<typeof createPostFX>;
  private readonly labels: { el: HTMLElement; anchor: string; show: keyof SceneState }[] = [];
  private readonly box = new THREE.Box3();
  private readonly ray = new THREE.Raycaster();
  private readonly ndc = new THREE.Vector2();
  private readonly q = new THREE.Quaternion();
  private readonly qIdle = new THREE.Quaternion();
  private readonly e = new THREE.Euler();
  private readonly v = new THREE.Vector3();
  private readonly pos = new THREE.Vector3();
  private readonly tgt = new THREE.Vector3();
  private w = 1;
  private h = 1;
  private mobile = false;

  constructor(canvas: HTMLCanvasElement, readonly tier: Tier, camStops: CamStop[], innerPlaylist: string[], outerPlaylist: string[]) {
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false, powerPreference: 'high-performance' });
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.0;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.shadowMap.enabled = tier !== 'low';
    this.renderer.shadowMap.type = THREE.PCFShadowMap;
    this.renderer.shadowMap.autoUpdate = false;
    // Render the shadow map once so its depth texture exists before any grounded pose.
    this.renderer.shadowMap.needsUpdate = true;

    this.scene.environment = createStudioEnvironment(this.renderer);
    this.scene.environmentIntensity = 1;

    this.bg = backgroundMaterial();
    const bgMesh = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), this.bg);
    bgMesh.frustumCulled = false;
    bgMesh.renderOrder = -10;
    this.scene.add(bgMesh);

    this.lights = createLights(this.scene, tier);

    this.groundMat = new THREE.ShadowMaterial({ color: '#000000', opacity: 0, transparent: true, depthWrite: false });
    const ground = new THREE.Mesh(new THREE.PlaneGeometry(12, 12), this.groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = GROUND_Y;
    ground.receiveShadow = true;
    this.scene.add(ground);

    this.blob = new THREE.Mesh(
      new THREE.PlaneGeometry(2.4, 1.7),
      new THREE.MeshBasicMaterial({ map: blobTexture(), transparent: true, opacity: 0, depthWrite: false, toneMapped: false }),
    );
    this.blob.rotation.x = -Math.PI / 2;
    this.blob.position.y = GROUND_Y + 0.001;
    this.scene.add(this.blob);

    // A soft pool of light on the floor so contact shadows read on the dark page.
    this.floorGlow = new THREE.Mesh(
      new THREE.PlaneGeometry(6, 4),
      new THREE.MeshBasicMaterial({ map: blobTexture('255,255,255'), transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false }),
    );
    this.floorGlow.rotation.x = -Math.PI / 2;
    this.floorGlow.position.y = GROUND_Y - 0.001;
    this.floorGlow.renderOrder = -1;
    this.scene.add(this.floorGlow);

    this.device = new Device({ hingeDetail: tier === 'low' ? 0.35 : 1 });
    this.scene.add(this.device.root);
    this.device.inner.setPlaylist(innerPlaylist);
    this.device.outer.setPlaylist(outerPlaylist);

    this.path = new CameraPath(camStops);
    if (tier === 'high') this.postfx = createPostFX(this.renderer, this.scene, this.camera);

    document.querySelectorAll<HTMLElement>('[data-anchor]').forEach((el) => {
      this.labels.push({ el, anchor: el.dataset.anchor!, show: (el.dataset.show ?? 'explode') as keyof SceneState });
    });
  }

  /** Load screen media; reports 0..1 progress. */
  async load(onProgress: (p: number) => void) {
    const manager = new THREE.LoadingManager();
    manager.onProgress = (_u, loaded, total) => onProgress(total ? loaded / total : 1);
    const images: Record<string, HTMLImageElement | undefined> = {};
    const aniso = Math.min(8, this.renderer.capabilities.getMaxAnisotropy());
    if (slot('model.glb').src) {
      const { applyModel } = await import('./model'); // only shipped when a model is set
      await applyModel(this.device, manager);
    }
    await this.device.inner.load(manager, images, aniso);
    await this.device.outer.load(manager, images, aniso);
    this.device.inner.redrawPlaceholders(images);
    this.device.outer.redrawPlaceholders(images);
    onProgress(1);
    // Compile shaders up front so the first scroll does not hitch.
    this.renderer.compile(this.scene, this.camera);
  }

  resize(w: number, h: number) {
    this.w = w;
    this.h = h;
    this.mobile = w < 768 || w / h < 0.9;
    const maxDpr = this.tier === 'high' ? 2 : this.tier === 'mid' ? 1.5 : 1.25;
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, this.mobile ? Math.min(1.5, maxDpr) : maxDpr));
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.postfx?.setSize(w, h);
    this.bg.uniforms.uRes.value.set(w, h);
  }

  update(f: FrameInput) {
    const s = f.state;
    const d = this.device;

    d.setColorway(f.colorT);
    d.setFold(s.fold);
    d.setExplode(s.explode);
    d.setXray(s.xray, s.explode);
    d.setInternals({ heat: s.heat, battery: s.battery, flow: s.flow, time: f.time });
    d.setFlare(s.flare);
    d.setCase(s.caseIn, s.kick);

    // Orientation: scroll pose × idle sway; turntable spin on top.
    this.q.set(s.qx, s.qy, s.qz, s.qw).normalize();
    if (s.idle > 0.001) {
      this.e.set(Math.sin(f.time * 0.45) * 0.05 * s.idle, Math.sin(f.time * 0.3) * 0.3 * s.idle, 0);
      this.q.premultiply(this.qIdle.setFromEuler(this.e));
    }
    d.orient.quaternion.copy(this.q);
    d.spin.rotation.set(f.drag.pitch, s.spin * DEG + f.drag.yaw, 0);

    const intro = easeOut(f.intro);
    d.root.position.set(s.px, s.py - 0.18 * (1 - intro), s.pz);
    d.root.scale.setScalar(s.scale * (0.86 + 0.14 * intro));
    d.root.updateMatrixWorld(true);

    // Drop onto the ground plane for posed chapters.
    if (s.ground > 0.001) {
      this.box.makeEmpty();
      for (const m of d.hullMeshes()) this.box.expandByObject(m);
      d.root.position.y += (GROUND_Y - this.box.min.y) * s.ground;
      d.root.updateMatrixWorld(true);
      this.box.getCenter(this.v);
      this.blob.position.x = this.floorGlow.position.x = this.v.x;
      this.blob.position.z = this.floorGlow.position.z = this.v.z;
      this.renderer.shadowMap.needsUpdate = true;
    }
    this.groundMat.opacity = 0.38 * s.ground * (1 - s.bgLight * 0.5);
    this.blob.material.opacity = (this.tier === 'low' ? 0.75 : 0.45) * s.ground;
    this.blob.visible = s.ground > 0.001;
    this.floorGlow.material.opacity = 0.16 * s.ground * (1 - s.bgLight);
    this.floorGlow.visible = this.blob.visible;

    // Displays
    d.inner.update(s.inner, { uBright: s.innerOn, uSweep: s.sweep, uSweepAmt: s.sweepAmt, uGlow: s.glow, uTime: f.time, uUdc: s.udc });
    d.outer.update(s.outer, { uBright: s.outerOn, uTime: f.time });

    // Background + lights
    this.bg.uniforms.uLight.value = s.bgLight;
    this.bg.uniforms.uTime.value = f.time;
    // Full midnight tint in the hero, easing to a faint wash once the story starts.
    this.bg.uniforms.uHero.value = 1 - 0.7 * THREE.MathUtils.smoothstep(f.storyTime, 40, 180);
    this.bg.uniforms.uReveal.value = 1 - Math.pow(1 - Math.min(1, f.intro * 1.15), 3);
    this.lights.setRim(f.storyTime * 0.012 + s.spin * DEG + Math.sin(f.time * 0.25) * 0.25, s.bgLight);

    // Camera rail
    this.path.resolve(d.anchors);
    this.path.evaluate(s.cam, this.pos, this.tgt);
    const zoom = this.mobile ? Math.min(2.3, Math.max(1, 0.95 / this.camera.aspect)) : 1;
    if (this.mobile) {
      // Narrow screens have no room for off-centre poses: re-centre the rail on the device
      // (except for close-ups, which already frame a detail).
      const k = THREE.MathUtils.smoothstep(this.pos.distanceTo(this.tgt), 1.6, 2.6) * 0.9;
      if (k > 0) {
        this.box.makeEmpty();
        for (const m of d.hullMeshes()) this.box.expandByObject(m);
        this.box.getCenter(this.v);
        const dx = (this.v.x - this.tgt.x) * k, dz = (this.v.z - this.tgt.z) * k;
        this.pos.x += dx; this.tgt.x += dx;
        this.pos.z += dz; this.tgt.z += dz;
      }
    }
    if (zoom !== 1) this.pos.sub(this.tgt).multiplyScalar(zoom).add(this.tgt);
    const dist = this.pos.distanceTo(this.tgt);
    this.pos.x += f.parallax.x * 0.025 * dist;
    this.pos.y += f.parallax.y * 0.018 * dist;
    this.camera.position.copy(this.pos);
    this.camera.lookAt(this.tgt);
    const fx = this.mobile ? 0 : s.frameX;
    const fy = this.mobile ? 0.15 : s.frameY;
    this.camera.setViewOffset(this.w, this.h, -fx * this.w, fy * this.h, this.w, this.h);
    this.camera.updateMatrixWorld();

    this.updateLabels(s);
  }

  private updateLabels(s: SceneState) {
    for (const l of this.labels) {
      const a = this.device.anchors[l.anchor];
      const o = Math.min(1, Math.max(0, (s[l.show] as number) * 1.4 - 0.4));
      if (!a || o <= 0.01) {
        if (l.el.style.opacity !== '0') l.el.style.opacity = '0';
        continue;
      }
      a.getWorldPosition(this.v).project(this.camera);
      const x = (this.v.x * 0.5 + 0.5) * this.w;
      const y = (-this.v.y * 0.5 + 0.5) * this.h;
      l.el.style.opacity = String(o);
      l.el.style.transform = `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0)`;
    }
  }

  /** True when a screen point is over the visible phone. */
  hitTest(clientX: number, clientY: number): boolean {
    const r = this.renderer.domElement.getBoundingClientRect();
    this.ndc.set(((clientX - r.left) / r.width) * 2 - 1, -((clientY - r.top) / r.height) * 2 + 1);
    this.ray.setFromCamera(this.ndc, this.camera);
    const hits = this.ray.intersectObject(this.device.root, true);
    return hits.some((h) => {
      for (let o: THREE.Object3D | null = h.object; o; o = o.parent) if (!o.visible) return false;
      return true;
    });
  }

  render() {
    if (this.postfx) this.postfx.render();
    else this.renderer.render(this.scene, this.camera);
  }
}

function easeOut(t: number) {
  return 1 - Math.pow(1 - Math.min(1, Math.max(0, t)), 3);
}

function backgroundMaterial() {
  return new THREE.ShaderMaterial({
    uniforms: { uLight: { value: 0 }, uTime: { value: 0 }, uRes: { value: new THREE.Vector2(1, 1) }, uHero: { value: 1 }, uReveal: { value: 0 } },
    vertexShader: /* glsl */ `varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }`,
    fragmentShader: /* glsl */ `
      uniform float uLight, uTime, uHero, uReveal; uniform vec2 uRes; varying vec2 vUv;
      vec3 lin(vec3 c){ return pow(c, vec3(2.2)); }
      void main(){
        float asp = uRes.x / uRes.y;
        vec2 p = vUv;
        vec2 c1 = vec2(0.7 + 0.05 * sin(uTime * 0.07), 0.66 + 0.03 * cos(uTime * 0.05));
        vec2 c2 = vec2(0.18 + 0.03 * cos(uTime * 0.06), 0.16);
        float d1 = length((p - c1) * vec2(asp, 1.0));
        float d2 = length((p - c2) * vec2(asp, 1.0));
        vec3 dark = vec3(0.016, 0.017, 0.024)
          + vec3(0.06, 0.09, 0.17) * exp(-d1 * d1 * 2.6) * (1.0 - 0.8 * uHero)
          + vec3(0.1, 0.06, 0.035) * exp(-d2 * d2 * 3.5);
        // Midnight hero gradient: a wide deep-blue glow rising from the bottom centre that
        // opens up on load, stays clear of the top/nav, and carries into the next chapter.
        vec2 hc = vec2(0.5 + 0.02 * sin(uTime * 0.1), 0.06);
        float dh = length((p - hc) * vec2(asp * 0.45, 1.0));
        float rad = mix(0.15, 0.6, uReveal); // reaches ~half the viewport height
        float bloom = smoothstep(rad, 0.0, dh);
        float band = smoothstep(0.6, 0.0, p.y) * uReveal;
        vec3 midnight = vec3(0.042, 0.072, 0.165) * bloom
          + vec3(0.012, 0.022, 0.055) * band;
        midnight *= smoothstep(0.75, 0.5, p.y); // keep the top half and the nav dark
        dark += midnight * uHero;
        float v = length((p - 0.5) * vec2(asp, 1.0));
        vec3 light = vec3(0.955, 0.952, 0.94) - vec3(0.05, 0.05, 0.045) * smoothstep(0.2, 1.3, v)
          + vec3(0.03) * exp(-d1 * d1 * 2.0);
        vec3 col = mix(dark, light, uLight);
        col += (fract(sin(dot(gl_FragCoord.xy, vec2(12.9898, 78.233))) * 43758.5453) - 0.5) / 255.0;
        gl_FragColor = vec4(lin(col), 1.0);
        #include <colorspace_fragment>
      }`,
    depthTest: false,
    depthWrite: false,
    toneMapped: false,
  });
}

function blobTexture(rgb = '0,0,0') {
  const c = document.createElement('canvas');
  c.width = c.height = 256;
  const g = c.getContext('2d')!;
  const r = g.createRadialGradient(128, 128, 0, 128, 128, 128);
  r.addColorStop(0, `rgba(${rgb},.55)`);
  r.addColorStop(0.45, `rgba(${rgb},.22)`);
  r.addColorStop(1, `rgba(${rgb},0)`);
  g.fillStyle = r;
  g.fillRect(0, 0, 256, 256);
  const t = new THREE.CanvasTexture(c);
  return t;
}
