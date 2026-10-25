import * as THREE from 'three';
import { colorways } from '../config/copy';

/**
 * All device materials. Shell materials fade for the x-ray chapter; the
 * colorway is a single 0..1 blend between Star White (0) and Night Sky (1).
 */
export interface DeviceMaterials {
  frame: THREE.MeshPhysicalMaterial;
  hinge: THREE.MeshPhysicalMaterial;
  backGlass: THREE.MeshPhysicalMaterial;
  plateau: THREE.MeshPhysicalMaterial;
  bezel: THREE.MeshPhysicalMaterial;
  innerGlass: THREE.MeshPhysicalMaterial;
  outerGlass: THREE.MeshPhysicalMaterial;
  plate: THREE.MeshStandardMaterial;
  lensRing: THREE.MeshPhysicalMaterial;
  lensGlass: THREE.MeshPhysicalMaterial;
  lensCore: THREE.MeshPhysicalMaterial;
  flash: THREE.MeshStandardMaterial;
  mic: THREE.MeshStandardMaterial;
  hingeMech: THREE.MeshStandardMaterial;
  board: THREE.MeshStandardMaterial;
  battery: THREE.MeshStandardMaterial;
  chip: THREE.MeshStandardMaterial;
  caseMat: THREE.MeshPhysicalMaterial;
  xrayEdge: THREE.ShaderMaterial;
  /** Materials that fade with x-ray, with their resting opacity. */
  shells: { m: THREE.Material & { opacity: number }; base: number; tr: boolean }[];
}

const tmpA = new THREE.Color();
const tmpB = new THREE.Color();

