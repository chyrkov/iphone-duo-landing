import type { CamStop } from '../three/camera-path';

/**
 * ONE SOURCE OF TRUTH for the scroll story.
 *
 * Every chapter owns `length` vh of scroll. Its `keys` are tweens placed at a
 * local position `at` (0..1 of the chapter) lasting `dur` (fraction of the
 * chapter). timeline.ts turns this list into a single scrubbed GSAP timeline,
 * so everything plays forward and reverses with the scroll.
 *
 * Special `to` fields (converted by timeline.ts):
 *   pose         device orientation (euler or a fold-aware pose helper below)
 *   camera       a camera stop on the CatmullRom rail
 *   innerScreen  media key to cross-fade to on the inner display
 *   outerScreen  media key to cross-fade to on the outer display
 *   frameX       how far the device sits from centre (0..0.5 of the viewport);
 *                the sign is taken from the chapter's text `side`
 */

export interface SceneState {
  fold: number; // 0 closed … 180 open
  qx: number; qy: number; qz: number; qw: number; // pose quaternion
  spin: number; // turntable degrees
  px: number; py: number; pz: number; scale: number;
  cam: number; // camera stop index (float)
  frameX: number; frameY: number;
  explode: number; xray: number; heat: number; battery: number; flow: number; charge: number; flare: number;
  ground: number; sweep: number; sweepAmt: number; glow: number; udc: number;
  innerOn: number; outerOn: number; inner: number; outer: number; // screen brightness + playlist index
  caseIn: number; kick: number; bgLight: number; idle: number;
}

export const defaultState: SceneState = {
  fold: 0, qx: 0, qy: 0, qz: 0, qw: 1, spin: 0, px: 0, py: 0, pz: 0, scale: 1,
  cam: 0, frameX: 0, frameY: 0,
  explode: 0, xray: 0, heat: 0, battery: 0, flow: 0, charge: 0, flare: 0,
  ground: 0, sweep: -0.3, sweepAmt: 0, glow: 0, udc: 0,
  innerOn: 0, outerOn: 1, inner: 0, outer: 0,
  caseIn: 0, kick: 0, bgLight: 0, idle: 1,
};

type V3 = [number, number, number];
export type Pose =
  | { euler: V3 } // degrees, XYZ
  | { hinge: V3; inner: V3; yaw?: number }; // hinge axis + direction the inner (fold) side faces

export interface KeyTo extends Partial<SceneState> {
  pose?: Pose;
  camera?: CamStop;
  innerScreen?: string;
  outerScreen?: string;
}

export interface Key {
  at: number;
  dur?: number;
  ease?: string;
  to: KeyTo;
}

export interface Chapter {
  id: string;
  label: string; // nav dot label
  length: number; // vh of scroll
  side: 'left' | 'right'; // where the text sits
  theme?: 'dark' | 'light';
  /** Local time used for the reduced-motion still. */
  hold?: number;
  /** Text fade in/out windows (local 0..1). */
  textIn?: [number, number];
  textOut?: [number, number];
  initial?: KeyTo; // first chapter only: starting state
  keys: Key[];
}

// ---------------------------------------------------------------- pose helpers
const euler = (x: number, y: number, z: number): Pose => ({ euler: [x, y, z] });
/** Inverted V on its edges, outer display facing out (hands-free FaceTime). */
const tent = (): Pose => ({ hinge: [1, 0, 0], inner: [0, -1, 0] });
/** One half flat on the table, the other upright. */
const laptop = (fold: number, yaw = 0): Pose => {
  const h = (fold / 2) * (Math.PI / 180);
  return { hinge: [1, 0, 0], inner: [0, Math.sin(h), Math.cos(h)], yaw };
};
/** Standing like an open book, hinge vertical. */
const standing = (yaw = 0): Pose => ({ hinge: [0, 1, 0], inner: [0, 0, 1], yaw });

const HOME: CamStop = { pos: [0, 0.05, 4.2], target: [0, 0, 0] };

