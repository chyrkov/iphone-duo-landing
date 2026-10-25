export type Tier = 'low' | 'mid' | 'high';

/** Pick a quality tier from the device. Override with ?quality=low|mid|high. */
export function detectTier(): Tier {
  const q = new URLSearchParams(location.search).get('quality');
  if (q === 'low' || q === 'mid' || q === 'high') return q;

  const coarse = matchMedia('(pointer: coarse)').matches;
  const cores = navigator.hardwareConcurrency || 4;
  let gpu = '';
  try {
    const gl = document.createElement('canvas').getContext('webgl');
    const ext = gl?.getExtension('WEBGL_debug_renderer_info');
    if (gl && ext) gpu = String(gl.getParameter(ext.UNMASKED_RENDERER_WEBGL));
  } catch {
    /* ignore */
  }
  const weakGpu = /Mali-[GT]?[4-7]\d|Adreno \(TM\) [3-5]\d\d|PowerVR|Intel\(R\) HD|SwiftShader|llvmpipe/i.test(gpu);
  if (weakGpu || (coarse && cores <= 4)) return 'low';
  if (coarse || cores < 8) return 'mid';
  return 'high';
}

export function hasWebGL(): boolean {
  try {
    const c = document.createElement('canvas');
    return !!(c.getContext('webgl2') || c.getContext('webgl'));
  } catch {
    return false;
  }
}
