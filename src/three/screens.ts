import * as THREE from 'three';
import { slot, url, type MediaKey } from '../config/media';
import { drawPlaceholder } from './placeholders';

/**
 * Display surfaces. Each display has a playlist of media keys generated from
 * chapters.config; the scroll timeline animates a float index through it and
 * the shader cross-fades between neighbouring entries, so scrolling back
 * reverses the cross-fades exactly.
 */

export function createScreenMaterial(opts: { gloss: number; aspect: number; udc?: [number, number] }) {
  return new THREE.ShaderMaterial({
    uniforms: {
      mapA: { value: null as THREE.Texture | null },
      mapB: { value: null as THREE.Texture | null },
      uMix: { value: 0 },
      uBright: { value: 0 },
      uSweep: { value: -0.3 },
      uSweepAmt: { value: 0 },
      uGlow: { value: 0 },
      uTime: { value: 0 },
      uGloss: { value: opts.gloss },
      uOpacity: { value: 1 },
      uUdc: { value: 0 },
      uUdcPos: { value: new THREE.Vector2(...(opts.udc ?? [-1, -1])) },
      uAspect: { value: opts.aspect },
    },
    vertexShader: /* glsl */ `
      varying vec2 vUv; varying vec3 vNw; varying vec3 vPw;
      void main() {
        vUv = uv;
        vec4 wp = modelMatrix * vec4(position, 1.0);
        vPw = wp.xyz;
        vNw = normalize(mat3(modelMatrix) * normal);
        gl_Position = projectionMatrix * viewMatrix * wp;
      }`,
    fragmentShader: /* glsl */ `
      uniform sampler2D mapA; uniform sampler2D mapB;
      uniform float uMix, uBright, uSweep, uSweepAmt, uGlow, uTime, uGloss, uOpacity, uUdc, uAspect;
      uniform vec2 uUdcPos;
      varying vec2 vUv; varying vec3 vNw; varying vec3 vPw;
      void main() {
        vec3 a = texture2D(mapA, vUv).rgb;
        vec3 b = texture2D(mapB, vUv).rgb;
        vec3 col = mix(a, b, uMix) * uBright;

        vec3 V = normalize(cameraPosition - vPw);
        vec3 N = normalize(vNw);
        float ndv = clamp(dot(N, V), 0.0, 1.0);
        float fres = pow(1.0 - ndv, 4.0);

        // Light sweep: a tight glare on glossy glass, a soft wide bloom on nano-texture.
        float d = (vUv.x * uAspect + vUv.y) / (uAspect + 1.0) - uSweep;
        float band = exp(-d * d * mix(30.0, 900.0, uGloss));
        col += vec3(1.0, 0.98, 0.95) * band * uSweepAmt * mix(0.16, 0.9, uGloss);
        col += vec3(0.62, 0.68, 0.8) * fres * mix(0.04, 0.22, uGloss);

        // Under-display camera: a faint ring that appears on cue.
        vec2 du = (vUv - uUdcPos) * vec2(uAspect, 1.0);
        float r = length(du);
        float ring = smoothstep(0.016, 0.012, r) - smoothstep(0.012, 0.008, r) * 0.6;
        col = mix(col, vec3(0.0), clamp(ring, 0.0, 1.0) * uUdc * 0.85);

        // Siri edge glow.
        vec2 e = min(vUv, 1.0 - vUv) * vec2(uAspect, 1.0);
        float edge = min(e.x, e.y);
        float ang = atan(vUv.y - 0.5, (vUv.x - 0.5) * uAspect);
        vec3 siri = 0.55 + 0.45 * cos(uTime * 1.4 + ang * 2.0 + vec3(0.0, 2.1, 4.2));
        float glowMask = exp(-edge * 28.0) * (0.75 + 0.25 * sin(uTime * 2.0 + ang * 3.0));
        col = mix(col, siri * 1.25, clamp(glowMask * uGlow, 0.0, 1.0) * 0.9);

        gl_FragColor = vec4(col, uOpacity);
        #include <colorspace_fragment>
      }`,
    toneMapped: false,
  });
}

