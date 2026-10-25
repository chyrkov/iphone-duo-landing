import * as THREE from 'three';
import type { Tier } from './quality';

/** Studio rig: soft key, a rim that sweeps across the titanium, gentle fill. */
export function createLights(scene: THREE.Scene, tier: Tier) {
  const key = new THREE.DirectionalLight('#fff7ee', 2.1);
  key.position.set(2.2, 4.2, 3.4);
  if (tier !== 'low') {
    key.castShadow = true;
    key.shadow.mapSize.setScalar(tier === 'high' ? 2048 : 1024);
    key.shadow.camera.left = -2;
    key.shadow.camera.right = 2;
    key.shadow.camera.top = 2;
    key.shadow.camera.bottom = -2;
    key.shadow.camera.near = 0.5;
    key.shadow.camera.far = 12;
    key.shadow.radius = 6;
    key.shadow.bias = -0.0004;
    key.shadow.normalBias = 0.01;
  }
  const rim = new THREE.DirectionalLight('#cfe0ff', 3.2);
  rim.position.set(-3, 2, -3);
  const fill = new THREE.HemisphereLight('#dfe8ff', '#1a1410', 0.35);
  scene.add(key, key.target, rim, rim.target, fill);

  return {
    key, rim, fill,
    /** Rim orbits behind the device; angle in radians. */
    setRim(angle: number, light: number) {
      rim.position.set(Math.sin(angle) * 4, 2.2, -Math.cos(angle) * 4);
      rim.intensity = 3.2 - light * 1.6;
      fill.intensity = 0.35 + light * 0.5;
    },
  };
}

/**
 * Dark studio environment for image-based lighting: a few large softboxes and
 * strip lights give the mirror-polished titanium crisp, readable highlights.
 */
export function createStudioEnvironment(renderer: THREE.WebGLRenderer): THREE.Texture {
  const env = new THREE.Scene();
  const room = new THREE.Mesh(
    new THREE.SphereGeometry(12, 32, 16),
    new THREE.MeshBasicMaterial({ color: '#0c0d11', side: THREE.BackSide }),
  );
  env.add(room);
  const box = (w: number, h: number, pos: [number, number, number], intensity: number, color = '#ffffff') => {
    const m = new THREE.Mesh(
      new THREE.PlaneGeometry(w, h),
      new THREE.MeshBasicMaterial({ color: new THREE.Color(color).multiplyScalar(intensity), side: THREE.DoubleSide }),
    );
    m.position.set(...pos);
    m.lookAt(0, 0, 0);
    env.add(m);
  };
  box(9, 3.2, [0, 8, 2.5], 5); // overhead softbox
  box(1.4, 9, [-8, 1, 3], 3.6); // left strip
  box(1.2, 9, [8, 1.5, -1.5], 2.6); // right strip
  box(7, 2.2, [0, 0.5, 9], 1.1); // front fill
  box(5, 6, [3, 2.5, -8], 2.4, '#cfe0ff'); // cool back light
  box(9, 4, [-1, 4, -8], 2.2); // back softbox (lights the rear glass)
  box(16, 16, [0, -8, 0], 0.35, '#d8d0c8'); // warm floor bounce
  const pmrem = new THREE.PMREMGenerator(renderer);
  const tex = pmrem.fromScene(env, 0.02).texture;
  pmrem.dispose();
  return tex;
}
