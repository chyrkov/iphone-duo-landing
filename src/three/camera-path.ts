import * as THREE from 'three';

export interface CamStop {
  pos: [number, number, number];
  target?: [number, number, number];
  /** If set, pos/target are offsets in this anchor's local space (e.g. 'lens'). */
  anchor?: string;
}

/**
 * Camera rail: one CatmullRom curve through every camera stop for position and
 * one for the look-at target. Stop i sits at curve parameter i/(n-1), so the
 * scroll timeline simply tweens a float "stop index".
 */
export class CameraPath {
  private readonly posPts: THREE.Vector3[];
  private readonly tgtPts: THREE.Vector3[];
  private readonly posCurve: THREE.CatmullRomCurve3;
  private readonly tgtCurve: THREE.CatmullRomCurve3;
  private readonly tmp = new THREE.Vector3();

  constructor(private readonly stops: CamStop[]) {
    let lastTarget: [number, number, number] = [0, 0, 0];
    this.posPts = stops.map((s) => new THREE.Vector3(...s.pos));
    this.tgtPts = stops.map((s) => {
      if (s.target) lastTarget = s.target;
      return new THREE.Vector3(...(s.target ?? (s.anchor ? [0, 0, 0] : lastTarget)));
    });
    if (stops.length === 1) {
      this.posPts.push(this.posPts[0].clone());
      this.tgtPts.push(this.tgtPts[0].clone());
    }
    this.posCurve = new THREE.CatmullRomCurve3(this.posPts, false, 'centripetal');
    this.tgtCurve = new THREE.CatmullRomCurve3(this.tgtPts, false, 'centripetal');
  }

  /** Resolve anchored stops into world space (call after the device is posed). */
  resolve(anchors: Record<string, THREE.Object3D>) {
    this.stops.forEach((s, i) => {
      if (!s.anchor) return;
      const a = anchors[s.anchor];
      if (!a) return;
      this.posPts[i].copy(a.localToWorld(this.tmp.set(...s.pos)));
      this.tgtPts[i].copy(a.localToWorld(this.tmp.set(...(s.target ?? [0, 0, 0]))));
    });
  }

  evaluate(index: number, outPos: THREE.Vector3, outTarget: THREE.Vector3) {
    const n = Math.max(1, this.posPts.length - 1);
    const u = THREE.MathUtils.clamp(index / n, 0, 1);
    this.posCurve.getPoint(u, outPos);
    this.tgtCurve.getPoint(u, outTarget);
  }
}