export const chapters: Chapter[] = [
  {
    id: 'hero', label: 'iPhone Duo', length: 70, side: 'left', hold: 0.1,
    textIn: [0, 0], textOut: [0.55, 0.92],
    initial: {
      fold: 0, pose: euler(6, -26, 0), camera: { pos: [0, 0.05, 4.0], target: [0, 0, 0] },
      frameX: 0.2, idle: 1, outerOn: 1, innerOn: 0,
      innerScreen: 'screen.inner.lock', outerScreen: 'screen.outer.lock',
    },
    keys: [
      { at: 0.4, dur: 0.6, to: { pose: euler(2, -6, 0), idle: 0 } },
    ],
  },
  {
    id: 'unfold', label: 'Unfold', length: 110, side: 'left', hold: 0.8,
    keys: [
      { at: 0, dur: 0.3, to: { camera: { pos: [0, 0.04, 4.35], target: [0, 0, 0] }, frameX: 0.2 } },
      { at: 0.08, dur: 0.62, ease: 'power2.inOut', to: { fold: 180, pose: euler(0, 0, 0) } },
      { at: 0.12, dur: 0.3, to: { outerOn: 0 } },
      { at: 0.32, dur: 0.38, to: { innerOn: 1 } },
    ],
  },
  {
    id: 'display', label: 'Display', length: 100, side: 'right', hold: 0.4,
    keys: [
      { at: 0, dur: 0.22, to: { camera: { pos: [0, 0, 4.1], target: [0, 0, 0] }, frameX: 0.2 } },
      { at: 0.12, dur: 0.06, to: { sweepAmt: 1 } },
      { at: 0.14, dur: 0.42, ease: 'none', to: { sweep: 1.3 } },
      { at: 0.55, dur: 0.06, to: { sweepAmt: 0 } },
      { at: 0.38, dur: 0.12, to: { udc: 1 } },
      // Tip it back to look along the surface: one unbroken reflection across the fold.
      { at: 0.6, dur: 0.3, to: { pose: euler(-62, -16, 0), camera: { pos: [0, 0.3, 3.4], target: [0, -0.02, 0] }, frameX: 0.19 } },
      { at: 0.86, dur: 0.12, to: { udc: 0 } },
    ],
  },
  {
    id: 'ios', label: 'iOS 27', length: 100, side: 'left', hold: 0.62,
    keys: [
      { at: 0, dur: 0.22, to: { camera: { pos: [0, 0, 4.1], target: [0, 0, 0] }, frameX: 0.18, pose: euler(0, 0, 90), fold: 165 } },
      { at: 0.18, dur: 0.08, to: { innerScreen: 'screen.inner.todayView' } },
      { at: 0.3, dur: 0.14, to: { fold: 128, pose: euler(-8, 22, 90) } },
      { at: 0.46, dur: 0.16, to: { fold: 180, pose: euler(0, 0, 0) } },
      { at: 0.56, dur: 0.07, to: { innerScreen: 'screen.inner.splitView' } },
      { at: 0.72, dur: 0.05, to: { innerScreen: 'screen.inner.video' } },
      { at: 0.81, dur: 0.05, to: { innerScreen: 'screen.inner.game' } },
      { at: 0.9, dur: 0.05, to: { innerScreen: 'screen.inner.reader' } },
    ],
  },
  {
    id: 'durability', label: 'Built to last', length: 100, side: 'right', hold: 0.6,
    keys: [
      { at: 0, dur: 0.22, to: { pose: euler(-56, 24, 0), camera: { pos: [0, 0.1, 5.5], target: [0, 0.05, 0] }, frameX: 0.12, innerScreen: 'screen.inner.home' } },
      { at: 0.18, dur: 0.32, ease: 'power3.inOut', to: { explode: 1 } },
      { at: 0.46, dur: 0.26, ease: 'sine.inOut', to: { pose: euler(-50, 38, 0) } },
      { at: 0.74, dur: 0.24, ease: 'power3.inOut', to: { explode: 0 } },
    ],
  },
  {
    id: 'posable', label: 'Posable', length: 120, side: 'left', hold: 0.6,
    keys: [
      {
        at: 0, dur: 0.18,
        to: {
          ground: 1, fold: 80, pose: tent(), outerOn: 1, innerOn: 0.15, outerScreen: 'screen.outer.facetime',
          camera: { pos: [2.9, 0.65, 2.3], target: [0, -0.3, 0] }, frameX: 0.17,
        },
      },
      {
        at: 0.25, dur: 0.17,
        to: { fold: 110, pose: laptop(110, -28), innerOn: 1, outerOn: 0, innerScreen: 'screen.inner.facetime', camera: { pos: [-0.5, 0.95, 3.4], target: [0, -0.2, 0] } },
      },
      {
        at: 0.5, dur: 0.17,
        to: { fold: 115, pose: standing(0), innerScreen: 'screen.inner.standby', camera: { pos: [0.25, 0.35, 4.5], target: [0, -0.12, 0] } },
      },
      {
        at: 0.75, dur: 0.17,
        to: { fold: 100, pose: laptop(100, 62), innerScreen: 'screen.inner.tv', camera: { pos: [0.4, 0.6, 3.9], target: [0, -0.25, 0] } },
      },
    ],
  },
  {
    id: 'cameras', label: 'Cameras', length: 100, side: 'right', hold: 0.4,
    keys: [
      {
        at: 0, dur: 0.22,
        to: { ground: 0, fold: 180, pose: euler(0, 180, 0), innerOn: 0, outerOn: 1, outerScreen: 'screen.outer.camera', camera: { pos: [0, 0, 3.9], target: [0, 0, 0] }, frameX: 0.16 },
      },
      { at: 0.24, dur: 0.2, to: { fold: 100, pose: { hinge: [0, 1, 0], inner: [0, 0, -1], yaw: -28 } } },
      { at: 0.48, dur: 0.18, to: { camera: { anchor: 'lens', pos: [0.06, 0.03, -0.62], target: [0, 0, 0] }, frameX: 0.08 } },
      { at: 0.62, dur: 0.05, ease: 'power2.out', to: { flare: 1 } },
      { at: 0.68, dur: 0.1, ease: 'power2.in', to: { flare: 0 } },
      { at: 0.8, dur: 0.18, to: { camera: { pos: [0, 0, 3.9], target: [0, 0, 0] }, frameX: 0.16 } },
    ],
  },
  {
    id: 'chip', label: 'A20 Pro', length: 80, side: 'left', hold: 0.7,
    keys: [
      { at: 0, dur: 0.25, to: { fold: 180, pose: euler(-16, 206, 0), outerOn: 0.4, camera: { pos: [0, 0, 4.4], target: [0, 0, 0] }, frameX: 0.19 } },
      { at: 0.12, dur: 0.25, to: { xray: 1 } },
      { at: 0.3, dur: 0.55, ease: 'power1.out', to: { heat: 1 } },
      { at: 0.4, dur: 0.3, to: { battery: 0.35 } },
    ],
  },
  {
    id: 'battery', label: 'Battery', length: 70, side: 'right', hold: 0.7,
    keys: [
      { at: 0, dur: 0.22, to: { pose: euler(-22, -14, 0), battery: 1, outerOn: 0, frameX: 0.19 } },
      { at: 0.1, dur: 0.3, to: { flow: 1 } },
      { at: 0.15, dur: 0.65, ease: 'power1.inOut', to: { charge: 0.5 } },
      { at: 0.82, dur: 0.16, to: { xray: 0, flow: 0, battery: 0, heat: 0 } },
    ],
  },
  {
    id: 'siri', label: 'Siri AI', length: 80, side: 'left', hold: 0.6,
    keys: [
      {
        at: 0, dur: 0.25,
        to: { fold: 150, pose: standing(0), ground: 1, innerOn: 1, innerScreen: 'screen.inner.siri', camera: { pos: [0, 0.2, 3.7], target: [0, -0.08, 0] }, frameX: 0.16 },
      },
      { at: 0.2, dur: 0.3, to: { glow: 1 } },
      { at: 0.82, dur: 0.15, to: { glow: 0, ground: 0 } },
    ],
  },
  {
    id: 'colors', label: 'Colors', length: 90, side: 'left', theme: 'light', hold: 0.5,
    keys: [
      { at: 0, dur: 0.2, to: { bgLight: 1 } },
      { at: 0, dur: 0.3, to: { fold: 0, pose: euler(4, 0, 0), outerOn: 1, innerOn: 0, outerScreen: 'screen.outer.lock', camera: { pos: [0, 0.05, 4.0], target: [0, 0, 0] }, frameX: 0.18 } },
      { at: 0.25, dur: 0.72, ease: 'none', to: { spin: 360 } },
    ],
  },
  {
    id: 'accessories', label: 'Accessories', length: 90, side: 'right', theme: 'light', hold: 0.8,
    keys: [
      { at: 0, dur: 0.22, to: { fold: 180, pose: euler(10, 200, 0), innerOn: 1, camera: { pos: [0, 0, 4.0], target: [0, 0, 0] }, frameX: 0.16 } },
      { at: 0.15, dur: 0.25, ease: 'power3.out', to: { caseIn: 1 } },
      { at: 0.5, dur: 0.26, to: { pose: euler(-45, -22, 0), ground: 1, kick: 1, camera: { pos: [0.2, 0.45, 3.8], target: [0, -0.15, 0] } } },
      { at: 0.88, dur: 0.12, to: { bgLight: 0 } },
    ],
  },
  {
    id: 'buy', label: 'Buy', length: 70, side: 'left', hold: 0.8, textOut: [2, 2],
    keys: [
      {
        at: 0, dur: 0.4,
        to: { caseIn: 0, kick: 0, ground: 0, fold: 0, pose: euler(6, -26, 0), innerOn: 0, outerOn: 1, camera: { ...HOME, pos: [0, 0.08, 4.4] }, frameX: 0.2 },
      },
      { at: 0.4, dur: 0.3, to: { idle: 1 } },
    ],
  },
];
