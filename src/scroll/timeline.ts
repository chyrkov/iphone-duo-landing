import gsap from 'gsap';
import * as THREE from 'three';
import { chapters, defaultState, type Chapter, type KeyTo, type Pose, type SceneState } from './chapters.config';
import type { CamStop } from '../three/camera-path';

export interface ChapterRange extends Chapter {
  index: number;
  start: number; // timeline units (vh)
  end: number;
}

export interface Story {
  tl: gsap.core.Timeline;
  state: SceneState;
  chapters: ChapterRange[];
  total: number;
  camStops: CamStop[];
  innerPlaylist: string[];
  outerPlaylist: string[];
  chapterAt(time: number): { chapter: ChapterRange; local: number };
}

const DEG = Math.PI / 180;
const m4 = new THREE.Matrix4();

/** Convert a pose to a quaternion. Fold-aware poses need the fold angle. */
export function poseQuat(p: Pose, fold: number): THREE.Quaternion {
  if ('euler' in p) {
    return new THREE.Quaternion().setFromEuler(new THREE.Euler(p.euler[0] * DEG, p.euler[1] * DEG, p.euler[2] * DEG, 'XYZ'));
  }
  // Local frame: hinge = +Y, right panel along +X, inner side bisector n = (a, 0, b).
  const phi = (180 - fold) * DEG;
  let a = 1 - Math.cos(phi);
  let b = Math.sin(phi);
  const len = Math.hypot(a, b);
  if (len < 1e-5) { a = 0; b = 1; } else { a /= len; b /= len; }
  const Y = new THREE.Vector3(...p.hinge).normalize();
  const n = new THREE.Vector3(...p.inner);
  n.addScaledVector(Y, -n.dot(Y)).normalize();
  const mw = new THREE.Vector3().crossVectors(Y, n);
  const X = n.clone().multiplyScalar(a).addScaledVector(mw, b);
  const Z = new THREE.Vector3().crossVectors(X, Y);
  m4.makeBasis(X, Y, Z);
  const q = new THREE.Quaternion().setFromRotationMatrix(m4);
  if (p.yaw) q.premultiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), p.yaw * DEG));
  return q;
}

/** Build the single master timeline from chapters.config. */
export function buildStory(): Story {
  const state: SceneState = { ...defaultState };
  const camStops: CamStop[] = [];
  const innerPlaylist: string[] = [];
  const outerPlaylist: string[] = [];
  const lastQ = new THREE.Quaternion();
  let fold = state.fold;

  let total = 0;
  const ranges: ChapterRange[] = chapters.map((c, index) => {
    const r = { ...c, index, start: total, end: total + c.length };
    total += c.length;
    return r;
  });

  /** Resolve special fields into plain numbers on the state. */
  const resolve = (to: KeyTo, side: 1 | -1): Record<string, number> => {
    const out: Record<string, number> = {};
    for (const [k, v] of Object.entries(to)) {
      if (typeof v === 'number' && k in defaultState) out[k] = v;
    }
    if (to.frameX !== undefined) out.frameX = to.frameX * side;
    if (to.fold !== undefined) fold = to.fold;
    if (to.pose) {
      const q = poseQuat(to.pose, fold);
      if (q.dot(lastQ) < 0) q.set(-q.x, -q.y, -q.z, -q.w); // shortest path
      lastQ.copy(q);
      Object.assign(out, { qx: q.x, qy: q.y, qz: q.z, qw: q.w });
    }
    if (to.camera) {
      camStops.push(to.camera);
      out.cam = camStops.length - 1;
    }
    if (to.innerScreen) {
      innerPlaylist.push(to.innerScreen);
      out.inner = innerPlaylist.length - 1;
    }
    if (to.outerScreen) {
      outerPlaylist.push(to.outerScreen);
      out.outer = outerPlaylist.length - 1;
    }
    return out;
  };

  const sideOf = (c: Chapter) => (c.side === 'left' ? 1 : -1) as 1 | -1;
  if (ranges[0].initial) Object.assign(state, resolve(ranges[0].initial, sideOf(ranges[0])));

  const tl = gsap.timeline({ paused: true, defaults: { ease: 'power2.inOut' } });
  for (const c of ranges) {
    const keys = [...c.keys].sort((a, b) => a.at - b.at);
    for (const k of keys) {
      const vars = resolve(k.to, sideOf(c));
      tl.to(state, {
        ...vars,
        duration: Math.max(0.001, (k.dur ?? 0.25) * c.length),
        ease: k.ease ?? 'power2.inOut',
        immediateRender: false,
      }, c.start + k.at * c.length);
    }
  }
  // Make the timeline exactly as long as the scroll story.
  tl.set({}, {}, total);

  const chapterAt = (time: number) => {
    const t = THREE.MathUtils.clamp(time, 0, total - 1e-6);
    const chapter = ranges.find((r) => t >= r.start && t < r.end) ?? ranges[ranges.length - 1];
    return { chapter, local: (t - chapter.start) / chapter.length };
  };

  return { tl, state, chapters: ranges, total, camStops, innerPlaylist, outerPlaylist, chapterAt };
}