export type ScreenMaterial = ReturnType<typeof createScreenMaterial>;

interface Entry { tex: THREE.Texture; video?: HTMLVideoElement }

const BLACK = new THREE.DataTexture(new Uint8Array([0, 0, 0, 255]), 1, 1);
BLACK.needsUpdate = true;

export class ScreenSet {
  readonly entries = new Map<string, Entry>();
  private playlist: string[] = [];
  private lastA = -1;
  private lastB = -1;

  constructor(
    readonly materials: ScreenMaterial[],
    private readonly size: [number, number],
  ) {}

  setPlaylist(keys: string[]) {
    this.playlist = keys;
  }

  /** Load every key in the playlist. Placeholders are generated for empty slots. */
  async load(manager: THREE.LoadingManager, images: Record<string, HTMLImageElement | undefined>, anisotropy: number) {
    const unique = [...new Set(this.playlist)];
    const loader = new THREE.ImageLoader(manager);
    await Promise.all(unique.map(async (key) => {
      const s = slot(key as MediaKey);
      let tex: THREE.Texture;
      let video: HTMLVideoElement | undefined;
      if (s?.src && s.kind === 'image') {
        const img = images[key] ?? await loader.loadAsync(url(s.src));
        images[key] = img;
        tex = new THREE.Texture(img);
      } else if (s?.src && s.kind === 'video') {
        video = document.createElement('video');
        Object.assign(video, { muted: true, loop: true, playsInline: true, preload: 'auto', crossOrigin: 'anonymous' });
        video.src = url(s.src);
        tex = new THREE.VideoTexture(video);
      } else {
        tex = new THREE.CanvasTexture(drawPlaceholder(key, this.size[0], this.size[1], images));
      }
      tex.colorSpace = THREE.SRGBColorSpace;
      tex.anisotropy = anisotropy;
      tex.needsUpdate = true;
      this.entries.set(key, { tex, video });
    }));
  }

  /** Placeholders that depend on other images (e.g. Siri) are drawn after load. */
  redrawPlaceholders(images: Record<string, HTMLImageElement | undefined>) {
    for (const [key, e] of this.entries) {
      if (e.tex instanceof THREE.CanvasTexture && !slot(key as MediaKey)?.src) {
        e.tex.image = drawPlaceholder(key, this.size[0], this.size[1], images);
        e.tex.needsUpdate = true;
      }
    }
  }

  private tex(i: number): Entry | undefined {
    const key = this.playlist[Math.max(0, Math.min(this.playlist.length - 1, i))];
    return key ? this.entries.get(key) : undefined;
  }

  update(index: number, uniforms: Partial<Record<'uBright' | 'uSweep' | 'uSweepAmt' | 'uGlow' | 'uTime' | 'uUdc', number>>) {
    const i0 = Math.floor(index);
    const f = index - i0;
    const a = this.tex(i0);
    const b = this.tex(i0 + 1);
    if (i0 !== this.lastA || i0 + 1 !== this.lastB) {
      // pause videos that left the screen
      for (const [, e] of this.entries) if (e.video && e !== a && e !== b) e.video.pause();
      this.lastA = i0;
      this.lastB = i0 + 1;
    }
    const visible = (uniforms.uBright ?? 1) > 0.01;
    for (const e of [a, b]) if (e?.video && visible && e.video.paused) e.video.play().catch(() => {});
    for (const m of this.materials) {
      m.uniforms.mapA.value = a?.tex ?? BLACK;
      m.uniforms.mapB.value = b?.tex ?? a?.tex ?? BLACK;
      m.uniforms.uMix.value = f;
      for (const k in uniforms) m.uniforms[k].value = uniforms[k as keyof typeof uniforms];
    }
  }

  pauseAll() {
    for (const [, e] of this.entries) e.video?.pause();
  }
}