export function createMaterials(): DeviceMaterials {
  const white = colorways[0];

  const frame = new THREE.MeshPhysicalMaterial({
    color: white.frame, metalness: 1, roughness: 0.14,
    clearcoat: 1, clearcoatRoughness: 0.06, envMapIntensity: 1.25,
  });
  // Micro-blasted: same metal, diffused highlight.
  const hinge = new THREE.MeshPhysicalMaterial({
    color: white.hinge, metalness: 1, roughness: 0.5, envMapIntensity: 1.0,
  });
  const backGlass = new THREE.MeshPhysicalMaterial({
    color: white.back, metalness: 0, roughness: 0.42, clearcoat: 0.35, clearcoatRoughness: 0.35,
    sheen: 0.3, sheenColor: new THREE.Color('#ffffff'), sheenRoughness: 0.6,
  });
  const plateau = backGlass.clone();
  plateau.roughness = 0.22;
  plateau.clearcoat = 0.8;

  const bezel = new THREE.MeshPhysicalMaterial({ color: '#040405', metalness: 0, roughness: 0.25, clearcoat: 1 });
  // Cover glass layers add reflections only (black + additive), so the screen
  // underneath keeps its contrast. Inner: nano-texture, soft and low specular.
  const innerGlass = new THREE.MeshPhysicalMaterial({
    color: '#000000', metalness: 0, roughness: 0.5, transparent: true, opacity: 1, depthWrite: false,
    blending: THREE.AdditiveBlending, envMapIntensity: 0.5,
  });
  // Outer: glossy Ceramic Shield 2.
  const outerGlass = new THREE.MeshPhysicalMaterial({
    color: '#000000', metalness: 0, roughness: 0.03, transparent: true, opacity: 1, depthWrite: false,
    blending: THREE.AdditiveBlending, clearcoat: 1, envMapIntensity: 1.2,
  });
  const plate = new THREE.MeshStandardMaterial({ color: '#7d7f84', metalness: 0.9, roughness: 0.38 });

  const lensRing = new THREE.MeshPhysicalMaterial({ color: '#d4d3cf', metalness: 1, roughness: 0.1, clearcoat: 1 });
  const lensGlass = new THREE.MeshPhysicalMaterial({
    color: '#050608', metalness: 0.2, roughness: 0.05, clearcoat: 1, clearcoatRoughness: 0.02, envMapIntensity: 1.6,
  });
  const lensCore = new THREE.MeshPhysicalMaterial({
    color: '#1a1f3a', metalness: 0.6, roughness: 0.12, clearcoat: 1,
    emissive: new THREE.Color('#2a3a8a'), emissiveIntensity: 0.25, iridescence: 1, iridescenceIOR: 1.6,
  });
  const flash = new THREE.MeshStandardMaterial({ color: '#f4efe2', roughness: 0.35, emissive: '#fff4d6', emissiveIntensity: 0.05 });
  const mic = new THREE.MeshStandardMaterial({ color: '#2a2a2c', roughness: 0.8 });

  const hingeMech = new THREE.MeshStandardMaterial({ color: '#a7a9ae', metalness: 1, roughness: 0.28 });
  const board = new THREE.MeshStandardMaterial({ color: '#1c2a24', metalness: 0.3, roughness: 0.6, emissive: '#0a3b2a', emissiveIntensity: 0 });
  const battery = new THREE.MeshStandardMaterial({
    color: '#2b2f36', metalness: 0.6, roughness: 0.35, emissive: new THREE.Color('#33d6ff'), emissiveIntensity: 0,
  });
  const chip = new THREE.MeshStandardMaterial({ color: '#16171a', metalness: 0.7, roughness: 0.3, emissive: '#ffffff', emissiveIntensity: 0 });
  chip.emissiveMap = makeChipTexture();
  chip.emissiveMap.colorSpace = THREE.SRGBColorSpace;

  const caseMat = new THREE.MeshPhysicalMaterial({
    color: '#1f2b45', roughness: 0.62, metalness: 0, sheen: 1, sheenRoughness: 0.8, sheenColor: new THREE.Color('#8fa0c8'),
    transparent: true, opacity: 0,
  });

  const xrayEdge = new THREE.ShaderMaterial({
    uniforms: { uOpacity: { value: 0 }, uColor: { value: new THREE.Color('#6fc8ff') } },
    vertexShader: /* glsl */ `
      varying vec3 vN; varying vec3 vV;
      void main() {
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        vN = normalize(normalMatrix * normal);
        vV = normalize(-mv.xyz);
        gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: /* glsl */ `
      uniform float uOpacity; uniform vec3 uColor;
      varying vec3 vN; varying vec3 vV;
      void main() {
        float f = pow(1.0 - abs(dot(normalize(vN), normalize(vV))), 2.2);
        gl_FragColor = vec4(uColor * (0.25 + f * 1.6), (0.08 + f) * uOpacity);
      }`,
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
  });

  const shells = [frame, hinge, backGlass, plateau, bezel, plate, lensRing, lensGlass, lensCore, flash, mic, innerGlass, outerGlass]
    .map((m) => ({ m, base: m.opacity, tr: m.transparent }));

  return {
    frame, hinge, backGlass, plateau, bezel, innerGlass, outerGlass, plate, lensRing, lensGlass, lensCore,
    flash, mic, hingeMech, board, battery, chip, caseMat, xrayEdge, shells,
  };
}

/** Blend between Star White (t=0) and Night Sky (t=1). */
export function applyColorway(m: DeviceMaterials, t: number): void {
  const [a, b] = colorways;
  const lerp = (mat: THREE.MeshPhysicalMaterial, ka: string, kb: string) => {
    tmpA.set(ka); tmpB.set(kb);
    mat.color.copy(tmpA).lerp(tmpB, t);
  };
  lerp(m.frame, a.frame, b.frame);
  lerp(m.hinge, a.hinge, b.hinge);
  lerp(m.backGlass, a.back, b.back);
  lerp(m.plateau, a.back, b.back);
  lerp(m.lensRing, a.frame, b.frame);
  m.backGlass.sheen = 0.3 * (1 - t);
}

let xrayOn = false;
/** Fade shell materials for the x-ray view. Cheap: only flips flags at the threshold. */
export function applyXray(m: DeviceMaterials, x: number): void {
  const on = x > 0.002;
  for (const { m: mat, base, tr } of m.shells) {
    if (on !== xrayOn) {
      mat.transparent = on || tr;
      mat.depthWrite = !on && !tr;
      mat.needsUpdate = true;
    }
    mat.opacity = base * (1 - 0.88 * x);
  }
  xrayOn = on;
  m.xrayEdge.uniforms.uOpacity.value = x;
}

function makeChipTexture(): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = c.height = 256;
  const g = c.getContext('2d')!;
  g.fillStyle = '#000';
  g.fillRect(0, 0, 256, 256);
  const grd = g.createLinearGradient(0, 0, 256, 256);
  grd.addColorStop(0, '#9ad8ff');
  grd.addColorStop(1, '#c69bff');
  g.strokeStyle = grd;
  g.lineWidth = 6;
  g.strokeRect(14, 14, 228, 228);
  g.fillStyle = grd;
  g.font = '600 64px "Inter Tight", system-ui, sans-serif';
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.fillText('A20', 128, 108);
  g.font = '500 44px "Inter Tight", system-ui, sans-serif';
  g.fillText('PRO', 128, 166);
  return new THREE.CanvasTexture(c);
}
