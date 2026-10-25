import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js';
import { slot, url } from '../config/media';
import type { Device } from './device';

/**
 * Optional: swap the procedural shells for a supplied .glb (media key model.glb).
 *
 * Expected model setup (same as the procedural device):
 *  - 1 unit = 100 mm, exported OPEN and flat, inner display facing +Z, hinge along +Y at x = 0
 *  - nodes named  panelLeft  (x < 0, outer display on its back)
 *                 panelRight (x > 0, rear cameras on its back)
 *                 hinge      (hinge cover / spine)
 * The procedural displays stay on top, so screen media keeps working.
 */
export async function applyModel(device: Device, manager: THREE.LoadingManager): Promise<boolean> {
  const s = slot('model.glb');
  if (!s.src) return false;
  // three bundles its Draco decoder; Vite copies it into the build automatically.
  const draco = new DRACOLoader(manager);
  const loader = new GLTFLoader(manager).setDRACOLoader(draco);
  try {
    const gltf = await loader.loadAsync(url(s.src));
    const left = gltf.scene.getObjectByName('panelLeft');
    const right = gltf.scene.getObjectByName('panelRight');
    const hinge = gltf.scene.getObjectByName('hinge');
    if (!left || !right) {
      console.warn('[model] panelLeft / panelRight not found — keeping the procedural device.');
      return false;
    }
    gltf.scene.updateMatrixWorld(true);
    device.useModel({ left, right, hinge: hinge ?? null });
    return true;
  } catch (err) {
    console.warn('[model] failed to load, keeping the procedural device.', err);
    return false;
  } finally {
    draco.dispose();
  }
}
